from django.db.models import Q
from django.utils import timezone
from rest_framework.permissions import BasePermission
from apps.core.models import Role, ProfessionalAccount, Professional, ProfessionalLinkStatus
class IsProfessional(BasePermission):
    """Gates the therapist app to authenticated Role.THERAPIST users, and
    auto-provisions their ProfessionalAccount (global identity) on first
    access so the native app never has to special-case onboarding."""
    message = "Only therapist accounts can access this endpoint."
    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.role == Role.THERAPIST):
            return False
        account, _ = ProfessionalAccount.objects.get_or_create(
            user=user,
            defaults={'name': user.get_full_name() or user.email, 'phone_e164': user.phone}
        )
        self._accept_pending_invites(user, account)
        request.professional_account = account
        return True
    def _accept_pending_invites(self, user, account):
        """A store admin invites a Professional (booking-schedulable resource)
        by name/phone/email before that person ever logs into the therapist
        app. The first time they do, link any still-pending invite at their
        own outlet whose contact details match — this is what makes their
        real bookings (AppointmentSlot.professional) resolve to this account."""
        outlet_id = getattr(user.store, 'outlet_id', None) if user.store_id else None
        if not outlet_id:
            return
        contact_match = Q()
        if user.email:
            contact_match |= Q(email__iexact=user.email)
        if user.phone:
            contact_match |= Q(phone_e164=user.phone)
        if not contact_match:
            return
        Professional.objects.filter(
            Q(user_account__isnull=True), contact_match, outlet_id=outlet_id,
        ).update(user_account=account, link_status=ProfessionalLinkStatus.ACCEPTED, accepted_at=timezone.now())
