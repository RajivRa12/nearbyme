import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager

# ROLES

class Role(models.TextChoices):
    MASTER_ADMIN = 'MASTER_ADMIN', 'Master Admin'
    BRAND_OWNER = 'BRAND_OWNER', 'Brand Owner'
    STORE_ADMIN = 'STORE_ADMIN', 'Store Admin'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    THERAPIST = 'THERAPIST', 'Therapist'
    CUSTOMER = 'CUSTOMER', 'Customer'


# BUSINESS

class BusinessStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Approval'
    ACTIVE = 'ACTIVE', 'Active'
    SUSPENDED = 'SUSPENDED', 'Suspended'

class BusinessType(models.TextChoices):
    SALON = 'SALON', 'Salon'
    SPA = 'SPA', 'Spa'
    BEAUTY_CLINIC = 'BEAUTY_CLINIC', 'Beauty Clinic'
    MASSAGE_CENTER = 'MASSAGE_CENTER', 'Massage Center'
    BARBER_SHOP = 'BARBER_SHOP', 'Barber Shop'
    NAIL_STUDIO = 'NAIL_STUDIO', 'Nail Studio'
    TATTOO_STUDIO = 'TATTOO_STUDIO', 'Tattoo Studio'
    MAKEUP_ARTIST = 'MAKEUP_ARTIST', 'Makeup Artist'
    HOME_BEAUTY_SERVICES = 'HOME_BEAUTY_SERVICES', 'Home Beauty Services'
    WELLNESS_CENTRE = 'WELLNESS_CENTRE', 'Wellness Centre'
    BEAUTY_ACADEMY = 'BEAUTY_ACADEMY', 'Beauty Academy'
    SKIN_CLINIC = 'SKIN_CLINIC', 'Skin Clinic'
    HAIR_CLINIC = 'HAIR_CLINIC', 'Hair Clinic'
    COSMETIC_CLINIC = 'COSMETIC_CLINIC', 'Cosmetic Clinic'
    LASER_CLINIC = 'LASER_CLINIC', 'Laser Clinic'
    AYURVEDA_CENTRE = 'AYURVEDA_CENTRE', 'Ayurveda Centre'
    PHYSIOTHERAPY_CENTRE = 'PHYSIOTHERAPY_CENTRE', 'Physiotherapy Centre'
    YOGA_STUDIO = 'YOGA_STUDIO', 'Yoga Studio'
    FITNESS_STUDIO = 'FITNESS_STUDIO', 'Fitness Studio'
    NUTRITION_CENTRE = 'NUTRITION_CENTRE', 'Nutrition Centre'
    MEDICAL_SPA = 'MEDICAL_SPA', 'Medical Spa'

class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=30, choices=BusinessType.choices, default=BusinessType.SALON)
    registration_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    website = models.URLField(blank=True, null=True)
    logo = models.ImageField(upload_to='business_logos/', blank=True, null=True)
    address = models.TextField()
    country = models.CharField(max_length=100, default='India')
    state = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=BusinessStatus.choices, default=BusinessStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Business'
        verbose_name_plural = 'Businesses'

    def __str__(self):
        return f"{self.name} ({self.business_type})"


# BRAND 

class BrandStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'

class Brand(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='brands', null=True, blank=True)
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='brand_logos/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=BrandStatus.choices, default=BrandStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('name', 'business')

    def __str__(self):
        return f"{self.name} — {self.business.name}"



# STORE 

class StoreStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'

class Store(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='stores', null=True, blank=True)
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name='stores', null=True, blank=True)
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True, help_text="lat,long e.g. 12.9716,77.5946")
    working_hours = models.JSONField(
        default=dict,
        help_text='e.g. {"mon": "09:00-21:00", "tue": "09:00-21:00", "sun": "closed"}'
    )
    currency = models.CharField(max_length=10, default='INR')
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=StoreStatus.choices, default=StoreStatus.ACTIVE)
    is_premium_listing = models.BooleanField(default=False, help_text="Bumps store in marketplace search for a fee")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.brand.name}"


