import pyotp
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from apps.core.models import InternalUser, AuditLog, Role
from .permissions import BaseInternalUserPermission

User = get_user_model()

class MasterAdminLoginView(generics.GenericAPIView):
    """
    Ticket 1: Mandatory 2FA/TOTP Authentication for Master Admin Control Panel.
    Enforces strict access separation (no salon/store admin access) and initializes
    the session timestamp for the 60-minute inactivity timeout.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        totp_code = request.data.get('totp_code')

        if not email or not password:
            return Response(
                {"success": False, "message": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Authenticate credentials against Django user accounts
        user = authenticate(username=email, password=password)
        if not user:
            # Check fallback if username differs from email
            user_obj = User.objects.filter(email=email).first()
            if user_obj and user_obj.check_password(password):
                user = user_obj

        if not user or not user.is_active:
            return Response(
                {"success": False, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 2. Strict Platform Separation Check: Must be an active InternalUser
        internal_user = InternalUser.objects.filter(email=email, is_active=True, deleted_at__isnull=True).first()
        
        # If legacy Master Admin user, automatically bridge to an InternalUser representation
        if not internal_user and getattr(user, 'role', '') == Role.MASTER_ADMIN:
            from apps.core.models import InternalUserRole
            internal_user, _ = InternalUser.objects.get_or_create(
                email=email,
                defaults={
                    "name": getattr(user, 'first_name', 'Legacy Master Admin') or "Admin",
                    "phone": "+919000000000", # E.164 compliant default
                    "role": InternalUserRole.SUPERADMIN,
                    "is_active": True
                }
            )

        if not internal_user:
            return Response(
                {
                    "success": False,
                    "error_code": "FORBIDDEN_NON_INTERNAL_USER",
                    "message": "Access Denied: Master Admin is a control panel restricted exclusively to Nearbyme internal operational staff."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 3. Handle Mandatory TOTP 2FA Enforcement
        if not internal_user.totp_secret:
            internal_user.totp_secret = pyotp.random_base32()
            internal_user.save(update_fields=['totp_secret'])

        totp = pyotp.TOTP(internal_user.totp_secret)

        # If TOTP code is not provided in this request, require 2FA completion
        if not totp_code:
            payload = {
                "success": True,
                "totp_required": True,
                "totp_setup_required": not internal_user.is_totp_enabled,
                "message": "Mandatory TOTP 2FA code required."
            }
            if not internal_user.is_totp_enabled:
                payload["totp_secret"] = internal_user.totp_secret
                payload["qr_uri"] = totp.provisioning_uri(
                    name=internal_user.email,
                    issuer_name="Nearbyme Master Admin"
                )
            return Response(payload, status=status.HTTP_200_OK)

        # 4. Verify submitted 6-digit TOTP code
        clean_code = str(totp_code).strip()
        if not totp.verify(clean_code, valid_windows=1):
            # Record failed 2FA attempt in audit log
            AuditLog.objects.create(
                actor_id=str(internal_user.id),
                actor_type="internal_user",
                action="totp_verification_failed",
                entity_type="auth",
                entity_id=str(internal_user.id),
                before={"status": "attempt"},
                after={"status": "failed", "reason": "invalid_code"},
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {"success": False, "message": "Invalid TOTP 2FA code."},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 5. Successful 2FA Authentication
        if not internal_user.is_totp_enabled:
            internal_user.is_totp_enabled = True
        
        # Stamp activity timestamp for 60-minute server-side timeout rule
        internal_user.last_login_at = timezone.now()
        internal_user.save(update_fields=['is_totp_enabled', 'last_login_at'])

        # Generate simplejwt access and refresh tokens
        refresh = RefreshToken.for_user(user)
        refresh['role'] = internal_user.role
        refresh['internal_user_id'] = str(internal_user.id)
        refresh['phone_e164'] = internal_user.phone
        refresh['is_internal'] = True

        # Audit login success
        AuditLog.objects.create(
            actor_id=str(internal_user.id),
            actor_type="internal_user",
            action="master_admin_login_success",
            entity_type="auth",
            entity_id=str(internal_user.id),
            before={},
            after={"role": internal_user.role, "2fa_verified": True},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            "success": True,
            "message": "Authenticated successfully with mandatory 2FA.",
            "access_token": str(refresh.access_token),
            "refresh_token": str(refresh),
            "expires_in_minutes": 60,
            "user": {
                "id": str(internal_user.id),
                "name": internal_user.name,
                "email": internal_user.email,
                "phone_e164": internal_user.phone,
                "role": internal_user.role,
                "is_totp_enabled": internal_user.is_totp_enabled
            }
        }, status=status.HTTP_200_OK)


class MasterAdminLogoutView(generics.GenericAPIView):
    """
    Server-side session termination.
    Invalidates active sessions by clearing the last_login_at timestamp, causing immediate 401/403
    from BaseInternalUserPermission on subsequent token presentations.
    """
    permission_classes = [IsAuthenticated, BaseInternalUserPermission]

    def post(self, request):
        internal_user = getattr(request, 'internal_user', None)
        if internal_user:
            # Expire session immediately server-side
            internal_user.last_login_at = timezone.now() - timedelta(minutes=120)
            internal_user.save(update_fields=['last_login_at'])

            AuditLog.objects.create(
                actor_id=str(internal_user.id),
                actor_type="internal_user",
                action="master_admin_logout",
                entity_type="auth",
                entity_id=str(internal_user.id),
                before={"session": "active"},
                after={"session": "terminated"},
                ip_address=request.META.get('REMOTE_ADDR')
            )

        return Response({
            "success": True,
            "message": "Logged out successfully and server-side session terminated."
        }, status=status.HTTP_200_OK)


class MasterAdminSessionStatusView(generics.GenericAPIView):
    """
    Endpoint to verify current token validity, activity status, and time remaining until
    the 60-minute inactivity auto-expiry triggers.
    """
    permission_classes = [IsAuthenticated, BaseInternalUserPermission]

    def get(self, request):
        internal_user = getattr(request, 'internal_user', None)
        if not internal_user or not internal_user.last_login_at:
            return Response({"success": False, "message": "No active session timestamp found."}, status=401)

        now = timezone.now()
        elapsed_seconds = (now - internal_user.last_login_at).total_seconds()
        remaining_seconds = max(0, 3600 - elapsed_seconds)

        return Response({
            "success": True,
            "session_active": remaining_seconds > 0,
            "inactivity_remaining_seconds": int(remaining_seconds),
            "inactivity_remaining_minutes": int(remaining_seconds // 60),
            "user": {
                "id": str(internal_user.id),
                "name": internal_user.name,
                "email": internal_user.email,
                "phone_e164": internal_user.phone,
                "role": internal_user.role
            }
        }, status=status.HTTP_200_OK)
