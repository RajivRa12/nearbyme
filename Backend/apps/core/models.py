import json
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
class Role(models.TextChoices):
    MASTER_ADMIN = 'MASTER_ADMIN', 'Master Admin'
    BRAND_OWNER = 'BRAND_OWNER', 'Brand Owner'
    STORE_ADMIN = 'STORE_ADMIN', 'Store Admin'
    RECEPTIONIST = 'RECEPTIONIST', 'Receptionist'
    THERAPIST = 'THERAPIST', 'Therapist'
    CUSTOMER = 'CUSTOMER', 'Customer'
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='legacy_stores', help_text="Bridge to the Phase1 Outlet this legacy Store maps to, for online booking")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.name} — {self.brand.name}"
    def has_plan_feature(self, feature_name):
        """True only if this store has an active/trial subscription whose
        plan actually bundles the named add-on (e.g. 'includes_crm') — a
        store with no subscription row, a lapsed one, or a plan that
        doesn't include the feature all resolve to False. No subscription
        row is treated as no access, not as grandfathered — this is a
        paywall, not a rollout flag."""
        sub = getattr(self, 'platform_subscription', None)
        if not sub or not sub.plan or sub.status not in ('ACTIVE', 'FREE_TRIAL'):
            return False
        return bool(getattr(sub.plan, feature_name, False))
class StorePublicProfile(models.Model):
    """What a store's microsite (and, once dark-launched, the marketplace)
    shows. One per store — a microsite query is scoped to exactly one of
    these, never a list. See customer-app-build-guide.pdf sections 2 & 5.

    The guide's schema names the FK store_group_id/outlet_id (Phase1 terms);
    this app's customer-facing browsing/booking already runs entirely on the
    legacy Store model (bridged to Outlet via Store.outlet), so this links to
    Store directly to stay consistent with every other customer-app screen
    built this session — store.outlet still gets you to store_group/outlet.
    """
    store = models.OneToOneField('Store', on_delete=models.CASCADE, related_name='public_profile')
    slug = models.SlugField(max_length=80, unique=True, help_text="Public microsite path, e.g. /s/<slug>")
    custom_domain = models.CharField(max_length=255, blank=True, null=True, unique=True)
    headline = models.CharField(max_length=255, blank=True, null=True)
    about = models.TextField(blank=True, null=True)
    cover_image_url = models.URLField(max_length=500, blank=True, null=True)
    gallery = models.JSONField(default=list, blank=True, help_text="List of image URLs")
    amenities = models.JSONField(default=list, blank=True, help_text="List of short strings, e.g. ['Parking', 'AC', 'Wifi']")
    cancellation_policy_text = models.TextField(blank=True, null=True)
    is_microsite_live = models.BooleanField(default=True, help_text="Every approved store gets a microsite immediately")
    marketplace_public = models.BooleanField(default=False, help_text="This store's own opt-in to cross-store discovery — still gated by the city's dark-launch flag")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'store_public_profile'
    def __str__(self):
        return f"{self.store.name} (/{self.slug})"
class CityMarketplaceFlag(models.Model):
    """The dark-launch switch — marketplace discovery is built and populated
    for every city, but only actually shown once a city clears this flag.
    Same code, same components either way: a launch decision, not a build one."""
    city = models.OneToOneField('City', on_delete=models.CASCADE, related_name='marketplace_flag')
    is_public = models.BooleanField(default=False)
    min_store_threshold = models.PositiveIntegerField(default=10, help_text="Suggested minimum approved stores before flipping this on")
    enabled_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return f"{self.city.name}: {'public' if self.is_public else 'dark'}"
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_members', help_text="Specific branch outlet this user/staff is assigned to")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments', help_text="Specific branch outlet where this appointment takes place")
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
class PaymentMethod(models.TextChoices):
    CASH = 'CASH', 'Cash'
    CARD = 'CARD', 'Credit/Debit Card'
    UPI = 'UPI', 'UPI'
    WALLET = 'WALLET', 'Wallet'
    GIFT_CARD = 'GIFT_CARD', 'Gift Card'
    PACKAGE = 'PACKAGE', 'Package Redemption'
    MEMBERSHIP_CREDIT = 'MEMBERSHIP_CREDIT', 'Membership Credit'
    PACKAGE_CREDIT = 'PACKAGE_CREDIT', 'Package Credit'
class InvoiceStatus(models.TextChoices):
    UNPAID = 'UNPAID', 'Unpaid'
    PAID = 'PAID', 'Paid'
    PARTIALLY_PAID = 'PARTIALLY_PAID', 'Partially Paid'
    REFUNDED = 'REFUNDED', 'Refunded'
class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_number = models.CharField(max_length=50, unique=True)
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='invoices')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices', help_text="Branch outlet that issued this POS receipt")
    appointment = models.OneToOneField(Appointment, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice')
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    global_customer = models.ForeignKey('GlobalCustomer', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices', help_text="Phase1 customer identity, for invoices raised from a Booking")
    booking = models.ForeignKey('Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    subtotal_paise = models.BigIntegerField(default=0)
    discount_amount_paise = models.BigIntegerField(default=0)
    tax_amount_paise = models.BigIntegerField(default=0)
    grand_total_paise = models.BigIntegerField(default=0)
    platform_fee_paise = models.BigIntegerField(default=0, help_text="Calculated revenue for Nearbyme")
    gateway_fee_paise = models.BigIntegerField(default=0, help_text="Calculated payment processing fee")
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.UNPAID)
    requires_manager_approval = models.BooleanField(default=False)
    is_discount_approved = models.BooleanField(default=False)
    is_review_reminder_sent = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices_created')
    finalised_at = models.DateTimeField(null=True, blank=True, help_text="Null means still a draft. Once set, the invoice is immutable.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.pk and Invoice.objects.filter(pk=self.pk, finalised_at__isnull=False).exists():
            from django.core.exceptions import ValidationError
            raise ValidationError("Invoice is finalised and cannot be modified.")
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.invoice_number} ({self.store.name}) - ₹{self.grand_total_paise / 100:.2f}"
    @staticmethod
    def generate_invoice_number(outlet):
        """Next gap-free OUTLET_PREFIX-YYYY-NNNN number. Caller must hold a lock on `outlet`
        (e.g. Outlet.objects.select_for_update()) inside an atomic transaction."""
        from django.utils import timezone
        year = timezone.now().year
        prefix = outlet.invoice_prefix
        last = Invoice.objects.filter(
            outlet=outlet, invoice_number__startswith=f"{prefix}-{year}-"
        ).order_by('-invoice_number').first()
        next_seq = 1
        if last:
            try:
                next_seq = int(last.invoice_number.rsplit('-', 1)[-1]) + 1
            except ValueError:
                next_seq = 1
        return f"{prefix}-{year}-{next_seq:04d}"
class InvoiceLineType(models.TextChoices):
    SERVICE = 'service', 'Service'
    PRODUCT = 'product', 'Product'
class InvoiceLine(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    store_service = models.ForeignKey('StoreService', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice_lines', help_text="Phase1 service catalog reference, for lines sourced from a Booking")
    professional = models.ForeignKey('Professional', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoice_lines', help_text="Who performed this line, for commission accrual")
    quantity = models.PositiveIntegerField(default=1)
    line_type = models.CharField(max_length=20, choices=InvoiceLineType.choices, default=InvoiceLineType.SERVICE)
    unit_price_paise = models.BigIntegerField()
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    tax_amount_paise = models.BigIntegerField(default=0)
    total_paise = models.BigIntegerField(default=0)
    def __str__(self):
        name = self.service.name if self.service else "Item"
        return f"{name} (x{self.quantity}) - {self.invoice.invoice_number}"
class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PaymentMethod.choices)
    amount_paise = models.BigIntegerField()
    transaction_reference = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"₹{self.amount_paise / 100:.2f} via {self.method} for {self.invoice.invoice_number}"
class Tip(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='tips')
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, limit_choices_to={'role': 'THERAPIST'})
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"₹{self.amount} tip for {self.therapist.email}"
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
class Vendor(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='vendors')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendors', help_text="Specific branch outlet for this vendor")
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.name} ({self.store.name})"
class Product(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='products')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='products', help_text="Specific branch outlet for this inventory item")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders', help_text="Branch outlet receiving this stock delivery")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses', help_text="Branch outlet that incurred this expense")
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
    invoice_item = models.OneToOneField(InvoiceLine, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    is_paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Commission for {self.therapist.get_full_name()} - ₹{self.amount}"
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
class Room(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='rooms')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='rooms', help_text="Specific branch outlet this treatment room belongs to")
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return f"{self.store.name} - {self.name}"
class Shift(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='shifts')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='shifts', help_text="Specific branch outlet for this shift")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='attendances', help_text="Specific branch outlet where attendance was marked")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='leave_requests', help_text="Branch outlet of the requesting staff")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='campaigns', help_text="Branch outlet executing this campaign")
    name = models.CharField(max_length=255)
    channel = models.CharField(max_length=20, choices=MarketingChannel.choices)
    message_body = models.TextField()
    target_audience = models.CharField(max_length=100, help_text="e.g., ALL_CUSTOMERS, INACTIVE_CUSTOMERS")
    status = models.CharField(max_length=20, default='DRAFT')
    sent_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return self.name
class RegisterStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open'
    CLOSED = 'CLOSED', 'Closed'
class DailyRegister(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='daily_registers')
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='daily_registers', help_text="Branch outlet for this daily cash register")
    date = models.DateField()
    opening_balance = models.DecimalField(max_digits=10, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_cash_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_card_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=RegisterStatus.choices, default=RegisterStatus.OPEN)
    closed_at = models.DateTimeField(null=True, blank=True)
    def __str__(self):
        return f"Register {self.store.name} - {self.date}"
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
class CustomerFavourite(models.Model):
    """A saved salon — distinct from FavoriteTherapist (which favourites a
    login User, for the pre-Phase1 in-store staff list). The build guide
    names the FK store_group_id/professional_account_id; this links to the
    legacy Store instead, same deviation StorePublicProfile documents —
    every customer-facing screen in this app runs on Store, not StoreGroup
    directly, so this stays consistent with that."""
    customer = models.ForeignKey('GlobalCustomer', on_delete=models.CASCADE, related_name='favourite_stores')
    store = models.ForeignKey('Store', on_delete=models.CASCADE, related_name='favourited_by')
    professional_account = models.ForeignKey('ProfessionalAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='favourited_at', help_text="Optional: a specific professional at this store the customer prefers")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('customer', 'store')
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.customer.name} saved {self.store.name}"
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='payrolls', help_text="Branch outlet for this staff payroll")
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='incentives', help_text="Branch outlet this incentive belongs to")
    staff = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incentives')
    title = models.CharField(max_length=255, help_text="e.g., Monthly Bonus, Top Performer")
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid_out = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.title} for {self.staff.get_full_name()}"
class ServiceProduct(models.Model):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, null=True, blank=True, related_name='products_used')
    store_service = models.ForeignKey('StoreService', on_delete=models.CASCADE, null=True, blank=True, related_name='products_used', help_text="Phase1 service catalog reference, for services sourced from a Booking")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_used = models.PositiveIntegerField(default=1)
    def __str__(self):
        name = self.store_service.name if self.store_service else (self.service.name if self.service else "service")
        return f"{self.quantity_used}x {self.product.name} for {name}"
class StockMovement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stock_movements')
    invoice = models.ForeignKey('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_movements')
    quantity_deducted = models.IntegerField(help_text="Positive integer; always a deduction from stock_quantity")
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'stock_movement'
        ordering = ['-created_at']
    def __str__(self):
        return f"-{self.quantity_deducted} {self.product.name} ({self.created_at:%Y-%m-%d})"
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
    outlet = models.ForeignKey('Outlet', on_delete=models.SET_NULL, null=True, blank=True, related_name='waitlists', help_text="Branch outlet waitlist")
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='waitlists')
    service = models.ForeignKey(Service, on_delete=models.CASCADE)
    preferred_date = models.DateField()
    preferred_time_slot = models.CharField(max_length=100, help_text="e.g. Morning, Afternoon, or specific time")
    status = models.CharField(max_length=20, choices=WaitlistStatus.choices, default=WaitlistStatus.WAITING)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"Waitlist for {self.customer.get_full_name()} on {self.preferred_date}"
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
class Conversation(models.Model):
    """A direct-message thread between one customer and one therapist."""
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='customer_conversations', limit_choices_to={'role': 'CUSTOMER'})
    therapist = models.ForeignKey(User, on_delete=models.CASCADE, related_name='therapist_conversations', limit_choices_to={'role': 'THERAPIST'})
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = ('customer', 'therapist')
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.customer.get_full_name()} <-> {self.therapist.get_full_name()}"
class ChatMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_conversation_messages')
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['created_at']
    def __str__(self):
        return f"{self.sender.get_full_name()}: {self.content[:30]}"
class PlatformSubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Commission taken on online bookings")
    includes_crm = models.BooleanField(default=False, help_text="CRM add-on bundled into this plan")
    includes_analytics = models.BooleanField(default=False, help_text="Analytics add-on bundled into this plan")
    includes_ai_assistant = models.BooleanField(default=False, help_text="AI assistant add-on bundled into this plan")
    includes_premium_listing = models.BooleanField(default=False, help_text="Sponsored/boosted placement in customer search bundled into this plan")
    features = models.JSONField(default=dict, blank=True, help_text="Any other feature flags not covered by the fields above")
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
class PlatformCommissionLedger(models.Model):
    """Marketplace commission — the platform's cut of a completed online booking,
    computed from the store's active PlatformSubscriptionPlan.commission_percent."""
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='commission_ledger_entries')
    booking = models.ForeignKey('Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='commission_ledger_entries')
    gross_amount_paise = models.BigIntegerField(help_text="Booking total the commission was calculated on, in integer paise")
    commission_percent_applied = models.DecimalField(max_digits=5, decimal_places=2)
    commission_paise = models.BigIntegerField(help_text="Platform's commission on this booking, in integer paise")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'platform_commission_ledger'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.store.name}: ₹{self.commission_paise / 100:.2f} commission"
class AdPlacement(models.TextChoices):
    HOME_BANNER = 'HOME_BANNER', 'Home Banner'
    SEARCH_TOP = 'SEARCH_TOP', 'Search Top Result'
    CATEGORY_FEATURED = 'CATEGORY_FEATURED', 'Category Featured'
class AdCampaignStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    ACTIVE = 'ACTIVE', 'Active'
    PAUSED = 'PAUSED', 'Paused'
    ENDED = 'ENDED', 'Ended'
