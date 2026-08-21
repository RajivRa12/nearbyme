from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.models import SlotHold, SlotHoldStatus
from apps.store_erp.availability import bump_availability_version
class Command(BaseCommand):
    help = "Flip HELD SlotHolds past their expires_at to EXPIRED. Run every few minutes via cron/celery-beat — the on-read filter (expires_at__gt=now()) already hides expired holds from availability, but this sweep keeps the DB from accumulating stale HELD rows forever, per build guide section 6."
    def handle(self, *args, **options):
        stale = SlotHold.objects.filter(status=SlotHoldStatus.HELD, expires_at__lte=timezone.now())
        outlet_ids = set(stale.values_list('outlet_id', flat=True))
        count = stale.update(status=SlotHoldStatus.EXPIRED)
        for outlet_id in outlet_ids:
            bump_availability_version(outlet_id)
        self.stdout.write(self.style.SUCCESS(f"Expired {count} stale slot hold(s) across {len(outlet_ids)} outlet(s)."))
