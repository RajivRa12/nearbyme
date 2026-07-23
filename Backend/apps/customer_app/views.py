from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.db.models import Prefetch

from apps.core.models import (
    Store, ServiceCategory, Service, User, Role,
    Appointment, Wallet, CustomerMembership, Review,
    GiftCard, ServicePackage, CustomerPackage, StaffAvailability,
    FavoriteTherapist, Invoice, Coupon, Tip, WalletTransaction, AppointmentItem
)
from .serializers import (
    PublicStoreSerializer, PublicServiceCategorySerializer,
    PublicReviewSerializer, CustomerProfileSerializer,
    CustomerWalletSerializer, CustomerMembershipSerializer,
    CustomerAppointmentSerializer, GiftCardSerializer,
    ServicePackageSerializer, CustomerPackageSerializer,
    FavoriteTherapistSerializer, CustomerInvoiceSerializer,
    PublicServiceSerializer, PublicCouponSerializer, PublicTherapistSerializer
)
from .permissions import IsCustomer

def success_response(data, message="Success", status_code=200):
    return Response({"success": True, "message": message, "data": data}, status=status_code)

# DISCOVERY (PUBLIC/MARKETPLACE) 

class PublicStoreViewSet(viewsets.ReadOnlyModelViewSet):

    queryset = Store.objects.filter(status='ACTIVE')
    serializer_class = PublicStoreSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['brand', 'business__business_type']
    search_fields = ['name', 'address', 'location']
    ordering = ['name']

    @action(detail=True, methods=['get'])
    def menu(self, request, pk=None):
        store = self.get_object()
        categories = ServiceCategory.objects.filter(
            store=store, 
            is_active=True
        ).prefetch_related(
            Prefetch('services', queryset=Service.objects.filter(is_active=True))
        )
        serializer = PublicServiceCategorySerializer(categories, many=True)
        return success_response(serializer.data, f"Menu for {store.name}")

    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        store = self.get_object()
        reviews = Review.objects.filter(store=store, status='APPROVED').order_by('-created_at')
        serializer = PublicReviewSerializer(reviews, many=True)
        return success_response(serializer.data, f"Reviews for {store.name}")

    @action(detail=True, methods=['get'])
    def availability(self, request, pk=None):
        store = self.get_object()
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({"error": "date query parameter is required (YYYY-MM-DD)"}, status=400)
        return success_response({"available_slots": ["09:00", "10:00", "11:30", "14:00"]}, f"Available slots for {store.name} on {date_str}")


# AUTHENTICATED CUSTOMER 

class CustomerProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = CustomerProfileSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_object(self):
        return self.request.user


class CustomerWalletView(generics.RetrieveAPIView):
    serializer_class = CustomerWalletSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_object(self):
        wallet, created = Wallet.objects.get_or_create(customer=self.request.user)
        return wallet


class CustomerMembershipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerMembershipSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return CustomerMembership.objects.filter(customer=self.request.user)


class CustomerAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerAppointmentSerializer
    permission_classes = [IsAuthenticated, IsCustomer]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'store']
    ordering = ['-start_time']

    def get_queryset(self):
        return Appointment.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=['post'])
    def tip(self, request, pk=None):
        from django.db import transaction
        from decimal import Decimal
        
        appointment = self.get_object()
        amount_str = request.data.get('amount')
        therapist_id = request.data.get('therapist_id')
        
        if not amount_str:
            return Response({"error": "amount is required"}, status=400)
            
        amount = Decimal(amount_str)
        
        if therapist_id:
            therapist = User.objects.filter(id=therapist_id).first()
        else:
            first_item = appointment.items.first()
            therapist = first_item.assigned_staff if first_item else None
            
        if not therapist:
            return Response({"error": "No therapist found for this appointment to tip."}, status=400)

        invoice = Invoice.objects.filter(appointment=appointment).first()
        
        with transaction.atomic():
            tip = Tip.objects.create(
                invoice=invoice,
                amount=amount
            )
            therapist_wallet, _ = Wallet.objects.get_or_create(customer=therapist)
            therapist_wallet.balance += amount
            therapist_wallet.save()
            WalletTransaction.objects.create(
                wallet=therapist_wallet,
                transaction_type='CREDIT',
                amount=amount,
                description=f"Tip from {request.user.get_full_name()} for Appointment #{appointment.id}"
            )
            
        return success_response({
            "appointment_id": appointment.id, 
            "therapist": therapist.get_full_name(),
            "tip_amount": amount
        }, "Tip successfully sent to therapist's wallet!")

class GiftCardViewSet(viewsets.ModelViewSet):
    serializer_class = GiftCardSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return GiftCard.objects.filter(purchaser=self.request.user)
        
    def perform_create(self, serializer):
        serializer.save(purchaser=self.request.user)

class CustomerPackageViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerPackageSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return CustomerPackage.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

class CustomerInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CustomerInvoiceSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return Invoice.objects.filter(appointment__customer=self.request.user).order_by('-created_at')

class FavoriteTherapistViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteTherapistSerializer
    permission_classes = [IsAuthenticated, IsCustomer]

    def get_queryset(self):
        return FavoriteTherapist.objects.filter(customer=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

# MARKETPLACE DISCOVERY: TRENDING, OFFERS, RECOMMENDED THERAPISTS 

class PublicServiceViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from django.db.models import Count
        return Service.objects.filter(is_active=True).annotate(
            booking_count=Count('appointmentitem')
        ).order_by('-booking_count')[:10]
    serializer_class = PublicServiceSerializer
    permission_classes = [AllowAny]

class PublicCouponViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Coupon.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = PublicCouponSerializer
    permission_classes = [AllowAny]

class PublicTherapistViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        from django.db.models import Count
        return User.objects.filter(role=Role.THERAPIST, is_active=True).annotate(
            follower_count=Count('favorited_by')
        ).order_by('-follower_count')[:10]
    serializer_class = PublicTherapistSerializer
    permission_classes = [AllowAny]