class AdCampaign(models.Model):
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='ad_campaigns')
    title = models.CharField(max_length=150)
    placement = models.CharField(max_length=20, choices=AdPlacement.choices)
    status = models.CharField(max_length=10, choices=AdCampaignStatus.choices, default=AdCampaignStatus.DRAFT)
    start_date = models.DateField()
    end_date = models.DateField()
    budget_paise = models.BigIntegerField(help_text="Amount the store paid for this campaign, in integer paise")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'ad_campaign'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.title} ({self.store.name}, {self.status})"
class PaymentGateway(models.TextChoices):
    RAZORPAY = 'RAZORPAY', 'Razorpay'
    STRIPE = 'STRIPE', 'Stripe'
    PAYU = 'PAYU', 'PayU'
    OTHER = 'OTHER', 'Other'
class PaymentGatewayRevenue(models.Model):
    """No live gateway integration exists yet — this is a manually-recorded
    ledger for staff to log gateway fee revenue from their dashboard."""
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True, related_name='gateway_revenue_entries', help_text="Blank for platform-wide gateway revenue")
    gateway = models.CharField(max_length=20, choices=PaymentGateway.choices)
    period_month = models.CharField(max_length=7, help_text="MM-YYYY")
    gross_volume_paise = models.BigIntegerField(help_text="Total payment volume processed, in integer paise")
    gateway_fee_paise = models.BigIntegerField(help_text="Fee charged by the gateway, in integer paise")
    net_revenue_paise = models.BigIntegerField(help_text="Platform's markup/net revenue on the gateway fee, in integer paise", default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'payment_gateway_revenue'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.gateway} {self.period_month}: ₹{self.net_revenue_paise / 100:.2f} net"
class InsurancePartnerStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    ACTIVE = 'ACTIVE', 'Active'
    INACTIVE = 'INACTIVE', 'Inactive'
class InsurancePartner(models.Model):
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    revenue_share_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Platform's cut of premiums sold through this partnership")
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=10, choices=InsurancePartnerStatus.choices, default=InsurancePartnerStatus.PENDING)
    contract_start = models.DateField(blank=True, null=True)
    contract_end = models.DateField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'insurance_partner'
        ordering = ['name']
    def __str__(self):
        return f"{self.name} ({self.status})"
class MarketplaceProduct(models.Model):
    """Platform-wide product catalog sold across stores — distinct from the
    per-store Product model used for a single store's own inventory."""
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    vendor_name = models.CharField(max_length=150, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    price_paise = models.BigIntegerField(help_text="Price in integer paise")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'marketplace_product'
        ordering = ['name']
    def __str__(self):
        return f"{self.name} (₹{self.price_paise / 100:.2f})"
class TrainingCourse(models.Model):
    """Platform-wide training/course catalog — distinct from StaffTraining,
    which records a single store's internal staff training history."""
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    instructor_name = models.CharField(max_length=150, blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    duration_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    price_paise = models.BigIntegerField(help_text="Price in integer paise")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'training_course'
        ordering = ['title']
    def __str__(self):
        return f"{self.title} (₹{self.price_paise / 100:.2f})"
import re
from django.utils import timezone
def normalize_e164(phone: str) -> str:
    if not phone:
        return phone
    cleaned = re.sub(r'[^\d+]', '', str(phone))
    if not cleaned.startswith('+'):
        if len(cleaned) == 10:
            cleaned = f"+91{cleaned}"
        else:
            cleaned = f"+{cleaned}"
    return cleaned
class PhoneOTP(models.Model):
    """Short-lived login code for the phone-is-the-account customer flow —
    no password, no signup form. See customer-app-build-guide.pdf rule 26."""
    phone_e164 = models.CharField(max_length=20, db_index=True)
    code_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'phone_otp'
        ordering = ['-created_at']
class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return self.update(deleted_at=timezone.now())
    def hard_delete(self):
        return super().delete()
    def active(self):
        return self.filter(deleted_at__isnull=True)
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)
    def all_with_deleted(self):
        return SoftDeleteQuerySet(self.model, using=self._db)
class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)
    objects = SoftDeleteManager()
    all_objects = models.Manager()
    class Meta:
        abstract = True
    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(using=using)
class InternalUserRole(models.TextChoices):
    SUPERADMIN = 'superadmin', 'Super Admin'
    OPS = 'ops', 'Operations'
    REVIEWER = 'reviewer', 'Reviewer'
class InternalUser(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=20, choices=InternalUserRole.choices, default=InternalUserRole.REVIEWER)
    totp_secret = models.CharField(max_length=100, blank=True, null=True, help_text="Base32 TOTP secret for mandatory 2FA")
    is_totp_enabled = models.BooleanField(default=False, help_text="True once user verifies first 6-digit TOTP code")
    last_login_at = models.DateTimeField(null=True, blank=True, help_text="Last recorded activity timestamp for 60m inactivity timeout")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'internal_user'
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.phone:
            self.phone = normalize_e164(self.phone)
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.name} ({self.role})"
class Plan(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    price_paise = models.BigIntegerField(default=0, help_text="Price in integer paise (29900 = ₹299.00)")
    billing_period = models.CharField(max_length=50, default='monthly')
    outlet_limit = models.IntegerField(default=1)
    professional_limit = models.IntegerField(default=5)
    feature_flags = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'plan'
        ordering = ['price_paise']
    def __str__(self):
        return f"{self.name} (₹{self.price_paise / 100:.2f})"
class AccessCode(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=100, unique=True)
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name='access_codes')
    duration_days = models.IntegerField(default=30)
    max_redemptions = models.IntegerField(default=1)
    redemption_count = models.IntegerField(default=0)
    expires_at = models.DateTimeField()
    issued_by = models.CharField(max_length=255, blank=True, null=True, help_text="Internal user ID or name")
    source_tag = models.CharField(max_length=100, help_text="Channel that produced stores that stayed")
    status = models.CharField(max_length=50, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'access_code'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.code} ({self.source_tag})"
class StoreGroupStatus(models.TextChoices):
    APPLIED = 'applied', 'Applied'
    UNDER_REVIEW = 'under_review', 'Under Review'
    APPROVED = 'approved', 'Approved'
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    DORMANT = 'dormant', 'Dormant'
    OFFBOARDED = 'offboarded', 'Offboarded'
class StoreGroupType(models.TextChoices):
    SPA = 'spa', 'Spa'
    SALON = 'salon', 'Salon'
    BOTH = 'both', 'Both'
class StoreGroup(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    legal_name = models.CharField(max_length=255, blank=True, null=True)
    owner_name = models.CharField(max_length=255)
    owner_phone = models.CharField(max_length=20)
    owner_email = models.EmailField()
    gstin = models.CharField(max_length=15, blank=True, null=True, help_text="Validated 15-character GSTIN")
    pan = models.CharField(max_length=10, blank=True, null=True)
    business_type = models.CharField(max_length=10, choices=StoreGroupType.choices, default=StoreGroupType.SALON)
    status = models.CharField(max_length=20, choices=StoreGroupStatus.choices, default=StoreGroupStatus.APPLIED)
    status_changed_at = models.DateTimeField(auto_now=True)
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True, blank=True, related_name='store_groups')
    access_code = models.ForeignKey(AccessCode, on_delete=models.SET_NULL, null=True, blank=True, related_name='store_groups')
    term_start = models.DateTimeField(null=True, blank=True)
    term_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'store_group'
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.owner_phone:
            self.owner_phone = normalize_e164(self.owner_phone)
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.name} [{self.status}]"
class AccessCodeRedemption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    access_code = models.ForeignKey(AccessCode, on_delete=models.CASCADE, related_name='redemption_logs')
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='code_redemption_logs')
    redeemed_at = models.DateTimeField(auto_now_add=True)
    term_start = models.DateTimeField()
    term_end = models.DateTimeField()
    class Meta:
        db_table = 'access_code_redemption'
        ordering = ['-redeemed_at']
    def __str__(self):
        return f"{self.store_group.name} redeemed {self.access_code.code}"
