from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TherapistProfileView,
    PayoutDestinationViewSet,
    ProfessionalTipViewSet,
    ProfessionalReviewViewSet,
    TherapistScheduleViewSet,
    TherapistCommissionAccrualView,
    ReputationConsentView,
    TherapistPhotoUploadView,
)
router = DefaultRouter()
router.register(r'payout-destinations', PayoutDestinationViewSet, basename='therapist-payout-destination')
router.register(r'tips', ProfessionalTipViewSet, basename='therapist-tip')
router.register(r'reviews', ProfessionalReviewViewSet, basename='therapist-review')
router.register(r'schedule', TherapistScheduleViewSet, basename='therapist-schedule')
urlpatterns = [
    path('', include(router.urls)),
    path('profile/', TherapistProfileView.as_view(), name='therapist-profile'),
    path('reputation-consent/', ReputationConsentView.as_view(), name='therapist-reputation-consent'),
    path('commissions/', TherapistCommissionAccrualView.as_view(), name='therapist-commissions'),
    path('upload-photo/', TherapistPhotoUploadView.as_view(), name='therapist-upload-photo'),
]
