from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RegisterView, CustomTokenObtainPairView, RequestOTPView, VerifyOTPView, ChangePasswordView
urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('otp/request/', RequestOTPView.as_view(), name='auth_otp_request'),
    path('otp/verify/', VerifyOTPView.as_view(), name='auth_otp_verify'),
    path('change-password/', ChangePasswordView.as_view(), name='auth_change_password'),
]
