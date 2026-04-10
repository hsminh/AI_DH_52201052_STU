from django.urls import path
from .views import TextAnalysisView, ImageAnalysisView

urlpatterns = [
    path('analyze-text/', TextAnalysisView.as_view(), name='fitness_analyze_text'),
    path('analyze-image/', ImageAnalysisView.as_view(), name='fitness_analyze_image'),
]
