from decimal import Decimal
from rest_framework import serializers
from apps.core.models import (
    Store, ServiceCategory, Service, User,
    Appointment, AppointmentItem, Wallet, WalletTransaction,
    CustomerMembership, Review,
    GiftCard, ServicePackage, CustomerPackage,
    FavoriteTherapist, CustomerFavourite, Invoice, Coupon,
    Notification, ProfessionalReview,
    Conversation, ChatMessage,
    StorePublicProfile,
)
class MicrositeSerializer(serializers.ModelSerializer):
    # A store's own public booking page — deliberately single-object only
    # (see MicrositeView). Every field here is scoped through `store`, so
    # there's no field a future edit could add that would leak another
    # store's data; the object itself can never be more than one store.
    store_id = serializers.CharField(source='store.id', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    address = serializers.CharField(source='store.address', read_only=True)
    location = serializers.CharField(source='store.location', read_only=True)
    contact_number = serializers.CharField(source='store.contact_number', read_only=True)
    working_hours = serializers.JSONField(source='store.working_hours', read_only=True)
    is_premium_listing = serializers.SerializerMethodField()
    class Meta:
        model = StorePublicProfile
        fields = [
            'slug', 'headline', 'about', 'cover_image_url', 'gallery', 'amenities',
            'cancellation_policy_text', 'store_id', 'store_name', 'address', 'location',
            'contact_number', 'working_hours', 'is_premium_listing',
        ]
    def get_is_premium_listing(self, obj):
        return bool(obj.store.is_premium_listing) and obj.store.has_plan_feature('includes_premium_listing')
class PublicStoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    has_online_booking = serializers.SerializerMethodField()
    is_premium_listing = serializers.SerializerMethodField()
    slug = serializers.SerializerMethodField()
    class Meta:
        model = Store
        fields = ['id', 'name', 'brand_name', 'address', 'location', 'contact_number', 'email', 'has_online_booking', 'working_hours', 'is_premium_listing', 'slug']
    def get_has_online_booking(self, obj):
        return obj.outlet_id is not None
    def get_slug(self, obj):
        profile = getattr(obj, 'public_profile', None)
        return profile.slug if profile else None
    def get_is_premium_listing(self, obj):
        # The admin flag alone isn't proof of payment — only show the boost
        # when an active subscription actually bundles it in. See
        # Store.has_plan_feature.
        return bool(obj.is_premium_listing) and obj.has_plan_feature('includes_premium_listing')
class PublicServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    store_id = serializers.SerializerMethodField()
    store_name = serializers.SerializerMethodField()
    class Meta:
        model = Service
        fields = ['id', 'name', 'price', 'duration_minutes', 'category_name', 'is_premium_listing', 'store_id', 'store_name']
    def get_store(self, obj):
        return obj.category.business.stores.filter(status='ACTIVE').first()
    def get_store_id(self, obj):
        store = self.get_store(obj)
        return store.id if store else None
    def get_store_name(self, obj):
        store = self.get_store(obj)
        return store.name if store else None
class PublicServiceCategorySerializer(serializers.ModelSerializer):
    services = serializers.SerializerMethodField()
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'services']
    def get_services(self, obj):
        services = Service.objects.filter(category=obj, is_active=True)
        return PublicServiceSerializer(services, many=True).data
class PublicReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.first_name', read_only=True)
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 'customer_name', 'created_at']
class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'loyalty_points', 'expo_push_token']
        read_only_fields = ['id', 'email', 'loyalty_points']
class CustomerWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ['id', 'transaction_type', 'amount', 'description', 'created_at']
class CustomerWalletSerializer(serializers.ModelSerializer):
    transactions = CustomerWalletTransactionSerializer(many=True, read_only=True)
    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'updated_at', 'transactions']
