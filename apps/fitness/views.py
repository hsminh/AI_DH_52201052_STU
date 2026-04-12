import base64
import json
from datetime import datetime, timedelta

from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.chatbot_core.prompts import get_cooking_assistant_prompt, get_meal_tracking_prompt
from apps.chatbot_core.services import RAGService
from .cache_service import HybridCacheService
from .pipeline import (
    identify_food_from_image,
    identify_food_from_text,
    make_cache_key,
    make_profile_hash,
    stream_and_collect,
)
from .services import FitnessService


class BaseFitnessView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    # ──────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────

    def get_current_time_info(self):
        vn_time = datetime.utcnow() + timedelta(hours=7)
        hour = vn_time.hour
        if 5 <= hour < 11:
            session = "Sáng"
        elif 11 <= hour < 14:
            session = "Trưa"
        elif 14 <= hour < 18:
            session = "Chiều/Phụ"
        elif 18 <= hour < 22:
            session = "Tối"
        else:
            session = "Khuya"
        return f"{vn_time.strftime('%H:%M:%S')} (Buổi {session})"

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
                    "Dưới đây là tài liệu tham khảo từ cơ sở tri thức. "
                    "Hãy ưu tiên sử dụng thông tin này khi phân tích và trả lời:\n\n"
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


# ──────────────────────────────────────────────────────────────
# TextAnalysisView
# ──────────────────────────────────────────────────────────────

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
            # ── Yield profile metadata ──────────────────────────
            yield f"[PROFILE_DATA]{json.dumps({'weight': profile.weight, 'height': profile.height, 'age': profile.age, 'bmi': body_metrics['bmi'], 'status': body_metrics['status']})}[/PROFILE_DATA]"

            # ── Bước 1: Xác định tên món ──────────────────────
            food_name = identify_food_from_text(user_input)
            print(f"[TextAnalysis] Identified food: '{food_name}'")

            # ── Bước 2a: Cache exact lookup ─────────────────────
            cache_key = make_cache_key(food_name, "text", profile_hash)
            cached = HybridCacheService.get_exact(cache_key)

            # ── Bước 2b: Cache semantic lookup ──────────────────
            if cached is None:
                cached = HybridCacheService.get_semantic(food_name, "text", profile_hash)

            if cached is not None:
                yield "[CACHE_HIT]"
                yield cached
                return

            # ── Bước 3: RAG + LLM ───────────────────────────────
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
                        HybridCacheService.save(
                            cache_key, food_name, "text",
                            profile_hash, payload, request.user,
                        )
                    elif signal == "__ERROR__":
                        yield f"[ERROR]Tất cả model thất bại. {payload}[/ERROR]"
                else:
                    yield item

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


# ──────────────────────────────────────────────────────────────
# ImageAnalysisView
# ──────────────────────────────────────────────────────────────

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
            # ── Yield profile metadata ──────────────────────────
            yield f"[PROFILE_DATA]{json.dumps({'weight': profile.weight, 'height': profile.height, 'age': profile.age, 'bmi': body_metrics['bmi'], 'status': body_metrics['status']})}[/PROFILE_DATA]"

            # ── Bước 1: Xác định tên món từ ảnh ─────────────────
            food_name = identify_food_from_image(image_base64, content_type)
            print(f"[ImageAnalysis] Identified food: '{food_name}'")
            yield f"[FOOD_IDENTIFIED]{food_name}[/FOOD_IDENTIFIED]"

            # ── Bước 2a: Cache exact lookup ─────────────────────
            cache_key = make_cache_key(food_name, "image", profile_hash)
            cached = HybridCacheService.get_exact(cache_key)

            # ── Bước 2b: Cache semantic lookup ──────────────────
            if cached is None:
                cached = HybridCacheService.get_semantic(food_name, "image", profile_hash)

            if cached is not None:
                yield "[CACHE_HIT]"
                yield cached
                return

            # ── Bước 3: RAG + LLM ───────────────────────────────
            prompt = get_meal_tracking_prompt(
                user_input or food_name, body_metrics,
                current_time=current_time_info,
                workout_data=None,
            )
            image_content = [{"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{image_base64}"}}]
            messages = self.build_messages_with_rag(food_name, prompt, extra_content=image_content)
            models = ["fast-vision-combo", "vision-ultra-combo", "free-stack"]

            for item in stream_and_collect(messages, models):
                if isinstance(item, tuple):
                    signal, payload = item
                    if signal == "__FULL__" and payload and not payload.startswith("[ERROR]"):
                        HybridCacheService.save(
                            cache_key, food_name, "image",
                            profile_hash, payload, request.user,
                        )
                    elif signal == "__ERROR__":
                        yield f"[ERROR]Tất cả model thất bại. {payload}[/ERROR]"
                else:
                    yield item

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


# ──────────────────────────────────────────────────────────────
# CookingAssistantView
# ──────────────────────────────────────────────────────────────

class CookingAssistantView(BaseFitnessView):
    def post(self, request):
        food_name = request.data.get("food_name", "").strip()
        if not food_name:
            return JsonResponse({"error": "No food name provided"}, status=400)

        current_time_info = self.get_current_time_info()

        def stream_generator():
            # Cooking không phụ thuộc profile — dùng profile_hash rỗng
            profile_hash = ""
            cache_key = make_cache_key(food_name, "cooking", profile_hash)

            # ── Cache exact lookup ──────────────────────────────
            cached = HybridCacheService.get_exact(cache_key)

            # ── Cache semantic lookup ───────────────────────────
            if cached is None:
                cached = HybridCacheService.get_semantic(food_name, "cooking", profile_hash)

            if cached is not None:
                yield "[CACHE_HIT]"
                yield cached
                return

            # ── RAG + LLM ───────────────────────────────────────
            prompt = get_cooking_assistant_prompt(food_name, current_time=current_time_info)
            messages = self.build_messages_with_rag(food_name, prompt)
            models = ["fast-text-combo", "text-smart-combo", "free-stack"]

            for item in stream_and_collect(messages, models):
                if isinstance(item, tuple):
                    signal, payload = item
                    if signal == "__FULL__" and payload and not payload.startswith("[ERROR]"):
                        HybridCacheService.save(
                            cache_key, food_name, "cooking",
                            profile_hash, payload, None,
                        )
                    elif signal == "__ERROR__":
                        yield f"[ERROR]Tất cả model thất bại. {payload}[/ERROR]"
                else:
                    yield item

        return StreamingHttpResponse(stream_generator(), content_type="text/plain")


# ──────────────────────────────────────────────────────────────
# CacheStatsView  (admin / debug)
# ──────────────────────────────────────────────────────────────

class CacheStatsView(BaseFitnessView):
    """GET  → thống kê cache
    DELETE → xoá cache theo food_name (query param) và tuỳ chọn analysis_type"""

    def get(self, request):
        return JsonResponse({"cache": HybridCacheService.get_stats()})

    def delete(self, request):
        food_name = request.query_params.get("food_name", "").strip()
        analysis_type = request.query_params.get("analysis_type", "").strip() or None
        if not food_name:
            return JsonResponse({"error": "food_name required"}, status=400)
        count = HybridCacheService.invalidate(food_name, analysis_type)
        return JsonResponse({"deleted": count, "food_name": food_name})
