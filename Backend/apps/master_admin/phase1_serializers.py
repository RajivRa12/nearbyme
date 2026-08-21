from rest_framework import serializers
from apps.core.models import (
    StoreGroup, StoreGroupStatus, StoreGroupType,
    Outlet, StoreStatusHistory, KycDocument,
    Plan, AccessCode, AccessCodeRedemption,
    ServiceCategoryPhase1, CanonicalService, StoreService, StoreServiceMarketplaceStatus,
    GlobalCustomer, CustomerStatus, CustomerStoreLink, CustomerMergeLog, AuditLog,
    ImpersonationSession, ImpersonationSessionMode
)

class PlanSerializer(serializers.ModelSerializer):
    """
    Serializer for Phase 1 Subscription Plans.
    Strictly enforces Rule 8: All money is stored in paise integers.
    Provides a read-only formatted rupees display for control panel presentation.
    """
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
    """
    Serializer for tracking free-access promo and enterprise codes (Ticket 5).
    """
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
    """
    Input payload validation for generating prefixed, unique access codes (Ticket 5).
    Example Prefix: 'BLR' with Plan 'Pilot' produces code like 'BLR-PILOT-A7X2'.
    """
    prefix = serializers.CharField(max_length=10, default="NRBY")
    plan_id = serializers.UUIDField(required=True)
    duration_days = serializers.IntegerField(default=30, min_value=1, max_value=365)
    max_redemptions = serializers.IntegerField(default=1, min_value=1)
    source_tag = serializers.CharField(max_length=100, required=True, help_text="e.g. 'Instagram-Ad', 'Partner-Referral'")


class OutletSerializer(serializers.ModelSerializer):
    """
    Serializer for physical locations attached to a StoreGroup (Page 6 rule).
    """
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
    """
    Audit timeline representation of Store Group state transformations.
    """
    class Meta:
        model = StoreStatusHistory
        fields = [
            'id', 'store_group', 'from_status', 'to_status',
            'reason', 'changed_by', 'changed_by_type', 'created_at'
        ]
        read_only_fields = fields


class KycDocumentSerializer(serializers.ModelSerializer):
    """
    Serializer for Store Group KYC compliance verification (Ticket 4).
    """
    class Meta:
        model = KycDocument
        fields = [
            'id', 'store_group', 'doc_type', 'file_url',
            'status', 'reviewed_by', 'reviewed_at',
            'rejection_reason', 'uploaded_at'
        ]
        read_only_fields = ['id', 'reviewed_by', 'reviewed_at', 'uploaded_at']


