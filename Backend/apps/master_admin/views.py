from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Count, Sum, Avg
from django.utils import timezone

from apps.core.models import (
    Business, Brand, Store, User, Role,
    SubscriptionPlan, BusinessSubscription,
    PlatformSettings, Coupon, Review,
    BusinessStatus, ReviewStatus,
    Invoice, MembershipTier, Commission, InvoiceStatus
)
from .serializers import (
    BusinessSerializer, BrandSerializer, StoreSerializer,
    PlatformUserSerializer, SubscriptionPlanSerializer,
    BusinessSubscriptionSerializer, PlatformSettingsSerializer,
    CouponSerializer, ReviewSerializer,
    PlatformUserSerializer, GlobalMembershipSerializer,
    GlobalInvoiceSerializer, GlobalCommissionSerializer
)
from .permissions import IsMasterAdmin


def success_response(data, message="Success", status_code=200, meta=None):
    payload = {"success": True, "message": message, "data": data}
    if meta:
        payload["meta"] = meta
    return Response(payload, status=status_code)


# DASHBOARD 

class DashboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsMasterAdmin]

    def get(self, request):
        now = timezone.now()
        businesses = Business.objects.all()
        stores = Store.objects.all()
        users = User.objects.all()

        total_revenue = Invoice.objects.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total'))['grand_total__sum'] or 0

        top_stores = stores.annotate(
            revenue=Sum('invoices__grand_total', filter=models.Q(invoices__status=InvoiceStatus.PAID))
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


# BUSINESS

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


# BRAND 

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.select_related('business').all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'business']
    search_fields = ['name', 'business__name']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']


# MODULE 4: 

class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related('brand', 'business').all()
    serializer_class = StoreSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'brand', 'business', 'currency', 'timezone']
    search_fields = ['name', 'email', 'contact_number', 'address']
    ordering_fields = ['name', 'created_at', 'status']
    ordering = ['-created_at']


#  PLATFORM USERS 

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


# SUBSCRIPTION PLANS

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'billing_cycle']
    search_fields = ['name']
    ordering_fields = ['price', 'name', 'created_at']
    ordering = ['price']


class BusinessSubscriptionViewSet(viewsets.ModelViewSet):
    queryset = BusinessSubscription.objects.select_related('business', 'plan').all()
    serializer_class = BusinessSubscriptionSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'business', 'plan']
    search_fields = ['business__name', 'plan__name']
    ordering_fields = ['start_date', 'end_date', 'status']
    ordering = ['-created_at']


# PLATFORM SETTINGS 

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


# COUPONS 

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


# REVIEWS 

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related('store').all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'store', 'rating']
    search_fields = ['customer_name', 'customer_email', 'comment']
    ordering_fields = ['rating', 'created_at', 'status']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.status = ReviewStatus.APPROVED
        review.save()
        return success_response(ReviewSerializer(review).data, "Review approved")

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.status = ReviewStatus.REJECTED
        review.save()
        return success_response(ReviewSerializer(review).data, "Review rejected")


# GLOBAL MANAGEMENT 

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


class GlobalCommissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Commission.objects.all()
    serializer_class = GlobalCommissionSerializer
    permission_classes = [IsAuthenticated, IsMasterAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['store', 'is_paid_out', 'therapist']
    ordering = ['-created_at']



# ANALYTICS 

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

        gmv_agg = Invoice.objects.filter(status=InvoiceStatus.PAID).aggregate(total=Sum('grand_total'))
        gmv = gmv_agg['total'] or 0
        
        rev_agg = BusinessSubscription.objects.filter(status='ACTIVE').aggregate(total=Sum('plan__price'))
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
