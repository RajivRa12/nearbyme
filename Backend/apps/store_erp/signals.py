from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from apps.core.models import Booking, AppointmentSlot
from .availability import bump_availability_version
@receiver(post_save, sender=Booking)
def bump_on_booking_change(sender, instance, **kwargs):
    bump_availability_version(instance.outlet_id)
@receiver(post_save, sender=AppointmentSlot)
def bump_on_slot_save(sender, instance, **kwargs):
    bump_availability_version(instance.booking.outlet_id)
@receiver(post_delete, sender=AppointmentSlot)
def bump_on_slot_delete(sender, instance, **kwargs):
    bump_availability_version(instance.booking.outlet_id)
