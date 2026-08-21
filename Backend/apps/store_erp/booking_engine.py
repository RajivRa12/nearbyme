import datetime as dt
import hashlib
import json
from django.conf import settings
from django.core import signing
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from apps.core.models import (
    Professional, Resource, ResourceType, StoreService,
    BookingStatus, AppointmentSlot, AppointmentSlotStatus, ProfessionalShift,
)
from .availability import (
    service_duration_and_buffers, service_price_paise,
    eligible_professionals, free_windows_for_professional,
)
OVERRIDE_TOKEN_SALT = 'store-admin-booking-override'
class BookingEngineError(Exception):
    pass
class BookingConflictError(Exception):
    def __init__(self, conflicts, override_token):
        self.conflicts = conflicts
        self.override_token = override_token
        super().__init__("Booking conflict detected")
def _slot_requests_fingerprint(slot_requests):
    normalized = sorted(
        (str(r.get('store_service_id')), str(r.get('professional_id') or ''), r['slot_start'].isoformat(), r['slot_end'].isoformat())
        for r in slot_requests
    )
    return hashlib.sha256(json.dumps(normalized).encode()).hexdigest()
def make_override_token(booking_id, slot_requests):
    signer = signing.TimestampSigner(salt=OVERRIDE_TOKEN_SALT)
    return signer.sign(f"{booking_id}:{_slot_requests_fingerprint(slot_requests)}")
def verify_override_token(token, booking_id, slot_requests):
    signer = signing.TimestampSigner(salt=OVERRIDE_TOKEN_SALT)
    max_age = getattr(settings, 'BOOKING_OVERRIDE_TOKEN_MAX_AGE_SECONDS', 600)
    try:
        value = signer.unsign(token, max_age=max_age)
    except signing.BadSignature:
        return False
    return value == f"{booking_id}:{_slot_requests_fingerprint(slot_requests)}"
def _earliest_shift_start(professional, outlet, the_date):
    weekday = the_date.weekday()
    shift = ProfessionalShift.objects.filter(
        professional=professional, outlet=outlet, weekday=weekday, effective_from__lte=the_date
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=the_date)).order_by('start_time').first()
    return shift.start_time if shift else dt.time.max
def _pick_fewest_bookings_today(candidates, outlet, the_date):
    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(dt.datetime.combine(the_date, dt.time.min), tz)
    day_end = day_start + dt.timedelta(days=1)
    counts = {
        row['professional_id']: row['n']
        for row in AppointmentSlot.objects.filter(
            professional__in=candidates, slot_start__gte=day_start, slot_start__lt=day_end,
            status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED, AppointmentSlotStatus.DONE],
        ).values('professional_id').annotate(n=Count('id'))
    }
    return min(candidates, key=lambda p: (counts.get(p.id, 0), _earliest_shift_start(p, outlet, the_date)))
AUTO_ASSIGN_STRATEGIES = {
    'fewest_bookings_today': _pick_fewest_bookings_today,
}
def auto_assign_professional(outlet, store_service, the_date, slot_start, slot_end):
    duration_min, buffer_before, buffer_after, skill_tag, resource_type = service_duration_and_buffers(store_service, outlet)
    candidates = [
        professional for professional in eligible_professionals(outlet, skill_tag)
        if any(
            w_start <= slot_start and slot_end <= w_end
            for w_start, w_end in free_windows_for_professional(professional, outlet, the_date, duration_min, buffer_before, buffer_after)
        )
    ]
    if not candidates:
        return None
    strategy = getattr(settings, 'BOOKING_AUTO_ASSIGN_STRATEGY', 'fewest_bookings_today')
    picker = AUTO_ASSIGN_STRATEGIES.get(strategy)
    if not picker:
        raise BookingEngineError(f"Unknown BOOKING_AUTO_ASSIGN_STRATEGY: {strategy}")
    return picker(candidates, outlet, the_date)
def _resolve_professional(booking, req, store_service, the_date, slot_start, slot_end):
    professional_id = req.get('professional_id')
    if professional_id:
        try:
            return Professional.objects.select_for_update().get(id=professional_id, outlet=booking.outlet)
        except Professional.DoesNotExist:
            raise BookingEngineError(f"Professional {professional_id} not found at this outlet.")
    candidate = auto_assign_professional(booking.outlet, store_service, the_date, slot_start, slot_end)
    if not candidate:
        raise BookingEngineError(f"No eligible professional available for '{store_service.name}' at this time.")
    return Professional.objects.select_for_update().get(id=candidate.id)
def _resolve_resource(booking, req, resource_type, slot_start, slot_end, buffer_after, exclude_slot_id=None):
    resource_qs = Resource.objects.select_for_update().filter(outlet=booking.outlet, resource_type=resource_type, is_bookable=True)
    resource_id = req.get('resource_id')
    if resource_id:
        candidates = list(resource_qs.filter(id=resource_id))
        if not candidates:
            raise BookingEngineError(f"Requested {resource_type} resource is not available at this outlet.")
    else:
        candidates = list(resource_qs)
        if not candidates:
            raise BookingEngineError(f"No {resource_type} resource configured for this outlet.")
    for resource in candidates:
        busy_qs = AppointmentSlot.objects.filter(
            resource=resource, status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
            slot_start__lt=slot_end + dt.timedelta(minutes=buffer_after), slot_end__gt=slot_start,
        ).exclude(booking=booking)
        if exclude_slot_id:
            busy_qs = busy_qs.exclude(id=exclude_slot_id)
        if not busy_qs.exists():
            return resource, False
    return candidates[0], True
