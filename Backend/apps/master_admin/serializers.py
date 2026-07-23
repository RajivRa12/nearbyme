from rest_framework import serializers
from apps.core.models import (
    Business, Brand, Store, User, Role,
    SubscriptionPlan, BusinessSubscription,
    PlatformSettings, Coupon, Review,
    MembershipTier, Invoice, Commission
)


# BUSINESS 
class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# BRAND 

class BrandSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# STORE 

class StoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)

    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# PLATFORM USERS 

class PlatformUserSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    password = serializers.CharField(write_only=True, required=False, min_length=6)

    class Meta:
        model = User
        fields = (
            'id', 'email', 'password', 'first_name', 'last_name',
            'phone', 'role', 'brand', 'brand_name', 'store', 'store_name',
            'is_active', 'date_joined'
        )
        read_only_fields = ('id', 'date_joined')

    def validate_role(self, value):
        if value == Role.MASTER_ADMIN:
            raise serializers.ValidationError("Cannot assign MASTER_ADMIN role via this endpoint.")
        return value

    def validate(self, attrs):
        role = attrs.get('role', getattr(self.instance, 'role', None))
        store = attrs.get('store', getattr(self.instance, 'store', None))
        brand = attrs.get('brand', getattr(self.instance, 'brand', None))
        if role in [Role.STORE_ADMIN, Role.RECEPTIONIST, Role.THERAPIST]:
            if not store:
                raise serializers.ValidationError({"store": "Store is required for this role."})
            attrs['brand'] = store.brand
        if role == Role.BRAND_OWNER and not brand:
            raise serializers.ValidationError({"brand": "Brand is required for Brand Owners."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.username = validated_data['email']
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# SUBSCRIPTION PLAN 

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class BusinessSubscriptionSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = BusinessSubscription
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


# PLATFORM SETTINGS 

class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = '__all__'
        read_only_fields = ('id', 'updated_at')


# COUPONS 

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('id', 'used_count', 'created_at', 'updated_at')


#  REVIEWS 

class ReviewSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

# GLOBAL ANALYTICS & MANAGEMENT 

class GlobalMembershipSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    
    class Meta:
        model = MembershipTier
        fields = '__all__'
        read_only_fields = ('store',)

class GlobalInvoiceSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    appointment_id = serializers.CharField(source='appointment.id', read_only=True, allow_null=True)
    
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ('store', 'appointment')

class GlobalCommissionSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    therapist_name = serializers.CharField(source='therapist.get_full_name', read_only=True)
    
    class Meta:
        model = Commission
        fields = '__all__'
        read_only_fields = ('store', 'therapist')
