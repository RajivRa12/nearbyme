from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.utils import timezone
from .models import (
    User, Brand, Store, Business,
    PlatformSettings, Coupon,
    ServiceCategory, Service, StaffAvailability,
    Appointment, AppointmentItem,
    Invoice, Payment,
    MembershipTier, CustomerMembership,
    PurchaseOrder, PurchaseOrderItem, Expense, StaffIncentive,
    InternalUser, City, Zone, Plan, AccessCode, AccessCodeRedemption,
    StoreGroup, StoreStatusHistory, KycDocument, KycDocStatus, Outlet,
    BankSettlementAccount,
    ServiceCategoryPhase1, CanonicalService, StoreService, StoreServiceOutletOverride,
    Professional, ProfessionalSkill, Resource, ProfessionalShift, ProfessionalTimeOff,
    Booking, AppointmentSlot, CommissionRule, CommissionAccrual, CreditNote,
    MembershipPlan, Membership, PackagePlan, Package, Campaign, CampaignSend,
    GlobalCustomer, CustomerStoreLink, CustomerConsent, CustomerMergeLog,
    AuditLog, ImpersonationSession,
    Vendor, Product, Room, Shift, Attendance, LeaveRequest, MarketingCampaign, DailyRegister,
    Payroll, ServiceProduct, StockMovement,
    ProfessionalAccount, ProfessionalPortfolio, ProfessionalCertification,
    PayoutDestination, ProfessionalTip,
    ProfessionalReview, ReviewResponse, ReputationAggregate, ReputationConsent,
    PlatformSubscriptionPlan, StoreSubscription, PlatformInvoice,
    PlatformCommissionLedger, AdCampaign, PaymentGatewayRevenue,
    InsurancePartner, MarketplaceProduct, TrainingCourse,
    StorePublicProfile, CityMarketplaceFlag, OnlinePayment, QueueEntry, SlotHold, CustomerFavourite,
)
admin.site.site_header = "NearByMe Master Admin Panel (Phase 1 | v2)"
admin.site.site_title = "NearByMe Master Admin"
admin.site.index_title = "Platform Operations & Governance Portal"
class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone')}),
        ('Salon/Spa Context', {'fields': ('role', 'brand', 'store')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'role', 'brand', 'store'),
        }),
    )
    list_display = ('email', 'first_name', 'last_name', 'role', 'brand', 'store', 'is_active', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active', 'brand', 'store')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_type', 'email', 'phone', 'city', 'state', 'status', 'created_at')
    list_filter = ('status', 'business_type', 'country', 'state')
    search_fields = ('name', 'email', 'phone', 'city')
    ordering = ('-created_at',)
@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'status', 'created_at')
    list_filter = ('status', 'business')
    search_fields = ('name', 'business__name')
    ordering = ('-created_at',)
@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'brand', 'business', 'contact_number', 'email', 'city_from_address', 'status', 'is_premium_listing', 'created_at')
    list_filter = ('status', 'is_premium_listing', 'brand', 'business', 'currency', 'timezone')
    list_editable = ('is_premium_listing',)
    search_fields = ('name', 'email', 'contact_number', 'address')
    ordering = ('-created_at',)
    def city_from_address(self, obj):
        return obj.address[:30] + '...' if len(obj.address) > 30 else obj.address
    city_from_address.short_description = 'Address'
@admin.register(StorePublicProfile)
class StorePublicProfileAdmin(admin.ModelAdmin):
    list_display = ('store', 'slug', 'is_microsite_live', 'marketplace_public', 'created_at')
    list_filter = ('is_microsite_live', 'marketplace_public')
    list_editable = ('is_microsite_live', 'marketplace_public')
    search_fields = ('store__name', 'slug', 'custom_domain')
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
@admin.register(CityMarketplaceFlag)
class CityMarketplaceFlagAdmin(admin.ModelAdmin):
    list_display = ('city', 'is_public', 'min_store_threshold', 'enabled_at')
    list_filter = ('is_public',)
    list_editable = ('is_public', 'min_store_threshold')
    search_fields = ('city__name',)
    def save_model(self, request, obj, form, change):
        if obj.is_public and not obj.enabled_at:
            obj.enabled_at = timezone.now()
        super().save_model(request, obj, form, change)
@admin.register(QueueEntry)
class QueueEntryAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'outlet', 'status', 'checked_in_at', 'called_at', 'started_at', 'completed_at')
    list_filter = ('status', 'outlet')
    search_fields = ('guest_name', 'guest_phone', 'customer__name', 'customer__phone_e164')
    autocomplete_fields = ('outlet', 'customer', 'store_service')
    readonly_fields = ('id', 'checked_in_at')
    ordering = ('-checked_in_at',)
