from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .serializers import AccountSerializer, ConsumerProfileSerializer, UserProfileSerializer
from .models import Account, ConsumerProfile

class RegisterView(generics.CreateAPIView):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.AllowAny]

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, created = ConsumerProfile.objects.get_or_create(user=self.request.user)
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        print(f"DEBUG: Serialized data: {serializer.data}")
        return Response(serializer.data)

class UserLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.role != 'USER':
            raise serializers.ValidationError("This login is for admin users only.")
        return data

class ConsumerLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.role != 'CONSUMER':
            raise serializers.ValidationError("This login is for consumers only.")
        return data

class UserLoginView(TokenObtainPairView):
    serializer_class = UserLoginSerializer

class ConsumerLoginView(TokenObtainPairView):
    serializer_class = ConsumerLoginSerializer
