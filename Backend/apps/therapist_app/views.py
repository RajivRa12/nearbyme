import os
import uuid
from django.utils import timezone
from django.core.files.storage import default_storage
from rest_framework import generics, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from apps.core.models import (
    PayoutDestination, PayoutVerificationStatus,
    ProfessionalTip, ProfessionalTipStatus,
    ProfessionalReview, ReviewResponse, ReputationConsent,
    AppointmentSlot, AppointmentSlotStatus, CommissionAccrual,
)
from .permissions import IsProfessional
from .serializers import (
    ProfessionalAccountSerializer, PayoutDestinationSerializer,
    ProfessionalTipSerializer, ProfessionalReviewSerializer, ReviewResponseSerializer,
    CommissionAccrualSerializer, AppointmentSlotScheduleSerializer,
    ReputationConsentSerializer,
)
def success_response(data, message="Success", status_code=200):
    return Response({"success": True, "message": message, "data": data}, status=status_code)
def error_response(message="Error", status_code=400):
    return Response({"success": False, "message": message, "data": None}, status=status_code)
class TherapistProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfessionalAccountSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_object(self):
        return self.request.professional_account
class TherapistPhotoUploadView(APIView):
    """Uploads a profile/portfolio image and returns its URL — the frontend
    then PATCHes that URL into profile_photo_url or a portfolio_items entry."""
    permission_classes = [IsAuthenticated, IsProfessional]
    parser_classes = [MultiPartParser, FormParser]
    ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png']
    MAX_BYTES = 8 * 1024 * 1024
    def post(self, request):
        photo = request.FILES.get('photo')
        if not photo:
            return error_response("photo is required.", 400)
        ext = os.path.splitext(photo.name)[1].lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            return error_response(f"Only {', '.join(self.ALLOWED_EXTENSIONS)} images are allowed.", 400)
        if photo.size > self.MAX_BYTES:
            return error_response("Image must be under 8MB.", 400)
        filename = f"professional_photos/{request.professional_account.id}/{uuid.uuid4().hex}{ext}"
        saved_path = default_storage.save(filename, photo)
        url = request.build_absolute_uri(default_storage.url(saved_path))
        return success_response({"url": url}, "Uploaded", 201)
class ReputationConsentView(generics.RetrieveUpdateAPIView):
    serializer_class = ReputationConsentSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_object(self):
        consent, _ = ReputationConsent.objects.get_or_create(professional_account=self.request.professional_account)
        return consent
class PayoutDestinationViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PayoutDestinationSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_queryset(self):
        return PayoutDestination.objects.filter(professional_account=self.request.professional_account)
    def perform_create(self, serializer):
        serializer.save(professional_account=self.request.professional_account)
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        from django.utils import timezone
        destination = self.get_object()
        destination.verification_status = PayoutVerificationStatus.VERIFIED
        destination.verified_at = timezone.now()
        destination.save()
        return success_response(PayoutDestinationSerializer(destination).data, "Payout destination verified.")
class ProfessionalTipViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ProfessionalTipSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_queryset(self):
        return ProfessionalTip.objects.filter(
            professional_account=self.request.professional_account
        ).select_related('customer', 'booking', 'appointment_slot')
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        tip = self.get_object()
        if tip.status == ProfessionalTipStatus.CONFIRMED:
            return error_response("Tip is already confirmed.", 400)
        tip.status = ProfessionalTipStatus.CONFIRMED
        tip.confirmed_at = timezone.now()
        payment_ref = (request.data.get('payment_ref') or '').strip()
        if payment_ref:
            tip.payment_ref = payment_ref
        tip.save()
        return success_response(ProfessionalTipSerializer(tip).data, "Tip confirmed.")
class ProfessionalReviewViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ProfessionalReviewSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_queryset(self):
        return ProfessionalReview.objects.filter(
            professional_account=self.request.professional_account
        ).select_related('customer', 'store_group', 'booking').prefetch_related('response')
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        review = self.get_object()
        if hasattr(review, 'response'):
            return error_response("This review already has a response.", 400)
        response_text = (request.data.get('response_text') or '').strip()
        if not response_text:
            return error_response("response_text is required.", 400)
        response = ReviewResponse.objects.create(
            review=review, professional_account=self.request.professional_account, response_text=response_text
        )
        return success_response(ReviewResponseSerializer(response).data, "Response posted.", 201)
class TherapistScheduleViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = AppointmentSlotScheduleSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering = ['slot_start']
    def get_queryset(self):
        return AppointmentSlot.objects.filter(
            professional__user_account=self.request.professional_account
        ).select_related('booking', 'booking__outlet', 'booking__customer', 'store_service')
    def _sync_booking_status(self, booking):
        from apps.core.models import BookingStatus
        from apps.store_erp.views import _record_platform_commission
        slots = list(booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED))
        if slots and all(s.status == AppointmentSlotStatus.DONE for s in slots):
            if booking.status != BookingStatus.COMPLETED:
                booking.status = BookingStatus.COMPLETED
                booking.save()
                _record_platform_commission(booking)
        elif booking.status == BookingStatus.CONFIRMED and any(s.status == AppointmentSlotStatus.STARTED for s in slots):
            booking.status = BookingStatus.IN_SERVICE
            booking.save()
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        slot = self.get_object()
        if slot.status != AppointmentSlotStatus.SCHEDULED:
            return error_response(f"Cannot start a slot in status '{slot.status}'.", 400)
        slot.status = AppointmentSlotStatus.STARTED
        slot.save()
        self._sync_booking_status(slot.booking)
        return success_response(AppointmentSlotScheduleSerializer(slot).data, "Service started.")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        slot = self.get_object()
        if slot.status not in [AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED]:
            return error_response(f"Cannot complete a slot in status '{slot.status}'.", 400)
        slot.status = AppointmentSlotStatus.DONE
        slot.save()
        self._sync_booking_status(slot.booking)
        return success_response(AppointmentSlotScheduleSerializer(slot).data, "Marked complete.")
    def _parse_latlng(self, request):
        lat, lng = request.data.get('lat'), request.data.get('lng')
        if lat is None or lng is None:
            return None, None
        from decimal import Decimal, InvalidOperation
        try:
            return Decimal(str(lat)), Decimal(str(lng))
        except InvalidOperation:
            return False, False
    @action(detail=True, methods=['post'], url_path='on-the-way')
    def on_the_way(self, request, pk=None):
        slot = self.get_object()
        booking = slot.booking
        if not booking.is_home_service:
            return error_response("This isn't a home-service booking.", 400)
        lat, lng = self._parse_latlng(request)
        if lat is False:
            return error_response("lat/lng must be numbers.", 400)
        from django.utils import timezone
        booking.on_the_way_at = timezone.now()
        update_fields = ['on_the_way_at']
        if lat is not None:
            booking.therapist_lat, booking.therapist_lng = lat, lng
            booking.location_updated_at = timezone.now()
            update_fields += ['therapist_lat', 'therapist_lng', 'location_updated_at']
        booking.save(update_fields=update_fields)
        return success_response(AppointmentSlotScheduleSerializer(slot).data, "Customer notified you're on the way.")
    @action(detail=True, methods=['post'], url_path='update-location')
    def update_location(self, request, pk=None):
        slot = self.get_object()
        booking = slot.booking
        if not booking.is_home_service:
            return error_response("This isn't a home-service booking.", 400)
        lat, lng = self._parse_latlng(request)
        if lat is None:
            return error_response("lat and lng are required.", 400)
        if lat is False:
            return error_response("lat/lng must be numbers.", 400)
        from django.utils import timezone
        booking.therapist_lat, booking.therapist_lng = lat, lng
        booking.location_updated_at = timezone.now()
        booking.save(update_fields=['therapist_lat', 'therapist_lng', 'location_updated_at'])
        return success_response(None, "Location updated.")
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        slot = self.get_object()
        if slot.status == AppointmentSlotStatus.DONE:
            return error_response("Cannot cancel a completed slot.", 400)
        slot.status = AppointmentSlotStatus.CANCELLED
        slot.save()
        return success_response(AppointmentSlotScheduleSerializer(slot).data, "Cancelled.")
class TherapistCommissionAccrualView(generics.ListAPIView):
    serializer_class = CommissionAccrualSerializer
    permission_classes = [IsAuthenticated, IsProfessional]
    def get_queryset(self):
        return CommissionAccrual.objects.filter(
            professional__user_account=self.request.professional_account
        ).select_related('invoice_line', 'invoice_line__invoice', 'invoice_line__service', 'invoice_line__store_service').order_by('-created_at')
