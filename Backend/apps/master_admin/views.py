import pyotp
import random
import string
import uuid
import csv
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.http import HttpResponse
from django.db import transaction, models
from django.db.models import Count, Sum, Avg, Q
from django.contrib.auth import authenticate, get_user_model
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from apps.core.models import (
    Business, Brand, Store, Role,
    PlatformSettings, Coupon,
    BusinessStatus,
    Invoice, MembershipTier, InvoiceStatus,
    InternalUser, InternalUserRole, AuditLog,
    StoreGroup, StoreGroupStatus, Outlet, StoreStatusHistory, KycDocument,
    Plan, AccessCode,
    ServiceCategoryPhase1, CanonicalService, StoreService, StoreServiceMarketplaceStatus,
    GlobalCustomer, CustomerStatus, CustomerStoreLink, CustomerMergeLog,
    ImpersonationSession, ImpersonationSessionMode,
    PlatformSubscriptionPlan, StoreSubscription, PlatformInvoice,
)
from .serializers import (
    BusinessSerializer, BrandSerializer, StoreSerializer,
    PlatformUserSerializer, PlatformSettingsSerializer,
    CouponSerializer, GlobalMembershipSerializer,
    GlobalInvoiceSerializer,
    PlanSerializer, AccessCodeSerializer, AccessCodeGenerateSerializer,
    StoreGroupListSerializer, StoreGroupDetailSerializer, StoreGroupTransitionSerializer,
    KycDocumentSerializer, KycVerifySerializer, ServiceCategoryPhase1Serializer, CanonicalServiceSerializer, StoreServiceSerializer, StoreServiceReviewSerializer,
    GlobalCustomerSerializer, CustomerMergeSerializer, CustomerMergeLogSerializer,
    AuditLogSerializer, ToggleFeatureFlagSerializer, ImpersonationSessionSerializer, ImpersonationStartSerializer,
    PlatformSubscriptionPlanSerializer, StoreSubscriptionSerializer, PlatformInvoiceSerializer,
)
from .permissions import IsMasterAdmin, BaseInternalUserPermission, IsSuperAdmin, IsOpsOrSuperAdmin, IsReviewerOrAbove
User = get_user_model()
def success_response(data, message="Success", status_code=200, meta=None):
    payload = {"success": True, "message": message, "data": data}
    if meta:
        payload["meta"] = meta
    return Response(payload, status=status_code)
class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    def get(self, request):
        now = timezone.now()
        businesses = Business.objects.all()
        stores = Store.objects.all()
        users = User.objects.all()
        total_revenue = Decimal(Invoice.objects.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
        top_stores = stores.annotate(
            revenue=Sum('invoices__grand_total_paise', filter=models.Q(invoices__status=InvoiceStatus.PAID))
        ).order_by('-revenue')[:5]
        low_rated_stores = stores.annotate(
            avg_rating=Avg('reviews__rating')
        ).filter(avg_rating__lt=3.0)
        two_weeks_ago = now - timezone.timedelta(days=14)
        churn_risk_stores = stores.annotate(
            recent_invoices=Count('invoices', filter=models.Q(invoices__created_at__gte=two_weeks_ago))
        ).filter(recent_invoices=0)
        stats = {
            "total_businesses": businesses.count(),
            "total_brands": Brand.objects.count(),
            "total_stores": stores.count(),
            "total_users": users.count(),
            "active_stores": stores.filter(status='ACTIVE').count(),
            "active_staff": users.filter(role__in=['THERAPIST', 'STORE_ADMIN', 'RECEPTIONIST'], is_active=True).count(),
            "total_customers": users.filter(role='CUSTOMER').count(),
            "total_revenue_gmv": total_revenue,
            "churn_risk_count": churn_risk_stores.count(),
            "low_rated_store_count": low_rated_stores.count(),
            "top_stores": [{"id": s.id, "name": s.name, "revenue": s.revenue or 0} for s in top_stores],
            "recent_businesses": BusinessSerializer(businesses.order_by('-created_at')[:5], many=True).data,
            "recent_stores": StoreSerializer(stores.order_by('-created_at')[:5], many=True).data,
        }
        return success_response(stats, "Dashboard data fetched successfully")
class BusinessViewSet(viewsets.ModelViewSet):
    queryset = Business.objects.all()
    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'business_type', 'city', 'state', 'country']
    search_fields = ['name', 'email', 'phone', 'city']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return success_response(BusinessSerializer(instance).data, "Business created successfully", status.HTTP_201_CREATED)
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return success_response(BusinessSerializer(instance).data, "Business updated successfully")
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return success_response(None, "Business deleted successfully", status.HTTP_204_NO_CONTENT)
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        business = self.get_object()
        business.status = BusinessStatus.ACTIVE
        business.save()
        return success_response(BusinessSerializer(business).data, f"Business '{business.name}' activated")
    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        business = self.get_object()
        business.status = BusinessStatus.SUSPENDED
        business.save()
        return success_response(BusinessSerializer(business).data, f"Business '{business.name}' suspended")
class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.select_related('business').all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'business']
    search_fields = ['name', 'business__name']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']
class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related('brand', 'business').all()
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'brand', 'business', 'currency', 'timezone']
    search_fields = ['name', 'email', 'contact_number', 'address']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']
class PlatformSubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = PlatformSubscriptionPlan.objects.all()
    serializer_class = PlatformSubscriptionPlanSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['monthly_price', 'name', 'created_at']
    ordering = ['monthly_price']
class StoreSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = StoreSubscription.objects.select_related('store', 'plan').all()
    serializer_class = StoreSubscriptionSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'plan']
    search_fields = ['store__name']
    ordering_fields = ['created_at', 'current_period_end']
    ordering = ['-created_at']
class PlatformInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PlatformInvoice.objects.select_related('store').all()
    serializer_class = PlatformInvoiceSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'store']
    search_fields = ['store__name']
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']
class PlatformUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.select_related('brand', 'store').exclude(role=Role.CUSTOMER)
    serializer_class = PlatformUserSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'brand', 'store']
    search_fields = ['email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['email', 'date_joined', 'role']
    ordering = ['-date_joined']
    @action(detail=True, methods=['post'])
    def disable(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return success_response(None, f"User '{user.email}' has been disabled")
    @action(detail=True, methods=['post'])
    def enable(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return success_response(None, f"User '{user.email}' has been enabled")
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 6:
            return Response({"success": False, "message": "Password must be at least 6 characters."}, status=400)
        user.set_password(new_password)
        user.save()
        return success_response(None, f"Password reset for '{user.email}' successfully")
class PlatformSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = PlatformSettingsSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    def get_object(self):
        return PlatformSettings.get()
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        return success_response(PlatformSettingsSerializer(instance).data, "Platform settings fetched")
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Platform settings updated successfully")
class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'discount_type']
    search_fields = ['code']
    ordering_fields = ['start_date', 'end_date', 'created_at']
    ordering = ['-created_at']
    @action(detail=False, methods=['post'], url_path='validate')
    def validate_coupon(self, request):
        code = request.data.get('code')
        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
        except Coupon.DoesNotExist:
            return Response({"success": False, "message": "Coupon not found or inactive."}, status=400)
        now = timezone.now()
        if not (coupon.start_date <= now <= coupon.end_date):
            return Response({"success": False, "message": "Coupon is expired or not yet valid."}, status=400)
        if coupon.used_count >= coupon.usage_limit:
            return Response({"success": False, "message": "Coupon usage limit reached."}, status=400)
        return success_response(CouponSerializer(coupon).data, "Coupon is valid")
class GlobalUserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = PlatformUserSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active', 'store', 'brand']
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering_fields = ['date_joined', 'email']
    ordering = ['-date_joined']
class GlobalMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = MembershipTier.objects.all()
    serializer_class = GlobalMembershipSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['store', 'is_active']
    search_fields = ['name']
    ordering = ['-created_at']
class GlobalInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = GlobalInvoiceSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['store', 'status']
    search_fields = ['invoice_number', 'customer_name']
    ordering = ['-created_at']
class AnalyticsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    def get(self, request):
        users = User.objects.all()
        stores = Store.objects.all()
        businesses = Business.objects.all()
        from django.db.models.functions import TruncMonth
        monthly_registrations = (
            users.filter(role=Role.CUSTOMER)
            .annotate(month=TruncMonth('date_joined'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        top_stores = stores.filter(status='ACTIVE').annotate(
            review_count=Count('reviews'),
            avg_rating=Avg('reviews__rating')
        ).order_by('-avg_rating')[:10]
        low_rated_stores = stores.annotate(
            avg_rating=Avg('reviews__rating')
        ).filter(avg_rating__isnull=False).order_by('avg_rating')[:10]
        gmv_agg = Invoice.objects.filter(status=InvoiceStatus.PAID).aggregate(total=Sum('grand_total_paise'))
        gmv = Decimal(gmv_agg['total'] or 0) / 100
        rev_agg = StoreSubscription.objects.filter(status='ACTIVE').aggregate(total=Sum('plan__monthly_price'))
        revenue = rev_agg['total'] or 0
        analytics = {
            "gmv": gmv,
            "revenue": revenue,
            "active_businesses": businesses.filter(status='ACTIVE').count(),
            "active_stores": stores.filter(status='ACTIVE').count(),
            "active_staff": users.filter(
                role__in=['THERAPIST', 'STORE_ADMIN', 'RECEPTIONIST'],
                is_active=True
            ).count(),
            "total_customers": users.filter(role=Role.CUSTOMER).count(),
            "new_customers_this_month": users.filter(
                role=Role.CUSTOMER,
                date_joined__month=timezone.now().month,
                date_joined__year=timezone.now().year
            ).count(),
            "monthly_registrations": list(monthly_registrations),
            "top_stores": StoreSerializer(top_stores, many=True).data,
            "low_rated_stores": StoreSerializer(low_rated_stores, many=True).data,
        }
        return success_response(analytics, "Analytics fetched successfully")
class MasterAdminLoginView(generics.GenericAPIView):
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
        user = authenticate(username=email, password=password)
        if not user:
            user_obj = User.objects.filter(email=email).first()
            if user_obj and user_obj.check_password(password):
                user = user_obj
        if not user or not user.is_active:
            return Response(
                {"success": False, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED
            )
        internal_user = InternalUser.objects.filter(email=email, is_active=True, deleted_at__isnull=True).first()
        if not internal_user and getattr(user, 'role', '') == Role.MASTER_ADMIN:
            from apps.core.models import InternalUserRole
            internal_user, _ = InternalUser.objects.get_or_create(
                email=email,
                defaults={
                    "name": getattr(user, 'first_name', 'Legacy Master Admin') or "Admin",
                    "phone": "+919000000000",
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
        if not internal_user.totp_secret:
            internal_user.totp_secret = pyotp.random_base32()
            internal_user.save(update_fields=['totp_secret'])
        totp = pyotp.TOTP(internal_user.totp_secret)
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
        clean_code = str(totp_code).strip()
        if not totp.verify(clean_code, valid_window=1):
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
        if not internal_user.is_totp_enabled:
            internal_user.is_totp_enabled = True
        internal_user.last_login_at = timezone.now()
        internal_user.save(update_fields=['is_totp_enabled', 'last_login_at'])
        refresh = RefreshToken.for_user(user)
        refresh['role'] = internal_user.role
        refresh['internal_user_id'] = str(internal_user.id)
        refresh['phone_e164'] = internal_user.phone
        refresh['is_internal'] = True
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
    permission_classes = [IsAuthenticated, BaseInternalUserPermission]
    def post(self, request):
        internal_user = getattr(request, 'internal_user', None)
        if internal_user:
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
class MasterAdminPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
class PlanViewSet(viewsets.ModelViewSet):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'billing_cycle' if hasattr(Plan, 'billing_cycle') else 'billing_period']
    search_fields = ['name']
    ordering_fields = ['price_paise', 'name', 'created_at']
    ordering = ['price_paise']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    def perform_create(self, serializer):
        plan = serializer.save()
        AuditLog.objects.create(
            actor_id=str(getattr(self.request, 'internal_user', 'system')),
            actor_type="internal_user",
            action="plan_create",
            entity_type="plan",
            entity_id=str(plan.id),
            before={},
            after=serializer.data,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    def perform_update(self, serializer):
        old_data = PlanSerializer(self.get_object()).data
        plan = serializer.save()
        AuditLog.objects.create(
            actor_id=str(getattr(self.request, 'internal_user', 'system')),
            actor_type="internal_user",
            action="plan_update",
            entity_type="plan",
            entity_id=str(plan.id),
            before=old_data,
            after=serializer.data,
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    def perform_destroy(self, instance):
        instance.delete()
        AuditLog.objects.create(
            actor_id=str(getattr(self.request, 'internal_user', 'system')),
            actor_type="internal_user",
            action="plan_soft_delete",
            entity_type="plan",
            entity_id=str(instance.id),
            before={"deleted_at": None},
            after={"deleted_at": str(instance.deleted_at)},
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
    @action(detail=True, methods=['post'], url_path='toggle-feature-flag', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def toggle_feature_flag(self, request, pk=None):
        plan = self.get_object()
        serializer = ToggleFeatureFlagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        old_flags = dict(plan.feature_flags) if isinstance(plan.feature_flags, dict) else {}
        new_flags = dict(old_flags)
        new_flags[data['flag_key']] = data['enabled']
        plan.feature_flags = new_flags
        plan.save(update_fields=['feature_flags'])
        internal_user = getattr(request, 'internal_user', None)
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="plan_feature_flag_toggle",
            entity_type="plan",
            entity_id=str(plan.id),
            before={"feature_flags": old_flags},
            after={"feature_flags": new_flags, "reason": data.get('reason', '')},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"Feature flag '{data['flag_key']}' set to {data['enabled']} for plan '{plan.name}'.",
            "data": PlanSerializer(plan).data
        }, status=status.HTTP_200_OK)
class AccessCodeViewSet(viewsets.ModelViewSet):
    queryset = AccessCode.objects.select_related('plan').all()
    serializer_class = AccessCodeSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'source_tag', 'plan']
    search_fields = ['code', 'source_tag', 'issued_by']
    ordering_fields = ['expires_at', 'created_at', 'redemption_count']
    ordering = ['-created_at']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'generate']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    @action(detail=False, methods=['post'], url_path='generate', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def generate_code(self, request):
        serializer = AccessCodeGenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        plan = get_object_or_404(Plan, id=data['plan_id'])
        prefix = data['prefix'].upper().strip()
        plan_tag = plan.name[:5].upper().replace(' ', '')
        for _ in range(10):
            suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            code_str = f"{prefix}-{plan_tag}-{suffix}"
            if not AccessCode.objects.filter(code=code_str).exists():
                break
        else:
            code_str = f"{prefix}-{plan_tag}-{uuid.uuid4().hex[:6].upper()}"
        internal_user = getattr(request, 'internal_user', None)
        issued_by_name = internal_user.name if internal_user else "Ops Staff"
        access_code = AccessCode.objects.create(
            code=code_str,
            plan=plan,
            duration_days=data['duration_days'],
            max_redemptions=data['max_redemptions'],
            redemption_count=0,
            expires_at=timezone.now() + timedelta(days=data['duration_days']),
            issued_by=issued_by_name,
            source_tag=data['source_tag'],
            status='active'
        )
        resp_data = AccessCodeSerializer(access_code).data
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="access_code_generate",
            entity_type="access_code",
            entity_id=str(access_code.id),
            before={},
            after=resp_data,
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"success": True, "message": "Access code generated successfully", "data": resp_data}, status=status.HTTP_201_CREATED)
class StoreGroupViewSet(viewsets.ModelViewSet):
    queryset = StoreGroup.objects.select_related('plan', 'access_code').prefetch_related('outlets', 'status_history', 'kyc_documents').all()
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'business_type', 'plan']
    search_fields = ['name', 'legal_name', 'owner_name', 'owner_phone', 'owner_email', 'gstin', 'pan']
    ordering_fields = ['created_at', 'name', 'approved_at']
    ordering = ['-created_at']
    def get_serializer_class(self):
        if self.action == 'list':
            return StoreGroupListSerializer
        return StoreGroupDetailSerializer
    def get_permissions(self):
        if self.action in ['suspend', 'offboard', 'destroy']:
            return [IsAuthenticated(), IsSuperAdmin()]
        if self.action in ['mark_under_review', 'approve', 'activate', 'mark_dormant', 'create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    def _execute_transition(self, store_group, to_status, reason):
        from_status = store_group.status
        if from_status == to_status:
            return Response({"success": False, "message": f"Store Group is already in status '{to_status}'."}, status=status.HTTP_400_BAD_REQUEST)
        allowed_transitions = {
            StoreGroupStatus.APPLIED: [StoreGroupStatus.UNDER_REVIEW, StoreGroupStatus.OFFBOARDED],
            StoreGroupStatus.UNDER_REVIEW: [StoreGroupStatus.APPROVED, StoreGroupStatus.APPLIED, StoreGroupStatus.OFFBOARDED],
            StoreGroupStatus.APPROVED: [StoreGroupStatus.ACTIVE, StoreGroupStatus.SUSPENDED],
            StoreGroupStatus.ACTIVE: [StoreGroupStatus.SUSPENDED, StoreGroupStatus.DORMANT, StoreGroupStatus.OFFBOARDED],
            StoreGroupStatus.SUSPENDED: [StoreGroupStatus.ACTIVE, StoreGroupStatus.OFFBOARDED],
            StoreGroupStatus.DORMANT: [StoreGroupStatus.ACTIVE, StoreGroupStatus.OFFBOARDED, StoreGroupStatus.SUSPENDED],
        }
        if to_status not in allowed_transitions.get(from_status, []):
            return Response({
                "success": False,
                "error": "illegal_state_transition",
                "message": f"Illegal state jump from '{from_status}' directly to '{to_status}'. Must follow defined operational state sequence."
            }, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        internal_user = getattr(self.request, 'internal_user', None)
        actor_name = internal_user.name if internal_user else "System Admin"
        StoreStatusHistory.objects.create(
            store_group=store_group,
            from_status=from_status,
            to_status=to_status,
            reason=reason or f"State transition from {from_status} to {to_status}",
            changed_by=actor_name,
            changed_by_type="internal_user"
        )
        store_group.status = to_status
        if to_status in [StoreGroupStatus.APPROVED, StoreGroupStatus.ACTIVE] and not store_group.approved_at:
            store_group.approved_at = timezone.now()
        store_group.save(update_fields=['status', 'approved_at'])
        if to_status == StoreGroupStatus.ACTIVE:
            Outlet.objects.filter(store_group=store_group).update(status='active')
        elif to_status in [StoreGroupStatus.SUSPENDED, StoreGroupStatus.DORMANT, StoreGroupStatus.OFFBOARDED]:
            Outlet.objects.filter(store_group=store_group).update(status='inactive')
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action=f"store_group_transition_to_{to_status}",
            entity_type="store_group",
            entity_id=str(store_group.id),
            before={"status": from_status},
            after={"status": to_status, "reason": reason},
            ip_address=self.request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"Store group '{store_group.name}' transitioned from '{from_status}' to '{to_status}'.",
            "data": StoreGroupDetailSerializer(store_group).data
        }, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='mark-under-review')
    def mark_under_review(self, request, pk=None):
        store_group = self.get_object()
        serializer = StoreGroupTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=False)
        reason = request.data.get('reason', 'Application dossier under operational review')
        return self._execute_transition(store_group, StoreGroupStatus.UNDER_REVIEW, reason)
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        store_group = self.get_object()
        reason = request.data.get('reason', 'Onboarding review complete & KYC verified')
        return self._execute_transition(store_group, StoreGroupStatus.APPROVED, reason)
    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        store_group = self.get_object()
        reason = request.data.get('reason', 'Store operational and accepting bookings')
        return self._execute_transition(store_group, StoreGroupStatus.ACTIVE, reason)
    @action(detail=True, methods=['post'], url_path='suspend')
    def suspend(self, request, pk=None):
        store_group = self.get_object()
        serializer = StoreGroupTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._execute_transition(store_group, StoreGroupStatus.SUSPENDED, serializer.validated_data['reason'])
    @action(detail=True, methods=['post'], url_path='mark-dormant')
    def mark_dormant(self, request, pk=None):
        store_group = self.get_object()
        reason = request.data.get('reason', 'No operational activity detected in trailing 60 days')
        return self._execute_transition(store_group, StoreGroupStatus.DORMANT, reason)
    @action(detail=True, methods=['post'], url_path='offboard')
    def offboard(self, request, pk=None):
        store_group = self.get_object()
        serializer = StoreGroupTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._execute_transition(store_group, StoreGroupStatus.OFFBOARDED, serializer.validated_data['reason'])
class KycDocumentViewSet(viewsets.ModelViewSet):
    queryset = KycDocument.objects.select_related('store_group').all()
    serializer_class = KycDocumentSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['store_group', 'status', 'doc_type']
    search_fields = ['store_group__name', 'doc_type', 'reviewed_by']
    ordering = ['-uploaded_at']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'verify_document']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    @action(detail=True, methods=['post'], url_path='verify', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def verify_document(self, request, pk=None):
        doc = self.get_object()
        serializer = KycVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        old_status = doc.status
        internal_user = getattr(request, 'internal_user', None)
        reviewer_name = internal_user.name if internal_user else "Ops Staff"
        target_status = 'approved' if data['status'] == 'verified' else data['status']
        doc.status = target_status
        doc.reviewed_by = reviewer_name
        doc.reviewed_at = timezone.now()
        doc.rejection_reason = data.get('rejection_reason', '')
        doc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action=f"kyc_{target_status}",
            entity_type="kyc_document",
            entity_id=str(doc.id),
            before={"status": old_status},
            after={"status": doc.status, "reviewer": reviewer_name, "reason": doc.rejection_reason},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"KYC Document ({doc.doc_type}) marked as '{doc.status}'.",
            "data": KycDocumentSerializer(doc).data
        }, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='approve', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def approve(self, request, pk=None):
        from .serializers import KycApproveSerializer
        from apps.core.models import KycDocStatus
        doc = self.get_object()
        if doc.status == KycDocStatus.APPROVED:
            return Response({"success": False, "message": "Document is already approved."}, status=400)
        serializer = KycApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        internal_user = getattr(request, 'internal_user', None)
        reviewer_name = internal_user.name if internal_user else request.user.email
        old_status = doc.status
        doc.status = KycDocStatus.APPROVED
        doc.reviewed_by = reviewer_name
        doc.reviewed_at = timezone.now()
        doc.rejection_reason = ''
        doc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="kyc_approved",
            entity_type="kyc_document",
            entity_id=str(doc.id),
            before={"status": old_status},
            after={"status": "approved", "reviewer": reviewer_name},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"✅ {doc.get_doc_type_display()} approved for {doc.store_group.name}.",
            "kyc_completion_triggered": False
        }, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='reject', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def reject(self, request, pk=None):
        from .serializers import KycRejectSerializer
        from apps.core.models import KycDocStatus
        doc = self.get_object()
        if doc.status == KycDocStatus.REJECTED:
            return Response({"success": False, "message": "Document is already rejected."}, status=400)
        serializer = KycRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        internal_user = getattr(request, 'internal_user', None)
        reviewer_name = internal_user.name if internal_user else request.user.email
        old_status = doc.status
        doc.status = KycDocStatus.REJECTED
        doc.reviewed_by = reviewer_name
        doc.reviewed_at = timezone.now()
        doc.rejection_reason = serializer.validated_data['rejection_reason']
        doc.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'rejection_reason'])
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="kyc_rejected",
            entity_type="kyc_document",
            entity_id=str(doc.id),
            before={"status": old_status},
            after={"status": "rejected", "reviewer": reviewer_name, "reason": doc.rejection_reason},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"❌ {doc.get_doc_type_display()} rejected for {doc.store_group.name}. Store owner will be notified to re-upload.",
        }, status=status.HTTP_200_OK)
