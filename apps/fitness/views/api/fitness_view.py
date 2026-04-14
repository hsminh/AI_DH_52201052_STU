import base64
import json
import os
import uuid
from datetime import datetime, timedelta

from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.chatbot_core.data.prompts import get_cooking_assistant_prompt, get_meal_tracking_prompt
from apps.chatbot_core.services import RAGService
from apps.fitness.services import (
    FitnessService,
    HybridCacheService,
    identify_food_from_image,
    identify_food_from_text,
    make_cache_key,
    make_profile_hash,
    stream_and_collect,
)


class BaseFitnessView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_current_time_info(self):
        vn_time = datetime.utcnow() + timedelta(hours=7)
        hour = vn_time.hour
        if 5 <= hour < 11:
            session = "Morning"
        elif 11 <= hour < 14:
            session = "Lunch"
        elif 14 <= hour < 18:
            session = "Afternoon/Snack"
        elif 18 <= hour < 22:
            session = "Evening"
        else:
            session = "Late Night"
        return f"{vn_time.strftime('%H:%M:%S')} ({session})"

    def get_rag_context(self, query: str, k: int = 3) -> str:
        try:
            ctx = RAGService.get_relevant_context(query, k=k)
            return ctx.strip() if ctx else ""
        except Exception as exc:
            print(f"[RAG] Error: {exc}")
            return ""

    def build_messages_with_rag(self, query: str, prompt: str, extra_content: list = None) -> list:
        rag_context = self.get_rag_context(query)
        messages = []

        if rag_context:
            print(f"[RAG] Context found ({len(rag_context)} chars) for: '{query[:60]}'")
            messages.append({
                "role": "system",
                "content": (
                    "Reference documentation from knowledge base. "
                    "Prioritize this information when analyzing and responding:\n\n"
                    + rag_context
                ),
            })
        else:
            print(f"[RAG] No docs for: '{query[:60]}'")

        if extra_content:
            messages.append({
                "role": "user",
                "content": [{"type": "text", "text": prompt}] + extra_content,
            })
        else:
            messages.append({"role": "user", "content": prompt})

        return messages

    def get_profile_and_metrics(self, request):
        try:
            profile = request.user.profile
        except AttributeError:
            profile = type("obj", (object,), {
                "weight": 70, "height": 170, "age": 25,
                "gender": "male", "activity_level": 1.2,
                "body_type": "Normal", "health_condition": "None",
            })()
        body_metrics = FitnessService.calculate_metrics(
            profile.weight, profile.height, profile.age, profile.gender,
            profile.activity_level,
            body_type=profile.body_type,
            health_condition=profile.health_condition,
        )
        return profile, body_metrics


class TextAnalysisView(BaseFitnessView):
    def post(self, request):
        user_input = request.data.get("user_input", "").strip()

        try:
            profile, body_metrics = self.get_profile_and_metrics(request)
        except ValueError as exc:
            return JsonResponse({"error": "Invalid profile data", "message": str(exc)}, status=400)

        current_time_info = self.get_current_time_info()
        profile_hash = make_profile_hash(profile)

        def stream_generator():
            yield f"[PROFILE_DATA]{json.dumps({'weight': profile.weight, 'height': profile.height, 'age': profile.age, 'bmi': body_metrics['bmi'], 'status': body_metrics['status']})}[/PROFILE_DATA]"

            food_name = identify_food_from_text(user_input)
            print(f"[TextAnalysis] Identified food: '{food_name}'")

            cache_key = make_cache_key(food_name, "text", profile_hash)
            cached = HybridCacheService.get_exact(cache_key)

            if cached is None:
                cached = HybridCacheService.get_semantic(food_name, "text", profile_hash)

            if cached is not None:
                yield "[CACHE_HIT]"
                yield cached
                return

            prompt = get_meal_tracking_prompt(
                user_input, body_metrics,
                current_time=current_time_info,
                workout_data=None,
            )
            messages = self.build_messages_with_rag(food_name or user_input, prompt)
            models = ["fast-text-combo", "text-smart-combo", "free-stack"]

            for item in stream_and_collect(messages, models):
                if isinstance(item, tuple):
                    signal, payload = item
                    if signal == "__FULL__" and payload and not payload.startswith("[ERROR]"):
                        HybridCacheService.save(cache_key, food_name, "text", profile_hash, payload, request.user)
                    elif signal == "__ERROR__":
                        yield f"[ERROR]All models failed. {payload}[/ERROR]"
                else:
                    yield item

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


