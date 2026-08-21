from django.core.management.base import BaseCommand
from apps.core.models import StoreGroup, StoreGroupStatus, Campaign, CampaignChannel, CampaignTargetType
from apps.store_erp.campaigns import send_campaign
AUTO_CAMPAIGNS = [
    (CampaignTargetType.BIRTHDAY_THIS_WEEK, "Automated: Birthday", "Happy Birthday {name}! Enjoy a treat on us this week."),
    (CampaignTargetType.LAPSED_60D, "Automated: We Miss You", "Hi {name}, it's been a while since your last visit — come see us again!"),
    (CampaignTargetType.LIFECYCLE_LAPSING, "Automated: Don't Drift Away", "Hi {name}, we'd love to have you back soon."),
]
class Command(BaseCommand):
    help = 'Run automated marketing campaigns (birthdays, lapsed 60+ day customers, lapsing lifecycle stage) for every active store group.'
    def handle(self, *args, **options):
        total_sent = 0
        for store_group in StoreGroup.objects.filter(status=StoreGroupStatus.ACTIVE):
            for target_type, name, template in AUTO_CAMPAIGNS:
                campaign, _ = Campaign.objects.get_or_create(
                    store_group=store_group, target_type=target_type, name=name,
                    defaults={'channel': CampaignChannel.SMS, 'message_template': template},
                )
                sent = send_campaign(campaign)
                total_sent += sent
                if sent:
                    self.stdout.write(self.style.SUCCESS(f"{store_group.name}: sent '{campaign.name}' to {sent} customers"))
        self.stdout.write(self.style.SUCCESS(f"Done. Total messages sent this run: {total_sent}"))
