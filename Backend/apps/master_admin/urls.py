from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MasterAdminLoginView, MasterAdminLogoutView, MasterAdminSessionStatusView,
    StoreGroupViewSet, KycDocumentViewSet, PlanViewSet, AccessCodeViewSet,
    ServiceCategoryPhase1ViewSet, CanonicalServiceViewSet, StoreServiceViewSet,
    GlobalCustomerViewSet, CustomerMergeLogViewSet, AuditLogViewSet, OpsHealthMetricsView,
    ImpersonationViewSet,
    BankSettlementAdminViewSet,
    DashboardView,
    BusinessViewSet,
    BrandViewSet,
    StoreViewSet,
    PlatformUserViewSet,
    PlatformSettingsView,
    CouponViewSet,
    AnalyticsView,
    GlobalUserViewSet,
    GlobalMembershipViewSet,
    GlobalInvoiceViewSet,
    PlatformSubscriptionPlanViewSet,
    StoreSubscriptionViewSet,
    PlatformInvoiceViewSet,
)
router = DefaultRouter()
router.register(r'store-groups', StoreGroupViewSet, basename='store-group')
router.register(r'kyc-documents', KycDocumentViewSet, basename='kyc-document')
router.register(r'plans-phase1', PlanViewSet, basename='plan-phase1')
router.register(r'access-codes', AccessCodeViewSet, basename='access-code')
router.register(r'service-categories', ServiceCategoryPhase1ViewSet, basename='service-category')
router.register(r'canonical-services', CanonicalServiceViewSet, basename='canonical-service')
router.register(r'store-services', StoreServiceViewSet, basename='store-service')
router.register(r'global-customers', GlobalCustomerViewSet, basename='global-customer')
router.register(r'customers', GlobalCustomerViewSet, basename='customer')
router.register(r'customer-merge-logs', CustomerMergeLogViewSet, basename='customer-merge-log')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'impersonation-sessions', ImpersonationViewSet, basename='impersonation-session')
router.register(r'bank-settlements', BankSettlementAdminViewSet, basename='bank-settlement')
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'stores', StoreViewSet, basename='store')
router.register(r'users', PlatformUserViewSet, basename='platform-user')
router.register(r'global-users', GlobalUserViewSet, basename='global-user')
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'global-memberships', GlobalMembershipViewSet, basename='global-membership')
router.register(r'global-invoices', GlobalInvoiceViewSet, basename='global-invoice')
router.register(r'subscription-plans', PlatformSubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'store-subscriptions', StoreSubscriptionViewSet, basename='store-subscription')
router.register(r'platform-invoices', PlatformInvoiceViewSet, basename='platform-invoice')
urlpatterns = [
    path('auth/login/', MasterAdminLoginView.as_view(), name='master_admin_login'),
    path('auth/logout/', MasterAdminLogoutView.as_view(), name='master_admin_logout'),
    path('auth/session-status/', MasterAdminSessionStatusView.as_view(), name='master_admin_session_status'),
    path('ops-metrics/', OpsHealthMetricsView.as_view(), name='ops_health_metrics'),
    path('metrics-dashboard/', OpsHealthMetricsView.as_view(), name='metrics_dashboard'),
    path('dashboard/', DashboardView.as_view(), name='master_dashboard'),
    path('settings/', PlatformSettingsView.as_view(), name='platform_settings'),
    path('analytics/', AnalyticsView.as_view(), name='master_analytics'),
    path('', include(router.urls)),
]