# SUBSCRIPTION PLANS

class BillingCycle(models.TextChoices):
    MONTHLY = 'MONTHLY', 'Monthly'
    QUARTERLY = 'QUARTERLY', 'Quarterly'
    YEARLY = 'YEARLY', 'Yearly'

class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    EXPIRED = 'EXPIRED', 'Expired'
    CANCELLED = 'CANCELLED', 'Cancelled'
    TRIAL = 'TRIAL', 'Trial'

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.MONTHLY)
    max_stores = models.PositiveIntegerField(default=1)
    max_staff = models.PositiveIntegerField(default=5)
    max_customers = models.PositiveIntegerField(default=500)
    features = models.JSONField(default=list, help_text='List of feature strings e.g. ["AI Analytics", "SMS Marketing"]')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price']

    def __str__(self):
        return f"{self.name} — ₹{self.price}/{self.billing_cycle}"

class BusinessSubscription(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices, default=SubscriptionStatus.TRIAL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business.name} → {self.plan.name} ({self.status})"


# PLATFORM SETTINGS (singleton)


class PlatformSettings(models.Model):
    platform_name = models.CharField(max_length=255, default='NearbyMe')
    support_email = models.EmailField(default='support@nearbyme.in')
    support_phone = models.CharField(max_length=20, default='+91 00000 00000')
    default_currency = models.CharField(max_length=10, default='INR')
    gst_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    platform_commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=10.00, help_text="Platform cut from marketplace bookings")
    gateway_fee_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=2.00, help_text="Payment processing fee")
    timezone = models.CharField(max_length=50, default='Asia/Kolkata')
    maintenance_mode = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Platform Settings'
        verbose_name_plural = 'Platform Settings'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return f"Platform Settings — {self.platform_name}"


# COUPONS

class DiscountType(models.TextChoices):
    PERCENTAGE = 'PERCENTAGE', 'Percentage'
    FLAT = 'FLAT', 'Flat Amount'

class Coupon(models.Model):
    store = models.ForeignKey('Store', on_delete=models.CASCADE, related_name='coupons', null=True, blank=True)
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    maximum_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Cap on max discount for percentage coupons")
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(default=1)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Coupon: {self.code} ({self.discount_type} — {self.discount_value})"


# REVIEWS

class ReviewStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Moderation'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'

class Review(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='reviews')
    customer_name = models.CharField(max_length=255)
    customer_email = models.EmailField(blank=True, null=True)
    therapist = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews', help_text="Staff member this review is for")
    rating = models.PositiveSmallIntegerField(default=5, help_text="Rating from 1 to 5")
    comment = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=ReviewStatus.choices, default=ReviewStatus.PENDING)
    reply_text = models.TextField(blank=True, null=True, help_text="Staff or store reply to the review")
    replied_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Review by {self.customer_name} for {self.store.name} — {self.rating}★"


# USER MODEL

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        if 'username' not in extra_fields or not extra_fields['username']:
            extra_fields['username'] = email
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', Role.MASTER_ADMIN)
        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    loyalty_points = models.PositiveIntegerField(default=0)
    expo_push_token = models.CharField(max_length=255, blank=True, null=True, help_text="Expo push token for mobile notifications")

    objects = UserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role})"

# STORE ERP 

class ServiceCategory(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='service_categories')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Service Categories"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.business.name})"


class Service(models.Model):
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=150)
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_home_service_available = models.BooleanField(default=False)
    is_premium_listing = models.BooleanField(default=False, help_text="Bumps service in marketplace search for a fee")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} - ₹{self.price} ({self.duration_minutes}m)"


