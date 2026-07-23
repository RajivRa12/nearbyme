from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.core.models import Appointment, MarketingCampaign, CampaignTarget
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run post-appointment triggers (Google Review Reminders)'

    def handle(self, *args, **options):
        self.stdout.write("Starting post-appointment triggers...")
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        
        try:
            from apps.core.models import Store
            store = Store.objects.first()
            if not store:
                self.stdout.write(self.style.ERROR("No store found."))
                return

            # Review reminder campaign
            review_campaign, _ = MarketingCampaign.objects.get_or_create(
                store=store,
                name="Automated Google Review Reminders",
                defaults={
                    'channel': 'SMS',
                    'status': 'ACTIVE',
                    'start_date': now.date(),
                    'end_date': (now + timedelta(days=365)).date(),
                    'message_template': "Hi {name}, we hope you enjoyed your visit! Please leave us a review on Google: https://g.page/r/example"
                }
            )

            # Find appointments completed in the last 24-48 hours
            recent_appts = Appointment.objects.filter(
                status='COMPLETED',
                end_time__gte=yesterday - timedelta(days=1),
                end_time__lte=yesterday
            ).exclude(customer__isnull=True)

            reminders_sent = 0
            for appt in recent_appts:
                # To prevent spam, check if we've sent a review reminder recently (e.g. last 6 months)
                recently_sent = CampaignTarget.objects.filter(
                    campaign=review_campaign,
                    customer=appt.customer,
                    sent_at__gte=now - timedelta(days=180)
                ).exists()

                if not recently_sent:
                    CampaignTarget.objects.create(
                        campaign=review_campaign,
                        customer=appt.customer,
                        status='SENT'
                    )
                    reminders_sent += 1

            self.stdout.write(self.style.SUCCESS(f"Successfully triggered {reminders_sent} Google Review reminders."))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error running triggers: {str(e)}"))
