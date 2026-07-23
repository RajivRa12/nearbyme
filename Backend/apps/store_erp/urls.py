from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceCategoryViewSet,
    ServiceViewSet,
    StaffAvailabilityViewSet,
    AppointmentViewSet,
    InvoiceViewSet,
    CustomerViewSet,
    MembershipTierViewSet,
    WalletViewSet,
    VendorViewSet,
    ProductViewSet,
    PurchaseOrderViewSet,
    ExpenseViewSet,
    CommissionViewSet,
    DashboardViewSet,
    ERPGiftCardViewSet,
    ERPServicePackageViewSet,
    ERPCustomerPackageViewSet,
    RoomViewSet,
    ShiftViewSet,
    AttendanceViewSet,
    LeaveRequestViewSet,
    MarketingCampaignViewSet,
    ERPCouponViewSet,
    DailyRegisterViewSet,
    StaffDocumentViewSet, StaffTargetViewSet, PayrollViewSet,
    LeaderboardView, FinancialReportView,
    ServiceProductViewSet, StockTransferViewSet, ReferralViewSet,
    WaitlistViewSet, CustomerCRMViewSet, StaffViewSet, StaffTrainingViewSet
)

router = DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'staff-training', StaffTrainingViewSet, basename='staff-training')
router.register(r'categories', ServiceCategoryViewSet, basename='service-category')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'availability', StaffAvailabilityViewSet, basename='staff-availability')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'memberships', MembershipTierViewSet, basename='membership-tier')
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'commissions', CommissionViewSet, basename='commission')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'giftcards', ERPGiftCardViewSet, basename='erp-giftcard')
router.register(r'service-packages', ERPServicePackageViewSet, basename='erp-service-package')
router.register(r'customer-packages', ERPCustomerPackageViewSet, basename='erp-customer-package')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'leaves', LeaveRequestViewSet, basename='leave')
router.register(r'campaigns', MarketingCampaignViewSet, basename='campaign')
router.register(r'coupons', ERPCouponViewSet, basename='erp-coupon')
router.register(r'registers', DailyRegisterViewSet, basename='daily-register')
router.register(r'staff-documents', StaffDocumentViewSet, basename='staff-document')
router.register(r'staff-targets', StaffTargetViewSet, basename='staff-target')
router.register(r'payroll', PayrollViewSet, basename='payroll')
router.register(r'service-products', ServiceProductViewSet, basename='service-product')
router.register(r'stock-transfers', StockTransferViewSet, basename='stock-transfer')
router.register(r'referrals', ReferralViewSet, basename='referral')
router.register(r'waitlist', WaitlistViewSet, basename='waitlist')
router.register(r'crm', CustomerCRMViewSet, basename='customer-crm')

urlpatterns = [
    path('', include(router.urls)),
    path('leaderboard/', LeaderboardView.as_view(), name='erp-leaderboard'),
    path('financial-reports/', FinancialReportView.as_view(), name='erp-financial-reports'),
]
