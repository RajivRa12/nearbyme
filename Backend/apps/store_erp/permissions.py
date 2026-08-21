from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed
from apps.core.models import Role, ImpersonationSession, ImpersonationSessionMode, Store
def check_impersonation_session(request, permission_obj):
    token_id = request.headers.get('X-Impersonation-Token') or request.META.get('HTTP_X_IMPERSONATION_TOKEN')
    if not token_id:
        return None
    try:
        session = ImpersonationSession.objects.get(id=token_id, ended_at__isnull=True)
    except (ImpersonationSession.DoesNotExist, ValueError):
        raise AuthenticationFailed("Impersonation session is invalid, expired, or has been terminated.")
    if (timezone.now() - session.started_at) > timedelta(minutes=60):
        session.ended_at = timezone.now()
        session.save(update_fields=['ended_at'])
        raise AuthenticationFailed("Impersonation session expired after 60 minutes.")
    if session.mode == ImpersonationSessionMode.READ_ONLY and request.method in ['POST', 'PUT', 'PATCH', 'DELETE']:
        permission_obj.message = "403 Forbidden: Read-only impersonation token rejects every write endpoint server-side."
        return False
    request.impersonation_session = session
    if request.user and request.user.is_authenticated:
        store = Store.objects.filter(outlet__store_group_id=session.store_group_id).select_related('outlet').first()
        if not store:
            permission_obj.message = "This impersonation session's target store could not be resolved."
            return False
        request.user.store = store
        request.user.store_id = store.id
        request.user.outlet = store.outlet
        request.user.outlet_id = store.outlet_id
    return True
def resolve_brand_owner_store(request):
    """
    A Brand Owner has no single `store` — they own a brand with many stores.
    When they've picked one to work in, the frontend sends its id in the
    X-Store-Id header. Validate it belongs to their brand and rebind
    request.user.store/outlet for this request only, so every existing
    store_erp view (which reads request.user.store) works unmodified.
    """
    user = request.user
    if not (user and user.is_authenticated) or user.role != Role.BRAND_OWNER:
        return
    store_id = request.headers.get('X-Store-Id') or request.META.get('HTTP_X_STORE_ID')
    if not store_id:
        return
    store = Store.objects.filter(id=store_id, brand_id=user.brand_id).select_related('outlet').first()
    if store:
        user.store = store
        user.store_id = store.id
        user.outlet = store.outlet
        user.outlet_id = store.outlet_id
class IsStoreStaff(BasePermission):
    message = "You must be assigned to a Store to access the Store ERP."
    def has_permission(self, request, view):
        imp_status = check_impersonation_session(request, self)
        if imp_status is not None:
            return imp_status
        resolve_brand_owner_store(request)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.THERAPIST, Role.BRAND_OWNER] and
            request.user.store_id is not None
        )
class IsOutletStaff(BasePermission):
    message = "You must be assigned to an Outlet to access the booking engine."
    def has_permission(self, request, view):
        imp_status = check_impersonation_session(request, self)
        if imp_status is not None:
            return imp_status
        resolve_brand_owner_store(request)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.THERAPIST, Role.BRAND_OWNER] and
            request.user.outlet_id is not None
        )
class IsStoreManagerOrReceptionist(BasePermission):
    message = "You do not have permission to perform this administrative action."
    def has_permission(self, request, view):
        imp_status = check_impersonation_session(request, self)
        if imp_status is not None:
            return imp_status
        resolve_brand_owner_store(request)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.BRAND_OWNER] and
            request.user.store_id is not None
        )
class IsErpUser(BasePermission):
    """Any authenticated ERP-side role, store optional — for endpoints like
    /me/ that must work for a Brand Owner before they've picked a store."""
    message = "You do not have an ERP account."
    def has_permission(self, request, view):
        imp_status = check_impersonation_session(request, self)
        if imp_status is not None:
            return imp_status
        resolve_brand_owner_store(request)
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.THERAPIST, Role.BRAND_OWNER]
        )
class IsBrandOwner(BasePermission):
    message = "You must be a Brand Owner assigned to a brand to access this resource."
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == Role.BRAND_OWNER and
            request.user.brand_id is not None
        )
class HasSubscriptionFeature(BasePermission):
    """Gates a paid add-on behind the store's actual PlatformSubscriptionPlan
    — list this AFTER a role permission (IsStoreStaff etc.) in
    permission_classes so request.user.store is already resolved (including
    the Brand Owner X-Store-Id rebind). A store with no subscription row is
    treated as not entitled, same as a lapsed one — this is a paywall."""
    feature = None
    message = "This feature isn't included in your store's current plan. Ask an owner to upgrade the subscription."
    def has_permission(self, request, view):
        store = getattr(request.user, 'store', None)
        if not store:
            return False
        return store.has_plan_feature(self.feature)
class RequiresCRM(HasSubscriptionFeature):
    feature = 'includes_crm'
    message = "CRM isn't included in your store's current plan. Upgrade to unlock customer profiles and visit history."
class RequiresAnalytics(HasSubscriptionFeature):
    feature = 'includes_analytics'
    message = "Analytics isn't included in your store's current plan. Upgrade to unlock financial reports."
