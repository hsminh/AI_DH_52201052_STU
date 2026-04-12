from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from apps.accounts.views.api import RegisterView, ProfileView, UserLoginView, ConsumerLoginView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register_api'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='user_profile'),
    path('user/login/', UserLoginView.as_view(), name='user_login_api'),
    path('consumer/login/', ConsumerLoginView.as_view(), name='consumer_login_api'),
]