class StaffAvailability(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')
    day_of_week = models.PositiveSmallIntegerField(help_text="0=Monday, 6=Sunday")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Staff Availabilities"
        unique_together = ('staff', 'day_of_week')
        ordering = ['day_of_week', 'start_time']

    def __str__(self):
        return f"{self.staff.email} - Day {self.day_of_week} ({self.start_time} to {self.end_time})"


class AppointmentStatus(models.TextChoices):
    BOOKED = 'BOOKED', 'Booked'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
    PAUSED = 'PAUSED', 'Paused'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'
    NO_SHOW = 'NO_SHOW', 'No Show'
    RESCHEDULE_REQUESTED = 'RESCHEDULE_REQUESTED', 'Reschedule Requested'


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='appointments')
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    guest_name = models.CharField(max_length=255, blank=True, null=True, help_text="For walk-ins without an account")
    guest_phone = models.CharField(max_length=20, blank=True, null=True)
    room = models.ForeignKey('Room', on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=20, choices=[('WALK_IN', 'Walk In'), ('ONLINE', 'Online'), ('PHONE', 'Phone')], default='WALK_IN')
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.BOOKED)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = models.CharField(max_length=20, choices=[('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly')], blank=True, null=True)
    recurrence_end_date = models.DateField(blank=True, null=True)
    is_group = models.BooleanField(default=False)
    group_size = models.PositiveIntegerField(default=1)
    is_home_service = models.BooleanField(default=False)
    service_address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f"Appt {self.id} at {self.store.name} ({self.start_time})"


class AppointmentItem(models.Model):
    appointment = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name='items')
    service = models.ForeignKey(Service, on_delete=models.PROTECT)
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Locked price at time of booking")

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_therapist_id = None
        if not is_new:
            try:
                old_therapist_id = AppointmentItem.objects.get(pk=self.pk).therapist_id
            except AppointmentItem.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        if self.therapist and self.therapist.expo_push_token:
            if is_new or (old_therapist_id != self.therapist_id):
                from apps.core.notifications import send_expo_push_notification
                service_name = self.service.name if self.service else "a service"
                appt_time = self.appointment.start_time.strftime("%I:%M %p")
                send_expo_push_notification(
                    token=self.therapist.expo_push_token,
                    title="New Appointment! 📅",
                    body=f"You've been assigned for {service_name} today at {appt_time}.",
                    data={"appointment_id": str(self.appointment.id)}
                )

    def __str__(self):
        return f"Item for Appt {self.appointment.id}: {self.service.name}"


# BILLING & INVOICES

class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Credit/Debit Card'
    UPI = 'UPI', 'UPI'
    WALLET = 'WALLET', 'Wallet'
    GIFT_CARD = 'GIFT_CARD', 'Gift Card'
    PACKAGE = 'PACKAGE', 'Package Redemption'

class InvoiceStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PAID = 'PAID', 'Paid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    REFUNDED = 'REFUNDED', 'Refunded'

class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='invoices')
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Calculated revenue for Nearbyme")
    gateway_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Calculated payment processing fee")
    
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.UNPAID)
    requires_manager_approval = models.BooleanField(default=False)
    is_discount_approved = models.BooleanField(default=False)
    is_review_reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.invoice_number} ({self.store.name}) - ₹{self.grand_total}"

class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        name = self.service.name if self.service else "Item"
        return f"{name} (x{self.quantity}) - {self.invoice.invoice_number}"

class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_reference = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"₹{self.amount} via {self.method} for {self.invoice.invoice_number}"

class Tip(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='tips')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'THERAPIST'})
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"₹{self.amount} tip for {self.therapist.email}"


# CUSTOMER CRM & LOYALTY 
class MembershipTier(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='membership_tiers')
    name = models.CharField(max_length=100)
    tier_type = models.CharField(max_length=50, choices=[('STANDARD', 'Standard'), ('VIP', 'VIP'), ('CORPORATE', 'Corporate'), ('MONTHLY', 'Monthly'), ('ANNUAL', 'Annual')], default='STANDARD')
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage off on all services")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Cost to buy this membership")
    duration_days = models.PositiveIntegerField(default=365)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.store.name})"

class CustomerMembership(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships', limit_choices_to={'role': 'CUSTOMER'})
    tier = models.ForeignKey(MembershipTier, on_delete=models.CASCADE)
    start_date = models.DateField(auto_now_add=True)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_frozen = models.BooleanField(default=False)
    frozen_until = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.customer.get_full_name()} - {self.tier.name}"

