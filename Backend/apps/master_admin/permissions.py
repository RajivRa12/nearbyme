from rest_framework.permissions import BasePermission
from apps.core.models import Role


class IsMasterAdmin(BasePermission):
    message = "You must be a Master Admin to access this resource."

    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.MASTER_ADMIN
        )
