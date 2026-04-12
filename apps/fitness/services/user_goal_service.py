from django.db import transaction
from core.services.base_service import BaseService
from apps.fitness.repositories import UserGoalRepository


class UserGoalService(BaseService):
    def __init__(self):
        self.repository = UserGoalRepository()

    def get_goals_for_user(self, user):
        """
        Return all goals for a user.
        @param user: Account instance
        @return: QuerySet of UserGoal
        """
        return self.repository.get_by_user(user)

    def get_active_goals(self, user):
        """
        Return only active goals for a user.
        @param user: Account instance
        @return: QuerySet of UserGoal where is_active=True
        """
        return self.repository.get_active_by_user(user)

    def create_goal(self, user, goal_type, start_date, **kwargs):
        """
        Create a new goal. If is_active=True (default), deactivate all previous
        active goals for this user first to keep only one active at a time.
        @param user: Account instance
        @param goal_type: One of WEIGHT_LOSS, WEIGHT_GAIN, MUSCLE_GAIN, MAINTAIN, CUSTOM
        @param start_date: date object — when the goal begins
        @param kwargs: Optional fields: target_calories, target_protein, target_carbs,
                       target_fat, description, is_active, end_date
        @return: Newly created UserGoal instance
        """
        is_active = kwargs.pop('is_active', True)
        with transaction.atomic():
            if is_active:
                self.repository.deactivate_all_for_user(user)
            return self.repository.create(
                user=user,
                goal_type=goal_type,
                start_date=start_date,
                is_active=is_active,
                **kwargs,
            )

    def update_goal(self, goal, **kwargs):
        """
        Update an existing goal's fields.
        If is_active is being set to True, deactivate all other active goals first.
        @param goal: UserGoal instance to update
        @param kwargs: Fields to update
        @return: Updated UserGoal instance
        """
        with transaction.atomic():
            if kwargs.get('is_active') is True:
                self.repository.deactivate_all_for_user(goal.user)
                self.repository.model.objects.filter(pk=goal.pk).update(is_active=True)
                goal.refresh_from_db()
                kwargs.pop('is_active')
            if kwargs:
                return self.repository.update(goal, **kwargs)
            return goal

    def delete_goal(self, goal):
        """
        Permanently delete a goal record.
        @param goal: UserGoal instance to delete
        @return: None
        """
        self.repository.delete(goal)

    def get_goal_for_user(self, user, goal_id):
        """
        Retrieve a single goal by id, ensuring it belongs to this user.
        @param user: Account instance
        @param goal_id: Integer primary key of the goal
        @return: UserGoal instance or None
        """
        return self.repository.get(id=goal_id, user=user)
