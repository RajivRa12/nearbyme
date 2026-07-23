from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PublicStoreViewSet,
    CustomerProfileView,
    CustomerWalletView,
    CustomerMembershipViewSet,
    CustomerAppointmentViewSet,
    GiftCardViewSet, CustomerPackageViewSet,
    PublicServiceViewSet, PublicCouponViewSet, PublicTherapistViewSet,
    FavoriteTherapistViewSet, CustomerInvoiceViewSet
)

router = DefaultRouter()
# Public APIs
router.register(r'stores', PublicStoreViewSet, basename='public-store')
router.register(r'trending-services', PublicServiceViewSet, basename='public-trending-services')
router.register(r'offers', PublicCouponViewSet, basename='public-offers')
router.register(r'recommended-therapists', PublicTherapistViewSet, basename='public-recommended-therapists')

# Authenticated APIs
router.register(r'memberships', CustomerMembershipViewSet, basename='customer-membership')
router.register(r'appointments', CustomerAppointmentViewSet, basename='customer-appointment')
router.register(r'giftcards', GiftCardViewSet, basename='customer-giftcard')
router.register(r'packages', CustomerPackageViewSet, basename='customer-package')
router.register(r'favorites', FavoriteTherapistViewSet, basename='customer-favorites')
router.register(r'invoices', CustomerInvoiceViewSet, basename='customer-invoices')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Generic API Views
    path('profile/', CustomerProfileView.as_view(), name='customer-profile'),
    path('wallet/', CustomerWalletView.as_view(), name='customer-wallet'),
]
