import datetime
import logging
from django.utils import timezone
from apps.core.models import (
    GlobalCustomer, CustomerStoreLink, CustomerLifecycleStage,
    CampaignTargetType, CampaignStatus, CampaignSend, Booking,
)
logger = logging.getLogger(__name__)
def _birthday_window_dates(today, days_ahead=7):
    return {(today + datetime.timedelta(days=i)).replace(year=2000) for i in range(days_ahead + 1)}
def resolve_targets(campaign):
    store_group = campaign.store_group
    today = timezone.localdate()
    if campaign.target_type == CampaignTargetType.LAPSED_60D:
        cutoff = today - datetime.timedelta(days=60)
        customer_ids = CustomerStoreLink.objects.filter(
            store_group=store_group, last_visit_at__date__lt=cutoff
        ).values_list('customer_id', flat=True)
        return GlobalCustomer.objects.filter(id__in=customer_ids)
    if campaign.target_type == CampaignTargetType.LIFECYCLE_LAPSING:
        customer_ids = CustomerStoreLink.objects.filter(
            store_group=store_group, lifecycle_stage=CustomerLifecycleStage.LAPSING
        ).values_list('customer_id', flat=True)
        return GlobalCustomer.objects.filter(id__in=customer_ids)
    if campaign.target_type == CampaignTargetType.BIRTHDAY_THIS_WEEK:
        window = _birthday_window_dates(today)
        customer_ids = CustomerStoreLink.objects.filter(store_group=store_group).values_list('customer_id', flat=True)
        candidates = GlobalCustomer.objects.filter(id__in=customer_ids, date_of_birth__isnull=False)
        return [c for c in candidates if c.date_of_birth.replace(year=2000) in window]
    return GlobalCustomer.objects.none()
def _dispatch(channel, customer, message):
    """No real SMS/WhatsApp gateway is wired into this codebase. This is the integration
    point a provider (Twilio, Gupshup, etc.) would plug into; for now it just logs."""
    destination = customer.phone_e164 or customer.email or customer.id
    logger.info(f"[campaign:{channel}] would send to {destination}: {message}")
def send_campaign(campaign):
    targets = resolve_targets(campaign)
    sent = 0
    for customer in targets:
        if CampaignSend.objects.filter(campaign=campaign, customer=customer).exists():
            continue
        message = campaign.message_template.replace('{name}', customer.name)
        _dispatch(campaign.channel, customer, message)
        CampaignSend.objects.create(campaign=campaign, customer=customer)
        sent += 1
    campaign.status = CampaignStatus.SENT
    campaign.sent_at = timezone.now()
    campaign.save(update_fields=['status', 'sent_at'])
    return sent
def campaign_analytics(campaign):
    sends = campaign.sends.all()
    sent_count = sends.count()
    opened_count = sends.filter(opened_at__isnull=False).count()
    bookings_generated = 0
    for send in sends.select_related('customer'):
        if Booking.objects.filter(
            outlet__store_group=campaign.store_group, customer=send.customer, booking_start__gte=send.sent_at
        ).exists():
            bookings_generated += 1
    return {
        'sent_count': sent_count,
        'open_rate': round(opened_count / sent_count, 4) if sent_count else 0,
        'bookings_generated': bookings_generated,
    }
