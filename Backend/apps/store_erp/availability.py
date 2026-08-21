import datetime as dt
from django.db.models import Q
from django.core.cache import cache
from django.utils import timezone
from apps.core.models import (
    Professional, ProfessionalShift, ProfessionalTimeOff, ProfessionalLinkStatus,
    AppointmentSlot, AppointmentSlotStatus, Resource, StoreServiceOutletOverride,
    ResourceType, SlotHold, SlotHoldStatus,
)
SLOT_GRANULARITY_MINUTES = 15
AVAILABILITY_CACHE_TTL_SECONDS = 30
def _availability_version_key(outlet_id):
    return f"availability_version:{outlet_id}"
def get_availability_version(outlet_id):
    return cache.get(_availability_version_key(outlet_id), 1)
def bump_availability_version(outlet_id):
    if not outlet_id:
        return
    key = _availability_version_key(outlet_id)
    try:
        cache.incr(key)
    except ValueError:
        cache.set(key, 2)
def availability_cache_key(outlet_id, service_id, date_str, professional_id=None):
    version = get_availability_version(outlet_id)
    return f"availability:{outlet_id}:{version}:{service_id}:{date_str}:{professional_id or 'any'}"
def service_duration_and_buffers(store_service, outlet):
    override = StoreServiceOutletOverride.objects.filter(store_service=store_service, outlet=outlet).first()
    duration_min = override.duration_min if override else store_service.duration_min
    canonical = store_service.canonical_service
    buffer_before = canonical.buffer_before_min if canonical else 0
    buffer_after = canonical.buffer_after_min if canonical else 0
    skill_tag = canonical.skill_tag if canonical else None
    resource_type = canonical.resource_type if canonical else ResourceType.NONE
    return duration_min, buffer_before, buffer_after, skill_tag, resource_type
def service_price_paise(store_service, outlet):
    override = StoreServiceOutletOverride.objects.filter(store_service=store_service, outlet=outlet).first()
    return override.price_paise if override else store_service.default_price_paise
def eligible_professionals(outlet, skill_tag, professional_id=None):
    qs = Professional.objects.filter(
        outlet=outlet, is_bookable=True, link_status=ProfessionalLinkStatus.ACCEPTED
    )
    if professional_id:
        qs = qs.filter(id=professional_id)
    if skill_tag:
        qs = qs.filter(skills__skill_tag=skill_tag)
    return qs.distinct()
def _shift_windows(professional, outlet, the_date):
    weekday = the_date.weekday()
    shifts = ProfessionalShift.objects.filter(
        professional=professional, outlet=outlet, weekday=weekday, effective_from__lte=the_date
    ).filter(Q(effective_to__isnull=True) | Q(effective_to__gte=the_date))
    tz = timezone.get_current_timezone()
    windows = []
    for shift in shifts:
        start = timezone.make_aware(dt.datetime.combine(the_date, shift.start_time), tz)
        end = timezone.make_aware(dt.datetime.combine(the_date, shift.end_time), tz)
        if end > start:
            windows.append((start, end))
    return windows
def _subtract_interval(windows, busy_start, busy_end):
    result = []
    for start, end in windows:
        if busy_end <= start or busy_start >= end:
            result.append((start, end))
            continue
        if busy_start > start:
            result.append((start, busy_start))
        if busy_end < end:
            result.append((busy_end, end))
    return result
def _professional_busy_intervals(professional, day_start, day_end):
    """A room reserves duration + buffer_after (cleanup) — see resource_free
    and its buffer-padded callers. A professional is only locked for the
    exact appointment duration; buffers are a room-cleanup concern, not a
    professional-availability one."""
    intervals = []
    for t in ProfessionalTimeOff.objects.filter(
        professional=professional, start_at__lt=day_end, end_at__gt=day_start
    ):
        intervals.append((t.start_at, t.end_at))
    for s in AppointmentSlot.objects.filter(
        professional=professional,
        status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
        slot_start__lt=day_end, slot_end__gt=day_start,
    ):
        intervals.append((s.slot_start, s.slot_end))
    for h in SlotHold.objects.filter(
        professional=professional, status=SlotHoldStatus.HELD, expires_at__gt=timezone.now(),
        slot_start__lt=day_end, slot_end__gt=day_start,
    ):
        intervals.append((h.slot_start, h.slot_end))
    return intervals
def free_windows_for_professional(professional, outlet, the_date, duration_min, buffer_before, buffer_after):
    windows = _shift_windows(professional, outlet, the_date)
    if not windows:
        return []
    day_start = min(w[0] for w in windows)
    day_end = max(w[1] for w in windows)
    for busy_start, busy_end in _professional_busy_intervals(professional, day_start, day_end):
        windows = _subtract_interval(windows, busy_start, busy_end)
    return [(s, e) for s, e in windows if (e - s).total_seconds() / 60 >= duration_min]
def resource_free(outlet, resource_type, start, end):
    resources = Resource.objects.filter(outlet=outlet, resource_type=resource_type, is_bookable=True)
    if not resources.exists():
        return False
    busy_resource_ids = set(
        AppointmentSlot.objects.filter(
            resource__in=resources,
            status__in=[AppointmentSlotStatus.SCHEDULED, AppointmentSlotStatus.STARTED],
            slot_start__lt=end, slot_end__gt=start,
        ).values_list('resource_id', flat=True)
    )
    busy_resource_ids |= set(
        SlotHold.objects.filter(
            resource__in=resources, status=SlotHoldStatus.HELD, expires_at__gt=timezone.now(),
            slot_start__lt=end, slot_end__gt=start,
        ).values_list('resource_id', flat=True)
    )
    return resources.exclude(id__in=busy_resource_ids).exists()
def compute_availability(outlet, store_service, the_date, professional_id=None):
    duration_min, buffer_before, buffer_after, skill_tag, resource_type = service_duration_and_buffers(store_service, outlet)
    professionals = list(eligible_professionals(outlet, skill_tag, professional_id))
    step = dt.timedelta(minutes=SLOT_GRANULARITY_MINUTES)
    slot_map = {}
    for professional in professionals:
        for win_start, win_end in free_windows_for_professional(professional, outlet, the_date, duration_min, buffer_before, buffer_after):
            candidate = win_start + dt.timedelta(minutes=buffer_before)
            latest_start = win_end - dt.timedelta(minutes=duration_min + buffer_after)
            while candidate <= latest_start:
                slot_end = candidate + dt.timedelta(minutes=duration_min)
                if resource_type != ResourceType.NONE and not resource_free(outlet, resource_type, candidate, slot_end + dt.timedelta(minutes=buffer_after)):
                    candidate += step
                    continue
                entry = slot_map.setdefault(candidate.isoformat(), {"start": candidate, "end": slot_end, "professionals": []})
                entry["professionals"].append(professional)
                candidate += step
    return duration_min, sorted(slot_map.values(), key=lambda e: e["start"])