from apps.core.models import BankSettlementAccount
from .serializers import BankSettlementAdminSerializer
class BankSettlementAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BankSettlementAccount.objects.select_related('store_group').all()
    serializer_class = BankSettlementAdminSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_verified', 'weekly_payout_enabled', 'account_type']
    search_fields = ['store_group__name', 'bank_name', 'ifsc_code', 'account_holder_name']
    ordering = ['-submitted_at']
    def get_permissions(self):
        if self.action in ['activate', 'reject_bank']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    @action(detail=False, methods=['get'], url_path='pending')
    def pending(self, request):
        qs = BankSettlementAccount.objects.filter(is_verified=False).select_related('store_group')
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = BankSettlementAdminSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = BankSettlementAdminSerializer(qs, many=True)
        return Response({"success": True, "count": qs.count(), "results": serializer.data})
    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        account = self.get_object()
        if account.is_verified:
            return Response({
                "success": False,
                "message": "This bank account is already verified and active."
            }, status=400)
        internal_user = getattr(request, 'internal_user', None)
        activated_by = internal_user.name if internal_user else request.user.email
        account.is_verified = True
        account.weekly_payout_enabled = True
        account.activated_at = timezone.now()
        account.activated_by = activated_by
        account.rejection_reason = ''
        account.save(update_fields=[
            'is_verified', 'weekly_payout_enabled',
            'activated_at', 'activated_by', 'rejection_reason'
        ])
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="bank_settlement_activated",
            entity_type="bank_settlement_account",
            entity_id=str(account.id),
            before={"is_verified": False},
            after={"is_verified": True, "activated_by": activated_by, "weekly_payout_enabled": True},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"✅ Bank account verified and weekly payouts activated for {account.store_group.name}. "
                       f"({account.bank_name} — {account.ifsc_code})",
            "data": BankSettlementAdminSerializer(account).data
        }, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='reject')
    def reject_bank(self, request, pk=None):
        from .serializers import KycRejectSerializer
        account = self.get_object()
        serializer = KycRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        internal_user = getattr(request, 'internal_user', None)
        rejected_by = internal_user.name if internal_user else request.user.email
        account.is_verified = False
        account.weekly_payout_enabled = False
        account.rejection_reason = serializer.validated_data['rejection_reason']
        account.save(update_fields=['is_verified', 'weekly_payout_enabled', 'rejection_reason'])
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="bank_settlement_rejected",
            entity_type="bank_settlement_account",
            entity_id=str(account.id),
            before={"is_verified": False},
            after={"rejected_by": rejected_by, "reason": account.rejection_reason},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"❌ Bank account rejected for {account.store_group.name}. Store owner must resubmit corrected details.",
        }, status=status.HTTP_200_OK)