class Wallet(models.Model):
    customer = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet', limit_choices_to={'role': 'CUSTOMER'})
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet for {self.customer.get_full_name()} - ₹{self.balance}"

class TransactionType(models.TextChoices):
    CREDIT = 'CREDIT', 'Credit (Add Funds)'
    DEBIT = 'DEBIT', 'Debit (Spend Funds)'

class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.transaction_type} ₹{self.amount} - {self.wallet.customer.get_full_name()}"


# INVENTORY 

class Vendor(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='vendors')
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.store.name})"

class Product(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, unique=True, help_text="Barcode / Stock Keeping Unit")
    barcode = models.CharField(max_length=255, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    retail_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock_quantity = models.IntegerField(default=0)
    low_stock_warning = models.IntegerField(default=5)
    expiry_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} - {self.stock_quantity} left"

class POStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    RECEIVED = 'RECEIVED', 'Received'
    CANCELLED = 'CANCELLED', 'Cancelled'

class PurchaseOrder(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='purchase_orders')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True)
    order_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=POStatus.choices, default=POStatus.PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PO {self.id} for {self.vendor.name if self.vendor else 'Unknown'}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.unit_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"


# FINANCE 

class ExpenseCategory(models.TextChoices):
    RENT = 'RENT', 'Rent'
    UTILITIES = 'UTILITIES', 'Utilities'
    SALARY = 'SALARY', 'Salary'
    MARKETING = 'MARKETING', 'Marketing'
    SUPPLIES = 'SUPPLIES', 'Supplies'
    PETTY_CASH = 'PETTY_CASH', 'Petty Cash'
    OTHER = 'OTHER', 'Other'

class Expense(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='expenses')
    category = models.CharField(max_length=20, choices=ExpenseCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_incurred = models.DateField()
    description = models.TextField(blank=True, null=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - ₹{self.amount} on {self.date_incurred}"

class Commission(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='commissions')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'THERAPIST'})
    invoice_item = models.OneToOneField(InvoiceItem, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Commission for {self.therapist.get_full_name()} - ₹{self.amount}"

# GIFT CARDS & PACKAGES

class GiftCard(models.Model):
    code = models.CharField(max_length=20, unique=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='gift_cards')
    purchaser = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='purchased_gift_cards')
    recipient_email = models.EmailField(blank=True, null=True)
    initial_value = models.DecimalField(max_digits=10, decimal_places=2)
    current_balance = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} (₹{self.current_balance})"

class ServicePackage(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='packages')
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Discounted bundle price")
    services = models.ManyToManyField(Service, related_name='packages')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - ₹{self.price}"

class CustomerPackage(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='packages')
    package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE)
    purchase_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.customer.email} - {self.package.name}"

#  ROOMS, HR, MARKETING, AND ADVANCED FINANCE 

class Room(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='rooms')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.store.name} - {self.name}"

class Shift(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='shifts')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='shifts')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"{self.staff.get_full_name()} Shift on {self.date}"

class AttendanceStatus(models.TextChoices):
    PRESENT = 'PRESENT', 'Present'
    ABSENT = 'ABSENT', 'Absent'
    HALF_DAY = 'HALF_DAY', 'Half Day'

class Attendance(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='attendances')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)

    def __str__(self):
        return f"{self.staff.get_full_name()} Attendance on {self.date}"

class StaffTraining(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='staff_trainings')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role__in': [Role.RECEPTIONIST, Role.THERAPIST, Role.STORE_ADMIN]}, related_name='trainings')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    completion_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=50, choices=[('PENDING', 'Pending'), ('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed')], default='PENDING')
    certification_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.title} - {self.staff.get_full_name()}"

class LeaveStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'

class LeaveRequest(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='leave_requests')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leave_requests')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)

    def __str__(self):
        return f"Leave request by {self.staff.get_full_name()} ({self.status})"

class MarketingChannel(models.TextChoices):
    SMS = 'SMS', 'SMS'
    EMAIL = 'EMAIL', 'Email'
    WHATSAPP = 'WHATSAPP', 'WhatsApp'