class ImageAnalysisView(BaseFitnessView):
    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        image_file = request.FILES.get("image")

        if not image_file:
            return JsonResponse({"error": "No image provided"}, status=400)

        try:
            profile, body_metrics = self.get_profile_and_metrics(request)
        except ValueError as exc:
            return JsonResponse({"error": "Invalid profile data", "message": str(exc)}, status=400)

        image_bytes = image_file.read()
        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
        content_type = image_file.content_type
        current_time_info = self.get_current_time_info()
        profile_hash = make_profile_hash(profile)

        def stream_generator():
            yield f"[PROFILE_DATA]{json.dumps({'weight': profile.weight, 'height': profile.height, 'age': profile.age, 'bmi': body_metrics['bmi'], 'status': body_metrics['status']})}[/PROFILE_DATA]"

            temp_id = f"{request.user.id}_{uuid.uuid4().hex[:8]}"
            temp_image_path = f"media/temp_analysis_{temp_id}.png"
            with open(temp_image_path, "wb") as f:
                f.write(image_bytes)

            rag_context = ""
            vector_ids = []
            try:
                rag_context, vector_ids = RAGService.get_image_context(temp_image_path, type_name="Recipe", content_type=content_type)
            except Exception as e:
                print(f"[ImageAnalysis] RAG failed: {e}")

            if rag_context:
                print(f"[ImageAnalysis] Vector DB match found. IDs: {vector_ids}")
                if vector_ids:
                    yield f"[VECTOR_ID]{vector_ids[0]}[/VECTOR_ID]"

                prompt = get_meal_tracking_prompt(
                    user_input or "Summarize and analyze this dish based on available data", 
                    body_metrics,
                    current_time=current_time_info,
                    workout_data=None,
                )
                messages = [
                    {"role": "system", "content": f"Accurate data from knowledge base (prioritize this): {rag_context}"},
                    {"role": "user", "content": prompt}
                ]
                models = ["fast-text-combo", "text-smart-combo", "free-stack"]
            else:
                print("[ImageAnalysis] No vector DB match. Falling back to AI Vision.")
                prompt = get_meal_tracking_prompt(
                    user_input or "identify and analyze the food in this image", body_metrics,
                    current_time=current_time_info,
                    workout_data=None,
                )
                image_content = [{"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{image_base64}"}}]
                messages = [
                    {"role": "user", "content": [{"type": "text", "text": prompt}] + image_content}
                ]
                models = ["fast-vision-combo", "vision-ultra-combo", "free-stack"]

            full_payload = ""
            for item in stream_and_collect(messages, models):
                if isinstance(item, tuple):
                    signal, payload = item
                    if signal == "__FULL__":
                        full_payload = payload
                        if payload and not payload.startswith("[ERROR]"):
                            if not rag_context and os.path.exists(temp_image_path):
                                try:
                                    print(f"[ImageAnalysis] Saving new image analysis to vector DB...")
                                    unique_id = RAGService.process_image(
                                        temp_image_path, 
                                        type_name="Recipe", 
                                        description=payload,
                                        content_type=content_type
                                    )
                                    if unique_id:
                                        yield f"[VECTOR_ID]{unique_id}[/VECTOR_ID]"
                                except Exception as ve:
                                    print(f"[ImageAnalysis] Failed to save vector: {ve}")
                    elif signal == "__ERROR__":
                        yield f"[ERROR]All models failed. {payload}[/ERROR]"
                else:
                    yield item

            if os.path.exists(temp_image_path):
                os.remove(temp_image_path)

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