@admin.register(SlotHold)
class SlotHoldAdmin(admin.ModelAdmin):
    list_display = ('store_service', 'professional', 'slot_start', 'slot_end', 'status', 'expires_at', 'customer', 'created_at')
    list_filter = ('status', 'outlet')
    list_editable = ('status',)
    search_fields = ('session_token', 'customer__name', 'customer__phone_e164', 'store_service__name')
    autocomplete_fields = ('outlet', 'store_service', 'professional', 'resource', 'customer')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)
@admin.register(OnlinePayment)
class OnlinePaymentAdmin(admin.ModelAdmin):
    list_display = ('gateway_order_id', 'store_service', 'payment_type', 'amount_paise', 'total_amount_paise', 'status', 'booking', 'customer', 'confirmed_at', 'created_at')
    list_filter = ('status', 'gateway')
    search_fields = ('gateway_order_id', 'gateway_payment_id', 'customer__name', 'customer__phone_e164')
    autocomplete_fields = ('store_service', 'booking', 'customer')
    readonly_fields = ('id', 'confirmed_at', 'created_at', 'updated_at')
    ordering = ('-created_at',)
@admin.register(PlatformSubscriptionPlan)
class PlatformSubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'monthly_price', 'commission_percent', 'includes_crm', 'includes_analytics', 'includes_ai_assistant', 'includes_premium_listing', 'is_active', 'created_at')
    list_filter = ('is_active', 'includes_crm', 'includes_analytics', 'includes_ai_assistant', 'includes_premium_listing')
    list_editable = ('is_active', 'includes_crm', 'includes_analytics', 'includes_ai_assistant', 'includes_premium_listing')
    search_fields = ('name',)
    ordering = ('monthly_price',)
@admin.register(StoreSubscription)
class StoreSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('store', 'plan', 'status', 'current_period_end', 'stripe_subscription_id', 'created_at')
    list_filter = ('status', 'plan')
    list_editable = ('status',)
    search_fields = ('store__name', 'stripe_customer_id', 'stripe_subscription_id')
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
@admin.register(PlatformInvoice)
class PlatformInvoiceAdmin(admin.ModelAdmin):
    list_display = ('store', 'amount', 'status', 'stripe_invoice_id', 'created_at')
    list_filter = ('status',)
    search_fields = ('store__name', 'stripe_invoice_id', 'description')
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
    def has_add_permission(self, request):
        return False
@admin.register(PlatformCommissionLedger)
class PlatformCommissionLedgerAdmin(admin.ModelAdmin):
    list_display = ('store', 'booking', 'gross_amount_paise', 'commission_percent_applied', 'commission_paise', 'created_at')
    list_filter = ('commission_percent_applied',)
    search_fields = ('store__name',)
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
    def has_add_permission(self, request):
        # Auto-computed when a booking completes (see apps/store_erp/views.py BookingViewSet.complete).
        return False
@admin.register(AdCampaign)
class AdCampaignAdmin(admin.ModelAdmin):
    list_display = ('title', 'store', 'placement', 'status', 'start_date', 'end_date', 'budget_paise', 'created_at')
    list_filter = ('placement', 'status')
    list_editable = ('status',)
    search_fields = ('title', 'store__name')
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
@admin.register(PaymentGatewayRevenue)
class PaymentGatewayRevenueAdmin(admin.ModelAdmin):
    list_display = ('gateway', 'period_month', 'store', 'gross_volume_paise', 'gateway_fee_paise', 'net_revenue_paise', 'created_at')
    list_filter = ('gateway',)
    search_fields = ('store__name', 'period_month', 'notes')
    autocomplete_fields = ('store',)
    ordering = ('-created_at',)
@admin.register(InsurancePartner)
class InsurancePartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'revenue_share_percent', 'contact_email', 'contract_start', 'contract_end')
    list_filter = ('status',)
    list_editable = ('status',)
    search_fields = ('name', 'contact_email')
    ordering = ('name',)
@admin.register(MarketplaceProduct)
class MarketplaceProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor_name', 'category', 'price_paise', 'is_active', 'created_at')
    list_filter = ('is_active', 'category')
    list_editable = ('is_active',)
    search_fields = ('name', 'vendor_name', 'category')
    ordering = ('name',)
@admin.register(TrainingCourse)
class TrainingCourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'instructor_name', 'category', 'duration_hours', 'price_paise', 'is_active', 'created_at')
    list_filter = ('is_active', 'category')
    list_editable = ('is_active',)
    search_fields = ('title', 'instructor_name', 'category')
    ordering = ('title',)
@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ('platform_name', 'support_email', 'default_currency', 'gst_percentage', 'maintenance_mode')
    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()
    def has_delete_permission(self, request, obj=None):
        return False
@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'start_date', 'end_date', 'usage_limit', 'used_count', 'is_active')
    list_filter = ('is_active', 'discount_type')
    search_fields = ('code',)
    ordering = ('-created_at',)
