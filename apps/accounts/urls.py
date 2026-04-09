from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import RegisterView, ProfileView, UserLoginView, ConsumerLoginView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register_api'),
    path('login/', TokenObtainPairView.as_view(), name='login_api'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='user_profile'),
    path('user/login/', UserLoginView.as_view(), name='user_login_api'),
    path('consumer/login/', ConsumerLoginView.as_view(), name='consumer_login_api'),
]
