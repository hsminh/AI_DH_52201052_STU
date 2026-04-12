from django.db import models
from django.conf import settings


class UserGoal(models.Model):
    GOAL_TYPE_CHOICES = [
        ('WEIGHT_LOSS',  'Giảm cân'),
        ('WEIGHT_GAIN',  'Tăng cân'),
        ('MUSCLE_GAIN',  'Tăng cơ'),
        ('MAINTAIN',     'Duy trì cân nặng'),
        ('CUSTOM',       'Tùy chỉnh'),
    ]

    user            = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='goals',
    )
    goal_type       = models.CharField(max_length=20, choices=GOAL_TYPE_CHOICES)
    target_calories = models.IntegerField(null=True, blank=True)
    target_protein  = models.FloatField(null=True, blank=True, help_text='grams per day')
    target_carbs    = models.FloatField(null=True, blank=True, help_text='grams per day')
    target_fat      = models.FloatField(null=True, blank=True, help_text='grams per day')
    description     = models.TextField(blank=True)
    is_active       = models.BooleanField(default=True)
    start_date      = models.DateField()
    end_date        = models.DateField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"[{self.goal_type}] {self.user.username} — active={self.is_active}"
