from rest_framework import serializers
from apps.core.models import User
class ERPStaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'is_active', 'created_at']
