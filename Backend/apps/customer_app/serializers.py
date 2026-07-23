from rest_framework import serializers
from apps.core.models import (
    Store, ServiceCategory, Service, User,
    Appointment, AppointmentItem, Wallet, WalletTransaction,
    CustomerMembership, Review,
    GiftCard, ServicePackage, CustomerPackage,
    FavoriteTherapist, Invoice, Coupon
)

# DISCOVERY (PUBLIC/MARKETPLACE)

class PublicStoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    
    class Meta:
        model = Store
        fields = ['id', 'name', 'brand_name', 'address', 'location', 'contact_number', 'email']

class PublicServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration', 'price', 'category']

class PublicServiceCategorySerializer(serializers.ModelSerializer):
    services = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceCategory
        fields = ['id', 'name', 'description', 'services']
        
    def get_services(self, obj):
        services = Service.objects.filter(category=obj, is_active=True)
        return PublicServiceSerializer(services, many=True).data

class PublicReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.first_name', read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 'customer_name', 'created_at']

# AUTHENTICATED CUSTOMER 

class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'loyalty_points']
        read_only_fields = ['id', 'email', 'loyalty_points']

class CustomerWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ['id', 'transaction_type', 'amount', 'reference_id', 'created_at']

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

# APPOINTMENTS

class CustomerAppointmentItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    price = serializers.DecimalField(source='service.price', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = AppointmentItem
        fields = ['id', 'service', 'service_name', 'price']

class CustomerAppointmentSerializer(serializers.ModelSerializer):
    items = CustomerAppointmentItemSerializer(many=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    
    class Meta:
        model = Appointment
        fields = ['id', 'store', 'store_name', 'start_time', 'end_time', 'status', 'total_amount', 'notes', 'items']
        read_only_fields = ['id', 'store_name', 'end_time', 'status', 'total_amount']

    def create(self, validated_data):
        import datetime
        items_data = validated_data.pop('items')
        total_amount = sum([item['service'].price for item in items_data])
        
        start_time = validated_data.get('start_time')
        if start_time:
            validated_data['end_time'] = start_time + datetime.timedelta(hours=1)
        
        appointment = Appointment.objects.create(
            total_amount=total_amount,
            **validated_data
        )
        
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

class CustomerInvoiceSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'store_name', 'grand_total', 'status', 'created_at']
        read_only_fields = ['id']

class PublicCouponSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = Coupon
        fields = ['id', 'code', 'discount_type', 'discount_value', 'store_name', 'start_date', 'end_date']

class PublicServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    class Meta:
        model = Service
        fields = ['id', 'name', 'price', 'duration_minutes', 'category_name', 'is_premium_listing']

class PublicTherapistSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name']
