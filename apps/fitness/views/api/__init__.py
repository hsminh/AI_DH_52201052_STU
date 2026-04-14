from .fitness_view import (
    TextAnalysisView, ImageAnalysisView, ImageCorrectionView, 
    CookingAssistantView, CacheStatsView
)
from .user_goal_view import UserGoalListCreateView, UserGoalDetailView

__all__ = [
    'TextAnalysisView', 'ImageAnalysisView', 'ImageCorrectionView', 
    'CookingAssistantView', 'CacheStatsView',
    'UserGoalListCreateView', 'UserGoalDetailView',
]