class City(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    class Meta:
        db_table = 'city'
        verbose_name_plural = 'cities'
        ordering = ['name']
    def __str__(self):
        return f"{self.name}, {self.state}"
class Zone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='zones')
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    class Meta:
        db_table = 'zone'
        ordering = ['name']
    def __str__(self):
        return f"{self.name} ({self.city.name})"
class Outlet(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='outlets')
    name = models.CharField(max_length=255)
    address_line = models.TextField()
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, blank=True, related_name='outlets')
    zone = models.ForeignKey(Zone, on_delete=models.SET_NULL, null=True, blank=True, related_name='outlets')
    pincode = models.CharField(max_length=20)
    lat = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)
    phone = models.CharField(max_length=20)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default='active')
    invoice_prefix = models.CharField(max_length=10, unique=True, null=True, blank=True, help_text="Short code used as the prefix for this outlet's invoice numbers, e.g. 'BLR1'. Auto-derived from the name if left blank.")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'outlet'
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.phone:
            self.phone = normalize_e164(self.phone)
        if not self.invoice_prefix:
            base = ''.join(ch for ch in self.name.upper() if ch.isalnum())[:4] or 'OUT'
            candidate = base
            suffix = 1
            while Outlet.objects.filter(invoice_prefix=candidate).exclude(pk=self.pk).exists():
                suffix += 1
                candidate = f"{base[:3]}{suffix}"
            self.invoice_prefix = candidate
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.name} - {self.store_group.name}"
class StoreStatusHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=50)
    to_status = models.CharField(max_length=50)
    reason = models.TextField(blank=True, null=True)
    changed_by = models.CharField(max_length=255, null=True, blank=True)
    changed_by_type = models.CharField(max_length=20, choices=[('internal_user', 'Internal User'), ('system', 'System')])
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'store_status_history'
        ordering = ['-created_at']
        verbose_name_plural = 'store status histories'
    def __str__(self):
        return f"{self.store_group.name}: {self.from_status} -> {self.to_status}"
class KycDocType(models.TextChoices):
    GST_CERT = 'gst_cert', 'GST Certificate'
    PAN = 'pan', 'PAN Card'
    TRADE_LICENCE = 'trade_licence', 'Trade Licence'
    BANK_PROOF = 'bank_proof', 'Bank Proof'
    BUSINESS_CERT = 'business_cert', 'Business Incorporation Certificate'
class KycDocStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
class KycDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='kyc_documents')
    doc_type = models.CharField(max_length=20, choices=KycDocType.choices)
    file_url = models.URLField(max_length=500, blank=True, null=True, help_text="Signed URL for cloud storage")
    file = models.FileField(upload_to='kyc_documents/', null=True, blank=True, help_text="Uploaded document file")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=KycDocStatus.choices, default=KycDocStatus.PENDING)
    reviewed_by = models.CharField(max_length=255, null=True, blank=True, help_text="Internal user reviewer")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True, help_text="Required on rejection")
    class Meta:
        db_table = 'kyc_document'
        ordering = ['-uploaded_at']
    def __str__(self):
        return f"{self.store_group.name} - {self.doc_type} ({self.status})"
    @property
    def file_display_url(self):
        if self.file:
            return self.file.url
        return self.file_url or ''
class BankSettlementAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.OneToOneField(StoreGroup, on_delete=models.CASCADE, related_name='bank_settlement_account')
    account_holder_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=50, help_text="Store securely — encrypt at rest in production")
    ifsc_code = models.CharField(max_length=11, help_text="11-character RBI IFSC code")
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_type = models.CharField(
        max_length=20,
        choices=[('current', 'Current Account'), ('savings', 'Savings Account')],
        default='current'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    submitted_by = models.CharField(max_length=255, blank=True, null=True, help_text="Store owner who submitted")
    is_verified = models.BooleanField(default=False, help_text="Set True by Master Admin after manual verification")
    activated_at = models.DateTimeField(null=True, blank=True)
    activated_by = models.CharField(max_length=255, null=True, blank=True, help_text="Internal user who activated payouts")
    weekly_payout_enabled = models.BooleanField(default=False, help_text="Enables automated weekly revenue disbursements")
    rejection_reason = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'bank_settlement_account'
        ordering = ['-submitted_at']
    def __str__(self):
        return f"{self.store_group.name} — {self.bank_name} ({'Verified' if self.is_verified else 'Pending'})"
class ServiceCategoryPhase1(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    applies_to = models.CharField(max_length=20, choices=[('salon', 'Salon'), ('spa', 'Spa'), ('both', 'Both')], default='both')
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    class Meta:
        db_table = 'category'
        ordering = ['display_order', 'name']
    def __str__(self):
        return f"{self.name} ({self.applies_to})"
class ResourceType(models.TextChoices):
    NONE = 'none', 'None'
    CHAIR = 'chair', 'Chair'
    ROOM = 'room', 'Room'
    EQUIPMENT = 'equipment', 'Equipment'
class CanonicalService(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(ServiceCategoryPhase1, on_delete=models.CASCADE, related_name='canonical_services')
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    default_duration_min = models.IntegerField(default=60)
    buffer_before_min = models.IntegerField(default=0)
    buffer_after_min = models.IntegerField(default=0)
    resource_type = models.CharField(max_length=20, choices=ResourceType.choices, default=ResourceType.NONE, help_text="Unified resource logic: chair = room = equipment")
    gender_applicability = models.CharField(max_length=20, choices=[('men', 'Men'), ('women', 'Women'), ('unisex', 'Unisex')], default='unisex')
    skill_tag = models.CharField(max_length=100, blank=True, null=True)
    hsn_sac_code = models.CharField(max_length=20, blank=True, null=True, help_text="GST HSN/SAC code for this service, e.g. '999721'")
    is_active = models.BooleanField(default=True)
    class Meta:
        db_table = 'canonical_service'
        ordering = ['category', 'name']
    def __str__(self):
        return f"{self.name} [{self.resource_type}]"
class StoreServiceMarketplaceStatus(models.TextChoices):
    PENDING = 'pending', 'Pending Review'
    APPROVED = 'approved', 'Approved'
    MERGED = 'merged', 'Merged into Canonical'
    REJECTED = 'rejected', 'Rejected'
class StoreService(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='store_services', help_text="Belongs to GROUP, not one outlet")
    canonical_service = models.ForeignKey(CanonicalService, on_delete=models.SET_NULL, null=True, blank=True, related_name='store_variants')
    name = models.CharField(max_length=200)
    default_price_paise = models.BigIntegerField(help_text="Price stored strictly in integer paise")
    duration_min = models.IntegerField()
    deposit_percentage = models.PositiveSmallIntegerField(default=20, help_text="What percentage of the price a customer can pay online as a deposit, balance due at venue")
    is_active_in_store = models.BooleanField(default=True, help_text="Defaults TRUE immediately so store can bill same minute")
    marketplace_status = models.CharField(max_length=20, choices=StoreServiceMarketplaceStatus.choices, default=StoreServiceMarketplaceStatus.PENDING)
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.CharField(max_length=255, null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'store_service'
        ordering = ['-submitted_at']
    def __str__(self):
        return f"{self.name} (@ {self.store_group.name})"
class StoreServiceOutletOverride(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_service = models.ForeignKey(StoreService, on_delete=models.CASCADE, related_name='outlet_overrides')
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='service_overrides')
    price_paise = models.BigIntegerField(help_text="Price stored strictly in integer paise")
    duration_min = models.IntegerField()
    is_available = models.BooleanField(default=True)
    class Meta:
        db_table = 'store_service_outlet_override'
        unique_together = ('store_service', 'outlet')
    def __str__(self):
        return f"{self.store_service.name} override at {self.outlet.name}"
class ProfessionalLinkStatus(models.TextChoices):
    INVITED = 'invited', 'Invited'
    ACCEPTED = 'accepted', 'Accepted'
    DECLINED = 'declined', 'Declined'
    REMOVED = 'removed', 'Removed'
class Professional(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='professionals')
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='professionals')
    user_account = models.ForeignKey('ProfessionalAccount', on_delete=models.SET_NULL, null=True, blank=True, related_name='professional_profiles', help_text="Nullable until the invited professional accepts. Points to the professional's global identity, not their store-login User.")
    display_name = models.CharField(max_length=255)
    display_role = models.CharField(max_length=100, blank=True, null=True, help_text="Free text, e.g. 'Senior Stylist'")
    phone_e164 = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    email = models.EmailField(null=True, blank=True)
    gender = models.CharField(max_length=50, null=True, blank=True)
    link_status = models.CharField(max_length=20, choices=ProfessionalLinkStatus.choices, default=ProfessionalLinkStatus.INVITED)
    is_bookable = models.BooleanField(default=True)
    invited_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'professional'
        ordering = ['display_name']
    def save(self, *args, **kwargs):
        if self.phone_e164:
            self.phone_e164 = normalize_e164(self.phone_e164)
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.display_name} ({self.link_status}) @ {self.outlet.name}"
class ProfessionalSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='skills')
    skill_tag = models.CharField(max_length=100, help_text="Maps to CanonicalService.skill_tag")
    class Meta:
        db_table = 'professional_skill'
        unique_together = ('professional', 'skill_tag')
        ordering = ['skill_tag']
    def __str__(self):
        return f"{self.professional.display_name}: {self.skill_tag}"
class ResourceKind(models.TextChoices):
    CHAIR = 'chair', 'Chair'
    ROOM = 'room', 'Room'
    EQUIPMENT = 'equipment', 'Equipment'
class Resource(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='resources')
    name = models.CharField(max_length=255)
    resource_type = models.CharField(max_length=20, choices=ResourceKind.choices)
    capacity = models.IntegerField(default=1, help_text="Usually 1; a couples room = 2")
    is_bookable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'resource'
        ordering = ['outlet', 'resource_type', 'name']
    def __str__(self):
        return f"{self.name} ({self.resource_type}) @ {self.outlet.name}"
class ProfessionalShift(models.Model):
    WEEKDAY_CHOICES = [(0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'), (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='shifts')
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='professional_shifts')
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True, help_text="Null means open-ended")
    class Meta:
        db_table = 'professional_shift'
        ordering = ['professional', 'weekday', 'start_time']
    def __str__(self):
        return f"{self.professional.display_name} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"
class ProfessionalTimeOff(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='time_off_blocks')
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.CharField(max_length=255, blank=True, null=True, help_text="Internal user ID or name")
    class Meta:
        db_table = 'professional_time_off'
        ordering = ['-start_at']
    def __str__(self):
        return f"{self.professional.display_name} off {self.start_at} - {self.end_at}"
class BookingSource(models.TextChoices):
    WALK_IN = 'walk_in', 'Walk In'
    FRONT_DESK = 'front_desk', 'Front Desk'
    PHONE = 'phone', 'Phone'
    ONLINE = 'online', 'Online'
    WHATSAPP = 'whatsapp', 'WhatsApp'
class BookingStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    CONFIRMED = 'confirmed', 'Confirmed'
    IN_SERVICE = 'in_service', 'In Service'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    NO_SHOW = 'no_show', 'No Show'
class Booking(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking_code = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False, help_text="Human-readable reference, e.g. BKG-000123. Auto-assigned on first save.")
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='bookings')
    customer = models.ForeignKey('GlobalCustomer', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    source = models.CharField(max_length=20, choices=BookingSource.choices, default=BookingSource.WALK_IN)
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.DRAFT)
    booked_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings_made', help_text="Staff member who created this booking")
    booking_start = models.DateTimeField()
    booking_end = models.DateTimeField()
    is_home_service = models.BooleanField(default=False)
    service_address = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    on_the_way_at = models.DateTimeField(null=True, blank=True, help_text="Home-service only — set when the professional marks themselves en route")
    therapist_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    therapist_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    class Meta:
        db_table = 'booking'
        ordering = ['-booking_start']
    def save(self, *args, **kwargs):
        if not self.booking_code:
            from django.db import transaction
            with transaction.atomic():
                last = Booking.all_objects.select_for_update().exclude(booking_code__isnull=True).order_by('-booking_code').first()
                next_seq = 1
                if last and last.booking_code:
                    try:
                        next_seq = int(last.booking_code.rsplit('-', 1)[-1]) + 1
                    except ValueError:
                        next_seq = 1
                self.booking_code = f"BKG-{next_seq:06d}"
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
    def __str__(self):
        return f"Booking {self.booking_code or self.id} @ {self.outlet.name} ({self.status})"
class AppointmentSlotStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    STARTED = 'started', 'Started'
    DONE = 'done', 'Done'
    CANCELLED = 'cancelled', 'Cancelled'
class AppointmentSlot(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='slots')
    store_service = models.ForeignKey('StoreService', on_delete=models.PROTECT, related_name='appointment_slots')
    professional = models.ForeignKey(Professional, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointment_slots')
    resource = models.ForeignKey(Resource, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointment_slots')
    slot_start = models.DateTimeField()
    slot_end = models.DateTimeField()
    price_paise = models.BigIntegerField(help_text="Price stored strictly in integer paise, locked at time of booking")
    status = models.CharField(max_length=20, choices=AppointmentSlotStatus.choices, default=AppointmentSlotStatus.SCHEDULED)
    was_overridden = models.BooleanField(default=False, help_text="True if this slot was booked despite a conflict warning")
    override_reason = models.TextField(blank=True, null=True)
    overridden_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='slot_overrides')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'appointment_slot'
        ordering = ['slot_start']
    def __str__(self):
        return f"{self.store_service.name} {self.slot_start} ({self.status})"
class SlotHoldStatus(models.TextChoices):
    HELD = 'held', 'Held'
    CONVERTED = 'converted', 'Converted'
    EXPIRED = 'expired', 'Expired'
    RELEASED = 'released', 'Released'
class SlotHold(models.Model):
    """Short-lived reservation while a guest completes OTP + payment, so the
    slot they're looking at can't be taken out from under them. See
    customer-app-build-guide.pdf section 6 — 'the double-booking problem'."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='slot_holds')
    store_service = models.ForeignKey('StoreService', on_delete=models.CASCADE, related_name='slot_holds')
    professional = models.ForeignKey(Professional, on_delete=models.SET_NULL, null=True, blank=True, related_name='slot_holds')
    resource = models.ForeignKey(Resource, on_delete=models.SET_NULL, null=True, blank=True, related_name='slot_holds')
    slot_start = models.DateTimeField()
    slot_end = models.DateTimeField()
    customer = models.ForeignKey('GlobalCustomer', on_delete=models.SET_NULL, null=True, blank=True, related_name='slot_holds')
    session_token = models.CharField(max_length=64, db_index=True)
    status = models.CharField(max_length=20, choices=SlotHoldStatus.choices, default=SlotHoldStatus.HELD)
    expires_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'slot_hold'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.store_service.name} {self.slot_start} ({self.status})"
class QueueEntryStatus(models.TextChoices):
    WAITING = 'waiting', 'Waiting'
    CALLED = 'called', 'Called'
    IN_SERVICE = 'in_service', 'In Service'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    NO_SHOW = 'no_show', 'No Show'
DEFAULT_QUEUE_WAIT_MINUTES = 15
class QueueEntry(models.Model):
    """A walk-in physically waiting at the outlet right now — reception's
    'who's here' board, distinct from `Waitlist` (a future-date preference
    list) and from `SlotHold`/`Booking` (a fixed pre-booked time)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey(Outlet, on_delete=models.CASCADE, related_name='queue_entries')
    customer = models.ForeignKey('GlobalCustomer', on_delete=models.SET_NULL, null=True, blank=True, related_name='queue_entries')
    guest_name = models.CharField(max_length=255, blank=True, null=True, help_text="For walk-ins without an account")
    guest_phone = models.CharField(max_length=20, blank=True, null=True)
    store_service = models.ForeignKey('StoreService', on_delete=models.SET_NULL, null=True, blank=True, related_name='queue_entries')
    professional = models.ForeignKey(Professional, on_delete=models.SET_NULL, null=True, blank=True, related_name='queue_entries', help_text="Preferred professional, if any")
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=QueueEntryStatus.choices, default=QueueEntryStatus.WAITING)
    checked_in_at = models.DateTimeField(auto_now_add=True)
    called_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'queue_entry'
        ordering = ['checked_in_at']
    def __str__(self):
        return f"{self.guest_name or (self.customer.name if self.customer else 'Walk-in')} @ {self.outlet.name} ({self.status})"
