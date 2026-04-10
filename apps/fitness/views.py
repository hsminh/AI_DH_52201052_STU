import json
import os
import requests
import base64
from datetime import datetime, timedelta
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .services import FitnessService
from apps.chatbot_core.prompts import get_meal_tracking_prompt

class BaseFitnessView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_current_time_info(self):
        # Lấy giờ Việt Nam (GMT+7)
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

    def get_profile_and_metrics(self, request):
        try:
            profile = request.user.profile
        except AttributeError:
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
            return profile, body_metrics
        except ValueError as e:
            raise e

    def stream_response(self, profile, body_metrics, models, messages):
        def stream_generator():
            profile_payload = json.dumps({
                "weight": profile.weight,
                "height": profile.height,
                "age": profile.age,
                "bmi": body_metrics['bmi'],
                "status": body_metrics['status']
            })
            yield f"[PROFILE_DATA]{profile_payload}[/PROFILE_DATA]"

            LOCAL_ENDPOINT = "http://localhost:20128/v1/chat/completions"
            api_key = os.environ.get("OMINIROUTE_API_KEY", "")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }

            success = False
            last_error = ""

            for model in models:
                try:
                    print(f"--- Attempting Analysis with Model: {model} ---")
                    payload = {
                        "model": model,
                        "messages": messages,
                        "stream": True
                    }
                    
                    response = requests.post(
                        LOCAL_ENDPOINT,
                        json=payload,
                        headers=headers,
                        stream=True,
                        timeout=120
                    )

                    if response.status_code == 200:
                        print(f"SUCCESS: Model {model} is responding.")
                        success = True
                        for line in response.iter_lines():
                            if line:
                                line = line.decode('utf-8')
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str.strip() == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_str)
                                        delta_content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if delta_content:
                                            yield delta_content
                                    except:
                                        pass
                        print(f"--- Analysis Completed with Model: {model} ---")
                        break
                    else:
                        print(f"FAILED: Model {model} returned status {response.status_code}")
                        last_error = f"Model {model} failed ({response.status_code}): {response.text}"
                        continue # Thử model tiếp theo
                except Exception as e:
                    print(f"ERROR: Exception while calling {model}: {str(e)}")
                    last_error = f"Request to {model} failed: {str(e)}"
                    continue

            if not success:
                yield f"[ERROR]Tất cả các model đều thất bại. Lỗi cuối cùng: {last_error}[/ERROR]"

        return StreamingHttpResponse(stream_generator(), content_type='text/plain')

class TextAnalysisView(BaseFitnessView):
    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        
        try:
            profile, body_metrics = self.get_profile_and_metrics(request)
        except ValueError as e:
            return JsonResponse({"error": "Invalid profile data", "message": str(e)}, status=400)

        current_time_info = self.get_current_time_info()
        prompt = get_meal_tracking_prompt(user_input, body_metrics, current_time=current_time_info, workout_data=None)
        
        models = ["text-smart-combo", "free-stack"]
        messages = [{"role": "user", "content": prompt}]

        return self.stream_response(profile, body_metrics, models, messages)

class ImageAnalysisView(BaseFitnessView):
    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        image_file = request.FILES.get("image")

        if not image_file:
            return JsonResponse({"error": "No image provided"}, status=400)

        try:
            profile, body_metrics = self.get_profile_and_metrics(request)
        except ValueError as e:
            return JsonResponse({"error": "Invalid profile data", "message": str(e)}, status=400)

        current_time_info = self.get_current_time_info()
        prompt = get_meal_tracking_prompt(user_input, body_metrics, current_time=current_time_info, workout_data=None)
        
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
        image_url = f"data:{image_file.content_type};base64,{image_data}"

        models = ["vision-ultra-combo", "free-stack"]
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }
        ]

        return self.stream_response(profile, body_metrics, models, messages)
