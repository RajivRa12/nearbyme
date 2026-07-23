from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TherapistProfileView,
    TherapistAppointmentViewSet,
    TherapistAppointmentItemViewSet,
    TherapistCommissionViewSet,
    CustomerNoteViewSet,
    AnnouncementViewSet,
    TrainingVideoViewSet,
    TherapistWalletView,
    TherapistDashboardViewSet,
    BeforeAfterGalleryViewSet,
    StaffCustomerCRMViewSet,
    NotificationViewSet,
    TherapistTipViewSet,
    AttendanceView,
    StaffTargetView,
    LeaderboardView,
    EarningsSummaryView,
    StaffStatsView,
    StaffTaskViewSet,
    TherapistSettingsView,
    StaffChatViewSet,
    AIDailySuggestionView,
    CustomerAIRecommendationView,
    TherapistReviewViewSet,
    StaffIncentiveViewSet,
)

router = DefaultRouter()
router.register(r'schedule', TherapistAppointmentViewSet, basename='staff-schedule')
router.register(r'notes', TherapistAppointmentItemViewSet, basename='staff-notes')
router.register(r'earnings', TherapistCommissionViewSet, basename='staff-earnings')
router.register(r'customer-notes', CustomerNoteViewSet, basename='staff-customer-notes')
router.register(r'announcements', AnnouncementViewSet, basename='staff-announcements')
router.register(r'training', TrainingVideoViewSet, basename='staff-training')
router.register(r'dashboard', TherapistDashboardViewSet, basename='staff-dashboard')
router.register(r'gallery', BeforeAfterGalleryViewSet, basename='staff-gallery')
router.register(r'crm', StaffCustomerCRMViewSet, basename='staff-crm')
router.register(r'notifications', NotificationViewSet, basename='staff-notifications')
router.register(r'tips', TherapistTipViewSet, basename='staff-tips')
router.register(r'tasks', StaffTaskViewSet, basename='staff-tasks')
router.register(r'chat', StaffChatViewSet, basename='staff-chat')
router.register(r'reviews', TherapistReviewViewSet, basename='staff-reviews')
router.register(r'incentives', StaffIncentiveViewSet, basename='staff-incentives')

urlpatterns = [
    path('', include(router.urls)),
    path('profile/', TherapistProfileView.as_view(), name='staff-profile'),
    path('wallet/', TherapistWalletView.as_view(), name='staff-wallet'),
    path('attendance/', AttendanceView.as_view(), name='staff-attendance'),
    path('target/', StaffTargetView.as_view(), name='staff-target'),
    path('leaderboard/', LeaderboardView.as_view(), name='staff-leaderboard'),
    path('earnings-summary/', EarningsSummaryView.as_view(), name='staff-earnings-summary'),
    path('stats/', StaffStatsView.as_view(), name='staff-stats'),
    path('settings/', TherapistSettingsView.as_view(), name='staff-settings'),
    path('ai-suggestions/', AIDailySuggestionView.as_view(), name='staff-ai-suggestions'),
    path('customer-crm/<int:pk>/ai_recommendations/', CustomerAIRecommendationView.as_view(), name='staff-customer-ai'),
]