class CookingAssistantView(BaseFitnessView):
    def post(self, request):
        food_name = request.data.get("food_name", "").strip()
        if not food_name:
            return JsonResponse({"error": "No food name provided"}, status=400)

        current_time_info = self.get_current_time_info()

        def stream_generator():
            profile_hash = ""
            cache_key = make_cache_key(food_name, "cooking", profile_hash)

            cached = HybridCacheService.get_exact(cache_key)
            if cached is None:
                cached = HybridCacheService.get_semantic(food_name, "cooking", profile_hash)

            if cached is not None:
                yield "[CACHE_HIT]"
                yield cached
                return

            prompt = get_cooking_assistant_prompt(food_name, current_time=current_time_info)
            messages = self.build_messages_with_rag(food_name, prompt)
            models = ["fast-text-combo", "text-smart-combo", "free-stack"]

            for item in stream_and_collect(messages, models):
                if isinstance(item, tuple):
                    signal, payload = item
                    if signal == "__FULL__" and payload and not payload.startswith("[ERROR]"):
                        HybridCacheService.save(cache_key, food_name, "cooking", profile_hash, payload, None)
                    elif signal == "__ERROR__":
                        yield f"[ERROR]All models failed. {payload}[/ERROR]"
                else:
                    yield item

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


class CacheStatsView(BaseFitnessView):
    def get(self, request):
        return JsonResponse({"cache": HybridCacheService.get_stats()})

    def delete(self, request):
        food_name = request.query_params.get("food_name", "").strip()
        analysis_type = request.query_params.get("analysis_type", "").strip() or None
        if not food_name:
            return JsonResponse({"error": "food_name required"}, status=400)
        count = HybridCacheService.invalidate(food_name, analysis_type)
        return JsonResponse({"deleted": count, "food_name": food_name})


class ImageCorrectionView(BaseFitnessView):
    def post(self, request):
        image_file = request.FILES.get("image")
        correct_description = request.data.get("correct_description", "").strip()
        vector_id = request.data.get("vector_id", "").strip()
        temp_image_path = None

        if not correct_description:
            return JsonResponse({"error": "Missing correct_description"}, status=400)

        if vector_id and not image_file:
            try:
                unique_id = RAGService.update_image_analysis(
                    correct_description=correct_description,
                    type_name="Recipe",
                    vector_id=vector_id
                )
                return JsonResponse({
                    "message": "Information corrected using ID.",
                    "vector_id": unique_id,
                    "description": correct_description
                })
            except Exception as e:
                return JsonResponse({"error": f"ID update failed: {str(e)}"}, status=500)

        if not image_file:
            return JsonResponse({"error": "Missing image file and no vector_id provided"}, status=400)

        image_bytes = image_file.read()
        content_type = image_file.content_type
        
        temp_id = f"correction_{request.user.id}_{uuid.uuid4().hex[:8]}"
        temp_image_path = f"media/temp_{temp_id}.png"
        
        try:
            with open(temp_image_path, "wb") as f:
                f.write(image_bytes)
            
            unique_id = RAGService.update_image_analysis(
                temp_image_path, 
                correct_description, 
                type_name="Recipe", 
                content_type=content_type,
                vector_id=vector_id
            )
            
            return JsonResponse({
                "message": "Information corrected and saved to Vector DB.",
                "vector_id": unique_id,
                "description": correct_description
            })
            
        except Exception as e:
            print(f"[ImageCorrection] Error: {e}")
            return JsonResponse({"error": str(e)}, status=500)
        finally:
            if temp_image_path and os.path.exists(temp_image_path):
                os.remove(temp_image_path)