class ServiceCategoryPhase1ViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategoryPhase1.objects.all()
    serializer_class = ServiceCategoryPhase1Serializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['applies_to', 'is_active']
    search_fields = ['name', 'slug']
    ordering_fields = ['display_order', 'name']
    ordering = ['display_order']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
class CanonicalServiceViewSet(viewsets.ModelViewSet):
    queryset = CanonicalService.objects.select_related('category').all()
    serializer_class = CanonicalServiceSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'resource_type', 'gender_applicability', 'is_active']
    search_fields = ['name', 'slug', 'skill_tag', 'category__name']
    ordering_fields = ['default_duration_min', 'name']
    ordering = ['category__display_order', 'name']
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
class StoreServiceViewSet(viewsets.ModelViewSet):
    queryset = StoreService.objects.select_related('store_group', 'canonical_service').all()
    serializer_class = StoreServiceSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['marketplace_status', 'store_group', 'is_active_in_store']
    search_fields = ['name', 'store_group__name']
    ordering = ['-submitted_at']
    def get_permissions(self):
        if self.action in ['approve_marketplace', 'reject_marketplace', 'destroy']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    @action(detail=False, methods=['get'], url_path='review-queue')
    def review_queue(self, request):
        pending_services = self.get_queryset().filter(marketplace_status=StoreServiceMarketplaceStatus.PENDING)
        page = self.paginate_queryset(pending_services)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(pending_services, many=True)
        return Response(serializer.data)
    @action(detail=True, methods=['post'], url_path='approve-marketplace')
    def approve_marketplace(self, request, pk=None):
        service = self.get_object()
        old_status = service.marketplace_status
        service.marketplace_status = StoreServiceMarketplaceStatus.APPROVED
        service.save(update_fields=['marketplace_status'])
        internal_user = getattr(request, 'internal_user', None)
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="store_service_marketplace_approve",
            entity_type="store_service",
            entity_id=str(service.id),
            before={"marketplace_status": old_status},
            after={"marketplace_status": service.marketplace_status},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"success": True, "message": f"Custom service '{service.name}' approved for public marketplace listing.", "data": self.get_serializer(service).data}, status=status.HTTP_200_OK)
    @action(detail=True, methods=['post'], url_path='reject-marketplace')
    def reject_marketplace(self, request, pk=None):
        service = self.get_object()
        serializer = StoreServiceReviewSerializer(data={'status': StoreServiceMarketplaceStatus.REJECTED, **request.data})
        serializer.is_valid(raise_exception=True)
        old_status = service.marketplace_status
        service.marketplace_status = StoreServiceMarketplaceStatus.REJECTED
        service.save(update_fields=['marketplace_status'])
        internal_user = getattr(request, 'internal_user', None)
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="store_service_marketplace_reject",
            entity_type="store_service",
            entity_id=str(service.id),
            before={"marketplace_status": old_status},
            after={"marketplace_status": service.marketplace_status, "rejection_reason": serializer.validated_data.get('rejection_reason', '')},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"success": True, "message": f"Custom service '{service.name}' rejected from public marketplace listing. (Note: remains active in-store for local billing).", "data": self.get_serializer(service).data}, status=status.HTTP_200_OK)
