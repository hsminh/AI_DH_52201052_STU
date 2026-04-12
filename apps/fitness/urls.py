from django.urls import path
from .views import CacheStatsView, CookingAssistantView, ImageAnalysisView, TextAnalysisView

urlpatterns = [
    path('analyze-text/',   TextAnalysisView.as_view(),   name='fitness_analyze_text'),
    path('analyze-image/',  ImageAnalysisView.as_view(),  name='fitness_analyze_image'),
    path('cooking-recipe/', CookingAssistantView.as_view(), name='cooking_recipe'),
    path('cache/stats/',    CacheStatsView.as_view(),     name='cache_stats'),
]
