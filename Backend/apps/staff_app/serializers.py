from rest_framework import serializers
from apps.core.models import (
    User, Appointment, AppointmentItem, Commission,
    CustomerNote, TherapistProfile, Announcement, TrainingVideo,
    Tip, Wallet, WalletTransaction, Notification,
    StaffTask, TherapistSettings, StaffChatMessage,
    Review, StaffIncentive
)

class TherapistPortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapistProfile
        fields = ['bio', 'instagram_link', 'specializations', 'years_of_experience', 'certificates', 'awards', 'languages']

class TherapistProfileSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    portfolio = TherapistPortfolioSerializer(source='therapist_profile')
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'phone', 'store_name', 'portfolio', 'expo_push_token']
        read_only_fields = ['id', 'email', 'store_name']
        
    def update(self, instance, validated_data):
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name = validated_data.get('last_name', instance.last_name)
        instance.phone = validated_data.get('phone', instance.phone)
        if 'expo_push_token' in validated_data:
            instance.expo_push_token = validated_data['expo_push_token']
        instance.save()

        portfolio_data = validated_data.pop('therapist_profile', None)
        if portfolio_data is not None:
            profile = getattr(instance, 'therapist_profile', None)
            if profile:
                for key, value in portfolio_data.items():
                    setattr(profile, key, value)
                profile.save()
            else:
                TherapistProfile.objects.create(user=instance, **portfolio_data)

        return instance


class TherapistAppointmentItemSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = AppointmentItem
        fields = ['id', 'service_name', 'price']


class TherapistAppointmentSerializer(serializers.ModelSerializer):
    items = TherapistAppointmentItemSerializer(many=True, read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = ['id', 'customer_name', 'customer_phone', 'start_time', 'end_time', 'status', 'notes', 'items']
        read_only_fields = ['id', 'customer_name', 'customer_phone', 'start_time', 'end_time', 'notes', 'items']

    def get_customer_name(self, obj):
        if obj.customer:
            return f"{obj.customer.first_name} {obj.customer.last_name}".strip()
        return "Walk-in Customer"

    def get_customer_phone(self, obj):
        if obj.customer:
            return obj.customer.phone
        return None


class TherapistCommissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commission
        fields = ['id', 'amount', 'created_at', 'is_paid_out']

class CustomerNoteSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)

    class Meta:
        model = CustomerNote
        fields = ['id', 'customer', 'customer_name', 'note_text', 'image_url', 'created_at']
        read_only_fields = ['id', 'customer_name', 'created_at']

class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'content', 'created_at']

class TrainingVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainingVideo
        fields = ['id', 'title', 'description', 'video_url', 'category', 'created_at']

class StaffTipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tip
        fields = ['id', 'amount', 'created_at']

class StaffWalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ['id', 'transaction_type', 'amount', 'description', 'created_at']

class StaffWalletSerializer(serializers.ModelSerializer):
    transactions = StaffWalletTransactionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Wallet
        fields = ['id', 'balance', 'updated_at', 'transactions']

from apps.core.models import BeforeAfterGallery

class BeforeAfterGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = BeforeAfterGallery
        fields = '__all__'
        read_only_fields = ['therapist']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'is_read', 'type', 'created_at']


class TipSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)

    class Meta:
        model = Tip
        fields = ['id', 'amount', 'customer_name', 'invoice_number', 'created_at']

    def get_customer_name(self, obj):
        if obj.invoice and obj.invoice.customer:
            return obj.invoice.customer.get_full_name()
        return 'Unknown'


class StaffTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTask
        fields = ['id', 'title', 'description', 'is_completed', 'created_at']


class TherapistSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TherapistSettings
        fields = ['push_notifications', 'sms_alerts', 'biometric_login', 'dark_mode']


class StaffChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)

    class Meta:
        model = StaffChatMessage
        fields = ['id', 'sender_name', 'content', 'timestamp']

class TherapistReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'customer_name', 'rating', 'comment', 'reply_text', 'replied_at', 'created_at']
        read_only_fields = ['id', 'customer_name', 'rating', 'comment', 'replied_at', 'created_at']

class StaffIncentiveSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffIncentive
        fields = ['id', 'title', 'amount', 'is_paid_out', 'created_at']
        read_only_fields = ['id', 'title', 'amount', 'is_paid_out', 'created_at']

