from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils.text import slugify
from .models import Store, StorePublicProfile
@receiver(post_save, sender=Store)
def create_store_public_profile(sender, instance, created, **kwargs):
    """Every store gets a microsite the moment it exists — legacy Store has
    no separate approval gate (StoreStatus defaults to ACTIVE on creation),
    so 'the moment it's approved' is 'the moment it's created' here. See
    customer-app-build-guide.pdf section 2."""
    if not created or hasattr(instance, 'public_profile'):
        return
    base_slug = slugify(instance.name) or f"store-{instance.id}"
    slug = base_slug
    suffix = 2
    while StorePublicProfile.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    StorePublicProfile.objects.create(store=instance, slug=slug)
