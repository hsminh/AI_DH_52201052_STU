from django.urls import path
from apps.chatbot_core.views.api import ChatView, ClearChatView, CookingAssistantView

urlpatterns = [
    path('chat/', ChatView.as_view(), name='chatbot_chat'),
    path('clear/', ClearChatView.as_view(), name='clear_chat'),
    path('cooking/', CookingAssistantView.as_view(), name='cooking_assistant'),
]