class MarketingCampaign(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=255)
    channel = models.CharField(max_length=20, choices=MarketingChannel.choices)
    message_body = models.TextField()
    target_audience = models.CharField(max_length=100, help_text="e.g., ALL_CUSTOMERS, INACTIVE_CUSTOMERS")
    status = models.CharField(max_length=20, default='DRAFT') # DRAFT, SENT
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

class RegisterStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    CLOSED = 'CLOSED', 'Closed'

class DailyRegister(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='daily_registers')
    date = models.DateField()
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cash_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_card_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=RegisterStatus.choices, default=RegisterStatus.OPEN)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Register {self.store.name} - {self.date}"

# STAFF APP  

class CustomerNote(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notes_received')
    therapist = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='notes_written')
    note_text = models.TextField()
    image_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Note by {self.therapist.get_full_name() if self.therapist else 'Unknown'} for {self.customer.get_full_name()}"

class TherapistProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='therapist_profile')
    bio = models.TextField(blank=True, null=True)
    instagram_link = models.URLField(blank=True, null=True)
    specializations = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., Hair Coloring, Bridal Makeup")
    years_of_experience = models.IntegerField(default=0)
    certificates = models.JSONField(default=list, blank=True, help_text="List of certificate names/urls")
    awards = models.JSONField(default=list, blank=True, help_text="List of awards")
    languages = models.JSONField(default=list, blank=True, help_text="List of spoken languages")

    def __str__(self):
        return f"Profile of {self.user.get_full_name()}"

class Announcement(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='announcements', null=True, blank=True, help_text="If null, visible to all stores")
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class TrainingVideo(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    video_url = models.URLField()
    category = models.CharField(max_length=100, blank=True, null=True, help_text="e.g., Technical, Soft Skills, Product Training")
    is_premium = models.BooleanField(default=False, help_text="Requires payment to access")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class FavoriteTherapist(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorite_therapists')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('customer', 'therapist')

    def __str__(self):
        return f"{self.customer.get_full_name()} favorited {self.therapist.get_full_name()}"

# ADVANCED HR & FINANCE 

class StaffDocument(models.Model):
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    title = models.CharField(max_length=255)
    document_url = models.URLField()
    document_type = models.CharField(max_length=50, choices=[('ID', 'ID Proof'), ('CERTIFICATE', 'Certificate'), ('CONTRACT', 'Contract')])
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} for {self.staff.get_full_name()}"

class StaffTarget(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='staff_targets')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='targets')
    month_year = models.CharField(max_length=7, help_text="MM-YYYY")
    revenue_target = models.DecimalField(max_digits=10, decimal_places=2)
    achieved_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('staff', 'month_year')

    def __str__(self):
        return f"Target for {self.staff.get_full_name()} ({self.month_year})"

class PayrollStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'

class Payroll(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='payrolls')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payrolls')
    month_year = models.CharField(max_length=7, help_text="MM-YYYY")
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commissions_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    incentives = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_payout = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=PayrollStatus.choices, default=PayrollStatus.PENDING)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('staff', 'month_year')

    def __str__(self):
        return f"Payroll for {self.staff.get_full_name()} ({self.month_year})"

class StaffIncentive(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='incentives')
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incentives')
    title = models.CharField(max_length=255, help_text="e.g., Monthly Bonus, Top Performer")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} for {self.staff.get_full_name()}"

# ADVANCED INVENTORY & MARKETING 

class ServiceProduct(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='products_used')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity_used}x {self.product.name} for {self.service.name}"

class StockTransferStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    COMPLETED = 'COMPLETED', 'Completed'
    CANCELLED = 'CANCELLED', 'Cancelled'

class StockTransfer(models.Model):
    from_store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='transfers_out')
    to_store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='transfers_in')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=StockTransferStatus.choices, default=StockTransferStatus.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.quantity}x {self.product.name} from {self.from_store.name} to {self.to_store.name}"

class Referral(models.Model):
    referrer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals_made')
    referred_user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='referred_by')
    reward_points_awarded = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.referrer.get_full_name()} referred {self.referred_user.get_full_name()}"