admin.site.register(User, CustomUserAdmin)
@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'business', 'is_active', 'created_at')
    list_filter = ('is_active', 'business')
    search_fields = ('name',)
@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'duration_minutes', 'is_active')
    list_filter = ('is_active', 'category__business')
    search_fields = ('name',)
@admin.register(StaffAvailability)
class StaffAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('staff', 'day_of_week', 'start_time', 'end_time', 'is_available')
    list_filter = ('day_of_week', 'is_available', 'staff__store')
@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'store', 'outlet', 'customer', 'start_time', 'status')
    list_filter = ('status', 'store', 'outlet')
    search_fields = ('customer__email', 'id')
    date_hierarchy = 'start_time'
@admin.register(AppointmentItem)
class AppointmentItemAdmin(admin.ModelAdmin):
    list_display = ('appointment', 'service', 'therapist', 'price')
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'store', 'outlet', 'grand_total_paise', 'status', 'finalised_at', 'created_at')
    list_filter = ('status', 'store', 'outlet')
    search_fields = ('invoice_number', 'customer__email')
    date_hierarchy = 'created_at'
    readonly_fields = ('finalised_at',)
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'method', 'amount_paise', 'created_at')
    list_filter = ('method',)
@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'price', 'discount_percentage', 'duration_days', 'is_active')
    list_filter = ('store', 'is_active')
@admin.register(CustomerMembership)
class CustomerMembershipAdmin(admin.ModelAdmin):
    list_display = ('customer', 'tier', 'start_date', 'end_date', 'is_active')
    list_filter = ('tier__store', 'is_active')
    search_fields = ('customer__email', 'customer__first_name')
class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'vendor', 'store', 'outlet', 'status', 'total_amount', 'order_date')
    list_filter = ('status', 'store', 'outlet')
    inlines = [PurchaseOrderItemInline]
@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('category', 'amount', 'store', 'outlet', 'date_incurred')
    list_filter = ('category', 'store', 'outlet')
    date_hierarchy = 'date_incurred'
@admin.register(StaffIncentive)
class StaffIncentiveAdmin(admin.ModelAdmin):
    list_display = ('title', 'staff', 'store', 'outlet', 'amount', 'is_paid_out', 'created_at')
    list_filter = ('is_paid_out', 'store', 'outlet')
    search_fields = ('title', 'staff__email')
@admin.register(InternalUser)
class InternalUserAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'role', 'is_active', 'last_login_at')
    list_filter = ('role', 'is_active')
    search_fields = ('name', 'email', 'phone')
    readonly_fields = ('deleted_at',)
@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'is_active')
    list_filter = ('state', 'is_active')
    search_fields = ('name',)
@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'is_active')
    list_filter = ('city', 'is_active')
    search_fields = ('name', 'city__name')
@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price_paise', 'billing_period', 'outlet_limit', 'professional_limit', 'is_active')
    list_filter = ('is_active', 'billing_period')
    search_fields = ('name',)
    readonly_fields = ('deleted_at',)
@admin.register(AccessCode)
class AccessCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'plan', 'duration_days', 'max_redemptions', 'redemption_count', 'status', 'expires_at')
    list_filter = ('status', 'plan')
    search_fields = ('code', 'issued_by')
    readonly_fields = ('deleted_at',)
@admin.register(AccessCodeRedemption)
class AccessCodeRedemptionAdmin(admin.ModelAdmin):
    list_display = ('access_code', 'store_group', 'redeemed_at', 'term_start', 'term_end')
    search_fields = ('store_group__name', 'access_code__code')
@admin.register(StoreGroup)
class StoreGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'business_type', 'status', 'owner_name', 'owner_phone', 'created_at')
    list_filter = ('status', 'business_type')
    search_fields = ('name', 'owner_name', 'owner_phone', 'legal_name')
    readonly_fields = ('id', 'created_at', 'deleted_at')
@admin.register(StoreStatusHistory)
class StoreStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('store_group', 'from_status', 'to_status', 'changed_by', 'changed_by_type', 'created_at')
    list_filter = ('to_status', 'changed_by_type')
    search_fields = ('store_group__name', 'reason')
class OutletAppointmentInline(admin.TabularInline):
    model = Appointment
    fields = ('customer', 'start_time', 'end_time', 'status')
    readonly_fields = ('customer', 'start_time', 'end_time', 'status')
    extra = 0
    max_num = 0
    verbose_name = "Recent Appointment"
    verbose_name_plural = "Recent Appointments (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('-start_time')
    def has_add_permission(self, request, obj=None):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False
