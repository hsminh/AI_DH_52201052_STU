from django.shortcuts import render, redirect

def login_page(request):
    return render(request, "account/login.html")

def register_page(request):
    return render(request, "account/register.html")

def fitness_analyst_page(request):
    return render(request, "chatbot/fitness_analyst.html")

def chat_page(request):
    return render(request, "chatbot/chat.html")

def manage_training_page(request):
    return render(request, "chatbot/manage_training.html")

def logout_page(request):
    return render(request, "account/logout.html")
