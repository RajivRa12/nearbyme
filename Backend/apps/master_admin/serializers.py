from rest_framework import serializers
from apps.core.models import (
    Business, Brand, Store, User, Role,
    PlatformSettings, Coupon, MembershipTier, Invoice, StoreGroup, Outlet, StoreStatusHistory, KycDocument, BankSettlementAccount,
    Plan, AccessCode, ServiceCategoryPhase1, CanonicalService, StoreService, StoreServiceMarketplaceStatus,
    GlobalCustomer, CustomerStoreLink, CustomerMergeLog, AuditLog,
    ImpersonationSession, ImpersonationSessionMode,
    PlatformSubscriptionPlan, StoreSubscription, PlatformInvoice,
)
class PlatformSubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSubscriptionPlan
        fields = '__all__'
class StoreSubscriptionSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    plan_monthly_price = serializers.DecimalField(source='plan.monthly_price', read_only=True, max_digits=10, decimal_places=2)
    class Meta:
        model = StoreSubscription
        fields = '__all__'
class PlatformInvoiceSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    class Meta:
        model = PlatformInvoice
        fields = '__all__'
        read_only_fields = ['store', 'stripe_invoice_id', 'created_at']
class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
class BrandSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source='business.name', read_only=True)
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
class StoreSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    class Meta:
        model = Store
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
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
class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = '__all__'
        read_only_fields = ('id', 'updated_at')
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'
        read_only_fields = ('id', 'used_count', 'created_at', 'updated_at')
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
class PlanSerializer(serializers.ModelSerializer):
    price_rupees_display = serializers.SerializerMethodField()
    class Meta:
        model = Plan
        fields = [
            'id', 'name', 'price_paise', 'price_rupees_display',
            'billing_period', 'outlet_limit', 'professional_limit',
            'feature_flags', 'is_active', 'created_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'created_at', 'deleted_at', 'price_rupees_display']
    def get_price_rupees_display(self, obj):
        rupees = obj.price_paise / 100.0
        return f"₹{rupees:,.2f}"
class AccessCodeSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name')
    is_expired = serializers.SerializerMethodField()
    class Meta:
        model = AccessCode
        fields = [
            'id', 'code', 'plan', 'plan_name', 'duration_days',
            'max_redemptions', 'redemption_count', 'expires_at',
            'issued_by', 'source_tag', 'status', 'is_expired', 'created_at'
        ]
        read_only_fields = ['id', 'redemption_count', 'issued_by', 'created_at', 'is_expired']
    def get_is_expired(self, obj):
        from django.utils import timezone
        return obj.expires_at < timezone.now() if obj.expires_at else False
class AccessCodeGenerateSerializer(serializers.Serializer):
    prefix = serializers.CharField(max_length=10, default="NRBY")
    plan_id = serializers.UUIDField(required=True)
    duration_days = serializers.IntegerField(default=30, min_value=1, max_value=365)
    max_redemptions = serializers.IntegerField(default=1, min_value=1)
    source_tag = serializers.CharField(max_length=100, required=True, help_text="e.g. 'Instagram-Ad', 'Partner-Referral'")
class OutletSerializer(serializers.ModelSerializer):
    city_name = serializers.ReadOnlyField(source='city.name', default='')
    zone_name = serializers.ReadOnlyField(source='zone.name', default='')
    class Meta:
        model = Outlet
        fields = [
            'id', 'store_group', 'name', 'address_line',
            'city', 'city_name', 'zone', 'zone_name',
            'pincode', 'phone', 'opening_time', 'closing_time',
            'status', 'created_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'created_at', 'deleted_at']
class StoreStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreStatusHistory
        fields = [
            'id', 'store_group', 'from_status', 'to_status',
            'reason', 'changed_by', 'changed_by_type', 'created_at'
        ]
        read_only_fields = fields
class KycDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = KycDocument
        fields = [
            'id', 'store_group', 'doc_type', 'file_url',
            'status', 'reviewed_by', 'reviewed_at',
            'rejection_reason', 'uploaded_at'
        ]
        read_only_fields = ['id', 'reviewed_by', 'reviewed_at', 'uploaded_at']
class KycVerifySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'verified', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')
    def validate(self, data):
        if data.get('status') == 'rejected' and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({"rejection_reason": "A valid reason is strictly required when rejecting a KYC document."})
        return data
class StoreGroupListSerializer(serializers.ModelSerializer):
    plan_name = serializers.ReadOnlyField(source='plan.name', default='Unassigned')
    outlet_count = serializers.SerializerMethodField()
    class Meta:
        model = StoreGroup
        fields = [
            'id', 'name', 'legal_name', 'business_type', 'status',
            'owner_name', 'owner_phone', 'owner_email',
            'gstin', 'plan_name', 'outlet_count', 'created_at'
        ]
        read_only_fields = fields
    def get_outlet_count(self, obj):
        return obj.outlets.count() if hasattr(obj, 'outlets') else 0
class StoreGroupDetailSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source='plan', read_only=True)
    access_code_details = AccessCodeSerializer(source='access_code', read_only=True)
    outlets = OutletSerializer(many=True, read_only=True)
    status_history = StoreStatusHistorySerializer(many=True, read_only=True)
    kyc_documents = KycDocumentSerializer(many=True, read_only=True)
    class Meta:
        model = StoreGroup
        fields = [
            'id', 'name', 'legal_name', 'owner_name', 'owner_phone', 'owner_email',
            'gstin', 'pan', 'business_type', 'status',
            'plan', 'plan_details', 'access_code', 'access_code_details',
            'term_start', 'term_end', 'approved_at',
            'outlets', 'status_history', 'kyc_documents',
            'created_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'approved_at', 'created_at', 'deleted_at']
class StoreGroupTransitionSerializer(serializers.Serializer):
    reason = serializers.CharField(required=True, max_length=500, help_text="Mandatory audit reason for lifecycle state transition")
class ServiceCategoryPhase1Serializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceCategoryPhase1
        fields = ['id', 'name', 'slug', 'applies_to', 'display_order', 'is_active']
        read_only_fields = fields
class CanonicalServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    class Meta:
        model = CanonicalService
        fields = [
            'id', 'category', 'category_name', 'name', 'slug',
            'default_duration_min', 'buffer_before_min', 'buffer_after_min',
            'resource_type', 'gender_applicability', 'skill_tag',
            'is_active'
        ]
        read_only_fields = fields
class StoreServiceSerializer(serializers.ModelSerializer):
    store_group_name = serializers.ReadOnlyField(source='store_group.name')
    canonical_service_name = serializers.ReadOnlyField(source='canonical_service.name', default='Custom Unmatched')
    default_price_rupees_display = serializers.SerializerMethodField()
    class Meta:
        model = StoreService
        fields = [
            'id', 'store_group', 'store_group_name', 'canonical_service', 'canonical_service_name',
            'name', 'default_price_paise', 'default_price_rupees_display', 'duration_min',
            'is_active_in_store', 'marketplace_status', 'submitted_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'store_group_name', 'canonical_service_name', 'default_price_rupees_display', 'submitted_at', 'deleted_at']
    def get_default_price_rupees_display(self, obj):
        rupees = (obj.default_price_paise or 0) / 100.0
        return f"₹{rupees:,.2f}"
class StoreServiceReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[StoreServiceMarketplaceStatus.APPROVED, StoreServiceMarketplaceStatus.REJECTED])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')
    def validate(self, data):
        if data.get('status') == StoreServiceMarketplaceStatus.REJECTED and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({"rejection_reason": "A valid reason is required when rejecting a service from the marketplace."})
        return data
class CustomerStoreLinkSerializer(serializers.ModelSerializer):
    store_group_name = serializers.ReadOnlyField(source='store_group.name')
    lifetime_spend_rupees_display = serializers.SerializerMethodField()
    class Meta:
        model = CustomerStoreLink
        fields = [
            'id', 'customer', 'store_group', 'store_group_name',
            'first_visit_at', 'last_visit_at', 'visit_count',
            'lifetime_spend_paise', 'lifetime_spend_rupees_display',
            'preferred_professional_id', 'notes', 'lifecycle_stage', 'created_at'
        ]
        read_only_fields = ['id', 'store_group_name', 'lifetime_spend_rupees_display', 'created_at']
    def get_lifetime_spend_rupees_display(self, obj):
        rupees = (obj.lifetime_spend_paise or 0) / 100.0
        return f"₹{rupees:,.2f}"
class GlobalCustomerSerializer(serializers.ModelSerializer):
    store_links = CustomerStoreLinkSerializer(many=True, read_only=True)
    total_global_spend_paise = serializers.SerializerMethodField()
    total_global_spend_rupees_display = serializers.SerializerMethodField()
    total_global_visits = serializers.SerializerMethodField()
    store_count = serializers.SerializerMethodField()
    class Meta:
        model = GlobalCustomer
        fields = [
            'id', 'name', 'phone_e164', 'email', 'status', 'is_global',
            'total_global_spend_paise', 'total_global_spend_rupees_display',
            'total_global_visits', 'store_count', 'store_links',
            'created_at', 'deleted_at'
        ]
        read_only_fields = ['id', 'total_global_spend_paise', 'total_global_spend_rupees_display', 'total_global_visits', 'store_count', 'store_links', 'created_at', 'deleted_at']
    def get_total_global_spend_paise(self, obj):
        links = obj.store_links.all() if hasattr(obj, 'store_links') else []
        return sum(link.lifetime_spend_paise or 0 for link in links)
    def get_total_global_spend_rupees_display(self, obj):
        paise = self.get_total_global_spend_paise(obj)
        return f"₹{paise / 100.0:,.2f}"
    def get_total_global_visits(self, obj):
        links = obj.store_links.all() if hasattr(obj, 'store_links') else []
        return sum(link.visit_count or 0 for link in links)
    def get_store_count(self, obj):
        return obj.store_links.count() if hasattr(obj, 'store_links') else 0
class CustomerMergeSerializer(serializers.Serializer):
    primary_customer_id = serializers.UUIDField(required=True, help_text="The canonical profile that will retain and absorb all financial histories.")
    secondary_customer_id = serializers.UUIDField(required=True, help_text="The duplicate profile whose links will be absorbed before soft deletion.")
    reason = serializers.CharField(required=True, max_length=500, help_text="Mandatory audit justification for profile consolidation.")
    def validate(self, data):
        if data['primary_customer_id'] == data['secondary_customer_id']:
            raise serializers.ValidationError({"secondary_customer_id": "Primary and secondary customer IDs must be distinct."})
        return data
class CustomerMergeLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerMergeLog
        fields = [
            'id', 'surviving_customer_id', 'merged_customer_id',
            'merged_by', 'affected_records', 'created_at', 'reverted_at'
        ]
        read_only_fields = fields
class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_id', 'actor_type', 'action',
            'entity_type', 'entity_id', 'before', 'after',
            'ip_address', 'created_at'
        ]
        read_only_fields = fields
class ToggleFeatureFlagSerializer(serializers.Serializer):
    flag_key = serializers.CharField(max_length=100, required=True, help_text="Unique flag identifier e.g., 'whatsapp_reminders'")
    enabled = serializers.BooleanField(required=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default="Operational feature flag adjustment")
class ImpersonationSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImpersonationSession
        fields = ['id', 'internal_user_id', 'store_group_id', 'mode', 'started_at', 'ended_at', 'reason']
        read_only_fields = fields
class ImpersonationStartSerializer(serializers.Serializer):
    store_group_id = serializers.UUIDField(required=True)
    mode = serializers.ChoiceField(choices=ImpersonationSessionMode.choices, default=ImpersonationSessionMode.READ_ONLY)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)
    def validate(self, data):
        if data.get('mode') == ImpersonationSessionMode.WRITE and not data.get('reason'):
            raise serializers.ValidationError({"reason": "A documented support reason is mandatory when requesting write mode impersonation."})
        return data
