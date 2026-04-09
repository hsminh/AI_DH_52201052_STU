from django.urls import path
from .views import ChatView, ClearChatView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chatbot_chat'),
    path('clear/', ClearChatView.as_view(), name='clear_chat'),
]
