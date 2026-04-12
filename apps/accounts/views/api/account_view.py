from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.accounts.serializers import AccountSerializer, UserProfileSerializer
from apps.accounts.services import AccountService
from apps.accounts.models import ConsumerProfile


class RegisterView(generics.CreateAPIView):
    serializer_class = AccountSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        """
        Register a new account. Validates input via serializer,
        then delegates creation logic to AccountService.
        @param request: HTTP request with username, password, email, role, profile
        @return: Serialized account data with 201 status
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        user = AccountService().register(
            username=data['username'],
            password=data['password'],
            email=data.get('email', ''),
            role=data.get('role', 'CONSUMER'),
            profile_data=data.get('profile'),
        )
        return Response(AccountSerializer(user).data, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        ConsumerProfile.objects.get_or_create(user=self.request.user)
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class UserLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.role != 'USER':
            raise serializers.ValidationError("This login is for admin users only.")
        return data


class ConsumerLoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        if self.user.role != 'CONSUMER':
            raise serializers.ValidationError("This login is for consumers only.")
        return data


class UserLoginView(TokenObtainPairView):
    serializer_class = UserLoginSerializer


class ConsumerLoginView(TokenObtainPairView):
    serializer_class = ConsumerLoginSerializer