class WaitlistStatus(models.TextChoices):
    WAITING = 'WAITING', 'Waiting'
    NOTIFIED = 'NOTIFIED', 'Notified'
    BOOKED = 'BOOKED', 'Booked'
    CANCELLED = 'CANCELLED', 'Cancelled'

class Waitlist(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='waitlists')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='waitlists')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    preferred_date = models.DateField()
    preferred_time_slot = models.CharField(max_length=100, help_text="e.g. Morning, Afternoon, or specific time")
    status = models.CharField(max_length=20, choices=WaitlistStatus.choices, default=WaitlistStatus.WAITING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Waitlist for {self.customer.get_full_name()} on {self.preferred_date}"

# CUSTOMER CRM

class SkinType(models.TextChoices):
    NORMAL = 'NORMAL', 'Normal'
    DRY = 'DRY', 'Dry'
    OILY = 'OILY', 'Oily'
    COMBINATION = 'COMBINATION', 'Combination'
    SENSITIVE = 'SENSITIVE', 'Sensitive'

class HairType(models.TextChoices):
    STRAIGHT = 'STRAIGHT', 'Straight'
    WAVY = 'WAVY', 'Wavy'
    CURLY = 'CURLY', 'Curly'
    COILY = 'COILY', 'Coily'

class CustomerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='crm_profile')
    preferred_timing = models.CharField(max_length=50, choices=[('MORNING', 'Morning'), ('AFTERNOON', 'Afternoon'), ('EVENING', 'Evening')], blank=True, null=True)
    birthday = models.DateField(blank=True, null=True)
    anniversary = models.DateField(blank=True, null=True)
    allergies = models.TextField(blank=True, null=True)
    skin_type = models.CharField(max_length=20, choices=SkinType.choices, blank=True, null=True)
    hair_type = models.CharField(max_length=20, choices=HairType.choices, blank=True, null=True)
    medical_notes = models.TextField(blank=True, null=True)
    churn_risk_score = models.IntegerField(default=0, help_text="AI calculated score 0-100")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.get_full_name()}"

class BeforeAfterGallery(models.Model):
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='galleries')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transformation_galleries')
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True)
    before_photo_url = models.URLField(blank=True, null=True)
    after_photo_url = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Gallery for {self.customer.get_full_name()} by {self.therapist.get_full_name()}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    type = models.CharField(max_length=50, blank=True, null=True, help_text="e.g. APPOINTMENT, TIP, SYSTEM")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"To {self.user.get_full_name()}: {self.title}"


class StaffTask(models.Model):
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return self.title

class TherapistSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='therapist_settings')
    push_notifications = models.BooleanField(default=True)
    sms_alerts = models.BooleanField(default=True)
    biometric_login = models.BooleanField(default=False)
    dark_mode = models.BooleanField(default=False)

    def __str__(self):
        return f"Settings for {self.user.get_full_name()}"

class StaffChatMessage(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_staff_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Message by {self.sender.get_full_name()}"

# PLATFORM BILLING (B2B SaaS)

class PlatformSubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Commission taken on online bookings")
    features = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - ₹{self.monthly_price}/mo"

class StoreSubscription(models.Model):
    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='platform_subscription')
    plan = models.ForeignKey(PlatformSubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, choices=[
        ('ACTIVE', 'Active'),
        ('PAST_DUE', 'Past Due'),
        ('CANCELED', 'Canceled'),
        ('FREE_TRIAL', 'Free Trial')
    ], default='FREE_TRIAL')
    current_period_end = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.store.name} Subscription ({self.status})"

class PlatformInvoice(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='platform_invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_invoice_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, choices=[
        ('DRAFT', 'Draft'),
        ('OPEN', 'Open'),
        ('PAID', 'Paid'),
        ('VOID', 'Void'),
        ('UNCOLLECTIBLE', 'Uncollectible')
    ], default='OPEN')
    description = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice {self.id} for {self.store.name} - ₹{self.amount} ({self.status})"