class OutletInvoiceInline(admin.TabularInline):
    model = Invoice
    fields = ('invoice_number', 'customer', 'grand_total_paise', 'status', 'created_at')
    readonly_fields = ('invoice_number', 'customer', 'grand_total_paise', 'status', 'created_at')
    extra = 0
    max_num = 0
    verbose_name = "Recent POS Invoice"
    verbose_name_plural = "Recent POS Customer Invoices (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def get_queryset(self, request):
        return super().get_queryset(request).order_by('-created_at')
    def has_add_permission(self, request, obj=None):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False
class OutletStaffInline(admin.TabularInline):
    model = User
    fields = ('email', 'role', 'phone', 'is_active')
    readonly_fields = ('email', 'role', 'phone', 'is_active')
    extra = 0
    max_num = 0
    verbose_name = "Assigned Staff / User"
    verbose_name_plural = "Assigned Staff Members & Receptionists (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletPurchaseOrderInline(admin.TabularInline):
    model = PurchaseOrder
    fields = ('vendor', 'status', 'order_date', 'total_amount')
    readonly_fields = ('vendor', 'status', 'order_date', 'total_amount')
    extra = 0
    max_num = 0
    verbose_name = "Purchase Order"
    verbose_name_plural = "Recent Stock Purchase Orders (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def get_queryset(self, request): return super().get_queryset(request).order_by('-order_date')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletExpenseInline(admin.TabularInline):
    model = Expense
    fields = ('category', 'amount', 'date_incurred', 'description')
    readonly_fields = ('category', 'amount', 'date_incurred', 'description')
    extra = 0
    max_num = 0
    verbose_name = "Operational Expense"
    verbose_name_plural = "Recent Operational Expenses (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def get_queryset(self, request): return super().get_queryset(request).order_by('-date_incurred')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletIncentiveInline(admin.TabularInline):
    model = StaffIncentive
    fields = ('title', 'staff', 'amount', 'is_paid_out', 'created_at')
    readonly_fields = ('title', 'staff', 'amount', 'is_paid_out', 'created_at')
    extra = 0
    max_num = 0
    verbose_name = "Staff Incentive / Bonus"
    verbose_name_plural = "Recent Staff Incentives & Bonuses (Branch Preview — Read Only)"
    show_change_link = True
    can_delete = False
    def get_queryset(self, request): return super().get_queryset(request).order_by('-created_at')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletProductInline(admin.TabularInline):
    model = Product
    fields = ('name', 'sku', 'retail_price', 'stock_quantity')
    readonly_fields = ('name', 'sku', 'retail_price', 'stock_quantity')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Inventory Product"
    verbose_name_plural = "Store Inventory Products (Branch Preview — Read Only)"
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletVendorInline(admin.TabularInline):
    model = Vendor
    fields = ('name', 'contact_person', 'phone')
    readonly_fields = ('name', 'contact_person', 'phone')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Vendor / Supplier"
    verbose_name_plural = "Store Vendors & Suppliers (Branch Preview — Read Only)"
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletRoomInline(admin.TabularInline):
    model = Room
    fields = ('name', 'is_active')
    readonly_fields = ('name', 'is_active')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Salon Room"
    verbose_name_plural = "Treatment & Salon Rooms (Branch Preview — Read Only)"
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletShiftInline(admin.TabularInline):
    model = Shift
    fields = ('staff', 'date', 'start_time', 'end_time')
    readonly_fields = ('staff', 'date', 'start_time', 'end_time')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Staff Shift"
    verbose_name_plural = "Staff Shifts & Schedules (Branch Preview — Read Only)"
    def get_queryset(self, request): return super().get_queryset(request).order_by('-date')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletAttendanceInline(admin.TabularInline):
    model = Attendance
    fields = ('staff', 'date', 'clock_in', 'clock_out', 'status')
    readonly_fields = ('staff', 'date', 'clock_in', 'clock_out', 'status')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Attendance Log"
    verbose_name_plural = "Staff Daily Attendance Logs (Branch Preview — Read Only)"
    def get_queryset(self, request): return super().get_queryset(request).order_by('-date')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletLeaveRequestInline(admin.TabularInline):
    model = LeaveRequest
    fields = ('staff', 'start_date', 'end_date', 'status')
    readonly_fields = ('staff', 'start_date', 'end_date', 'status')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Leave Request"
    verbose_name_plural = "Staff Leave Requests (Branch Preview — Read Only)"
    def get_queryset(self, request): return super().get_queryset(request).order_by('-start_date')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletPayrollInline(admin.TabularInline):
    model = Payroll
    fields = ('staff', 'month_year', 'total_payout', 'status')
    readonly_fields = ('staff', 'month_year', 'total_payout', 'status')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Payroll Record"
    verbose_name_plural = "Staff Payroll Records (Branch Preview — Read Only)"
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletDailyRegisterInline(admin.TabularInline):
    model = DailyRegister
    fields = ('date', 'opening_balance', 'total_cash_collected', 'status')
    readonly_fields = ('date', 'opening_balance', 'total_cash_collected', 'status')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Daily Register"
    verbose_name_plural = "Daily Cash Registers & Till Reports (Branch Preview — Read Only)"
    def get_queryset(self, request): return super().get_queryset(request).order_by('-date')
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
class OutletCampaignInline(admin.TabularInline):
    model = MarketingCampaign
    fields = ('name', 'channel', 'status', 'sent_at')
    readonly_fields = ('name', 'channel', 'status', 'sent_at')
    extra = 0; max_num = 0; show_change_link = True; can_delete = False
    verbose_name = "Marketing Campaign"
    verbose_name_plural = "Store Marketing Campaigns (Branch Preview — Read Only)"
    def has_add_permission(self, request, obj=None): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
