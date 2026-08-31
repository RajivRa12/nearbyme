from rest_framework import viewsets, generics
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Prefetch
from django.utils import timezone
from apps.core.models import (
    Store, ServiceCategory, Service, User, Role,
    Appointment, Wallet, CustomerMembership, Review,
    GiftCard, CustomerPackage, FavoriteTherapist, CustomerFavourite, Invoice, Coupon, Tip, WalletTransaction,
    Booking, GlobalCustomer, normalize_e164,
    Notification, ProfessionalReview,
    Conversation, ChatMessage, Referral,
    SlotHold, SlotHoldStatus, Professional, Resource, ResourceType,
    AppointmentSlot, AppointmentSlotStatus, StorePublicProfile,
    OnlinePayment, OnlinePaymentStatus,
)
from .serializers import (
    PublicStoreSerializer, PublicServiceCategorySerializer,
    PublicReviewSerializer, CustomerProfileSerializer,
    CustomerWalletSerializer, CustomerMembershipSerializer,
    CustomerAppointmentSerializer, GiftCardSerializer,
    CustomerPackageSerializer,
    FavoriteTherapistSerializer, CustomerFavouriteSerializer, CustomerInvoiceSerializer,
    PublicServiceSerializer, PublicCouponSerializer, PublicTherapistSerializer,
    Phase1StoreServiceSerializer, Phase1ProfessionalSerializer, Phase1BookingRequestSerializer,
    SlotHoldRequestSerializer, MicrositeSerializer, CreatePaymentOrderSerializer,
    CustomerBookingSerializer, BookingTipRequestSerializer, BookingReviewRequestSerializer,
    CustomerNotificationSerializer, CustomerReviewSerializer,
    ConversationSerializer, ChatMessageSerializer,
)
from .permissions import IsCustomer
def success_response(data, message="Success", status_code=200):
    return Response({"success": True, "message": message, "data": data}, status=status_code)
def error_response(message="Error", status_code=400):
    return Response({"success": False, "message": message, "data": None}, status=status_code)
class MicrositeView(generics.RetrieveAPIView):
    """A store's own public booking page — /s/<slug>. Deliberately built as a
    RetrieveAPIView with no list action anywhere on this class: there is no
    query here that could ever return more than one store, so a competitor
    appearing on a store's own page isn't a filter someone could forget —
    it's structurally not possible. See build guide rule 25."""
    permission_classes = [AllowAny]
    serializer_class = MicrositeSerializer
    lookup_field = 'slug'
    queryset = StorePublicProfile.objects.filter(is_microsite_live=True).select_related('store')
class PublicStoreViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Store.objects.filter(status='ACTIVE').select_related('platform_subscription__plan', 'public_profile')
    serializer_class = PublicStoreSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['brand', 'business__business_type']
    search_fields = ['name', 'address', 'location']
    ordering = ['name']
    def list(self, request, *args, **kwargs):
        # Marketplace cross-store discovery is dark-launched per city (build
        # guide section 2/27) — a store is still directly reachable through
        # its own microsite or store id no matter what; only this listing
        # (Home/Explore's "browse everything nearby") is gated. A city with
        # no flag row is left open, so existing/already-active cities aren't
        # retroactively hidden — dark-launch is something an admin opts a
        # *new* city into via Django admin, not a default-closed gate here.
        from apps.core.models import CityMarketplaceFlag
        queryset = self.filter_queryset(self.get_queryset())
        dark_city_ids = set(
            CityMarketplaceFlag.objects.filter(is_public=False).values_list('city_id', flat=True)
        )
        if dark_city_ids:
            queryset = queryset.exclude(outlet__city_id__in=dark_city_ids)
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page if page is not None else queryset, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)
    @action(detail=True, methods=['get'])
    def rooms(self, request, pk=None):
        from apps.core.models import Room
        store = self.get_object()
        rooms = Room.objects.filter(store=store, is_active=True).order_by('name')
        return success_response([{"id": r.id, "name": r.name} for r in rooms], f"Rooms for {store.name}")
    @action(detail=True, methods=['get'])
    def menu(self, request, pk=None):
        store = self.get_object()
        categories = ServiceCategory.objects.filter(
            business=store.business_id,
            is_active=True
        ).prefetch_related(
            Prefetch('services', queryset=Service.objects.filter(is_active=True))
        )
        serializer = PublicServiceCategorySerializer(categories, many=True)
        return success_response(serializer.data, f"Menu for {store.name}")
    @action(detail=True, methods=['get'])
    def staff(self, request, pk=None):
        store = self.get_object()
        therapists = User.objects.filter(store=store, role=Role.THERAPIST, is_active=True).select_related('therapist_profile')
        data = [{
            "id": t.id,
            "name": t.get_full_name(),
            "specializations": getattr(getattr(t, 'therapist_profile', None), 'specializations', None) or None,
        } for t in therapists]
        return success_response(data, f"Staff for {store.name}")
    @action(detail=True, methods=['get'], url_path='phase1-menu')
    def phase1_menu(self, request, pk=None):
        from apps.core.models import StoreService
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        services = StoreService.objects.filter(
            store_group=store.outlet.store_group_id, is_active_in_store=True
        ).select_related('canonical_service', 'canonical_service__category')
        return success_response(Phase1StoreServiceSerializer(services, many=True).data, f"Menu for {store.name}")
    @action(detail=True, methods=['get'], url_path='phase1-professionals')
    def phase1_professionals(self, request, pk=None):
        from apps.core.models import Professional, ProfessionalLinkStatus, StoreService
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        qs = Professional.objects.filter(outlet_id=store.outlet_id, is_bookable=True, link_status=ProfessionalLinkStatus.ACCEPTED)
        skill_tag = None
        service_id = request.query_params.get('service_id')
        if service_id:
            svc = StoreService.objects.filter(id=service_id).select_related('canonical_service').first()
            if svc and svc.canonical_service_id:
                skill_tag = svc.canonical_service.skill_tag
        if skill_tag:
            qs = qs.filter(skills__skill_tag=skill_tag)
        return success_response(Phase1ProfessionalSerializer(qs.distinct(), many=True).data)
    @action(detail=True, methods=['get'], url_path='phase1-availability')
    def phase1_availability(self, request, pk=None):
        import datetime
        from apps.core.models import StoreService
        from apps.store_erp.availability import compute_availability
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        service_id = request.query_params.get('service_id')
        date_str = request.query_params.get('date')
        if not service_id or not date_str:
            return error_response("service_id and date are required", 400)
        try:
            the_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return error_response("date must be in YYYY-MM-DD format", 400)
        try:
            svc = StoreService.objects.get(id=service_id, store_group=store.outlet.store_group_id)
        except StoreService.DoesNotExist:
            return error_response("Service not found for this store.", 404)
        professional_id = request.query_params.get('professional_id')
        duration_min, slots = compute_availability(store.outlet, svc, the_date, professional_id)
        return success_response({
            "duration_min": duration_min,
            "slots": [
                {
                    "start": s["start"].isoformat(), "end": s["end"].isoformat(),
                    "professionals": [{"id": str(p.id), "display_name": p.display_name} for p in s["professionals"]],
                }
                for s in slots
            ],
        })
    @action(detail=True, methods=['post'], url_path='hold-slot')
    def hold_slot(self, request, pk=None):
        """Reserves a slot for ~8 minutes while a guest completes OTP + payment,
        so it can't be taken out from under them. See build guide section 6."""
        import datetime as dt
        from apps.core.models import StoreService
        from apps.store_erp.booking_engine import auto_assign_professional
        from apps.store_erp.availability import service_duration_and_buffers, bump_availability_version
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        serializer = SlotHoldRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            svc = StoreService.objects.get(id=data['store_service_id'], store_group=store.outlet.store_group_id)
        except StoreService.DoesNotExist:
            return error_response("Service not found for this store.", 404)
        slot_start, slot_end = data['slot_start'], data['slot_end']
        if data.get('professional_id'):
            professional = Professional.objects.filter(id=data['professional_id'], outlet=store.outlet).first()
            if not professional:
                return error_response("Selected professional is not available at this outlet.", 404)
        else:
            professional = auto_assign_professional(store.outlet, svc, slot_start.date(), slot_start, slot_end)
        if not professional:
            return error_response("That time just went. Please pick another slot.", 409)
        conflict = SlotHold.objects.filter(
            professional=professional, status=SlotHoldStatus.HELD, expires_at__gt=timezone.now(),
            slot_start__lt=slot_end, slot_end__gt=slot_start,
        ).exists() or AppointmentSlot.objects.filter(
            professional=professional, status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
            slot_start__lt=slot_end, slot_end__gt=slot_start,
        ).exists()
        if conflict:
            return error_response("That time just went. Please pick another slot.", 409)
        _, _, _, _, resource_type = service_duration_and_buffers(svc, store.outlet)
        resource = None
        if resource_type != ResourceType.NONE:
            resource = Resource.objects.filter(outlet=store.outlet, resource_type=resource_type, is_bookable=True).first()
        hold = SlotHold.objects.create(
            outlet=store.outlet, store_service=svc, professional=professional, resource=resource,
            slot_start=slot_start, slot_end=slot_end, session_token=data['session_token'],
            expires_at=timezone.now() + dt.timedelta(minutes=8),
        )
        bump_availability_version(store.outlet_id)
        return success_response({
            "id": str(hold.id), "expires_at": hold.expires_at.isoformat(),
            "professional_id": str(professional.id), "professional_name": professional.display_name,
        }, "Slot held", 201)
    @action(detail=True, methods=['post'], url_path='release-hold')
    def release_hold(self, request, pk=None):
        from apps.store_erp.availability import bump_availability_version
        hold = SlotHold.objects.filter(
            id=request.data.get('hold_id'), session_token=request.data.get('session_token'), status=SlotHoldStatus.HELD,
        ).first()
        if hold:
            hold.status = SlotHoldStatus.RELEASED
            hold.save(update_fields=['status'])
            bump_availability_version(hold.outlet_id)
        return success_response(None, "Released")
    @action(detail=True, methods=['post'], url_path='create-payment-order', permission_classes=[IsAuthenticated, IsCustomer])
    def create_payment_order(self, request, pk=None):
        """Raises a Razorpay order for a Phase1 booking. Amount is always
        computed server-side from StoreService pricing (build guide rule:
        no client-side price computation) — the client only tells us which
        service and, optionally, which held slot it's paying for."""
        from apps.core.models import StoreService, GlobalCustomer, normalize_e164
        from apps.store_erp.availability import service_price_paise
        from .payments import create_order, PaymentsNotConfigured
        from django.conf import settings
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        serializer = CreatePaymentOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            svc = StoreService.objects.get(id=data['store_service_id'], store_group=store.outlet.store_group_id)
        except StoreService.DoesNotExist:
            return error_response("Service not found for this store.", 404)
        hold = None
        hold_id = data.get('hold_id')
        if hold_id:
            hold = SlotHold.objects.filter(id=hold_id, status=SlotHoldStatus.HELD, expires_at__gt=timezone.now()).first()
            if not hold:
                return error_response("Your hold expired. Please pick another slot.", 409)
        total_amount_paise = service_price_paise(svc, store.outlet)
        payment_type = data.get('payment_type', 'full')
        if payment_type == 'deposit':
            amount_paise = (total_amount_paise * svc.deposit_percentage) // 100
        else:
            amount_paise = total_amount_paise
        try:
            order = create_order(amount_paise, receipt=str(hold_id or svc.id), notes={
                "store_service_id": str(svc.id), "store_id": str(store.id), "payment_type": payment_type,
            })
        except PaymentsNotConfigured as e:
            return error_response(str(e), 503)
        user = request.user
        if user.phone:
            customer, _ = GlobalCustomer.objects.get_or_create(
                phone_e164=normalize_e164(user.phone), defaults={'name': user.get_full_name() or user.email, 'email': user.email}
            )
        else:
            customer, _ = GlobalCustomer.objects.get_or_create(email=user.email, defaults={'name': user.get_full_name() or user.email})
        payment = OnlinePayment.objects.create(
            hold=hold, store_service=svc, customer=customer, payment_type=payment_type,
            amount_paise=amount_paise, total_amount_paise=total_amount_paise, gateway_order_id=order['id'],
        )
        return success_response({
            "order_id": order['id'], "amount": amount_paise, "total_amount": total_amount_paise,
            "balance_due": total_amount_paise - amount_paise, "payment_type": payment_type, "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID, "payment_id": str(payment.id),
        }, "Payment order created", 201)
    @action(detail=True, methods=['post'], url_path='phase1-book', permission_classes=[IsAuthenticated, IsCustomer])
    def phase1_book(self, request, pk=None):
        from decimal import Decimal
        from django.db import transaction
        from apps.core.models import GlobalCustomer, Booking, BookingStatus, BookingSource, normalize_e164, StoreService
        from apps.store_erp.booking_engine import confirm_booking, BookingConflictError, BookingEngineError
        from apps.store_erp.availability import bump_availability_version, service_price_paise
        from .payments import verify_payment, refund_payment, PaymentsNotConfigured, PaymentVerificationError
        store = self.get_object()
        if not store.outlet_id:
            return error_response("Online booking is not available for this location yet.", 404)
        serializer = Phase1BookingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        slot_start = serializer.validated_data['slot_start']
        slot_end = serializer.validated_data['slot_end']
        pay_with_wallet = serializer.validated_data.get('pay_with_wallet', False)
        wallet = None
        if pay_with_wallet:
            try:
                store_service_for_price = StoreService.objects.get(
                    id=serializer.validated_data['store_service_id'], store_group=store.outlet.store_group
                )
            except StoreService.DoesNotExist:
                return error_response("Service not found for this store.", 404)
            expected_price_paise = service_price_paise(store_service_for_price, store.outlet)
            wallet, _ = Wallet.objects.get_or_create(customer=request.user)
            wallet_balance_paise = int(wallet.balance * 100)
            if wallet_balance_paise < expected_price_paise:
                return error_response(
                    f"Insufficient wallet balance. You have ₹{wallet.balance}, this booking costs ₹{expected_price_paise / 100:.2f}.",
                    402,
                )
        hold = None
        hold_id = serializer.validated_data.get('hold_id')
        if hold_id:
            hold = SlotHold.objects.filter(
                id=hold_id, status=SlotHoldStatus.HELD, expires_at__gt=timezone.now(),
                store_service_id=serializer.validated_data['store_service_id'],
                slot_start=slot_start, slot_end=slot_end,
            ).first()
            if not hold:
                return success_response({
                    "conflict": True, "conflicts": [],
                }, "Your hold expired. Please pick another slot.", 200)
        online_payment = None
        razorpay_order_id = serializer.validated_data.get('razorpay_order_id')
        if razorpay_order_id:
            online_payment = OnlinePayment.objects.filter(
                gateway_order_id=razorpay_order_id, status=OnlinePaymentStatus.CREATED,
            ).first()
            if not online_payment:
                return error_response("Payment not found or already used.", 409)
            try:
                verify_payment(
                    razorpay_order_id,
                    serializer.validated_data.get('razorpay_payment_id'),
                    serializer.validated_data.get('razorpay_signature'),
                )
            except PaymentsNotConfigured as e:
                return error_response(str(e), 503)
            except PaymentVerificationError as e:
                online_payment.status = OnlinePaymentStatus.FAILED
                online_payment.save(update_fields=['status'])
                return error_response(str(e), 402)
            online_payment.status = OnlinePaymentStatus.CAPTURED
            online_payment.gateway_payment_id = serializer.validated_data.get('razorpay_payment_id')
            online_payment.gateway_signature = serializer.validated_data.get('razorpay_signature')
            online_payment.confirmed_at = timezone.now()
            online_payment.save(update_fields=['status', 'gateway_payment_id', 'gateway_signature', 'confirmed_at'])
        user = request.user
        if user.phone:
            customer, _ = GlobalCustomer.objects.get_or_create(
                phone_e164=normalize_e164(user.phone), defaults={'name': user.get_full_name() or user.email, 'email': user.email}
            )
        else:
            customer, _ = GlobalCustomer.objects.get_or_create(email=user.email, defaults={'name': user.get_full_name() or user.email})
        booking = Booking.objects.create(
            outlet_id=store.outlet_id, customer=customer, source=BookingSource.ONLINE,
            status=BookingStatus.DRAFT, booking_start=slot_start, booking_end=slot_end,
            is_home_service=serializer.validated_data.get('is_home_service', False),
            service_address=serializer.validated_data.get('service_address') or None,
        )
        slot_request = {
            'store_service_id': str(serializer.validated_data['store_service_id']),
            'slot_start': slot_start, 'slot_end': slot_end,
        }
        if hold and hold.professional_id:
            # The hold already resolved "any available professional" to a
            # specific one — book that same professional, not a re-roll.
            slot_request['professional_id'] = str(hold.professional_id)
        elif serializer.validated_data.get('professional_id'):
            slot_request['professional_id'] = str(serializer.validated_data['professional_id'])
        try:
            created_slots = confirm_booking(booking, [slot_request], actor=None)
        except BookingConflictError as e:
            if online_payment:
                # We can't hand back the slot we just charged for — refund
                # immediately rather than leave the customer out of pocket.
                try:
                    refund_payment(online_payment.gateway_payment_id)
                    online_payment.status = OnlinePaymentStatus.REFUNDED
                except Exception:
                    pass
                else:
                    online_payment.save(update_fields=['status'])
            return success_response({
                "conflict": True, "conflicts": e.conflicts,
            }, "That time just got booked. Please pick another slot.", 200)
        except BookingEngineError as e:
            return error_response(str(e), 400)
        if pay_with_wallet and wallet:
            total_paise = sum(s.price_paise for s in created_slots)
            with transaction.atomic():
                wallet.balance -= Decimal(total_paise) / 100
                wallet.save(update_fields=['balance'])
                WalletTransaction.objects.create(
                    wallet=wallet, transaction_type='DEBIT', amount=Decimal(total_paise) / 100,
                    description=f"Booking payment - {booking.booking_code or booking.id}",
                )
        if online_payment:
            online_payment.booking = booking
            online_payment.save(update_fields=['booking'])
        if hold:
            hold.status = SlotHoldStatus.CONVERTED
            hold.customer = customer
            hold.save(update_fields=['status', 'customer'])
            bump_availability_version(store.outlet_id)
        booking.refresh_from_db()
        from zoneinfo import ZoneInfo
        from apps.core.notifications import send_expo_push_notification, notify_user
        when = booking.booking_start.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%d %b, %I:%M %p")
        if user.expo_push_token:
            send_expo_push_notification(
                user.expo_push_token, "Booking confirmed",
                f"You're booked at {store.name} on {when}.",
                data={"booking_id": str(booking.id)},
            )
        for slot in booking.slots.select_related('professional__user_account__user', 'store_service'):
            professional_user = getattr(getattr(slot.professional, 'user_account', None), 'user', None)
            if professional_user:
                notify_user(
                    professional_user, "New booking",
                    f"{customer.name} booked {slot.store_service.name} on {when}.",
                    notif_type='APPOINTMENT_BOOKED', data={"booking_id": str(booking.id)},
                )
        return success_response({
            "id": str(booking.id), "status": booking.status,
            "booking_start": booking.booking_start.isoformat(), "booking_end": booking.booking_end.isoformat(),
        }, "Booking confirmed", 201)
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        store = self.get_object()
        reviews = Review.objects.filter(store=store, status='APPROVED').order_by('-created_at')
        serializer = PublicReviewSerializer(reviews, many=True)
        return success_response(serializer.data, f"Reviews for {store.name}")
    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        store = self.get_object()
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"error": "date query parameter is required (YYYY-MM-DD)"}, status=400)
        return success_response({"available_slots": ["09:00", "10:00", "11:30", "14:00"]}, f"Available slots for {store.name} on {date_str}")
class CustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_object(self):
        return self.request.user
class CustomerWalletView(generics.RetrieveAPIView):
    serializer_class = CustomerWalletSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_object(self):
        wallet, created = Wallet.objects.get_or_create(customer=self.request.user)
        return wallet
REFERRAL_REWARD_POINTS = 100
def _referral_code_for(user_id):
    return f"NB{user_id:X}"
def _user_id_from_referral_code(code):
    code = (code or '').strip().upper()
    if not code.startswith('NB'):
        return None
    try:
        return int(code[2:], 16)
    except ValueError:
        return None
class ReferralView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def get(self, request):
        user = request.user
        referrals = Referral.objects.filter(referrer=user)
        total_points = sum(r.reward_points_awarded for r in referrals)
        was_referred = Referral.objects.filter(referred_user=user).exists()
        return success_response({
            "referral_code": _referral_code_for(user.id),
            "total_referred": referrals.count(),
            "total_points_earned": total_points,
            "was_referred": was_referred,
        })
    def post(self, request):
        code = request.data.get('code')
        referrer_id = _user_id_from_referral_code(code)
        if not referrer_id:
            return error_response("Invalid referral code", 400)
        if referrer_id == request.user.id:
            return error_response("You can't use your own referral code", 400)
        referrer = User.objects.filter(id=referrer_id, role=Role.CUSTOMER).first()
        if not referrer:
            return error_response("Referral code not found", 404)
        if Referral.objects.filter(referred_user=request.user).exists():
            return error_response("You've already used a referral code", 400)
        Referral.objects.create(
            referrer=referrer, referred_user=request.user,
            reward_points_awarded=REFERRAL_REWARD_POINTS,
        )
        referrer.loyalty_points += REFERRAL_REWARD_POINTS
        referrer.save(update_fields=['loyalty_points'])
        return success_response({"reward_points_awarded": REFERRAL_REWARD_POINTS}, "Referral applied successfully")