class GlobalCustomerViewSet(viewsets.ModelViewSet):
    queryset = GlobalCustomer.objects.prefetch_related('store_links__store_group').all()
    serializer_class = GlobalCustomerSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'is_global']
    search_fields = ['name', 'phone_e164', 'email']
    ordering_fields = ['created_at', 'name']
    ordering = ['-created_at']
    def get_permissions(self):
        if self.action in ['process_deletion', 'destroy']:
            return [IsAuthenticated(), IsSuperAdmin()]
        if self.action in ['merge', 'create', 'update', 'partial_update']:
            return [IsAuthenticated(), IsOpsOrSuperAdmin()]
        return [IsAuthenticated(), IsReviewerOrAbove()]
    @action(detail=True, methods=['post'], url_path='process-deletion')
    def process_deletion(self, request, pk=None):
        customer = self.get_object()
        old_phone = customer.phone_e164
        old_email = customer.email
        customer.name = f"Deleted Customer {customer.id.hex[:6].upper()}"
        customer.phone_e164 = f"+91000{customer.id.hex[:7]}"
        customer.email = f"anonymized.{customer.id.hex[:8]}@dpdp-compliance.in"
        customer.status = CustomerStatus.DELETED
        customer.save(update_fields=['name', 'phone_e164', 'email', 'status'])
        internal_user = getattr(request, 'internal_user', None)
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action="customer_dpdp_anonymize",
            entity_type="customer",
            entity_id=str(customer.id),
            before={"phone": old_phone, "email": old_email},
            after={"status": "deleted_anonymized"},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": "Customer identity anonymized in full accordance with DPDP compliance; financial transaction logs preserved.",
            "data": self.get_serializer(customer).data
        }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['post'], url_path='merge', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def merge(self, request):
        serializer = CustomerMergeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        primary = get_object_or_404(GlobalCustomer, id=data['primary_customer_id'])
        secondary = get_object_or_404(GlobalCustomer, id=data['secondary_customer_id'])
        internal_user = getattr(request, 'internal_user', None)
        actor_name = internal_user.name if internal_user else "Ops Staff"
        with transaction.atomic():
            secondary_links = CustomerStoreLink.objects.filter(customer=secondary)
            links_merged_count = 0
            for sec_link in secondary_links:
                prim_link = CustomerStoreLink.objects.filter(customer=primary, store_group=sec_link.store_group).first()
                if prim_link:
                    prim_link.lifetime_spend_paise = (prim_link.lifetime_spend_paise or 0) + (sec_link.lifetime_spend_paise or 0)
                    prim_link.visit_count = (prim_link.visit_count or 0) + (sec_link.visit_count or 0)
                    if sec_link.first_visit_at:
                        if not prim_link.first_visit_at or sec_link.first_visit_at < prim_link.first_visit_at:
                            prim_link.first_visit_at = sec_link.first_visit_at
                    if sec_link.last_visit_at:
                        if not prim_link.last_visit_at or sec_link.last_visit_at > prim_link.last_visit_at:
                            prim_link.last_visit_at = sec_link.last_visit_at
                    if sec_link.notes:
                        prim_link.notes = f"{prim_link.notes or ''} | [Merged from profile {secondary.id}]: {sec_link.notes}".strip(' |')
                    prim_link.save()
                    sec_link.delete()
                else:
                    sec_link.customer = primary
                    sec_link.save(update_fields=['customer'])
                links_merged_count += 1
            merge_log = CustomerMergeLog.objects.create(
                surviving_customer_id=primary.id,
                merged_customer_id=secondary.id,
                merged_by=actor_name,
                affected_records={
                    "surviving_name": primary.name,
                    "merged_name": secondary.name,
                    "links_absorbed": links_merged_count,
                    "reason": data['reason']
                }
            )
            secondary.delete()
            AuditLog.objects.create(
                actor_id=str(getattr(internal_user, 'id', 'system')),
                actor_type="internal_user",
                action="customer_profile_merge",
                entity_type="customer_merge_log",
                entity_id=str(merge_log.id),
                before={"secondary_id": str(secondary.id), "secondary_phone": secondary.phone_e164},
                after={"primary_id": str(primary.id), "links_absorbed": links_merged_count, "reason": data['reason']},
                ip_address=request.META.get('REMOTE_ADDR')
            )
        return Response({
            "success": True,
            "message": f"Successfully merged profile '{secondary.name}' into canonical profile '{primary.name}'. Absorbed {links_merged_count} store links.",
            "data": GlobalCustomerSerializer(primary).data
        }, status=status.HTTP_200_OK)
class CustomerMergeLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomerMergeLog.objects.all()
    serializer_class = CustomerMergeLogSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['merged_by', 'surviving_customer_id', 'merged_customer_id']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated, IsReviewerOrAbove]
    @action(detail=True, methods=['post'], url_path='revert', permission_classes=[IsAuthenticated, IsOpsOrSuperAdmin])
    def revert(self, request, pk=None):
        log = self.get_object()
        if log.reverted_at:
            return Response({"error": {"code": "VALIDATION_FAILED", "message": "This merge log has already been reverted."}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        if (timezone.now() - log.created_at).days > 30:
            return Response({"error": {"code": "EXPIRED_REVERT_WINDOW", "message": "Merges can only be reverted within 30 days of execution."}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        with transaction.atomic():
            log.reverted_at = timezone.now()
            log.save(update_fields=['reverted_at'])
            GlobalCustomer.all_objects.filter(id=log.merged_customer_id).update(deleted_at=None)
            AuditLog.objects.create(
                actor_id=str(getattr(request, 'internal_user', 'system').id) if getattr(request, 'internal_user', None) else 'system',
                actor_type="internal_user",
                action="customer_merge_revert",
                entity_type="customer_merge_log",
                entity_id=str(log.id),
                before={"reverted_at": None},
                after={"reverted_at": str(log.reverted_at)},
                ip_address=request.META.get('REMOTE_ADDR')
            )
        return Response({"success": True, "message": f"Successfully reverted merge log {log.id} and un-deleted duplicate customer {log.merged_customer_id}."}, status=status.HTTP_200_OK)
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    pagination_class = MasterAdminPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['actor_type', 'action', 'entity_type']
    search_fields = ['actor_id', 'entity_id', 'action', 'ip_address']
    ordering = ['-created_at']
    permission_classes = [IsAuthenticated, IsReviewerOrAbove]
    @action(detail=False, methods=['get'], url_path='export-csv', permission_classes=[IsAuthenticated, IsReviewerOrAbove])
    def export_csv(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log_export.csv"'
        writer = csv.writer(response)
        writer.writerow(['ID', 'Actor ID', 'Actor Type', 'Action', 'Entity Type', 'Entity ID', 'Before JSON', 'After JSON', 'IP Address', 'Created At UTC'])
        for log in queryset[:1000]:
            writer.writerow([
                str(log.id), log.actor_id or '', log.actor_type, log.action,
                log.entity_type, str(log.entity_id),
                log.before or {}, log.after or {},
                log.ip_address or '', log.created_at.isoformat()
            ])
        return response
class ImpersonationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ImpersonationSession.objects.all()
    serializer_class = ImpersonationSessionSerializer
    pagination_class = MasterAdminPagination
    permission_classes = [IsAuthenticated, IsReviewerOrAbove]
    ordering = ['-started_at']
    @action(detail=False, methods=['post'], url_path='start', permission_classes=[IsAuthenticated, IsReviewerOrAbove])
    def start_session(self, request):
        serializer = ImpersonationStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        store = get_object_or_404(StoreGroup, pk=data['store_group_id'])
        if not Store.objects.filter(outlet__store_group=store).exists():
            return Response({
                "error": {"code": "STORE_UNRESOLVABLE", "message": "This store group has no linked branch outlet the Store ERP can impersonate into."}
            }, status=status.HTTP_400_BAD_REQUEST)
        internal_user = getattr(request, 'internal_user', None)
        user_role = getattr(internal_user, 'role', '')
        if data['mode'] == ImpersonationSessionMode.WRITE:
            if user_role != InternalUserRole.SUPERADMIN:
                return Response({
                    "error": {"code": "FORBIDDEN_MODE", "message": "An ops or reviewer user cannot obtain a write-mode impersonation token. Strict SuperAdmin role required."}
                }, status=status.HTTP_403_FORBIDDEN)
        impersonation_session = ImpersonationSession.objects.create(
            internal_user_id=str(getattr(internal_user, 'id', request.user.id)),
            store_group_id=str(store.id),
            mode=data['mode'],
            reason=data.get('reason', 'Support read-only inspection')
        )
        AuditLog.objects.create(
            actor_id=str(getattr(internal_user, 'id', 'system')),
            actor_type="internal_user",
            action=f"impersonation_start_{data['mode']}",
            entity_type="store_group",
            entity_id=str(store.id),
            before={"impersonation": False},
            after={"impersonation_session_id": str(impersonation_session.id), "mode": data['mode'], "reason": data.get('reason', '')},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({
            "success": True,
            "message": f"Scoped impersonation session token created for store '{store.name}' ({data['mode']}).",
            "data": {
                "session_token": str(impersonation_session.id),
                "expires_in_minutes": 60,
                "store_group_id": str(store.id),
                "mode": data['mode'],
                "started_at": impersonation_session.started_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)
    @action(detail=True, methods=['post'], url_path='end', permission_classes=[IsAuthenticated, IsReviewerOrAbove])
    def end_session(self, request, pk=None):
        session = self.get_object()
        if session.ended_at:
            return Response({"error": {"code": "VALIDATION_FAILED", "message": "This impersonation session is already closed."}}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
        session.ended_at = timezone.now()
        session.save(update_fields=['ended_at'])
        AuditLog.objects.create(
            actor_id=str(getattr(request, 'internal_user', 'system').id) if getattr(request, 'internal_user', None) else 'system',
            actor_type="internal_user",
            action="impersonation_end",
            entity_type="impersonation_session",
            entity_id=str(session.id),
            before={"ended_at": None},
            after={"ended_at": session.ended_at.isoformat()},
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return Response({"success": True, "message": "Impersonation session invalidated immediately."}, status=status.HTTP_200_OK)
class OpsHealthMetricsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsReviewerOrAbove]
    def get(self, request):
        now = timezone.now()
        last_7_days = now - timedelta(days=7)
        next_30_days = now + timedelta(days=30)
        store_stats = StoreGroup.objects.aggregate(
            total=Count('id'),
            applied=Count('id', filter=Q(status=StoreGroupStatus.APPLIED)),
            under_review=Count('id', filter=Q(status=StoreGroupStatus.UNDER_REVIEW)),
            approved=Count('id', filter=Q(status=StoreGroupStatus.APPROVED)),
            active=Count('id', filter=Q(status=StoreGroupStatus.ACTIVE)),
            suspended=Count('id', filter=Q(status=StoreGroupStatus.SUSPENDED)),
            dormant=Count('id', filter=Q(status=StoreGroupStatus.DORMANT)),
            offboarded=Count('id', filter=Q(status=StoreGroupStatus.OFFBOARDED)),
        )
        total_approved_or_active = (store_stats['approved'] or 0) + (store_stats['active'] or 0) + (store_stats['dormant'] or 0)
        weekly_active_stores = StoreGroup.objects.filter(status=StoreGroupStatus.ACTIVE).count()
        approval_to_first_login_rate_pct = round((weekly_active_stores / total_approved_or_active * 100.0), 2) if total_approved_or_active > 0 else 0.0
        codes_total_issued = AccessCode.objects.count()
        codes_total_redeemed = AccessCode.objects.aggregate(total=Sum('redemption_count'))['total'] or 0
        expiring_codes_by_tag = list(AccessCode.objects.filter(expires_at__gte=now, expires_at__lte=next_30_days).values('source_tag').annotate(count=Count('id')))
        customer_stats = GlobalCustomer.objects.aggregate(
            total=Count('id'),
            global_count=Count('id', filter=Q(is_global=True)),
            walkin_only_count=Count('id', filter=Q(is_global=False)),
            new_this_week=Count('id', filter=Q(created_at__gte=last_7_days))
        )
        pending_services = StoreService.objects.filter(marketplace_status=StoreServiceMarketplaceStatus.PENDING)
        pending_queue_size = pending_services.count()
        total_age_hours = 0
        for srv in pending_services:
            total_age_hours += (now - srv.submitted_at).total_seconds() / 3600.0
        avg_age_hours = round(total_age_hours / pending_queue_size, 2) if pending_queue_size > 0 else 0.0
        return Response({
            "success": True,
            "timestamp_utc": now.isoformat(),
            "store_metrics": {
                "status_counts": {
                    "applied": store_stats['applied'] or 0,
                    "under_review": store_stats['under_review'] or 0,
                    "approved": store_stats['approved'] or 0,
                    "active": store_stats['active'] or 0,
                    "dormant": store_stats['dormant'] or 0,
                    "suspended": store_stats['suspended'] or 0,
                    "offboarded": store_stats['offboarded'] or 0,
                    "total": store_stats['total'] or 0,
                },
                "approval_to_first_login_rate": f"{approval_to_first_login_rate_pct}%",
                "weekly_active_stores_logged_in_last_7_days": weekly_active_stores,
            },
            "access_code_metrics": {
                "issued_count": codes_total_issued,
                "redeemed_count": codes_total_redeemed,
                "expiring_in_30_days_by_source_tag": expiring_codes_by_tag
            },
            "customer_registry_metrics": {
                "total_customers": customer_stats['total'] or 0,
                "global_identities": customer_stats['global_count'] or 0,
                "walk_in_only_non_global": customer_stats['walkin_only_count'] or 0,
                "new_this_week": customer_stats['new_this_week'] or 0
            },
            "custom_service_review_queue_metrics": {
                "pending_queue_size": pending_queue_size,
                "average_age_hours": avg_age_hours
            }
        }, status=status.HTTP_200_OK)
