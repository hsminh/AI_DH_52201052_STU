from django.urls import path
from .views import FitnessAnalysisView

urlpatterns = [
    path('analyze/', FitnessAnalysisView.as_view(), name='fitness_analyze'),
]
