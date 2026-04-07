from django.urls import path
from . import views

urlpatterns = [
    path("", views.chatbot_page, name="chatbot"),
    path("send/", views.send_message, name="send_message"),
    path("clear/", views.clear_chat, name="clear_chat"),
    path("upload/", views.upload_document, name="upload_document"),
    path("manage-training/", views.manage_training, name="manage_training"),
    path("create-type/", views.create_document_type, name="create_document_type"),
    path("delete-doc/<int:doc_id>/", views.delete_document, name="delete_document"),
    path("fitness-analyst/", views.fitness_analyst, name="fitness_analyst"),
]