class OnlinePaymentStatus(models.TextChoices):
    CREATED = 'created', 'Created'
    CAPTURED = 'captured', 'Captured'
    FAILED = 'failed', 'Failed'
    REFUNDED = 'refunded', 'Refunded'
class OnlinePaymentType(models.TextChoices):
    FULL = 'full', 'Full payment'
    DEPOSIT = 'deposit', 'Deposit'
class OnlinePayment(models.Model):
    """A Razorpay order raised for a Phase1 online booking — store revenue
    collected at checkout, distinct from Tip. See build guide's
    online_payment data model addition."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    hold = models.ForeignKey(SlotHold, on_delete=models.SET_NULL, null=True, blank=True, related_name='online_payments')
    store_service = models.ForeignKey('StoreService', on_delete=models.SET_NULL, null=True, blank=True, related_name='online_payments')
    booking = models.OneToOneField('Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='online_payment')
    customer = models.ForeignKey('GlobalCustomer', on_delete=models.SET_NULL, null=True, blank=True, related_name='online_payments')
    payment_type = models.CharField(max_length=10, choices=OnlinePaymentType.choices, default=OnlinePaymentType.FULL)
    amount_paise = models.BigIntegerField(help_text="Amount actually charged via the gateway — the deposit amount when payment_type=deposit")
    total_amount_paise = models.BigIntegerField(default=0, help_text="Full service price. Equals amount_paise for a full payment; balance_due = total_amount_paise - amount_paise for a deposit")
    currency = models.CharField(max_length=3, default='INR')
    gateway = models.CharField(max_length=20, default='razorpay')
    gateway_order_id = models.CharField(max_length=100, unique=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_signature = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=OnlinePaymentStatus.choices, default=OnlinePaymentStatus.CREATED)
    confirmed_at = models.DateTimeField(null=True, blank=True, help_text="When the gateway signature was verified and status became CAPTURED")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'online_payment'
        ordering = ['-created_at']
    def __str__(self):
        return f"₹{self.amount_paise / 100:.2f} ({self.status}) — {self.gateway_order_id}"
class CommissionAppliesTo(models.TextChoices):
    SERVICE = 'service', 'Service'
    PRODUCT = 'product', 'Product'
    CATEGORY = 'category', 'Category'
class CommissionRateType(models.TextChoices):
    PERCENT = 'percent', 'Percent'
    FLAT = 'flat', 'Flat'
class CommissionRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='commission_rules')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, null=True, blank=True, related_name='commission_rules', help_text="Null applies to every professional")
    applies_to = models.CharField(max_length=20, choices=CommissionAppliesTo.choices)
    rate_type = models.CharField(max_length=20, choices=CommissionRateType.choices)
    rate_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percentage (e.g. 12.50) if rate_type=percent, else flat amount in rupees")
    effective_from = models.DateField()
    class Meta:
        db_table = 'commission_rule'
        ordering = ['-effective_from']
    def __str__(self):
        who = self.professional.display_name if self.professional_id else "Everyone"
        return f"{who}: {self.rate_value} ({self.rate_type}) on {self.applies_to}"
class CommissionAccrual(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_line = models.ForeignKey('InvoiceLine', on_delete=models.CASCADE, related_name='commission_accruals')
    professional = models.ForeignKey(Professional, on_delete=models.CASCADE, related_name='commission_accruals')
    base_paise = models.BigIntegerField(help_text="Line amount commission was calculated on, in integer paise")
    commission_paise = models.BigIntegerField(help_text="Computed commission amount, in integer paise")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'commission_accrual'
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.pk and CommissionAccrual.objects.filter(pk=self.pk).exists():
            from django.core.exceptions import ValidationError
            raise ValidationError("CommissionAccrual is auto-computed at invoice finalisation and cannot be edited.")
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.professional.display_name}: ₹{self.commission_paise / 100:.2f}"
class CreditNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey('Invoice', on_delete=models.CASCADE, related_name='credit_notes')
    reason = models.TextField()
    amount_paise = models.BigIntegerField(help_text="Correction amount stored strictly in integer paise")
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='credit_notes_created')
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'credit_note'
        ordering = ['-created_at']
    def __str__(self):
        return f"Credit ₹{self.amount_paise / 100:.2f} on {self.invoice.invoice_number}"
class CustomerStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    BLOCKED = 'blocked', 'Blocked'
    DELETION_REQUESTED = 'deletion_requested', 'DPDP Deletion Requested'
    DELETED = 'deleted', 'Deleted / Anonymized'
class GlobalCustomer(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_e164 = models.CharField(max_length=20, null=True, blank=True, db_index=True, help_text="Normalized E.164 phone identity key. Can be null for walk-ins.")
    name = models.CharField(max_length=255)
    email = models.EmailField(null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=30, choices=CustomerStatus.choices, default=CustomerStatus.ACTIVE)
    is_global = models.BooleanField(default=True, help_text="FALSE for walk-ins with no phone")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'customer'
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        if self.phone_e164:
            self.phone_e164 = normalize_e164(self.phone_e164)
            self.is_global = True
        else:
            self.is_global = False
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.name} ({self.phone_e164 or 'Walk-in'})"
class CustomerLifecycleStage(models.TextChoices):
    NEW = 'new', 'New'
    ACTIVE = 'active', 'Active'
    REPEAT = 'repeat', 'Repeat'
    LAPSING = 'lapsing', 'Lapsing'
    CHURNED = 'churned', 'Churned'
    REACTIVATED = 'reactivated', 'Reactivated'
class CustomerStoreLink(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.CASCADE, related_name='store_links', help_text="All per-store data lives here, never on customer")
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='customer_links')
    first_visit_at = models.DateTimeField(null=True, blank=True)
    last_visit_at = models.DateTimeField(null=True, blank=True)
    visit_count = models.IntegerField(default=0)
    lifetime_spend_paise = models.BigIntegerField(default=0, help_text="Total spend stored strictly in integer paise")
    preferred_professional_id = models.CharField(max_length=255, null=True, blank=True, help_text="Always use 'professional', never staff/employee/therapist")
    notes = models.TextField(blank=True, null=True, help_text="Per-store notes require a documented support reason to view in Master Admin")
    tags = models.JSONField(default=list)
    lifecycle_stage = models.CharField(max_length=20, choices=CustomerLifecycleStage.choices, default=CustomerLifecycleStage.NEW)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'customer_store_link'
        unique_together = ('customer', 'store_group')
        ordering = ['-last_visit_at', '-created_at']
    def __str__(self):
        return f"{self.customer.name} at {self.store_group.name} (Spend: ₹{self.lifetime_spend_paise / 100:.2f})"
class MembershipPlan(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='membership_plans')
    name = models.CharField(max_length=200)
    value_paise = models.BigIntegerField(help_text="Wallet credit granted on purchase, in integer paise")
    validity_days = models.IntegerField(default=365)
    price_paise = models.BigIntegerField(help_text="What the customer pays, in integer paise")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'membership_plan'
        ordering = ['name']
    def __str__(self):
        return f"{self.name} (₹{self.price_paise / 100:.2f} for ₹{self.value_paise / 100:.2f} value)"
class MembershipStatus(models.TextChoices):
    ACTIVE = 'active', 'Active'
    EXPIRED = 'expired', 'Expired'
    CANCELLED = 'cancelled', 'Cancelled'
class Membership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.CASCADE, related_name='memberships')
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='memberships')
    plan_name = models.CharField(max_length=200)
    value_paise_remaining = models.BigIntegerField()
    valid_until = models.DateField()
    status = models.CharField(max_length=20, choices=MembershipStatus.choices, default=MembershipStatus.ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'membership'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.plan_name} for {self.customer.name} (₹{self.value_paise_remaining / 100:.2f} left)"
class PackagePlan(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='package_plans')
    name = models.CharField(max_length=200)
    service_credits = models.JSONField(default=dict, help_text="{store_service_id: credit_count} bundled into this package")
    validity_days = models.IntegerField(default=180)
    price_paise = models.BigIntegerField(help_text="What the customer pays, in integer paise")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'package_plan'
        ordering = ['name']
    def __str__(self):
        return f"{self.name} (₹{self.price_paise / 100:.2f})"
class Package(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.CASCADE, related_name='packages')
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='packages')
    name = models.CharField(max_length=200)
    service_credits = models.JSONField(default=dict, help_text="{store_service_id: credits_remaining}")
    valid_until = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'package'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.name} for {self.customer.name}"
class CampaignChannel(models.TextChoices):
    SMS = 'sms', 'SMS'
    WHATSAPP = 'whatsapp', 'WhatsApp'
    EMAIL = 'email', 'Email'
class CampaignTargetType(models.TextChoices):
    LAPSED_60D = 'lapsed_60d', 'Not visited in 60+ days'
    BIRTHDAY_THIS_WEEK = 'birthday_this_week', 'Birthday this week'
    LIFECYCLE_LAPSING = 'lifecycle_lapsing', 'Lifecycle stage: Lapsing'
class CampaignStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SENT = 'sent', 'Sent'
class Campaign(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=255)
    channel = models.CharField(max_length=20, choices=CampaignChannel.choices)
    target_type = models.CharField(max_length=30, choices=CampaignTargetType.choices)
    message_template = models.TextField(help_text="Use {name} as a placeholder for the customer's name")
    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'campaign'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.name} ({self.get_target_type_display()})"
class CampaignSend(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='sends')
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.CASCADE, related_name='campaign_sends')
    sent_at = models.DateTimeField(auto_now_add=True)
    opened_at = models.DateTimeField(null=True, blank=True, help_text="Set by a future delivery-webhook integration; unused until a real gateway is connected")
    class Meta:
        db_table = 'campaign_send'
        unique_together = ('campaign', 'customer')
        ordering = ['-sent_at']
    def __str__(self):
        return f"{self.campaign.name} -> {self.customer.name}"
class ConsentType(models.TextChoices):
    MARKETING_WHATSAPP = 'marketing_whatsapp', 'Marketing WhatsApp'
    MARKETING_SMS = 'marketing_sms', 'Marketing SMS'
    MARKETING_EMAIL = 'marketing_email', 'Marketing Email'
    PHOTOS = 'photos', 'Photo Permission'
class CustomerConsent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.CASCADE, related_name='consents')
    consent_type = models.CharField(max_length=30, choices=ConsentType.choices)
    granted = models.BooleanField(default=True)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True, help_text="Revocations recorded with timestamp, never deleted")
    source = models.CharField(max_length=100, blank=True, null=True)
    class Meta:
        db_table = 'customer_consent'
        ordering = ['-granted_at']
    def __str__(self):
        return f"{self.customer.name} - {self.consent_type} ({'Granted' if self.granted else 'Revoked'})"
class CustomerMergeLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    surviving_customer_id = models.UUIDField()
    merged_customer_id = models.UUIDField()
    merged_by = models.CharField(max_length=255, help_text="Restricted to superadmin and ops roles")
    affected_records = models.JSONField(default=dict, help_text="Full record of store links, bookings, reviews moved")
    created_at = models.DateTimeField(auto_now_add=True)
    reverted_at = models.DateTimeField(null=True, blank=True, help_text="Reversible within 30 days")
    class Meta:
        db_table = 'customer_merge_log'
        ordering = ['-created_at']
    def __str__(self):
        return f"Merged {self.merged_customer_id} -> {self.surviving_customer_id} by {self.merged_by}"
    def save(self, *args, **kwargs):
        if self.affected_records is not None:
            self.affected_records = json.loads(json.dumps(self.affected_records, default=str))
        super().save(*args, **kwargs)
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_id = models.CharField(max_length=255, null=True, blank=True)
    actor_type = models.CharField(max_length=50, help_text="'internal_user' | 'system'")
    action = models.CharField(max_length=100, help_text="create, update, delete, status change")
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=255)
    before = models.JSONField(null=True, blank=True, help_text="State before change")
    after = models.JSONField(null=True, blank=True, help_text="State after change")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'audit_log'
        ordering = ['-created_at']
    def __str__(self):
        return f"[{self.actor_type}] {self.action} on {self.entity_type} ({self.entity_id})"
    def save(self, *args, **kwargs):
        if self.before is not None:
            self.before = json.loads(json.dumps(self.before, default=str))
        if self.after is not None:
            self.after = json.loads(json.dumps(self.after, default=str))
        super().save(*args, **kwargs)
class ImpersonationSessionMode(models.TextChoices):
    READ_ONLY = 'read_only', 'Read Only'
    WRITE = 'write', 'Write'
class ImpersonationSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    internal_user_id = models.CharField(max_length=255)
    store_group_id = models.CharField(max_length=255)
    mode = models.CharField(max_length=20, choices=ImpersonationSessionMode.choices, default=ImpersonationSessionMode.READ_ONLY)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    reason = models.TextField(help_text="Required especially for write mode")
    class Meta:
        db_table = 'impersonation_session'
        ordering = ['-started_at']
    def __str__(self):
        return f"Impersonate {self.store_group_id} by {self.internal_user_id} ({self.mode})"
class ProfessionalAccount(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='professional_account', help_text="Null until the professional accepts their invite and creates a login")
    phone_e164 = models.CharField(max_length=20, null=True, blank=True, db_index=True)
    name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    years_experience = models.PositiveIntegerField(default=0)
    profile_photo_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'professional_account'
        ordering = ['name']
    def save(self, *args, **kwargs):
        if self.phone_e164:
            self.phone_e164 = normalize_e164(self.phone_e164)
        super().save(*args, **kwargs)
    def __str__(self):
        return f"{self.name} ({self.user.email})"
class ProfessionalPortfolio(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.CASCADE, related_name='portfolio_items')
    media_url = models.URLField()
    caption = models.CharField(max_length=255, blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)
    class Meta:
        db_table = 'professional_portfolio'
        ordering = ['display_order']
    def __str__(self):
        return f"Portfolio item for {self.professional_account.name}"
class ProfessionalCertification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.CASCADE, related_name='certifications')
    title = models.CharField(max_length=255)
    issuer = models.CharField(max_length=255, blank=True, null=True)
    year = models.PositiveIntegerField(blank=True, null=True)
    media_url = models.URLField(blank=True, null=True)
    class Meta:
        db_table = 'professional_certification'
        ordering = ['-year']
    def __str__(self):
        return f"{self.title} ({self.issuer or 'N/A'}) - {self.professional_account.name}"
class PayoutDestinationType(models.TextChoices):
    UPI_VPA = 'upi_vpa', 'UPI VPA'
    BANK = 'bank', 'Bank Account'
class PayoutVerificationStatus(models.TextChoices):
    UNVERIFIED = 'unverified', 'Unverified'
    PENDING = 'pending', 'Pending'
    VERIFIED = 'verified', 'Verified'
    FAILED = 'failed', 'Failed'
class PayoutDestination(SoftDeleteModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.CASCADE, related_name='payout_destinations')
    type = models.CharField(max_length=20, choices=PayoutDestinationType.choices)
    vpa = models.CharField(max_length=255, blank=True, null=True, help_text="UPI VPA, e.g. name@bank")
    bank_account_masked = models.CharField(max_length=50, blank=True, null=True, help_text="Masked account number, e.g. XXXX1234")
    holder_name = models.CharField(max_length=255)
    verification_status = models.CharField(max_length=20, choices=PayoutVerificationStatus.choices, default=PayoutVerificationStatus.UNVERIFIED)
    verified_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'payout_destination'
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.get_type_display()} for {self.professional_account.name} ({self.verification_status})"
class ProfessionalTipMethod(models.TextChoices):
    UPI_DEEPLINK = 'upi_deeplink', 'UPI Deep Link'
    VPA_DIRECT = 'vpa_direct', 'VPA Direct'
class ProfessionalTipStatus(models.TextChoices):
    INITIATED = 'initiated', 'Initiated'
    CONFIRMED = 'confirmed', 'Confirmed'
    FAILED = 'failed', 'Failed'
    UNCONFIRMED = 'unconfirmed', 'Unconfirmed'
class ProfessionalTip(models.Model):
    """Direct professional-to-customer tip. Money never touches the platform;
    this row exists purely to record and reconcile intent (see apps.core.models.Tip
    for the older, unrelated invoice-based tip-to-wallet flow)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='professional_tips')
    appointment_slot = models.ForeignKey(AppointmentSlot, on_delete=models.CASCADE, related_name='professional_tips')
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.CASCADE, related_name='tips_received')
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name='professional_tips_given')
    store_group = models.ForeignKey(StoreGroup, on_delete=models.SET_NULL, null=True, blank=True, related_name='professional_tips')
    amount_paise = models.BigIntegerField(help_text="Tip amount stored strictly in integer paise")
    method = models.CharField(max_length=20, choices=ProfessionalTipMethod.choices)
    status = models.CharField(max_length=20, choices=ProfessionalTipStatus.choices, default=ProfessionalTipStatus.INITIATED)
    payment_ref = models.CharField(max_length=255, blank=True, null=True, help_text="UPI transaction ref / provider reference, if captured")
    initiated_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        db_table = 'professional_tip'
        ordering = ['-initiated_at']
    def __str__(self):
        return f"₹{self.amount_paise / 100:.2f} tip for {self.professional_account.name} ({self.status})"