@admin.register(Outlet)
class OutletAdmin(admin.ModelAdmin):
    list_display = ('name', 'store_group', 'city', 'zone', 'status', 'created_at')
    list_filter = ('status', 'city')
    search_fields = ('name', 'store_group__name', 'phone')
    readonly_fields = ('id', 'created_at', 'deleted_at')
    inlines = [
        OutletStaffInline, OutletAppointmentInline, OutletInvoiceInline,
        OutletProductInline, OutletVendorInline, OutletPurchaseOrderInline,
        OutletExpenseInline, OutletRoomInline, OutletShiftInline,
        OutletAttendanceInline, OutletLeaveRequestInline, OutletPayrollInline,
        OutletIncentiveInline, OutletDailyRegisterInline, OutletCampaignInline
    ]
@admin.register(ServiceCategoryPhase1)
class ServiceCategoryPhase1Admin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'applies_to', 'display_order', 'is_active')
    list_filter = ('applies_to', 'is_active')
    search_fields = ('name',)
    readonly_fields = ('deleted_at',)
@admin.register(CanonicalService)
class CanonicalServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'resource_type', 'default_duration_min', 'gender_applicability', 'is_active')
    list_filter = ('resource_type', 'gender_applicability', 'is_active', 'category')
    search_fields = ('name', 'skill_tag')
    readonly_fields = ('deleted_at',)
@admin.register(StoreService)
class StoreServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'store_group', 'canonical_service', 'default_price_paise', 'deposit_percentage', 'duration_min', 'is_active_in_store', 'marketplace_status', 'submitted_at')
    list_filter = ('marketplace_status', 'is_active_in_store')
    list_editable = ('deposit_percentage',)
    search_fields = ('name', 'store_group__name')
    readonly_fields = ('deleted_at',)
@admin.register(StoreServiceOutletOverride)
class StoreServiceOutletOverrideAdmin(admin.ModelAdmin):
    list_display = ('store_service', 'outlet', 'price_paise', 'duration_min', 'is_available')
    list_filter = ('is_available',)
    search_fields = ('store_service__name', 'outlet__name')
class ProfessionalSkillInline(admin.TabularInline):
    model = ProfessionalSkill
    extra = 0
class ProfessionalShiftInline(admin.TabularInline):
    model = ProfessionalShift
    extra = 0
class ProfessionalTimeOffInline(admin.TabularInline):
    model = ProfessionalTimeOff
    extra = 0
@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'display_role', 'outlet', 'store_group', 'link_status', 'is_bookable', 'created_at')
    list_filter = ('link_status', 'is_bookable', 'outlet')
    search_fields = ('display_name', 'phone_e164', 'email')
    readonly_fields = ('deleted_at',)
    inlines = [ProfessionalSkillInline, ProfessionalShiftInline, ProfessionalTimeOffInline]
@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'outlet', 'resource_type', 'capacity', 'is_bookable', 'created_at')
    list_filter = ('resource_type', 'is_bookable', 'outlet')
    search_fields = ('name', 'outlet__name')
    readonly_fields = ('deleted_at',)
class AppointmentSlotInline(admin.TabularInline):
    model = AppointmentSlot
    extra = 0
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'outlet', 'customer', 'source', 'status', 'booking_start', 'booking_end')
    list_filter = ('status', 'source', 'outlet')
    search_fields = ('id', 'customer__name', 'customer__phone_e164')
    readonly_fields = ('deleted_at',)
    inlines = [AppointmentSlotInline]
@admin.register(AppointmentSlot)
class AppointmentSlotAdmin(admin.ModelAdmin):
    list_display = ('booking', 'store_service', 'professional', 'resource', 'slot_start', 'slot_end', 'status', 'was_overridden')
    list_filter = ('status', 'was_overridden')
    search_fields = ('booking__id', 'store_service__name', 'professional__display_name')
@admin.register(CommissionRule)
class CommissionRuleAdmin(admin.ModelAdmin):
    list_display = ('store_group', 'professional', 'applies_to', 'rate_type', 'rate_value', 'effective_from')
    list_filter = ('applies_to', 'rate_type')
    search_fields = ('store_group__name', 'professional__display_name')
