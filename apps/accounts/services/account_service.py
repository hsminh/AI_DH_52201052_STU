from django.db import transaction
from core.services.base_service import BaseService
from apps.accounts.repositories import AccountRepository, ConsumerProfileRepository


class AccountService(BaseService):
    def __init__(self):
        self.repository = AccountRepository()
        self.profile_repository = ConsumerProfileRepository()

    def register(self, username, password, email, role='CONSUMER', profile_data=None):
        """
        Register a new account. Creates profile automatically for CONSUMER role.
        @param username: Unique username
        @param password: Plain text password (hashed internally)
        @param email: User email address
        @param role: Account role — 'CONSUMER' or 'USER', default 'CONSUMER'
        @param profile_data: Optional dict with weight, height, age, gender, etc.
        @return: Newly created Account instance
        """
        with transaction.atomic():
            user = self.repository.create_account(username, password, email, role=role)
            if role == 'CONSUMER' and profile_data:
                self.repository.create_profile(user, **profile_data)
            return user

    def get_user_profile_data(self, user):
        profile = self.repository.get_profile(user)
        if profile:
            return {
                'weight': profile.weight,
                'height': profile.height,
                'age': profile.age,
                'gender': profile.gender,
                'activity_level': profile.activity_level,
                'body_type': profile.body_type,
                'health_condition': profile.health_condition,
            }
        return None
