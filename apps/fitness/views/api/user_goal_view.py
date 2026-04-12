from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.fitness.serializers import UserGoalSerializer, CreateUserGoalRequestSerializer
from apps.fitness.services import UserGoalService


class UserGoalListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = UserGoalService()

    def get(self, request):
        """
        List all goals for the authenticated user.
        Query param ?active=true returns only active goals.
        @return: List of serialized UserGoal objects
        """
        active_only = request.query_params.get('active', '').lower() == 'true'
        if active_only:
            goals = self.service.get_active_goals(request.user)
        else:
            goals = self.service.get_goals_for_user(request.user)
        return Response(UserGoalSerializer(goals, many=True).data)

    def post(self, request):
        """
        Create a new goal for the authenticated user.
        If is_active=True (default), all previous active goals are deactivated.
        @return: Serialized new UserGoal with 201 status
        """
        serializer = CreateUserGoalRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        goal = self.service.create_goal(
            user=request.user,
            goal_type=data['goal_type'],
            start_date=data['start_date'],
            end_date=data.get('end_date'),
            target_calories=data.get('target_calories'),
            target_protein=data.get('target_protein'),
            target_carbs=data.get('target_carbs'),
            target_fat=data.get('target_fat'),
            description=data.get('description', ''),
            is_active=data.get('is_active', True),
        )
        return Response(UserGoalSerializer(goal).data, status=status.HTTP_201_CREATED)


class UserGoalDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = UserGoalService()

    def _get_goal_or_404(self, user, goal_id):
        """
        Fetch a goal that belongs to the user, or return a 404 response.
        @param user: Authenticated Account instance
        @param goal_id: Integer pk of the goal
        @return: UserGoal instance or None (caller must check)
        """
        return self.service.get_goal_for_user(user, goal_id)

    def get(self, request, pk):
        """
        Retrieve a single goal by id.
        @return: Serialized UserGoal or 404
        """
        goal = self._get_goal_or_404(request.user, pk)
        if goal is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserGoalSerializer(goal).data)

    def patch(self, request, pk):
        """
        Partially update a goal.
        Accepted fields: goal_type, start_date, end_date, target_calories,
        target_protein, target_carbs, target_fat, description, is_active.
        @return: Serialized updated UserGoal or 404
        """
        goal = self._get_goal_or_404(request.user, pk)
        if goal is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = CreateUserGoalRequestSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.service.update_goal(goal, **serializer.validated_data)
        return Response(UserGoalSerializer(updated).data)

    def delete(self, request, pk):
        """
        Delete a goal permanently.
        @return: 204 No Content or 404
        """
        goal = self._get_goal_or_404(request.user, pk)
        if goal is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        self.service.delete_goal(goal)
        return Response(status=status.HTTP_204_NO_CONTENT)
