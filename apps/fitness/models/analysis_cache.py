from django.db import models
from django.conf import settings


class AnalysisCache(models.Model):
    ANALYSIS_TYPES = [
        ('text',    'Text Analysis'),
        ('image',   'Image Analysis'),
        ('cooking', 'Cooking Recipe'),
    ]

    cache_key     = models.CharField(max_length=64, unique=True, db_index=True)
    food_name     = models.CharField(max_length=255, db_index=True)
    analysis_type = models.CharField(max_length=20, choices=ANALYSIS_TYPES)
    profile_hash  = models.CharField(max_length=16, default='')
    response_json = models.TextField()
    hit_count     = models.IntegerField(default=0)
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='analysis_cache',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['food_name', 'analysis_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.analysis_type}] {self.food_name} (hits={self.hit_count})"
