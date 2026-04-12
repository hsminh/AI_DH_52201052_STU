from core.repositories.base_repository import BaseRepository
from apps.fitness.models import UserGoal


class UserGoalRepository(BaseRepository):
    model = UserGoal

    def get_by_user(self, user):
        """
        Return all goals belonging to a user, newest first.
        @param user: Account instance
        @return: QuerySet of UserGoal
        """
        return self.filter(user=user)

    def get_active_by_user(self, user):
        """
        Return all active goals for a user.
        @param user: Account instance
        @return: QuerySet of UserGoal where is_active=True
        """
        return self.filter(user=user, is_active=True)

    def deactivate_all_for_user(self, user):
        """
        Set is_active=False on every goal that belongs to this user.
        Used before activating a new goal so only one is active at a time.
        @param user: Account instance
        @return: Number of rows updated
        """
        return self.model.objects.filter(user=user, is_active=True).update(is_active=False)