@transaction.atomic
def confirm_booking(booking, slot_requests, actor=None, override_token=None, override_reason=None):
    """Locks professionals/resources per slot_request and writes AppointmentSlot rows, or raises BookingConflictError with an override_token."""
    if booking.status not in (BookingStatus.DRAFT, BookingStatus.CONFIRMED):
        raise BookingEngineError(f"Cannot confirm a booking in status '{booking.status}'.")
    if not slot_requests:
        raise BookingEngineError("At least one slot is required to confirm a booking.")
    has_valid_override = bool(override_token) and bool(override_reason) and verify_override_token(override_token, booking.id, slot_requests)
    conflicts = []
    resolved = []
    for req in slot_requests:
        slot_start, slot_end = req['slot_start'], req['slot_end']
        if slot_end <= slot_start:
            raise BookingEngineError("slot_end must be after slot_start.")
        try:
            store_service = StoreService.objects.get(id=req['store_service_id'], store_group=booking.outlet.store_group)
        except StoreService.DoesNotExist:
            raise BookingEngineError(f"Service {req.get('store_service_id')} not found for this store.")
        duration_min, buffer_before, buffer_after, skill_tag, resource_type = service_duration_and_buffers(store_service, booking.outlet)
        the_date = timezone.localtime(slot_start).date()
        professional = _resolve_professional(booking, req, store_service, the_date, slot_start, slot_end)
        prof_conflict = AppointmentSlot.objects.filter(
            professional=professional, status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
            slot_start__lt=slot_end, slot_end__gt=slot_start,
        ).exclude(booking=booking).exists()
        resource, resource_conflict = (None, False)
        if resource_type != ResourceType.NONE:
            resource, resource_conflict = _resolve_resource(booking, req, resource_type, slot_start, slot_end, buffer_after)
        if prof_conflict or resource_conflict:
            conflicts.append({
                "store_service_id": str(store_service.id), "professional_id": str(professional.id),
                "professional_conflict": prof_conflict, "resource_conflict": resource_conflict,
                "slot_start": slot_start.isoformat(), "slot_end": slot_end.isoformat(),
            })
        resolved.append((req, store_service, professional, resource, slot_start, slot_end))
    if conflicts and not has_valid_override:
        raise BookingConflictError(conflicts, make_override_token(booking.id, slot_requests))
    was_overridden = bool(conflicts) and has_valid_override
    created_slots = [
        AppointmentSlot.objects.create(
            booking=booking, store_service=store_service, professional=professional, resource=resource,
            slot_start=slot_start, slot_end=slot_end, price_paise=service_price_paise(store_service, booking.outlet),
            status=AppointmentSlotStatus.SCHEDULED, was_overridden=was_overridden,
            override_reason=override_reason if was_overridden else None,
            overridden_by=actor if was_overridden else None,
        )
        for req, store_service, professional, resource, slot_start, slot_end in resolved
    ]
    booking.status = BookingStatus.CONFIRMED
    booking.booking_start = min(s.slot_start for s in created_slots)
    booking.booking_end = max(s.slot_end for s in created_slots)
    booking.save()
    return created_slots
@transaction.atomic
def reschedule_slot(old_slot, new_start, new_professional_id=None, actor=None, override_token=None, override_reason=None):
    """Cancels old_slot and atomically creates its replacement at new_start (same duration/service)."""
    if old_slot.status not in (AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED):
        raise BookingEngineError(f"Cannot reschedule a slot in status '{old_slot.status}'.")
    booking = old_slot.booking
    store_service = old_slot.store_service
    duration_min, buffer_before, buffer_after, skill_tag, resource_type = service_duration_and_buffers(store_service, booking.outlet)
    new_end = new_start + dt.timedelta(minutes=duration_min)
    req = {
        'store_service_id': str(store_service.id),
        'professional_id': new_professional_id or (str(old_slot.professional_id) if old_slot.professional_id else None),
        'slot_start': new_start, 'slot_end': new_end,
    }
    has_valid_override = bool(override_token) and bool(override_reason) and verify_override_token(override_token, booking.id, [req])
    the_date = timezone.localtime(new_start).date()
    professional = _resolve_professional(booking, req, store_service, the_date, new_start, new_end)
    prof_conflict = AppointmentSlot.objects.filter(
        professional=professional, status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
        slot_start__lt=new_end, slot_end__gt=new_start,
    ).exclude(id=old_slot.id).exists()
    resource, resource_conflict = (None, False)
    if resource_type != ResourceType.NONE:
        resource, resource_conflict = _resolve_resource(booking, req, resource_type, new_start, new_end, buffer_after, exclude_slot_id=old_slot.id)
    if (prof_conflict or resource_conflict) and not has_valid_override:
        raise BookingConflictError([{
            "store_service_id": str(store_service.id), "professional_id": str(professional.id),
            "professional_conflict": prof_conflict, "resource_conflict": resource_conflict,
            "slot_start": new_start.isoformat(), "slot_end": new_end.isoformat(),
        }], make_override_token(booking.id, [req]))
    was_overridden = bool(prof_conflict or resource_conflict) and has_valid_override
    old_slot.status = AppointmentSlotStatus.CANCELLED
    old_slot.save()
    new_slot = AppointmentSlot.objects.create(
        booking=booking, store_service=store_service, professional=professional, resource=resource,
        slot_start=new_start, slot_end=new_end, price_paise=old_slot.price_paise,
        status=AppointmentSlotStatus.SCHEDULED,
        was_overridden=was_overridden, override_reason=override_reason if was_overridden else None,
        overridden_by=actor if was_overridden else None,
    )
    active = booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED)
    if active.exists():
        booking.booking_start = min(s.slot_start for s in active)
        booking.booking_end = max(s.slot_end for s in active)
        booking.save()
    return new_slot