@admin.register(CommissionAccrual)
class CommissionAccrualAdmin(admin.ModelAdmin):
    list_display = ('professional', 'invoice_line', 'base_paise', 'commission_paise', 'created_at')
    search_fields = ('professional__display_name',)
    readonly_fields = ('id', 'invoice_line', 'professional', 'base_paise', 'commission_paise', 'created_at')
    def has_change_permission(self, request, obj=None):
        return False
@admin.register(CreditNote)
class CreditNoteAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount_paise', 'created_by', 'created_at')
    search_fields = ('invoice__invoice_number', 'reason')
@admin.register(MembershipPlan)
class MembershipPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'store_group', 'price_paise', 'value_paise', 'validity_days', 'is_active')
    list_filter = ('is_active', 'store_group')
    search_fields = ('name', 'store_group__name')
    readonly_fields = ('deleted_at',)
@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ('plan_name', 'customer', 'store_group', 'value_paise_remaining', 'valid_until', 'status')
    list_filter = ('status',)
    search_fields = ('plan_name', 'customer__name', 'customer__phone_e164')
@admin.register(PackagePlan)
class PackagePlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'store_group', 'price_paise', 'validity_days', 'is_active')
    list_filter = ('is_active', 'store_group')
    search_fields = ('name', 'store_group__name')
    readonly_fields = ('deleted_at',)
@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'customer', 'store_group', 'valid_until')
    search_fields = ('name', 'customer__name', 'customer__phone_e164')
@admin.register(ServiceProduct)
class ServiceProductAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'quantity_used')
    search_fields = ('service__name', 'store_service__name', 'product__name')
@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('product', 'quantity_deducted', 'invoice', 'created_at')
    list_filter = ('product',)
    search_fields = ('product__name', 'invoice__invoice_number')
    readonly_fields = ('id', 'product', 'invoice', 'quantity_deducted', 'reason', 'created_at')
    def has_change_permission(self, request, obj=None):
        return False
class CampaignSendInline(admin.TabularInline):
    model = CampaignSend
    extra = 0
    readonly_fields = ('customer', 'sent_at', 'opened_at')
@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ('name', 'store_group', 'channel', 'target_type', 'status', 'sent_at')
    list_filter = ('status', 'channel', 'target_type')
    search_fields = ('name', 'store_group__name')
    readonly_fields = ('deleted_at', 'status', 'sent_at')
    inlines = [CampaignSendInline]
@admin.register(GlobalCustomer)
class GlobalCustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone_e164', 'status', 'is_global', 'created_at')
    list_filter = ('status', 'is_global')
    search_fields = ('name', 'phone_e164', 'email')
    readonly_fields = ('deleted_at',)
@admin.register(CustomerStoreLink)
class CustomerStoreLinkAdmin(admin.ModelAdmin):
    list_display = ('customer', 'store_group', 'visit_count', 'lifetime_spend_paise', 'lifecycle_stage', 'last_visit_at')
    list_filter = ('lifecycle_stage',)
    search_fields = ('customer__name', 'customer__phone_e164', 'store_group__name')
    readonly_fields = ('deleted_at',)
@admin.register(CustomerConsent)
class CustomerConsentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'consent_type', 'granted', 'granted_at', 'revoked_at')
    list_filter = ('consent_type', 'granted')
    search_fields = ('customer__name', 'customer__phone_e164')
@admin.register(CustomerMergeLog)
class CustomerMergeLogAdmin(admin.ModelAdmin):
    list_display = ('surviving_customer_id', 'merged_customer_id', 'merged_by', 'created_at', 'reverted_at')
    search_fields = ('merged_by', 'surviving_customer_id', 'merged_customer_id')
@admin.register(CustomerFavourite)
class CustomerFavouriteAdmin(admin.ModelAdmin):
    list_display = ('customer', 'store', 'professional_account', 'created_at')
    search_fields = ('customer__name', 'customer__phone_e164', 'store__name')
    autocomplete_fields = ('customer', 'store', 'professional_account')
    ordering = ('-created_at',)
@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'actor_type', 'actor_id', 'entity_type', 'entity_id', 'ip_address', 'created_at')
    list_filter = ('actor_type', 'action', 'entity_type')
    search_fields = ('actor_id', 'entity_id', 'action')
    readonly_fields = ('id', 'actor_id', 'actor_type', 'action', 'entity_type', 'entity_id', 'before', 'after', 'ip_address', 'created_at')
@admin.register(ImpersonationSession)
class ImpersonationSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'internal_user_id', 'store_group_id', 'mode', 'reason', 'started_at', 'ended_at')
    list_filter = ('mode',)
    search_fields = ('internal_user_id', 'store_group_id')
