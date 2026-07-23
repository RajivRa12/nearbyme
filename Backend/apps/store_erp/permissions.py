from rest_framework.permissions import BasePermission
from apps.core.models import Role

class IsStoreStaff(BasePermission):

    message = "You must be assigned to a Store to access the Store ERP."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.THERAPIST] and
            request.user.store_id is not None
        )

class IsStoreManagerOrReceptionist(BasePermission):
    message = "You do not have permission to perform this administrative action."

    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST] and
            request.user.store_id is not None
        )