class CustomerMembershipSerializer(serializers.ModelSerializer):
    tier_name = serializers.CharField(source='tier.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    class Meta:
        model = CustomerMembership
        fields = ['id', 'tier_name', 'store_name', 'start_date', 'end_date', 'is_active']
class CustomerAppointmentItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    price = serializers.DecimalField(source='service.price', max_digits=10, decimal_places=2, read_only=True)
    class Meta:
        model = AppointmentItem
        fields = ['id', 'service', 'service_name', 'price']
class CustomerAppointmentSerializer(serializers.ModelSerializer):
    items = CustomerAppointmentItemSerializer(many=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    total_amount = serializers.SerializerMethodField()
    class Meta:
        model = Appointment
        fields = ['id', 'store', 'store_name', 'start_time', 'end_time', 'status', 'total_amount', 'notes', 'items']
        read_only_fields = ['id', 'store_name', 'end_time', 'status', 'total_amount']
    def get_total_amount(self, obj):
        # Appointment carries no stored total — like Invoice.grand_total_paise,
        # it's derived from its locked line-item prices, not duplicated.
        return sum((item.price for item in obj.items.all()), start=Decimal('0'))
    def create(self, validated_data):
        import datetime
        items_data = validated_data.pop('items')
        start_time = validated_data.get('start_time')
        if start_time:
            validated_data['end_time'] = start_time + datetime.timedelta(hours=1)
        appointment = Appointment.objects.create(**validated_data)
        for item_data in items_data:
            AppointmentItem.objects.create(appointment=appointment, **item_data)
        return appointment
class GiftCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = GiftCard
        fields = ['id', 'code', 'store', 'initial_value', 'current_balance', 'recipient_email', 'expiry_date', 'is_active']
        read_only_fields = ['id', 'code', 'current_balance', 'expiry_date', 'is_active']
class ServicePackageSerializer(serializers.ModelSerializer):
    services_list = PublicServiceSerializer(source='services', many=True, read_only=True)
    class Meta:
        model = ServicePackage
        fields = ['id', 'name', 'description', 'price', 'services_list']
class CustomerPackageSerializer(serializers.ModelSerializer):
    package_details = ServicePackageSerializer(source='package', read_only=True)
    class Meta:
        model = CustomerPackage
        fields = ['id', 'package', 'package_details', 'purchase_date', 'is_active']
        read_only_fields = ['id', 'package_details', 'purchase_date', 'is_active']
class FavoriteTherapistSerializer(serializers.ModelSerializer):
    therapist_name = serializers.CharField(source='therapist.get_full_name', read_only=True)
    therapist_id = serializers.IntegerField(source='therapist.id', read_only=True)
    class Meta:
        model = FavoriteTherapist
        fields = ['id', 'therapist', 'therapist_id', 'therapist_name', 'created_at']
        read_only_fields = ['id', 'created_at']
class CustomerFavouriteSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_address = serializers.CharField(source='store.address', read_only=True)
    professional_account_name = serializers.CharField(source='professional_account.name', read_only=True)
    class Meta:
        model = CustomerFavourite
        fields = ['id', 'store', 'store_name', 'store_address', 'professional_account', 'professional_account_name', 'created_at']
        read_only_fields = ['id', 'created_at']
    def validate_store(self, store):
        customer = self.context.get('customer')
        if customer and CustomerFavourite.objects.filter(customer=customer, store=store).exists():
            raise serializers.ValidationError("This salon is already saved.")
        return store
class CustomerInvoiceSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'store_name', 'grand_total_paise', 'status', 'created_at']
        read_only_fields = ['id']
class CustomerNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'type', 'created_at']
class CustomerReviewSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store_group.name', read_only=True)
    professional_name = serializers.CharField(source='professional_account.name', read_only=True, default=None)
    class Meta:
        model = ProfessionalReview
        fields = ['id', 'store_name', 'professional_name', 'store_rating', 'professional_rating', 'comment', 'media_url', 'created_at']
class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    is_mine = serializers.SerializerMethodField()
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'sender_name', 'content', 'is_read', 'created_at', 'is_mine']
    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and obj.sender_id == request.user.id)
class ConversationSerializer(serializers.ModelSerializer):
    therapist_name = serializers.CharField(source='therapist.get_full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id', 'therapist', 'therapist_name', 'last_message', 'unread_count', 'created_at']
    def get_last_message(self, obj):
        m = obj.messages.order_by('-created_at').first()
        return {'content': m.content, 'created_at': m.created_at} if m else None
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        return obj.messages.exclude(sender=request.user).filter(is_read=False).count()
class PublicCouponSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'discount_type', 'discount_value', 'store_name', 'start_date', 'end_date']
class PublicTherapistSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name']
from apps.core.models import StoreService, Professional
class Phase1StoreServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='canonical_service.category.name', read_only=True, default=None)
    skill_tag = serializers.CharField(source='canonical_service.skill_tag', read_only=True, default=None)
    class Meta:
        model = StoreService
        fields = ['id', 'name', 'default_price_paise', 'deposit_percentage', 'duration_min', 'category_name', 'skill_tag']
        read_only_fields = fields
