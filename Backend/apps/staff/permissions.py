from rest_framework.permissions import BasePermission
from apps.core.models import Role
class IsTherapist(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == Role.THERAPIST)
