from django.urls import path
from .views import login_page, register_page, fitness_analyst_page, chat_page, manage_training_page, logout_page

urlpatterns = [
    path('login/', login_page, name='login_page'),
    path('register/', register_page, name='register_page'),
    path('logout/', logout_page, name='logout'),
    path('fitness/analyst/', fitness_analyst_page, name='fitness_page'),
    path('chat/', chat_page, name='chat_page'),
    path('documents/manage/', manage_training_page, name='manage_training_page'),
]
