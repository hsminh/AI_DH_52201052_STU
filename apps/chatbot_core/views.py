import json
import os
from django.http import StreamingHttpResponse, JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
import google.genai as genai
from .services import RAGService

class ChatView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_input = request.data.get("user_input", "").strip()
        if not user_input:
            return JsonResponse({"error": "No input provided"}, status=400)

        context = RAGService.get_relevant_context(user_input)
        prompt = f"Ngữ cảnh từ tài liệu huấn luyện:\n{context}\n\nNgười dùng hỏi: {user_input}\n\nHãy trả lời dựa trên ngữ cảnh trên."

        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
            MODEL = "gemini-3-flash-preview"

            def stream_generator():
                response = client.models.generate_content_stream(
                    model=MODEL,
                    contents=[prompt],
                )
                for chunk in response:
                    if chunk.text:
                        yield chunk.text

            return StreamingHttpResponse(stream_generator(), content_type='text/plain')

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

class ClearChatView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Vì hệ thống hiện tại chưa lưu history vào DB (chỉ stream), 
        # API này tạm thời trả về success để UI xóa nội dung ở client.
        return JsonResponse({"status": "success", "message": "Chat history cleared"})