original_get_app_list = admin.site.get_app_list
def custom_get_app_list(request, app_label=None):
    app_dict = admin.site._build_app_dict(request)
    groups = {
        '🔒 1. Platform Security & Role Governance': [
            'Internal users', 'Impersonation sessions', 'Groups'
        ],
        '🏬 2. Store Groups & Branch Directory': [
            'Store groups', 'Outlets', 'Kyc documents', 'Store status histories', 'Cities', 'Zones',
            'Store public profiles', 'City marketplace flags',
        ],
        '💳 3. Platform Access Plans & Codes': [
            'Plans', 'Access codes', 'Access code redemptions'
        ],
        '💇‍♀️ 4. Master Service Taxonomy & Moderation': [
            'Service category phase1s', 'Canonical services',
            'Store services', 'Store service outlet overrides'
        ],
        '🌍 5. Global Customer & Consent Governance': [
            'Global customers', 'Customer store links', 'Customer consents', 'Customer merge logs', 'Customer favourites'
        ],
        '📊 6. Store ERP & Daily Branch Operations': [
            'Appointments', 'Appointment items', 'Invoices', 'Payments', 'Purchase orders', 'Purchase order items', 'Expenses', 'Staff incentives',
            'Online payments', 'Queue entries', 'Slot holds',
        ],
        '👥 7. Store Staff & Legacy CRM': [
            'Users', 'Staff availabilities', 'Membership tiers', 'Customer memberships', 'Coupons'
        ],
        '📜 8. Universal Audit Trail & Governance': [
            'Audit logs', 'Platform Settings'
        ],
        '🏢 9. Legacy Entity Registry': [
            'Businesses', 'Brands', 'Stores', 'Service categories', 'Services'
        ],
        '💰 10. Revenue & Monetization': [
            'Platform subscription plans', 'Store subscriptions', 'Platform invoices',
            'Platform commission ledgers', 'Ad campaigns', 'Payment gateway revenues',
            'Insurance partners', 'Marketplace products', 'Training courses',
        ],
    }
    new_app_list = []
    all_models = {}
    for app in app_dict.values():
        for model in app['models']:
            all_models[model['name']] = model
    for group_name, model_names in groups.items():
        group_models = []
        for model_name in model_names:
            if model_name in all_models:
                group_models.append(all_models[model_name])
        if group_models:
            safe_label = group_name.encode('ascii', 'ignore').decode().lower().strip()
            safe_label = ''.join(c if c.isalnum() or c == '_' else '_' for c in safe_label)
            new_app_list.append({
                'name': group_name,
                'app_label': safe_label,
                'app_url': '',
                'has_module_perms': True,
                'models': group_models,
            })
    assigned_models = [m for sublist in groups.values() for m in sublist]
    other_models = [m for name, m in all_models.items() if name not in assigned_models]
    if other_models:
        new_app_list.append({
            'name': 'Other (Additional Models)',
            'app_label': 'other',
            'app_url': '',
            'has_module_perms': True,
            'models': other_models,
        })
    return new_app_list
admin.site.get_app_list = custom_get_app_list
def admin_approve_kyc_docs(modeladmin, request, queryset):
    now = timezone.now()
    updated = 0
    for doc in queryset.exclude(status=KycDocStatus.APPROVED):
        doc.status = KycDocStatus.APPROVED
        doc.reviewed_by = request.user.email
        doc.reviewed_at = now
        doc.rejection_reason = ''
        doc.save()
        updated += 1
    modeladmin.message_user(request, f"✅ {updated} KYC document(s) approved.", messages.SUCCESS)
admin_approve_kyc_docs.short_description = "✅ Approve selected KYC documents"
def admin_reject_kyc_docs(modeladmin, request, queryset):
    now = timezone.now()
    updated = 0
    for doc in queryset.exclude(status=KycDocStatus.REJECTED):
        doc.status = KycDocStatus.REJECTED
        doc.reviewed_by = request.user.email
        doc.reviewed_at = now
        doc.rejection_reason = "Rejected by Master Admin. Please re-upload a clearer, valid document."
        doc.save()
        updated += 1
    modeladmin.message_user(request, f"❌ {updated} KYC document(s) rejected. Store owners must re-upload.", messages.WARNING)
admin_reject_kyc_docs.short_description = "❌ Reject selected KYC documents"
class BankSettlementInline(admin.StackedInline):
    model = BankSettlementAccount
    fields = (
        'account_holder_name', 'bank_name', 'ifsc_code', 'account_type',
        'is_verified', 'weekly_payout_enabled', 'activated_by', 'activated_at', 'rejection_reason'
    )
    readonly_fields = ('submitted_at', 'submitted_by', 'activated_at', 'activated_by')
    extra = 0
    max_num = 1
    verbose_name = "Bank Settlement Account"
    verbose_name_plural = "🏦 Payout Bank Settlement Account"
    def has_add_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False