LOYALTY_POINTS_PER_RUPEE = 10  # 500 points = ₹50
LOYALTY_REDEEM_BLOCK = 500  # must redeem in blocks of this size
class LoyaltyRedeemView(APIView):
    permission_classes = [IsAuthenticated, IsCustomer]
    def post(self, request):
        from decimal import Decimal
        from django.db import transaction
        try:
            points = int(request.data.get('points'))
        except (TypeError, ValueError):
            return error_response("points must be a whole number", 400)
        if points <= 0 or points % LOYALTY_REDEEM_BLOCK != 0:
            return error_response(f"You can redeem in blocks of {LOYALTY_REDEEM_BLOCK} points", 400)
        user = request.user
        if user.loyalty_points < points:
            return error_response("You don't have enough points for that", 400)
        amount = Decimal(points) / LOYALTY_POINTS_PER_RUPEE
        with transaction.atomic():
            user.loyalty_points -= points
            user.save(update_fields=['loyalty_points'])
            wallet, _ = Wallet.objects.get_or_create(customer=user)
            wallet.balance += amount
            wallet.save()
            WalletTransaction.objects.create(
                wallet=wallet, transaction_type='CREDIT', amount=amount,
                description=f"Redeemed {points} loyalty points",
            )
        return success_response({
            "points_redeemed": points, "amount_credited": str(amount),
            "remaining_points": user.loyalty_points, "wallet_balance": str(wallet.balance),
        }, "Points redeemed to your wallet")
class CustomerMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerMembershipSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return CustomerMembership.objects.filter(customer=self.request.user)
class CustomerAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerAppointmentSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'store']
    ordering = ['-start_time']
    def get_queryset(self):
        return Appointment.objects.filter(customer=self.request.user)
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        from apps.core.models import AppointmentStatus
        appointment = self.get_object()
        if appointment.status not in (AppointmentStatus.BOOKED, AppointmentStatus.RESCHEDULE_REQUESTED):
            return error_response("Only booked appointments can be rescheduled.", 400)
        new_start = request.data.get('start_time')
        if not new_start:
            return error_response("start_time is required.", 400)
        from django.utils.dateparse import parse_datetime
        new_start_dt = parse_datetime(new_start)
        if not new_start_dt:
            return error_response("start_time must be a valid ISO datetime.", 400)
        duration = appointment.end_time - appointment.start_time
        appointment.start_time = new_start_dt
        appointment.end_time = new_start_dt + duration
        appointment.save(update_fields=['start_time', 'end_time'])
        return success_response({
            "id": str(appointment.id),
            "start_time": appointment.start_time.isoformat(),
            "end_time": appointment.end_time.isoformat(),
        }, "Appointment rescheduled.")
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        from apps.core.models import AppointmentStatus
        appointment = self.get_object()
        if appointment.status in (AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW):
            return error_response(f"Cannot cancel an appointment that is already {appointment.status.lower()}.", 400)
        appointment.status = AppointmentStatus.CANCELLED
        appointment.save(update_fields=['status'])
        return success_response(None, "Appointment cancelled.")
    @action(detail=True, methods=['post'])
    def tip(self, request, pk=None):
        from django.db import transaction
        from decimal import Decimal
        appointment = self.get_object()
        amount_str = request.data.get('amount')
        therapist_id = request.data.get('therapist_id')
        if not amount_str:
            return Response({"error": "amount is required"}, status=400)
        amount = Decimal(amount_str)
        if therapist_id:
            therapist = User.objects.filter(id=therapist_id).first()
        else:
            first_item = appointment.items.first()
            therapist = first_item.assigned_staff if first_item else None
        if not therapist:
            return Response({"error": "No therapist found for this appointment to tip."}, status=400)
        invoice = Invoice.objects.filter(appointment=appointment).first()
        with transaction.atomic():
            tip = Tip.objects.create(
                invoice=invoice,
                amount=amount
            )
            therapist_wallet, _ = Wallet.objects.get_or_create(customer=therapist)
            therapist_wallet.balance += amount
            therapist_wallet.save()
            WalletTransaction.objects.create(
                wallet=therapist_wallet,
                transaction_type='CREDIT',
                amount=amount,
                description=f"Tip from {request.user.get_full_name()} for Appointment #{appointment.id}"
            )
        return success_response({
            "appointment_id": appointment.id,
            "therapist": therapist.get_full_name(),
            "tip_amount": amount
        }, "Tip successfully sent to therapist's wallet!")
