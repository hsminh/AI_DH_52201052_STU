from rest_framework import serializers
from .models import Account, ConsumerProfile

class ConsumerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsumerProfile
        fields = ['weight', 'height', 'age', 'gender', 'activity_level', 'body_type', 'health_condition']

class AccountSerializer(serializers.ModelSerializer):
    profile = ConsumerProfileSerializer(required=False)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = Account
        fields = ['id', 'username', 'email', 'role', 'password', 'profile']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password')
        role = validated_data.get('role', 'CONSUMER')
        
        user = Account.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()

        if role == 'CONSUMER' and profile_data:
            ConsumerProfile.objects.create(user=user, **profile_data)
        return user
