from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DashboardView,
    BusinessViewSet,
    BrandViewSet,
    StoreViewSet,
    PlatformUserViewSet,
    SubscriptionPlanViewSet,
    BusinessSubscriptionViewSet,
    PlatformSettingsView,
    CouponViewSet,
    ReviewViewSet,
    AnalyticsView,
    GlobalUserViewSet,
    GlobalMembershipViewSet,
    GlobalInvoiceViewSet,
    GlobalCommissionViewSet
)

router = DefaultRouter()
router.register(r'businesses', BusinessViewSet, basename='business')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'stores', StoreViewSet, basename='store')
router.register(r'users', PlatformUserViewSet, basename='platform-user')
router.register(r'global-users', GlobalUserViewSet, basename='global-user')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'business-subscriptions', BusinessSubscriptionViewSet, basename='business-subscription')
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'global-memberships', GlobalMembershipViewSet, basename='global-membership')
router.register(r'global-invoices', GlobalInvoiceViewSet, basename='global-invoice')
router.register(r'global-commissions', GlobalCommissionViewSet, basename='global-commission')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='master_dashboard'),

    path('settings/', PlatformSettingsView.as_view(), name='platform_settings'),

    path('analytics/', AnalyticsView.as_view(), name='master_analytics'),

    path('', include(router.urls)),
]