class ReviewModerationStatus(models.TextChoices):
    VISIBLE = 'visible', 'Visible'
    FLAGGED = 'flagged', 'Flagged'
    HIDDEN = 'hidden', 'Hidden'
class ProfessionalReview(models.Model):
    """Booking-linked review of a store + optionally a specific professional
    (see apps.core.models.Review for the older, unrelated store-only review flow)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='professional_reviews')
    customer = models.ForeignKey(GlobalCustomer, on_delete=models.SET_NULL, null=True, blank=True, related_name='professional_reviews_given')
    store_group = models.ForeignKey(StoreGroup, on_delete=models.CASCADE, related_name='professional_reviews')
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviews_received')
    store_rating = models.PositiveSmallIntegerField(help_text="Rating from 1 to 5")
    professional_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Rating from 1 to 5, only when a professional is tagged")
    comment = models.TextField(blank=True, null=True)
    media_url = models.URLField(max_length=500, blank=True, null=True, help_text="Optional photo/video attached to the review")
    moderation_status = models.CharField(max_length=20, choices=ReviewModerationStatus.choices, default=ReviewModerationStatus.VISIBLE)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'professional_review'
        unique_together = ('booking', 'customer')
        ordering = ['-created_at']
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.professional_account_id:
            ReputationAggregate.recompute(self.professional_account)
    def __str__(self):
        return f"Review for {self.store_group.name} ({self.store_rating}★ store)"
class ReviewResponse(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    review = models.OneToOneField(ProfessionalReview, on_delete=models.CASCADE, related_name='response')
    professional_account = models.ForeignKey(ProfessionalAccount, on_delete=models.CASCADE, related_name='review_responses')
    response_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = 'review_response'
        ordering = ['-created_at']
    def __str__(self):
        return f"Response by {self.professional_account.name} to review {self.review_id}"
class ReputationAggregate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_account = models.OneToOneField(ProfessionalAccount, on_delete=models.CASCADE, related_name='reputation')
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    total_reviews = models.PositiveIntegerField(default=0)
    total_services = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'reputation_aggregate'
    @classmethod
    def recompute(cls, professional_account):
        from django.db.models import Avg, Count
        agg = ProfessionalReview.objects.filter(
            professional_account=professional_account,
            moderation_status=ReviewModerationStatus.VISIBLE,
            professional_rating__isnull=False,
        ).aggregate(avg=Avg('professional_rating'), count=Count('id'))
        total_services = AppointmentSlot.objects.filter(
            professional__user_account=professional_account,
            status=AppointmentSlotStatus.DONE,
        ).count()
        obj, _ = cls.objects.get_or_create(professional_account=professional_account)
        obj.avg_rating = agg['avg'] or 0
        obj.total_reviews = agg['count'] or 0
        obj.total_services = total_services
        obj.save()
        return obj
    def __str__(self):
        return f"{self.professional_account.name}: {self.avg_rating}★ ({self.total_reviews} reviews)"
class ReputationConsent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    professional_account = models.OneToOneField(ProfessionalAccount, on_delete=models.CASCADE, related_name='reputation_consent')
    portability_granted = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'reputation_consent'
    def __str__(self):
        return f"{self.professional_account.name}: portability {'granted' if self.portability_granted else 'not granted'}"
