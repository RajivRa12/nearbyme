from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.core.models import User, MarketingCampaign, CampaignTarget
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run automated marketing campaigns (birthdays, inactive customers)'

    def handle(self, *args, **options):
        self.stdout.write("Starting automated campaigns script...")
        today = timezone.now().date()
        
        # 1. Birthday Campaigns
        customers = User.objects.filter(role='CUSTOMER', is_active=True)
        birthday_count = 0
        inactive_count = 0

        # Simulate campaign creation
        try:
            from apps.core.models import Store
            store = Store.objects.first() # Run for the first store for now
            if not store:
                self.stdout.write(self.style.ERROR("No store found."))
                return

            # Birthday campaign
            birthday_campaign, _ = MarketingCampaign.objects.get_or_create(
                store=store,
                name=f"Automated Birthday Greetings {today.strftime('%Y-%m')}",
                defaults={
                    'channel': 'SMS',
                    'status': 'ACTIVE',
                    'start_date': today,
                    'end_date': today + timedelta(days=30),
                    'message_template': "Happy Birthday {name}! Enjoy a 10% discount on your next visit."
                }
            )

            # Inactive campaign
            inactive_campaign, _ = MarketingCampaign.objects.get_or_create(
                store=store,
                name=f"We Miss You - Inactive {today.strftime('%Y-%m')}",
                defaults={
                    'channel': 'EMAIL',
                    'status': 'ACTIVE',
                    'start_date': today,
                    'end_date': today + timedelta(days=30),
                    'message_template': "Hi {name}, we haven't seen you in a while! Come back for a special treat."
                }
            )

            for customer in customers:
                crm = getattr(customer, 'crm_profile', None)
                if not crm:
                    continue
                
                # Birthday Check
                if crm.birthday and crm.birthday.month == today.month and crm.birthday.day == today.day:
                    CampaignTarget.objects.get_or_create(
                        campaign=birthday_campaign,
                        customer=customer,
                        defaults={'status': 'SENT'}
                    )
                    birthday_count += 1
                
                # Inactive Check (> 90 days)
                last_appt = customer.appointments.filter(status='COMPLETED').order_by('-start_time').first()
                if last_appt and (today - last_appt.start_time.date()).days > 90:
                    recently_targeted = CampaignTarget.objects.filter(
                        campaign__name__startswith="We Miss You", 
                        customer=customer,
                        sent_at__gte=today - timedelta(days=30)
                    ).exists()

                    if not recently_targeted:
                        CampaignTarget.objects.get_or_create(
                            campaign=inactive_campaign,
                            customer=customer,
                            defaults={'status': 'SENT'}
                        )
                        inactive_count += 1

            self.stdout.write(self.style.SUCCESS(f"Successfully triggered {birthday_count} birthday campaigns and {inactive_count} inactive campaigns."))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error running campaigns: {str(e)}"))