class KycDocumentInline(admin.TabularInline):
    model = KycDocument
    fields = ('doc_type', 'status', 'uploaded_at', 'reviewed_by', 'reviewed_at', 'rejection_reason')
    readonly_fields = ('doc_type', 'uploaded_at', 'reviewed_at')
    extra = 0
    max_num = 0
    verbose_name_plural = "📎 KYC Document Submissions"
    can_delete = False
    def has_add_permission(self, request, obj=None):
        return False
@admin.register(KycDocument)
class KycDocumentAdmin(admin.ModelAdmin):
    list_display = ('store_group', 'doc_type', 'status', 'uploaded_at', 'reviewed_by', 'reviewed_at')
    list_filter = ('status', 'doc_type')
    search_fields = ('store_group__name',)
    readonly_fields = ('uploaded_at', 'reviewed_at')
    actions = [admin_approve_kyc_docs, admin_reject_kyc_docs]
def admin_activate_bank_settlement(modeladmin, request, queryset):
    updated = queryset.filter(is_verified=False).update(
        is_verified=True,
        weekly_payout_enabled=True,
        activated_by=request.user.email,
        activated_at=timezone.now()
    )
    modeladmin.message_user(request, f"✅ {updated} bank account(s) verified & payouts activated.", messages.SUCCESS)
admin_activate_bank_settlement.short_description = "✅ Activate weekly payouts for selected accounts"
@admin.register(BankSettlementAccount)
class BankSettlementAccountAdmin(admin.ModelAdmin):
    list_display = (
        'store_group', 'account_holder_name', 'bank_name', 'ifsc_code',
        'account_type', 'is_verified', 'weekly_payout_enabled', 'submitted_at'
    )
    list_filter = ('is_verified', 'weekly_payout_enabled', 'account_type')
    search_fields = ('store_group__name', 'bank_name', 'ifsc_code', 'account_holder_name')
    readonly_fields = ('id', 'submitted_at', 'submitted_by', 'activated_at', 'activated_by')
    actions = [admin_activate_bank_settlement]
    fieldsets = (
        ('🏦 Bank Details (Submitted by Store Owner)', {
            'fields': ('store_group', 'account_holder_name', 'account_number', 'ifsc_code', 'bank_name', 'branch_name', 'account_type', 'submitted_at', 'submitted_by')
        }),
        ('🔒 Verification & Payout Activation (HQ Only)', {
            'fields': ('is_verified', 'weekly_payout_enabled', 'activated_at', 'activated_by', 'rejection_reason')
        }),
    )
class ProfessionalPortfolioInline(admin.TabularInline):
    model = ProfessionalPortfolio
    extra = 0
class ProfessionalCertificationInline(admin.TabularInline):
    model = ProfessionalCertification
    extra = 0
@admin.register(ProfessionalAccount)
class ProfessionalAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'phone_e164', 'years_experience', 'created_at')
    search_fields = ('name', 'phone_e164', 'user__email')
    inlines = [ProfessionalPortfolioInline, ProfessionalCertificationInline]
@admin.register(PayoutDestination)
class PayoutDestinationAdmin(admin.ModelAdmin):
    list_display = ('professional_account', 'type', 'verification_status', 'is_active', 'created_at')
    list_filter = ('type', 'verification_status', 'is_active')
    search_fields = ('professional_account__name', 'vpa', 'holder_name')
@admin.register(ProfessionalTip)
class ProfessionalTipAdmin(admin.ModelAdmin):
    list_display = ('professional_account', 'booking', 'amount_paise', 'method', 'status', 'initiated_at')
    list_filter = ('method', 'status')
    search_fields = ('professional_account__name',)
    readonly_fields = ('id', 'initiated_at')
class ReviewResponseInline(admin.StackedInline):
    model = ReviewResponse
    extra = 0
@admin.register(ProfessionalReview)
class ProfessionalReviewAdmin(admin.ModelAdmin):
    list_display = ('store_group', 'professional_account', 'store_rating', 'professional_rating', 'moderation_status', 'created_at')
    list_filter = ('moderation_status', 'store_rating')
    search_fields = ('store_group__name', 'professional_account__name', 'comment')
    inlines = [ReviewResponseInline]
@admin.register(ReputationAggregate)
class ReputationAggregateAdmin(admin.ModelAdmin):
    list_display = ('professional_account', 'avg_rating', 'total_reviews', 'total_services', 'updated_at')
    search_fields = ('professional_account__name',)
    readonly_fields = ('id', 'professional_account', 'avg_rating', 'total_reviews', 'total_services', 'updated_at')
    def has_add_permission(self, request):
        return False
@admin.register(ReputationConsent)
class ReputationConsentAdmin(admin.ModelAdmin):
    list_display = ('professional_account', 'portability_granted', 'updated_at')
    search_fields = ('professional_account__name',)
