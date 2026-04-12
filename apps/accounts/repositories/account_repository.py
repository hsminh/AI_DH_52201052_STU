from core.repositories.base_repository import BaseRepository
from apps.accounts.models import Account, ConsumerProfile


class AccountRepository(BaseRepository):
    model = Account

    def get_by_username(self, username):
        return self.get(username=username)

    def get_profile(self, user):
        try:
            return user.profile
        except ConsumerProfile.DoesNotExist:
            return None

    def create_account(self, username, password, email, role='CONSUMER'):
        return Account.objects.create_user(username=username, password=password, email=email, role=role)

    def create_profile(self, user, **profile_data):
        return ConsumerProfile.objects.create(user=user, **profile_data)


class ConsumerProfileRepository(BaseRepository):
    model = ConsumerProfile
