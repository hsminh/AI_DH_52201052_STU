from django.urls import path
from apps.fitness.views.api import (
    TextAnalysisView, ImageAnalysisView, ImageCorrectionView, 
    CookingAssistantView, CacheStatsView,
    UserGoalListCreateView, UserGoalDetailView,
)

urlpatterns = [
    path('analyze-text/',   TextAnalysisView.as_view(),     name='fitness_analyze_text'),
    path('analyze-image/',  ImageAnalysisView.as_view(),    name='fitness_analyze_image'),
    path('correct-image/',  ImageCorrectionView.as_view(),  name='fitness_correct_image'),
    path('cooking-recipe/', CookingAssistantView.as_view(), name='cooking_recipe'),
    path('cache/stats/',    CacheStatsView.as_view(),       name='cache_stats'),
    # UserGoal CRUD
    path('goals/',          UserGoalListCreateView.as_view(), name='user_goal_list_create'),
    path('goals/<int:pk>/', UserGoalDetailView.as_view(),     name='user_goal_detail'),
]
