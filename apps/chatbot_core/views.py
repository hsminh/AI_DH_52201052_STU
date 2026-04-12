import json
import os
import requests
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from .services import RAGService
from apps.documents.models import DocumentType

from .prompts import COOKING_ASSISTANT_SYSTEM_PROMPT

class ChatView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        if not user_input:
            return JsonResponse({"error": "No input provided"}, status=400)

        context = RAGService.get_relevant_context(user_input)
        if context.strip():
            prompt = f"Ngữ cảnh từ tài liệu huấn luyện:\n{context}\n\nNgười dùng hỏi: {user_input}\n\nHãy trả lời dựa trên ngữ cảnh trên."
        else:
            prompt = f"Người dùng hỏi: {user_input}\n\nHãy trả lời câu hỏi này một cách chung chung, vì chưa có tài liệu nào được tải lên."

        def stream_generator():
            LOCAL_ENDPOINT = "http://localhost:20128/v1/chat/completions"
            api_key = os.environ.get("OMINIROUTE_API_KEY", "")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            # fast-text-combo → text-smart-combo → free-stack (3 lớp fallback)
            models = ["fast-text-combo", "text-smart-combo", "free-stack"]
            last_error = ""
            for model in models:
                try:
                    payload = {
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": True
                    }
                    response = requests.post(LOCAL_ENDPOINT, json=payload, headers=headers, stream=True, timeout=60)
                    if response.status_code == 200:
                        for line in response.iter_lines():
                            if line:
                                line = line.decode('utf-8')
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str.strip() == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_str)
                                        content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if content:
                                            yield content
                                    except:
                                        pass
                        return
                    else:
                        last_error = f"Model {model} lỗi ({response.status_code})"
                        continue
                except Exception as e:
                    last_error = f"Model {model} timeout: {str(e)}"
                    continue
            yield f"Tất cả model đều thất bại. Lỗi: {last_error}"

        return StreamingHttpResponse(stream_generator(), content_type='text/plain')

class ClearChatView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return JsonResponse({"status": "success", "message": "Chat history cleared"})


class CookingAssistantView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        if not user_input:
            return JsonResponse({"error": "No input provided"}, status=400)

        # Lấy ngữ cảnh RAG cho trợ lý nấu ăn
        recipe_type = DocumentType.objects.filter(name="Công thức nấu ăn").first()
        context = RAGService.get_relevant_context(user_input, type_id=recipe_type.id if recipe_type else None)
        
        system_prompt = COOKING_ASSISTANT_SYSTEM_PROMPT
        if context.strip():
            system_prompt += f"\n\nNgữ cảnh từ tài liệu huấn luyện (Công thức):\n{context}"

        def stream_generator():
            LOCAL_ENDPOINT = "http://localhost:20128/v1/chat/completions"
            api_key = os.environ.get("OMINIROUTE_API_KEY", "")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            # Sử dụng model fallback tương tự ChatView
            models = ["fast-text-combo", "text-smart-combo", "free-stack"]
            last_error = ""

            for model in models:
                try:
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_input}
                        ],
                        "stream": True
                    }
                    response = requests.post(LOCAL_ENDPOINT, json=payload, headers=headers, stream=True, timeout=60)
                    
                    if response.status_code == 200:
                        for line in response.iter_lines():
                            if line:
                                line = line.decode('utf-8')
                                if line.startswith("data: "):
                                    data_str = line[6:]
                                    if data_str.strip() == "[DONE]":
                                        break
                                    try:
                                        data = json.loads(data_str)
                                        content = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                                        if content:
                                            yield content
                                    except:
                                        pass
                        return # Thành công thì thoát
                    else:
                        last_error = f"Model {model} lỗi ({response.status_code})"
                        continue
                except Exception as e:
                    last_error = f"Model {model} timeout: {str(e)}"
                    continue
            
            yield f"Tất cả model trợ lý nấu ăn đều thất bại. Lỗi: {last_error}"

        return StreamingHttpResponse(stream_generator(), content_type='text/plain')
