from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from apps.core.models import InternalUser, InternalUserRole, Role
INACTIVITY_EXPIRY_MINUTES = 60
class ImpersonationWriteEnforcementPermission(BasePermission):
    message = "403 Forbidden: Read-only impersonation token rejects every write endpoint server-side."
    def has_permission(self, request, view):
        token_id = request.headers.get('X-Impersonation-Token') or request.META.get('HTTP_X_IMPERSONATION_TOKEN')
        if not token_id:
            return True
        from apps.core.models import ImpersonationSession, ImpersonationSessionMode
        try:
            session = ImpersonationSession.objects.get(id=token_id, ended_at__isnull=True)
        except (ImpersonationSession.DoesNotExist, ValueError):
            raise AuthenticationFailed("Impersonation session is invalid, expired, or has been explicitly terminated.")
        if (timezone.now() - session.started_at) > timedelta(minutes=60):
            session.ended_at = timezone.now()
            session.save(update_fields=['ended_at'])
            raise AuthenticationFailed("Impersonation session expired after 60 minutes.")
        if session.mode == ImpersonationSessionMode.READ_ONLY and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            self.message = "403 Forbidden: Read-only impersonation token rejects every write endpoint server-side."
            return False
        request.impersonation_session = session
        return True
class BaseInternalUserPermission(BasePermission):
    message = "You do not have the required Internal User platform permissions or session expired."
    def get_internal_user_and_validate_session(self, request):
        if not request.user or not request.user.is_authenticated:
            return None
        email = getattr(request.user, 'email', '') or getattr(request.user, 'username', '')
        internal_user = InternalUser.objects.filter(email=email, is_active=True, deleted_at__isnull=True).first()
        if not internal_user:
            if getattr(request.user, 'role', '') == Role.MASTER_ADMIN:
                internal_user, _ = InternalUser.objects.get_or_create(
                    email=email or f"admin_{request.user.id}@nearbyme.in",
                    defaults={
                        "name": getattr(request.user, 'first_name', 'Legacy Master Admin'),
                        "phone": "+919000000000",
                        "role": InternalUserRole.SUPERADMIN,
                        "is_active": True
                    }
                )
            else:
                return None
        now = timezone.now()
        if internal_user.last_login_at:
            inactivity_duration = now - internal_user.last_login_at
            if inactivity_duration > timedelta(minutes=INACTIVITY_EXPIRY_MINUTES):
                raise AuthenticationFailed(
                    "Session expired due to 60 minutes of inactivity. Please log in again using TOTP 2FA."
                )
            if inactivity_duration > timedelta(seconds=60):
                internal_user.last_login_at = now
                internal_user.save(update_fields=['last_login_at'])
        else:
            internal_user.last_login_at = now
            internal_user.save(update_fields=['last_login_at'])
        request.internal_user = internal_user
        return internal_user
    def has_permission(self, request, view):
        if not ImpersonationWriteEnforcementPermission().has_permission(request, view):
            self.message = "403 Forbidden: Read-only impersonation token rejects every write endpoint server-side."
            return False
        return self.get_internal_user_and_validate_session(request) is not None
class IsMasterAdmin(BaseInternalUserPermission):
    message = "You must be an active Master Admin Internal User to access this resource."
    def has_permission(self, request, view):
        return super().has_permission(request, view)
class IsSuperAdmin(BaseInternalUserPermission):
    message = "Strict SuperAdmin role required for this restricted administrative operation."
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        internal_user = getattr(request, 'internal_user', None)
        return internal_user is not None and internal_user.role == InternalUserRole.SUPERADMIN
class IsOpsOrSuperAdmin(BaseInternalUserPermission):
    message = "Ops or SuperAdmin role required for this operation."
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        internal_user = getattr(request, 'internal_user', None)
        return internal_user is not None and internal_user.role in [InternalUserRole.SUPERADMIN, InternalUserRole.OPS]
class IsReviewerOrAbove(BaseInternalUserPermission):
    message = "Reviewer platform permissions or above required."
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        internal_user = getattr(request, 'internal_user', None)
        return internal_user is not None and internal_user.role in [
            InternalUserRole.SUPERADMIN,
            InternalUserRole.OPS,
            InternalUserRole.REVIEWER
        ]
