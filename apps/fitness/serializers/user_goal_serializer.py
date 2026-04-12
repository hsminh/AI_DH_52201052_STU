from rest_framework import serializers
from apps.fitness.models import UserGoal


class UserGoalSerializer(serializers.ModelSerializer):
    goal_type_display = serializers.CharField(source='get_goal_type_display', read_only=True)

    class Meta:
        model = UserGoal
        fields = [
            'id',
            'goal_type',
            'goal_type_display',
            'target_calories',
            'target_protein',
            'target_carbs',
            'target_fat',
            'description',
            'is_active',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CreateUserGoalRequestSerializer(serializers.Serializer):
    goal_type       = serializers.ChoiceField(choices=UserGoal.GOAL_TYPE_CHOICES)
    start_date      = serializers.DateField()
    end_date        = serializers.DateField(required=False, allow_null=True)
    target_calories = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    target_protein  = serializers.FloatField(required=False, allow_null=True, min_value=0)
    target_carbs    = serializers.FloatField(required=False, allow_null=True, min_value=0)
    target_fat      = serializers.FloatField(required=False, allow_null=True, min_value=0)
    description     = serializers.CharField(required=False, allow_blank=True, default='')
    is_active       = serializers.BooleanField(required=False, default=True)

    def validate(self, attrs):
        end_date = attrs.get('end_date')
        start_date = attrs.get('start_date')
        if end_date and end_date < start_date:
            raise serializers.ValidationError({'end_date': 'end_date must be after start_date.'})
        return attrs
