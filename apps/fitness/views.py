import json
import os
import time
import random
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from PIL import Image
import google.genai as genai
from google.genai.errors import ServerError, APIError
from apps.accounts.models import ConsumerProfile
from .services import FitnessService
# Assuming we move prompts and RAG logic to a shared core or chatbot module
# For now, I'll import from the original location or move them
from apps.chatbot_core.prompts import get_fitness_analyst_prompt
from apps.chatbot_core.services import RAGService

class FitnessAnalysisView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        image_file = request.FILES.get("image")
        
        print(f"Backend - User input: '{user_input}'")
        print(f"Backend - Image file: {image_file}")
        if image_file:
            print(f"Backend - Image name: {image_file.name}")
            print(f"Backend - Image size: {image_file.size}")
            print(f"Backend - Image type: {image_file.content_type}")
        print(f"Backend - Request data keys: {list(request.data.keys())}")
        print(f"Backend - Request FILES keys: {list(request.FILES.keys())}")

        try:
            profile = request.user.profile
            print(f"Backend - User profile data: weight={profile.weight}, height={profile.height}, age={profile.age}, gender={profile.gender}")
        except AttributeError:
            # Fallback for USER role without profile
            profile = type('obj', (object,), {
                'weight': 70, 'height': 170, 'age': 25, 'gender': 'male', 
                'activity_level': 1.2, 'body_type': 'Normal', 'health_condition': 'None'
            })

        try:
            body_metrics = FitnessService.calculate_metrics(
                profile.weight, profile.height, profile.age, profile.gender, 
                profile.activity_level, body_type=profile.body_type, 
                health_condition=profile.health_condition
            )
        except ValueError as e:
            return JsonResponse({
                "error": "Invalid profile data", 
                "message": str(e),
                "details": "Please update your profile with valid height, weight, and age information."
            }, status=400)

        context_query = user_input if user_input else "calories and nutrition facts"
        context = RAGService.get_relevant_context(context_query)
        prompt = get_fitness_analyst_prompt(user_input, context=context, body_metrics=body_metrics)

        def generate_response_with_retry(client, model, contents, max_retries=3):
            """Generate response with exponential backoff retry logic"""
            for attempt in range(max_retries):
                try:
                    return client.models.generate_content_stream(
                        model=model,
                        contents=contents,
                    )
                except (ServerError, APIError) as e:
                    if attempt == max_retries - 1:
                        raise e
                    
                    # Exponential backoff with jitter
                    base_delay = 2 ** attempt
                    jitter = random.uniform(0, 1)
                    delay = base_delay + jitter
                    
                    print(f"API Error (attempt {attempt + 1}/{max_retries}): {e}")
                    print(f"Retrying in {delay:.2f} seconds...")
                    
                    time.sleep(delay)
                except Exception as e:
                    # For non-API errors, don't retry
                    raise e

        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            
            # Model list with fallbacks
            MODELS = [
                "gemini-3-flash-preview",  # Primary model
                # "gemini-3.1-pro-preview",        # Fallback 1
                # "gemini-1.5-pro",          # Fallback 2
            ]
            
            contents = [prompt]
            if image_file:
                img = Image.open(image_file)
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                contents.append(img)

            def stream_generator():
                profile_payload = json.dumps({
                    "weight": profile.weight,
                    "height": profile.height,
                    "age": profile.age,
                    "bmi": body_metrics['bmi'],
                    "status": body_metrics['status']
                })
                yield f"[PROFILE_DATA]{profile_payload}[/PROFILE_DATA]"

                # Try each model until one works
                for i, model in enumerate(MODELS):
                    try:
                        print(f"Trying model: {model}")
                        response = generate_response_with_retry(client, model, contents)
                        
                        for chunk in response:
                            if chunk.text:
                                yield chunk.text
                        break  # Success, exit model loop
                        
                    except (ServerError, APIError) as e:
                        print(f"Model {model} failed: {e}")
                        if i == len(MODELS) - 1:  # Last model failed
                            error_msg = "All AI models are currently unavailable due to high demand. Please try again in a few minutes."
                            yield f"[ERROR]{error_msg}[/ERROR]"
                        else:
                            print(f"Trying next model...")
                            continue
                    except Exception as e:
                        print(f"Unexpected error with model {model}: {e}")
                        if i == len(MODELS) - 1:  # Last model failed
                            error_msg = f"AI service error: {str(e)}. Please try again."
                            yield f"[ERROR]{error_msg}[/ERROR]"
                        else:
                            continue

            return StreamingHttpResponse(stream_generator(), content_type='text/plain')

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