class KycVerifySerializer(serializers.Serializer):
    """
    Input serializer for operations staff reviewing KYC uploaded documents.
    """
    status = serializers.ChoiceField(choices=['approved', 'verified', 'rejected'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data.get('status') == 'rejected' and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({"rejection_reason": "A valid reason is strictly required when rejecting a KYC document."})
        return data


class StoreGroupListSerializer(serializers.ModelSerializer):
    """
    Optimized summary serializer for paginated Store Group table views (Ticket 2).
    """
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
    """
    Comprehensive detail view serializer combining metadata, physical outlets,
    state transition histories, and uploaded KYC documents (Ticket 2 & 3).
    """
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
    """
    Input serializer for state transitions requiring audit justification.
    """
    reason = serializers.CharField(required=True, max_length=500, help_text="Mandatory audit reason for lifecycle state transition")


# =====================================================================
# TICKET 6: SERVICE TAXONOMY & CUSTOM SERVICE REVIEW QUEUE SERIALIZERS
# =====================================================================

class ServiceCategoryPhase1Serializer(serializers.ModelSerializer):
    """
    Serializer for the 10 canonical service categories.
    """
    class Meta:
        model = ServiceCategoryPhase1
        fields = ['id', 'name', 'slug', 'applies_to', 'display_order', 'is_active']
        read_only_fields = fields


class CanonicalServiceSerializer(serializers.ModelSerializer):
    """
    Serializer for the 53 master canonical services.
    Enforces unified resource_type ('none', 'chair', 'room', 'equipment').
    """
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
    """
    Serializer for custom store service moderation (Ticket 6).
    Enforces Rule: custom services are active locally the same minute (is_active_in_store=True),
    while waiting in the public marketplace moderation queue (marketplace_status='pending').
    """
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
    """
    Input validation for operations teams approving or rejecting custom store services in public marketplace.
    """
    status = serializers.ChoiceField(choices=[StoreServiceMarketplaceStatus.APPROVED, StoreServiceMarketplaceStatus.REJECTED])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data.get('status') == StoreServiceMarketplaceStatus.REJECTED and not data.get('rejection_reason', '').strip():
            raise serializers.ValidationError({"rejection_reason": "A valid reason is required when rejecting a service from the marketplace."})
        return data


# =====================================================================
# TICKETS 7 & 8: GLOBAL CUSTOMER REGISTRY & RECORD-MERGING ENGINE
# =====================================================================

class CustomerStoreLinkSerializer(serializers.ModelSerializer):
    """
    Store-Scoped Customer Financial Isolation (Rule 3 & Ticket 7).
    Salons see strictly their own spend, visit frequency, notes, and preferred professional IDs.
    """
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
    """
    Global Customer Registry View (Ticket 7).
    Displays global identity and aggregates financial statistics across all store links.
    Handles walk-in exceptions (is_global=False when phone is missing).
    """
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
    """
    Input validation for Ticket 8: The Record-Merging Engine.
    Requires primary target profile, duplicate secondary profile, and administrative justification.
    """
    primary_customer_id = serializers.UUIDField(required=True, help_text="The canonical profile that will retain and absorb all financial histories.")
    secondary_customer_id = serializers.UUIDField(required=True, help_text="The duplicate profile whose links will be absorbed before soft deletion.")
    reason = serializers.CharField(required=True, max_length=500, help_text="Mandatory audit justification for profile consolidation.")

    def validate(self, data):
        if data['primary_customer_id'] == data['secondary_customer_id']:
            raise serializers.ValidationError({"secondary_customer_id": "Primary and secondary customer IDs must be distinct."})
        return data


class CustomerMergeLogSerializer(serializers.ModelSerializer):
    """
    Ticket 8: Audit log representation of completed profile mergers. Reversible within 30 days.
    """
    class Meta:
        model = CustomerMergeLog
        fields = [
            'id', 'surviving_customer_id', 'merged_customer_id',
            'merged_by', 'affected_records', 'created_at', 'reverted_at'
        ]
        read_only_fields = fields


# =====================================================================
# TICKETS 9, 10 & 11: AUDIT LOG VIEWER & FEATURE FLAG ADMINISTRATION
# =====================================================================

class AuditLogSerializer(serializers.ModelSerializer):
    """
    Ticket 9: Read-Only System Audit Log Compliance Viewer.
    Enforces Rule 5: Displays timestamped immutable audit trails of all sensitive actions.
    """
    class Meta:
        model = AuditLog
        fields = [
            'id', 'actor_id', 'actor_type', 'action',
            'entity_type', 'entity_id', 'before', 'after',
            'ip_address', 'created_at'
        ]
        read_only_fields = fields


class ToggleFeatureFlagSerializer(serializers.Serializer):
    """
    Ticket 11: Feature Flag Administration input validation.
    Allows toggling specific capability switches on subscription tiers with audit justification.
    """
    flag_key = serializers.CharField(max_length=100, required=True, help_text="Unique flag identifier e.g., 'whatsapp_reminders'")
    enabled = serializers.BooleanField(required=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True, default="Operational feature flag adjustment")


# =====================================================================
# TICKET 9: IMPERSONATION INFRASTRUCTURE SERIALIZERS
# =====================================================================

class ImpersonationSessionSerializer(serializers.ModelSerializer):
    """
    Ticket 9: Read-Only inspection and write mode audit trails for store impersonation.
    """
    class Meta:
        model = ImpersonationSession
        fields = ['id', 'internal_user_id', 'store_group_id', 'mode', 'started_at', 'ended_at', 'reason']
        read_only_fields = fields


class ImpersonationStartSerializer(serializers.Serializer):
    """
    Input validation for requesting a scoped store impersonation token.
    Mode 'write' requires superadmin role and mandatory documented reason.
    """
    store_group_id = serializers.UUIDField(required=True)
    mode = serializers.ChoiceField(choices=ImpersonationSessionMode.choices, default=ImpersonationSessionMode.READ_ONLY)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        if data.get('mode') == ImpersonationSessionMode.WRITE and not data.get('reason'):
            raise serializers.ValidationError({"reason": "A documented support reason is mandatory when requesting write mode impersonation."})
        return data