class KycDocumentAdminSerializer(serializers.ModelSerializer):
    store_group_name = serializers.CharField(source='store_group.name', read_only=True)
    store_group_status = serializers.CharField(source='store_group.status', read_only=True)
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    file_url = serializers.SerializerMethodField()
    class Meta:
        model = KycDocument
        fields = [
            'id', 'store_group', 'store_group_name', 'store_group_status',
            'doc_type', 'doc_type_display', 'file_url',
            'status', 'status_display', 'uploaded_at',
            'reviewed_by', 'reviewed_at', 'rejection_reason'
        ]
        read_only_fields = ['id', 'store_group', 'doc_type', 'uploaded_at', 'reviewed_by', 'reviewed_at']
    def get_file_url(self, obj):
        return obj.file_display_url
class KycApproveSerializer(serializers.Serializer):
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
class KycRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(min_length=10, max_length=1000)
class BankSettlementAdminSerializer(serializers.ModelSerializer):
    store_group_name = serializers.CharField(source='store_group.name', read_only=True)
    store_group_status = serializers.CharField(source='store_group.status', read_only=True)
    class Meta:
        model = BankSettlementAccount
        fields = [
            'id', 'store_group', 'store_group_name', 'store_group_status',
            'account_holder_name', 'account_number', 'ifsc_code',
            'bank_name', 'branch_name', 'account_type',
            'submitted_at', 'submitted_by',
            'is_verified', 'activated_at', 'activated_by',
            'weekly_payout_enabled', 'rejection_reason'
        ]
        read_only_fields = [
            'id', 'store_group', 'submitted_at', 'submitted_by',
            'activated_at', 'activated_by'
        ]
