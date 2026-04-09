from django.db import models
from django.contrib.auth.models import AbstractUser

class Account(AbstractUser):
    ROLE_CHOICES = (
        ('USER', 'User (Admin/Training)'),
        ('CONSUMER', 'Consumer (Normal User)'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='CONSUMER')

    def is_user_admin(self):
        return self.role == 'USER' or self.is_staff

    def is_consumer(self):
        return self.role == 'CONSUMER'

class ConsumerProfile(models.Model):
    user = models.OneToOneField(Account, on_delete=models.CASCADE, related_name='profile')
    weight = models.FloatField(default=70.0)  # Default 70kg
    height = models.FloatField(default=170.0)  # Default 170cm
    age = models.IntegerField(default=25)  # Default 25 years
    gender = models.CharField(max_length=10, default='male')
    activity_level = models.FloatField(default=1.2)
    body_type = models.CharField(max_length=100, blank=True)
    health_condition = models.TextField(blank=True)

    def __str__(self):
        return f"Profile of {self.user.username}"