class Phase1ProfessionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Professional
        fields = ['id', 'display_name', 'display_role']
        read_only_fields = fields
class Phase1BookingRequestSerializer(serializers.Serializer):
    store_service_id = serializers.UUIDField()
    professional_id = serializers.UUIDField(required=False, allow_null=True)
    slot_start = serializers.DateTimeField()
    slot_end = serializers.DateTimeField()
    is_home_service = serializers.BooleanField(required=False, default=False)
    service_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    hold_id = serializers.UUIDField(required=False, allow_null=True)
    razorpay_order_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    razorpay_payment_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    razorpay_signature = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    def validate(self, attrs):
        if attrs.get('is_home_service') and not (attrs.get('service_address') or '').strip():
            raise serializers.ValidationError({"service_address": "An address is required for home service bookings."})
        return attrs
class SlotHoldRequestSerializer(serializers.Serializer):
    store_service_id = serializers.UUIDField()
    professional_id = serializers.UUIDField(required=False, allow_null=True)
    slot_start = serializers.DateTimeField()
    slot_end = serializers.DateTimeField()
    session_token = serializers.CharField(max_length=64)
class CreatePaymentOrderSerializer(serializers.Serializer):
    store_service_id = serializers.UUIDField()
    hold_id = serializers.UUIDField(required=False, allow_null=True)
    payment_type = serializers.ChoiceField(choices=['full', 'deposit'], required=False, default='full')
from apps.core.models import Booking, AppointmentSlot
class CustomerBookingSlotSerializer(serializers.ModelSerializer):
    store_service_name = serializers.CharField(source='store_service.name', read_only=True)
    professional_name = serializers.CharField(source='professional.display_name', read_only=True, default=None)
    class Meta:
        model = AppointmentSlot
        fields = ['id', 'store_service', 'store_service_name', 'professional', 'professional_name', 'slot_start', 'slot_end', 'price_paise', 'status']
        read_only_fields = fields
class CustomerBookingSerializer(serializers.ModelSerializer):
    outlet_name = serializers.CharField(source='outlet.name', read_only=True)
    slots = serializers.SerializerMethodField()
    has_review = serializers.SerializerMethodField()
    store_id = serializers.SerializerMethodField()
    payment = serializers.SerializerMethodField()
    class Meta:
        model = Booking
        fields = [
            'id', 'outlet', 'outlet_name', 'status', 'booking_start', 'booking_end', 'slots', 'has_review', 'store_id',
            'is_home_service', 'service_address', 'on_the_way_at', 'therapist_lat', 'therapist_lng', 'location_updated_at',
            'payment',
        ]
        read_only_fields = fields
    def get_slots(self, obj):
        # A reschedule cancels the old slot and creates a new one — exclude
        # cancelled slots so the customer doesn't see stale/duplicate entries.
        from apps.core.models import AppointmentSlotStatus
        active_slots = obj.slots.exclude(status=AppointmentSlotStatus.CANCELLED)
        return CustomerBookingSlotSerializer(active_slots, many=True).data
    def get_store_id(self, obj):
        store = Store.objects.filter(outlet_id=obj.outlet_id).first()
        return store.id if store else None
    def get_payment(self, obj):
        payment = getattr(obj, 'online_payment', None)
        if not payment:
            return None
        return {
            "payment_type": payment.payment_type,
            "status": payment.status,
            "amount_paise": payment.amount_paise,
            "total_amount_paise": payment.total_amount_paise,
            "balance_due_paise": payment.total_amount_paise - payment.amount_paise,
        }
    def get_has_review(self, obj):
        from apps.core.models import ProfessionalReview, GlobalCustomer, normalize_e164
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        customer = None
        if user.phone:
            customer = GlobalCustomer.objects.filter(phone_e164=normalize_e164(user.phone)).first()
        if not customer and user.email:
            customer = GlobalCustomer.objects.filter(email=user.email).first()
        if not customer:
            return False
        return ProfessionalReview.objects.filter(booking=obj, customer=customer).exists()
class BookingTipRequestSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('1.00'))
    professional_id = serializers.UUIDField()
class BookingReviewRequestSerializer(serializers.Serializer):
    store_rating = serializers.IntegerField(min_value=1, max_value=5)
    professional_rating = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)
    professional_id = serializers.UUIDField(required=False, allow_null=True)
    comment = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    media_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)
