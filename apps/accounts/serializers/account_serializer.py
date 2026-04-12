from rest_framework import serializers
from apps.accounts.models import Account, ConsumerProfile


class ConsumerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsumerProfile
        fields = ['weight', 'height', 'age', 'gender', 'activity_level', 'body_type', 'health_condition']


class UserProfileSerializer(serializers.ModelSerializer):
    profile = ConsumerProfileSerializer()

    class Meta:
        model = Account
        fields = ['id', 'username', 'email', 'role', 'profile']


class AccountSerializer(serializers.ModelSerializer):
    profile = ConsumerProfileSerializer(required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Account
        fields = ['id', 'username', 'email', 'role', 'password', 'profile']