class GiftCardViewSet(viewsets.ModelViewSet):
    serializer_class = GiftCardSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return GiftCard.objects.filter(purchaser=self.request.user)
    def perform_create(self, serializer):
        import random, string
        from datetime import timedelta
        code = None
        while not code or GiftCard.objects.filter(code=code).exists():
            code = 'GIFT-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        initial_value = serializer.validated_data.get('initial_value', 0)
        serializer.save(
            purchaser=self.request.user, code=code,
            current_balance=initial_value,
            expiry_date=timezone.now().date() + timedelta(days=365),
        )
    @action(detail=False, methods=['post'])
    def redeem(self, request):
        from django.db import transaction
        from apps.core.models import Wallet, WalletTransaction
        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return error_response("A gift card code is required", 400)
        gift_card = GiftCard.objects.filter(code=code).first()
        if not gift_card:
            return error_response("Invalid gift card code", 404)
        if not gift_card.is_active:
            return error_response("This gift card is no longer active", 400)
        if gift_card.expiry_date < timezone.now().date():
            return error_response("This gift card has expired", 400)
        if gift_card.current_balance <= 0:
            return error_response("This gift card has already been fully redeemed", 400)
        with transaction.atomic():
            amount = gift_card.current_balance
            wallet, _ = Wallet.objects.get_or_create(customer=request.user)
            wallet.balance += amount
            wallet.save()
            WalletTransaction.objects.create(
                wallet=wallet, transaction_type='CREDIT', amount=amount,
                description=f"Redeemed gift card {gift_card.code}",
            )
            gift_card.current_balance = 0
            gift_card.is_active = False
            gift_card.save()
        return success_response(
            {"amount_credited": str(amount), "wallet_balance": str(wallet.balance)},
            "Gift card redeemed successfully"
        )
class CustomerPackageViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerPackageSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return CustomerPackage.objects.filter(customer=self.request.user)
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
class CustomerInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerInvoiceSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return Invoice.objects.filter(appointment__customer=self.request.user).order_by('-created_at')
class FavoriteTherapistViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteTherapistSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return FavoriteTherapist.objects.filter(customer=self.request.user).order_by('-created_at')
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)
class StoreFavouriteViewSet(viewsets.ModelViewSet):
    """Saved salons — distinct from FavoriteTherapistViewSet, which favourites
    a therapist login User, not a store."""
    serializer_class = CustomerFavouriteSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def _resolve_customer(self):
        user = self.request.user
        if user.phone:
            customer, _ = GlobalCustomer.objects.get_or_create(
                phone_e164=normalize_e164(user.phone), defaults={'name': user.get_full_name() or user.email, 'email': user.email}
            )
            return customer
        customer, _ = GlobalCustomer.objects.get_or_create(email=user.email, defaults={'name': user.get_full_name() or user.email})
        return customer
    def get_queryset(self):
        return CustomerFavourite.objects.filter(customer=self._resolve_customer()).select_related('store', 'professional_account')
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['customer'] = self._resolve_customer()
        return context
    def perform_create(self, serializer):
        serializer.save(customer=self._resolve_customer())
class CustomerNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerNotificationSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return success_response(None, "All notifications marked as read")
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return success_response(None, "Notification marked as read")
class CustomerConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        return Conversation.objects.filter(customer=self.request.user)
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx
    def create(self, request, *args, **kwargs):
        therapist_id = request.data.get('therapist_id')
        if not therapist_id:
            return error_response("therapist_id is required.", 400)
        therapist = User.objects.filter(id=therapist_id, role=Role.THERAPIST).first()
        if not therapist:
            return error_response("Therapist not found.", 404)
        convo, _ = Conversation.objects.get_or_create(customer=request.user, therapist=therapist)
        return success_response(self.get_serializer(convo).data, "Conversation ready", 201)
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        convo = self.get_object()
        if request.method == 'POST':
            content = (request.data.get('content') or '').strip()
            if not content:
                return error_response("content is required.", 400)
            msg = ChatMessage.objects.create(conversation=convo, sender=request.user, content=content)
            from apps.core.notifications import notify_user
            notify_user(
                convo.therapist, f"New message from {request.user.get_full_name() or 'a customer'}",
                content[:120], notif_type='NEW_MESSAGE', data={"conversation_id": str(convo.id)},
            )
            return success_response(ChatMessageSerializer(msg, context={'request': request}).data, "Sent", 201)
        convo.messages.exclude(sender=request.user).update(is_read=True)
        msgs = convo.messages.select_related('sender')
        return success_response(ChatMessageSerializer(msgs, many=True, context={'request': request}).data)
class CustomerReviewViewSet(viewsets.ReadOnlyModelViewSet):
    """Reviews the logged-in customer has written (see CustomerBookingViewSet.review to create one)."""
    serializer_class = CustomerReviewSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        user = self.request.user
        customer = None
        if user.phone:
            customer = GlobalCustomer.objects.filter(phone_e164=normalize_e164(user.phone)).first()
        if not customer and user.email:
            customer = GlobalCustomer.objects.filter(email=user.email).first()
        if not customer:
            return ProfessionalReview.objects.none()
        return ProfessionalReview.objects.filter(customer=customer).select_related('store_group', 'professional_account').order_by('-created_at')
class PublicServiceViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from django.db.models import Count
        return Service.objects.filter(is_active=True).annotate(
            booking_count=Count('appointmentitem')
        ).order_by('-booking_count')[:10]
    serializer_class = PublicServiceSerializer
    permission_classes = [AllowAny]
class PublicCouponViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Coupon.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = PublicCouponSerializer
    permission_classes = [AllowAny]
class PublicTherapistViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from django.db.models import Count
        return User.objects.filter(role=Role.THERAPIST, is_active=True).annotate(
            follower_count=Count('favorited_by')
        ).order_by('-follower_count')[:10]
    serializer_class = PublicTherapistSerializer
    permission_classes = [AllowAny]
class CustomerBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """Phase1 (GlobalCustomer/Booking) bookings for the logged-in customer, with
    actions to tip a professional directly and to review a completed booking."""
    serializer_class = CustomerBookingSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    def get_queryset(self):
        customer = self._get_global_customer()
        if not customer:
            return Booking.objects.none()
        return Booking.objects.filter(customer=customer).select_related('outlet').prefetch_related('slots__professional', 'slots__store_service')
    def _get_global_customer(self):
        user = self.request.user
        if user.phone:
            customer = GlobalCustomer.objects.filter(phone_e164=normalize_e164(user.phone)).first()
            if customer:
                return customer
        if user.email:
            return GlobalCustomer.objects.filter(email=user.email).first()
        return None
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        from apps.core.models import BookingStatus
        booking = self.get_object()
        if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW):
            return error_response(f"Cannot cancel a booking that is already {booking.status}.", 400)
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.save(update_fields=['status', 'cancelled_at'])
        return success_response(None, "Booking cancelled.")
    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        from django.utils.dateparse import parse_datetime
        from apps.core.models import BookingStatus, AppointmentSlotStatus
        from apps.store_erp.booking_engine import reschedule_slot, BookingConflictError, BookingEngineError
        booking = self.get_object()
        if booking.status != BookingStatus.CONFIRMED:
            return error_response(f"Cannot reschedule a booking that is {booking.status}.", 400)
        new_start = parse_datetime(request.data.get('slot_start') or '')
        if not new_start:
            return error_response("A valid slot_start is required", 400)
        slot = booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED).order_by('slot_start').first()
        if not slot:
            return error_response("This booking has no active slot to reschedule", 400)
        try:
            # Customers can't override scheduling conflicts — only staff can.
            reschedule_slot(slot, new_start, actor=request.user)
        except BookingConflictError:
            return error_response("That time is no longer available. Please pick another slot.", 409)
        except BookingEngineError as e:
            return error_response(str(e), 400)
        booking.refresh_from_db()
        return success_response(CustomerBookingSerializer(booking).data, "Booking rescheduled")
    @action(detail=True, methods=['post'])
    def tip(self, request, pk=None):
        from urllib.parse import quote
        from apps.core.models import (
            Professional, PayoutDestination, PayoutDestinationType, PayoutVerificationStatus,
            ProfessionalTip, ProfessionalTipMethod, ProfessionalTipStatus,
        )
        booking = self.get_object()
        serializer = BookingTipRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']
        professional_id = serializer.validated_data['professional_id']
        professional = Professional.objects.filter(id=professional_id).select_related('user_account').first()
        if not professional or not professional.user_account_id:
            return error_response("This professional is not set up to receive tips yet.", 400)
        slot = booking.slots.filter(professional_id=professional_id).first()
        if not slot:
            return error_response("This professional did not perform a service in this booking.", 400)
        destination = PayoutDestination.objects.filter(
            professional_account=professional.user_account_id, type=PayoutDestinationType.UPI_VPA,
            verification_status=PayoutVerificationStatus.VERIFIED, is_active=True
        ).first()
        if not destination or not destination.vpa:
            return error_response("This professional hasn't set up a verified UPI payout method yet.", 400)
        customer = self._get_global_customer()
        amount_paise = int(amount * 100)
        tip = ProfessionalTip.objects.create(
            booking=booking, appointment_slot=slot, professional_account=professional.user_account,
            customer=customer, store_group_id=booking.outlet.store_group_id,
            amount_paise=amount_paise, method=ProfessionalTipMethod.UPI_DEEPLINK,
            status=ProfessionalTipStatus.INITIATED,
        )
        payee_name = destination.holder_name or professional.user_account.name
        deep_link = f"upi://pay?pa={quote(destination.vpa)}&pn={quote(payee_name)}&am={amount}&cu=INR&tn=Tip"
        if professional.user_account.user_id:
            from apps.core.notifications import notify_user
            notify_user(
                professional.user_account.user, "Tip on its way",
                f"{customer.name} is sending you a tip of ₹{amount}. Confirm it in Earnings once received.",
                notif_type='TIP_RECEIVED', data={"tip_id": str(tip.id)},
            )
        return success_response({
            "tip_id": str(tip.id),
            "status": tip.status,
            "amount_paise": tip.amount_paise,
            "vpa": destination.vpa,
            "payee_name": payee_name,
            "upi_deeplink": deep_link,
        }, "Tip initiated. Complete payment via your UPI app.", 201)
    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        from apps.core.models import BookingStatus, ProfessionalReview
        booking = self.get_object()
        if booking.status != BookingStatus.COMPLETED:
            return error_response("You can only review a completed booking.", 400)
        serializer = BookingReviewRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        customer = self._get_global_customer()
        if ProfessionalReview.objects.filter(booking=booking, customer=customer).exists():
            return error_response("You have already reviewed this booking.", 400)
        professional_id = data.get('professional_id')
        if professional_id:
            slot = booking.slots.filter(professional_id=professional_id).select_related('professional').first()
        else:
            slot = booking.slots.exclude(professional__isnull=True).select_related('professional').first()
        professional_account = None
        if slot and slot.professional_id and slot.professional.user_account_id:
            professional_account = slot.professional.user_account
        review = ProfessionalReview.objects.create(
            booking=booking, customer=customer, store_group=booking.outlet.store_group,
            professional_account=professional_account,
            store_rating=data['store_rating'],
            professional_rating=data.get('professional_rating'),
            comment=data.get('comment'),
            media_url=data.get('media_url'),
        )
        if professional_account and professional_account.user_id:
            from apps.core.notifications import notify_user
            stars = review.professional_rating or review.store_rating
            notify_user(
                professional_account.user, "New review",
                f"{customer.name} left you a {stars}★ review.",
                notif_type='NEW_REVIEW', data={"review_id": str(review.id)},
            )
        return success_response({
            "id": str(review.id),
            "store_rating": review.store_rating,
            "professional_rating": review.professional_rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat(),
        }, "Thanks for your review!", 201)
