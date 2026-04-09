from .models import Account, ConsumerProfile

class AccountRepository:
    @staticmethod
    def get_by_username(username):
        try:
            return Account.objects.get(username=username)
        except Account.DoesNotExist:
            return None

    @staticmethod
    def get_profile(user):
        try:
            return user.profile
        except ConsumerProfile.DoesNotExist:
            return None

    @staticmethod
    def create_account(username, password, email, role='CONSUMER'):
        user = Account.objects.create_user(username=username, password=password, email=email, role=role)
        return user

    @staticmethod
    def create_profile(user, **profile_data):
        return ConsumerProfile.objects.create(user=user, **profile_data)
