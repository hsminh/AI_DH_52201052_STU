from .repositories import AccountRepository
from django.db import transaction

class AccountService:
    @staticmethod
    def register_consumer(username, password, email, profile_data):
        with transaction.atomic():
            user = AccountRepository.create_account(username, password, email, role='CONSUMER')
            AccountRepository.create_profile(user, **profile_data)
            return user

    @staticmethod
    def register_admin(username, password, email):
        return AccountRepository.create_account(username, password, email, role='USER')

    @staticmethod
    def get_user_profile_data(user):
        profile = AccountRepository.get_profile(user)
        if profile:
            return {
                'weight': profile.weight,
                'height': profile.height,
                'age': profile.age,
                'gender': profile.gender,
                'activity_level': profile.activity_level,
                'body_type': profile.body_type,
                'health_condition': profile.health_condition
            }
        return None
