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
    FavoriteTherapistViewSet, StoreFavouriteViewSet, CustomerInvoiceViewSet,
    CustomerBookingViewSet,
    CustomerNotificationViewSet, CustomerReviewViewSet,
    CustomerConversationViewSet, ReferralView, LoyaltyRedeemView,
    MicrositeView,
)
router = DefaultRouter()
router.register(r'stores', PublicStoreViewSet, basename='public-store')
router.register(r'trending-services', PublicServiceViewSet, basename='public-trending-services')
router.register(r'offers', PublicCouponViewSet, basename='public-offers')
router.register(r'recommended-therapists', PublicTherapistViewSet, basename='public-recommended-therapists')
router.register(r'memberships', CustomerMembershipViewSet, basename='customer-membership')
router.register(r'appointments', CustomerAppointmentViewSet, basename='customer-appointment')
router.register(r'giftcards', GiftCardViewSet, basename='customer-giftcard')
router.register(r'packages', CustomerPackageViewSet, basename='customer-package')
router.register(r'favorites', FavoriteTherapistViewSet, basename='customer-favorites')
router.register(r'store-favourites', StoreFavouriteViewSet, basename='customer-store-favourites')
router.register(r'invoices', CustomerInvoiceViewSet, basename='customer-invoices')
router.register(r'bookings', CustomerBookingViewSet, basename='customer-booking')
router.register(r'notifications', CustomerNotificationViewSet, basename='customer-notifications')
router.register(r'my-reviews', CustomerReviewViewSet, basename='customer-reviews')
router.register(r'conversations', CustomerConversationViewSet, basename='customer-conversations')
urlpatterns = [
    path('', include(router.urls)),
    path('profile/', CustomerProfileView.as_view(), name='customer-profile'),
    path('wallet/', CustomerWalletView.as_view(), name='customer-wallet'),
    path('referral/', ReferralView.as_view(), name='customer-referral'),
    path('rewards/redeem/', LoyaltyRedeemView.as_view(), name='customer-loyalty-redeem'),
    path('microsite/<slug:slug>/', MicrositeView.as_view(), name='customer-microsite'),
]
