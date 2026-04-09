import json
import os
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from PIL import Image
import google.genai as genai
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

        try:
            profile = request.user.profile
        except AttributeError:
            # Fallback for USER role without profile
            profile = type('obj', (object,), {
                'weight': 70, 'height': 170, 'age': 25, 'gender': 'male', 
                'activity_level': 1.2, 'body_type': 'Normal', 'health_condition': 'None'
            })

        body_metrics = FitnessService.calculate_metrics(
            profile.weight, profile.height, profile.age, profile.gender, 
            profile.activity_level, body_type=profile.body_type, 
            health_condition=profile.health_condition
        )

        context_query = user_input if user_input else "calories and nutrition facts"
        context = RAGService.get_relevant_context(context_query)
        prompt = get_fitness_analyst_prompt(user_input, context=context, body_metrics=body_metrics)

        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            MODEL = "gemini-3-flash-preview"
            
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

                response = client.models.generate_content_stream(
                    model=MODEL,
                    contents=contents,
                )
                
                for chunk in response:
                    if chunk.text:
                        yield chunk.text

            return StreamingHttpResponse(stream_generator(), content_type='text/plain')

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
