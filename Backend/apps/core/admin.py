from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import (
    User, Brand, Store, Business,
    SubscriptionPlan, BusinessSubscription,
    PlatformSettings, Coupon, Review,
    ServiceCategory, Service, StaffAvailability,
    Appointment, AppointmentItem,
    Invoice, InvoiceItem, Payment, Tip,
    MembershipTier, CustomerMembership, Wallet, WalletTransaction,
    Vendor, Product, PurchaseOrder, PurchaseOrderItem,
    Expense, Commission, StaffIncentive
)

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
    list_display = ('name', 'brand', 'business', 'contact_number', 'email', 'city_from_address', 'status', 'created_at')
    list_filter = ('status', 'brand', 'business', 'currency', 'timezone')
    search_fields = ('name', 'email', 'contact_number', 'address')
    ordering = ('-created_at',)

    def city_from_address(self, obj):
        return obj.address[:30] + '...' if len(obj.address) > 30 else obj.address
    city_from_address.short_description = 'Address'

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'billing_cycle', 'max_stores', 'max_staff', 'max_customers', 'is_active')
    list_filter = ('billing_cycle', 'is_active')
    search_fields = ('name',)

@admin.register(BusinessSubscription)
class BusinessSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('business', 'plan', 'start_date', 'end_date', 'status')
    list_filter = ('status', 'plan')
    search_fields = ('business__name', 'plan__name')

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

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('customer_name', 'store', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating', 'store')
    search_fields = ('customer_name', 'customer_email', 'comment')
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
    list_display = ('id', 'store', 'customer', 'start_time', 'status')
    list_filter = ('status', 'store')
    search_fields = ('customer__email', 'id')
    date_hierarchy = 'start_time'

@admin.register(AppointmentItem)
class AppointmentItemAdmin(admin.ModelAdmin):
    list_display = ('appointment', 'service', 'therapist', 'price')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'store', 'grand_total', 'status', 'created_at')
    list_filter = ('status', 'store')
    search_fields = ('invoice_number', 'customer__email')
    date_hierarchy = 'created_at'

@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'service', 'quantity', 'total')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'method', 'amount', 'created_at')
    list_filter = ('method',)

@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = ('therapist', 'amount', 'created_at')

@admin.register(MembershipTier)
class MembershipTierAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'price', 'discount_percentage', 'duration_days', 'is_active')
    list_filter = ('store', 'is_active')

@admin.register(CustomerMembership)
class CustomerMembershipAdmin(admin.ModelAdmin):
    list_display = ('customer', 'tier', 'start_date', 'end_date', 'is_active')
    list_filter = ('tier__store', 'is_active')
    search_fields = ('customer__email', 'customer__first_name')

@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ('customer', 'balance', 'updated_at')
    search_fields = ('customer__email',)

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('wallet', 'transaction_type', 'amount', 'created_at')
    list_filter = ('transaction_type',)
    search_fields = ('wallet__customer__email',)

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'store', 'contact_person', 'phone')
    list_filter = ('store',)

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'store', 'retail_price', 'stock_quantity')
    list_filter = ('store', 'brand')
    search_fields = ('name', 'sku')

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'vendor', 'store', 'status', 'total_amount', 'order_date')
    list_filter = ('status', 'store')
    inlines = [PurchaseOrderItemInline]

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('category', 'amount', 'store', 'date_incurred')
    list_filter = ('category', 'store')
    date_hierarchy = 'date_incurred'

@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    list_display = ('therapist', 'amount', 'is_paid_out', 'created_at')
    list_filter = ('is_paid_out', 'therapist__store')

@admin.register(StaffIncentive)
class StaffIncentiveAdmin(admin.ModelAdmin):
    list_display = ('title', 'staff', 'store', 'amount', 'is_paid_out', 'created_at')
    list_filter = ('is_paid_out', 'store')
    search_fields = ('title', 'staff__email')

original_get_app_list = admin.site.get_app_list

def custom_get_app_list(request, app_label=None):
    app_dict = admin.site._build_app_dict(request)
    
    
    groups = {
        'Authentication & Authorization': ['Users', 'Groups', 'Roles', 'Permissions'],
        'Business Management': ['Businesses', 'Brands', 'Stores', 'Store Settings'],
        'Staff Management': ['Staff', 'Staff Availabilities', 'Departments', 'Attendance', 'Shifts'],
        'Customer Management': ['Customers', 'Memberships', 'Wallets', 'Loyalty'],
        'Service Management': ['Service Categories', 'Services', 'Packages', 'Add-ons'],
        'Appointments': ['Appointments', 'Appointment items', 'Rooms', 'Time Slots'],
        'Billing': ['Invoices', 'Invoice items', 'Payments', 'Refunds', 'Coupons', 'Tips'],
        'Inventory': ['Products', 'Vendors', 'Purchase Orders', 'Stock'],
        'Marketing': ['Campaigns', 'Reviews', 'Referrals'],
        'Finance': ['Taxes', 'Expenses', 'Commissions'],
        'Analytics': ['Reports', 'Revenue', 'AI Logs'],
        'Platform': ['Subscription plans', 'Business subscriptions', 'Platform Settings', 'Notification Templates']
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
            new_app_list.append({
                'name': group_name,
                'app_label': group_name.lower().replace(' ', '_').replace('&', 'and'),
                'app_url': '',
                'has_module_perms': True,
                'models': group_models,
            })
            
    assigned_models = [m for sublist in groups.values() for m in sublist]
    other_models = [m for name, m in all_models.items() if name not in assigned_models]
    
    if other_models:
        new_app_list.append({
            'name': 'Other',
            'app_label': 'other',
            'app_url': '',
            'has_module_perms': True,
            'models': other_models,
        })
        
    return new_app_list

admin.site.get_app_list = custom_get_app_list
