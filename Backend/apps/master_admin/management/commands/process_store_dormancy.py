import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Max
from django.db import transaction

from apps.core.models import (
    StoreGroup,
    StoreGroupStatus,
    StoreStatusHistory,
    AuditLog,
    Outlet,
    Booking,
    Invoice,
    User
)

class Command(BaseCommand):
    help = "Daily scheduled job to manage store dormancy based on inactivity (Ticket 4)"

    def handle(self, *args, **options):
        self.stdout.write("Starting store dormancy processing...")
        now = timezone.now()
        thirty_days_ago = now - datetime.timedelta(days=30)

        active_stores = StoreGroup.objects.filter(status=StoreGroupStatus.ACTIVE)
        dormant_stores = StoreGroup.objects.filter(status=StoreGroupStatus.DORMANT)

        marked_dormant = 0
        marked_active = 0

        # 1. Active to Dormant
        for store in active_stores:
            last_activity = self.get_last_activity(store)

            # If there's no activity ever, or the last activity was over 30 days ago
            if last_activity is None or last_activity < thirty_days_ago:
                with transaction.atomic():
                    self.transition(store, StoreGroupStatus.ACTIVE, StoreGroupStatus.DORMANT,
                                     "Automated 30-day inactivity timeout", now)
                    marked_dormant += 1
                    self.stdout.write(f"Marked {store.name} as DORMANT")

        # 2. Dormant to Active
        for store in dormant_stores:
            last_activity = self.get_last_activity(store)

            # If there is recent activity (within 30 days)
            if last_activity and last_activity >= thirty_days_ago:
                with transaction.atomic():
                    self.transition(store, StoreGroupStatus.DORMANT, StoreGroupStatus.ACTIVE,
                                     "Automated reactivation due to new activity", now)
                    marked_active += 1
                    self.stdout.write(f"Reactivated {store.name} to ACTIVE")

        self.stdout.write(self.style.SUCCESS(f"Done! Marked {marked_dormant} dormant, reactivated {marked_active}."))

    def transition(self, store, from_status, to_status, reason, now):
        store.status = to_status
        store.status_changed_at = now
        store.save(update_fields=['status', 'status_changed_at'])

        StoreStatusHistory.objects.create(
            store_group=store,
            from_status=from_status,
            to_status=to_status,
            reason=reason,
            changed_by="System (dormancy job)",
            changed_by_type="system"
        )

        AuditLog.objects.create(
            actor_id="system",
            actor_type="system",
            action=f"store_group_transition_to_{to_status}",
            entity_type="store_group",
            entity_id=str(store.id),
            before={"status": from_status},
            after={"status": to_status, "reason": reason}
        )

        if to_status == StoreGroupStatus.ACTIVE:
            Outlet.objects.filter(store_group=store).update(status='active')
        elif to_status == StoreGroupStatus.DORMANT:
            Outlet.objects.filter(store_group=store).update(status='inactive')

    def get_last_activity(self, store_group):
        """
        Most recent operational activity timestamp for a store group: the latest of
        any booking made, any invoice raised, or any staff login, across all its outlets.
        """
        booking_max = Booking.objects.filter(outlet__store_group=store_group).aggregate(
            Max('created_at')
        )['created_at__max']
        invoice_max = Invoice.objects.filter(outlet__store_group=store_group).aggregate(
            Max('created_at')
        )['created_at__max']
        login_max = User.objects.filter(outlet__store_group=store_group).aggregate(
            Max('last_login')
        )['last_login__max']

        candidates = [ts for ts in (booking_max, invoice_max, login_max) if ts is not None]
        return max(candidates) if candidates else None
