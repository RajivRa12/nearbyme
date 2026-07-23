from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import Invoice, InvoiceStatus

@receiver(pre_save, sender=Invoice)
def auto_accrue_loyalty_points(sender, instance, **kwargs):
    if not instance.pk:
        return  # New invoice being created — nothing to compare against
    try:
        old_invoice = Invoice.objects.get(pk=instance.pk)
    except Invoice.DoesNotExist:
        return  # Invoice doesn't exist in DB yet (e.g. pk was set manually before save)
    
    if old_invoice.status != InvoiceStatus.PAID and instance.status == InvoiceStatus.PAID:
        if instance.customer:
            points_to_award = int(instance.grand_total / 100)
            if points_to_award > 0:
                instance.customer.loyalty_points += points_to_award
                instance.customer.save(update_fields=['loyalty_points'])
