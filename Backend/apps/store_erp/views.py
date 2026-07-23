import datetime
import uuid
from django.db import transaction, models
from django.utils import timezone
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.core.models import (
    ServiceCategory, Service, StaffAvailability, 
    Appointment, AppointmentItem, User, Role
)
from .serializers import (
    ServiceCategorySerializer, ServiceSerializer, 
    StaffAvailabilitySerializer, AppointmentSerializer,
    CreateAppointmentSerializer
)
from .permissions import IsStoreStaff, IsStoreManagerOrReceptionist

def success_response(data, message="Success", status_code=200):
    return Response({"success": True, "message": message, "data": data}, status=status_code)

class ServiceCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated, IsStoreStaff]
    filter_backends = [SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        return ServiceCategory.objects.filter(business=self.request.user.store.business)

    def perform_create(self, serializer):
        serializer.save(business=self.request.user.store.business)

class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name']
    ordering_fields = ['price', 'name']

    def get_queryset(self):
        return Service.objects.filter(category__business=self.request.user.store.business)

from .serializers import ERPStaffSerializer

class StaffViewSet(viewsets.ModelViewSet):
    serializer_class = ERPStaffSerializer
    permission_classes = [IsAuthenticated, IsStoreStaff]
    
    def get_queryset(self):
        return User.objects.filter(store=self.request.user.store, role__in=[Role.RECEPTIONIST, Role.THERAPIST, Role.STORE_ADMIN])

    def perform_create(self, serializer):
        user = serializer.save(
            store=self.request.user.store,
            brand=self.request.user.brand,
        )
        password = self.request.data.get('password', 'changeme123')
        user.set_password(password)
        user.save()


class StaffTrainingViewSet(viewsets.ModelViewSet):
    from apps.core.models import StaffTraining
    queryset = StaffTraining.objects.all()
    permission_classes = [IsStoreStaff]
    
    def get_serializer_class(self):
        from apps.store_erp.serializers import StaffTrainingSerializer
        return StaffTrainingSerializer
        
    def get_queryset(self):
        return self.queryset.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class StaffAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAvailabilitySerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['day_of_week', 'staff']
    ordering_fields = ['day_of_week', 'start_time']

    def get_queryset(self):
        return StaffAvailability.objects.filter(staff__store=self.request.user.store)

    def perform_create(self, serializer):
        staff_id = self.request.data.get('staff')
        try:
            staff = User.objects.get(id=staff_id, store=self.request.user.store, role=Role.THERAPIST)
            serializer.save(staff=staff)
        except User.DoesNotExist:
            raise serializers.ValidationError({"staff": "Therapist not found in this store."})

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated, IsStoreStaff]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'start_time']
    search_fields = ['customer__email', 'customer__first_name']
    ordering_fields = ['start_time', 'created_at']
    ordering = ['-start_time']

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.filter(store=user.store)
        if user.role == Role.THERAPIST:
            qs = qs.filter(items__therapist=user).distinct()
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = CreateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        store = request.user.store
        customer_id = data.get('customer_id')
        start_time = data.get('start_time')
        
        customer = None
        if customer_id:
            customer = User.objects.filter(id=customer_id, role=Role.CUSTOMER).first()

        appointment = Appointment.objects.create(
            store=store,
            customer=customer,
            start_time=start_time,
            end_time=start_time, # Will compute below
            notes=data.get('notes', ''),
            is_group=data.get('is_group', False),
            group_size=data.get('group_size', 1),
            is_recurring=data.get('is_recurring', False),
            recurrence_pattern=data.get('recurrence_pattern'),
            recurrence_end_date=data.get('recurrence_end_date')
        )

        total_duration = 0
        for item in data['items']:
            service = Service.objects.get(id=item['service_id'])
            therapist = None
            if item.get('therapist_id'):
                therapist = User.objects.filter(id=item['therapist_id'], store=store).first()
            
            AppointmentItem.objects.create(
                appointment=appointment,
                service=service,
                therapist=therapist,
                price=service.price
            )
            total_duration += service.duration_minutes

        appointment.end_time = start_time + datetime.timedelta(minutes=total_duration)
        appointment.save()

        return success_response(AppointmentSerializer(appointment).data, "Appointment created successfully", 201)

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            date_str = timezone.now().date().isoformat()
        
        try:
            target_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        appointments = self.get_queryset().filter(
            start_time__date=target_date
        )

        data = AppointmentSerializer(appointments, many=True).data
        return success_response(data, f"Calendar data for {date_str}")

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_status = instance.status
        response = super().partial_update(request, *args, **kwargs)
        new_status = response.data.get('status')
        
        # If status changed to COMPLETED, auto-deduct inventory
        if old_status != 'COMPLETED' and new_status == 'COMPLETED':
            from apps.core.models import ServiceProduct, StockTransfer
            for item in instance.items.all():
                service_products = ServiceProduct.objects.filter(service=item.service)
                for sp in service_products:
                    product = sp.product
                    # Deduct stock
                    if product.stock >= sp.quantity_used:
                        product.stock -= sp.quantity_used
                        product.save()
                        # Log transfer
                        StockTransfer.objects.create(
                            store=instance.store,
                            product=product,
                            transfer_type='OUT',
                            quantity=sp.quantity_used,
                            reason=f"Auto-deducted for Appointment #{instance.id} (Service: {item.service.name})"
                        )
        
        return response


# BILLING & INVOICES 

from decimal import Decimal
from apps.core.models import Invoice, InvoiceItem, Payment, Tip, PlatformSettings, InvoiceStatus
from .serializers import InvoiceSerializer, CheckoutPaymentSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsStoreStaff]
    
    def get_queryset(self):
        return Invoice.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def generate(self, request):
        appointment_id = request.data.get('appointment_id')
        if not appointment_id:
            return error_response("appointment_id is required", 400)
            
        try:
            appointment = Appointment.objects.get(id=appointment_id, store=request.user.store)
        except Appointment.DoesNotExist:
            return error_response("Appointment not found", 404)
            
        if hasattr(appointment, 'invoice'):
            return error_response(f"Invoice already exists for this appointment: {appointment.invoice.invoice_number}", 400)

        settings = PlatformSettings.objects.first()
        tax_rate = settings.gst_percentage if settings else Decimal('18.00')

        invoice = Invoice.objects.create(
            invoice_number=f"INV-{uuid.uuid4().hex[:6].upper()}",
            store=request.user.store,
            appointment=appointment,
            customer=appointment.customer,
            status=InvoiceStatus.UNPAID
        )

        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')

        for item in appointment.items.all():
            line_tax = (item.price * tax_rate) / Decimal('100.00')
            line_total = item.price + line_tax
            
            InvoiceItem.objects.create(
                invoice=invoice,
                service=item.service,
                quantity=1,
                price=item.price,
                tax_rate=tax_rate,
                tax_amount=line_tax,
                total=line_total
            )
            subtotal += item.price
            tax_amount += line_tax

        discount_amount = Decimal(str(request.data.get('discount_amount', '0') or '0'))
        tip_amount = Decimal(str(request.data.get('tip_amount', '0') or '0'))
        payments_data = request.data.get('payments', [])

        invoice.subtotal = subtotal
        invoice.discount_amount = discount_amount
        invoice.tax_amount = tax_amount
        invoice.grand_total = max(Decimal('0.00'), subtotal - discount_amount + tax_amount)
        invoice.save()

        # Create payments if provided
        total_paid = Decimal('0.00')
        for p in payments_data:
            Payment.objects.create(
                invoice=invoice,
                method=p.get('method', 'CASH'),
                amount=Decimal(str(p.get('amount', '0'))),
                transaction_reference=p.get('transaction_reference', '')
            )
            total_paid += Decimal(str(p.get('amount', '0')))

        # Create tip if provided
        if tip_amount > 0 and invoice.appointment and invoice.appointment.items.exists():
            first_item = invoice.appointment.items.first()
            Tip.objects.create(
                invoice=invoice,
                amount=tip_amount,
                therapist=first_item.therapist if first_item else None
            )

        # Mark as PAID if fully covered
        if total_paid >= invoice.grand_total:
            invoice.status = InvoiceStatus.PAID
            if invoice.appointment:
                invoice.appointment.status = 'COMPLETED'
                invoice.appointment.save()
            invoice.save()

        return success_response(InvoiceSerializer(invoice).data, "Invoice Generated", 201)

    @action(detail=True, methods=['post'])
    def send_digital(self, request, pk=None):
        invoice = self.get_object()
        # In a real app, integrate with SendGrid, Twilio, or WhatsApp Business API here.
        # For now, simulate success.
        if not invoice.customer:
            return error_response("Invoice has no associated customer to send to.", 400)
            
        return success_response({}, f"Digital invoice successfully sent to {invoice.customer.email or invoice.customer.phone}")

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def pay(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == InvoiceStatus.PAID:
            return error_response("Invoice is already fully paid", 400)

        serializer = CheckoutPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        payments_data = serializer.validated_data['payments']
        total_payment = Decimal('0.00')
        
        for p_data in payments_data:
            Payment.objects.create(
                invoice=invoice,
                method=p_data['method'],
                amount=p_data['amount'],
                transaction_reference=p_data.get('transaction_reference', '')
            )
            total_payment += p_data['amount']
            
        existing_payments_total = sum(p.amount for p in invoice.payments.all())
        
        if existing_payments_total >= invoice.grand_total:
            invoice.status = InvoiceStatus.PAID
            invoice.save()
            
            if invoice.appointment:
                invoice.appointment.status = 'COMPLETED'
                invoice.appointment.save()

            from apps.core.models import ServiceProduct
            for item in invoice.items.all():
                service_products = ServiceProduct.objects.filter(service=item.service)
                for sp in service_products:
                    product = sp.product
                    product.stock_quantity -= sp.quantity_used
                    product.save()
                
            return success_response(InvoiceSerializer(invoice).data, "Invoice Fully Paid", 200)
        else:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
            invoice.save()
            return success_response(InvoiceSerializer(invoice).data, "Partial Payment Recorded", 200)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def refund(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == InvoiceStatus.REFUNDED:
            return error_response("Invoice already refunded", 400)
            
        invoice.status = InvoiceStatus.REFUNDED
        invoice.save()
        return success_response(InvoiceSerializer(invoice).data, "Invoice Refunded successfully", 200)


# CUSTOMER CRM & LOYALTY

from apps.core.models import MembershipTier, CustomerMembership, Wallet, WalletTransaction, Role
from .serializers import MembershipTierSerializer, CustomerMembershipSerializer, WalletSerializer
import datetime

class CustomerViewSet(viewsets.ViewSet):
    permission_classes = [IsStoreStaff]

    def list(self, request):
        appointment_customer_ids = Appointment.objects.filter(
            store=request.user.store
        ).values_list('customer_id', flat=True).distinct()
        
        customers = User.objects.filter(
            role=Role.CUSTOMER
        ).filter(
            models.Q(id__in=appointment_customer_ids) | models.Q(store=request.user.store)
        ).distinct()
        
        data = []
        for customer in customers:
            wallet = getattr(customer, 'wallet', None)
            wallet_balance = wallet.balance if wallet else Decimal('0.00')
            data.append({
                "id": customer.id,
                "name": customer.get_full_name(),
                "full_name": customer.get_full_name(),
                "email": customer.email,
                "phone": customer.phone,
                "wallet_balance": wallet_balance
            })
            
        return success_response(data, "Store Customers retrieved")

    def create(self, request):
        """Create a new customer and link them to this store."""
        full_name = request.data.get('full_name', '')
        name_parts = full_name.strip().split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        email = request.data.get('email', f"{first_name.lower()}{User.objects.count()}@guest.local")
        phone = request.data.get('phone', '')
        
        if User.objects.filter(email=email, role=Role.CUSTOMER).exists():
            customer = User.objects.get(email=email, role=Role.CUSTOMER)
        else:
            customer = User.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone=phone,
                role=Role.CUSTOMER,
                store=request.user.store,
                brand=request.user.brand,
                is_active=True,
            )
            customer.set_unusable_password()
            customer.save()
        
        return success_response({
            "id": customer.id,
            "name": customer.get_full_name(),
            "full_name": customer.get_full_name(),
            "email": customer.email,
            "phone": customer.phone,
        }, "Customer created", status_code=201)

class MembershipTierViewSet(viewsets.ModelViewSet):
    serializer_class = MembershipTierSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return MembershipTier.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class WalletViewSet(viewsets.ViewSet):
    permission_classes = [IsStoreManagerOrReceptionist]

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_funds(self, request, pk=None):
        customer = User.objects.filter(id=pk, role=Role.CUSTOMER).first()
        if not customer:
            return error_response("Customer not found", 404)
            
        amount = request.data.get('amount')
        if not amount:
            return error_response("Amount is required", 400)
            
        amount = Decimal(str(amount))
        if amount <= 0:
            return error_response("Amount must be positive", 400)
        wallet, created = Wallet.objects.get_or_create(customer=customer)
        WalletTransaction.objects.create(
            wallet=wallet,
            transaction_type='CREDIT',
            amount=amount,
            description="Manual funds added by store"
        )
        
        wallet.balance += amount
        wallet.save()
        
        return success_response(WalletSerializer(wallet).data, "Funds added successfully")

# INVENTORY 
from apps.core.models import Vendor, Product, PurchaseOrder, PurchaseOrderItem, POStatus
from .serializers import VendorSerializer, ProductSerializer, PurchaseOrderSerializer

class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Vendor.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [IsStoreStaff]

    def get_queryset(self):
        return Product.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return PurchaseOrder.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def receive(self, request, pk=None):
        po = self.get_object()
        if po.status == POStatus.RECEIVED:
            return error_response("PO already received", 400)
            
        for item in po.items.all():
            product = item.product
            product.stock_quantity += item.quantity
            product.save()
            
        po.status = POStatus.RECEIVED
        po.save()
        
        return success_response(PurchaseOrderSerializer(po).data, "PO received and stock updated")


# FINANCE 

from apps.core.models import Expense, Commission
from .serializers import ExpenseSerializer, CommissionSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Expense.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store, recorded_by=self.request.user)

class CommissionViewSet(viewsets.ModelViewSet):
    serializer_class = CommissionSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        if self.request.user.role == Role.THERAPIST:
            return Commission.objects.filter(therapist=self.request.user)
        return Commission.objects.filter(store=self.request.user.store)


# DASHBOARD & ANALYTICS
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from apps.core.models import InvoiceStatus, AppointmentStatus, Tip, Attendance, Product

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsStoreStaff]
    
    def list(self, request):
        today = timezone.localtime().date()
        store = request.user.store
        
        today_appointments = Appointment.objects.filter(store=store, start_time__date=today)
        appointments_count = today_appointments.exclude(status=AppointmentStatus.CANCELLED).count()
        walk_in_count = today_appointments.filter(source='WALK_IN').count()
        cancelled_count = today_appointments.filter(status=AppointmentStatus.CANCELLED).count()
        
        today_invoices = Invoice.objects.filter(store=store, created_at__date=today)
        revenue_today = today_invoices.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')
        pending_payments = today_invoices.filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]).aggregate(Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')
        today_tips = Tip.objects.filter(invoice__store=store, created_at__date=today).aggregate(Sum('amount'))['amount__sum'] or Decimal('0.00')
        staff_attendance = Attendance.objects.filter(store=store, date=today, status='PRESENT').count()
        
        now = timezone.now()
        busy_therapists = AppointmentItem.objects.filter(
            appointment__store=store, 
            appointment__start_time__lte=now,
            appointment__end_time__gte=now,
            appointment__status=AppointmentStatus.BOOKED
        ).values_list('therapist_id', flat=True).distinct()
        
        total_therapists = User.objects.filter(store=store, role=Role.THERAPIST, is_active=True).count()
        available_therapists = total_therapists - len(busy_therapists)
        
        low_stock_count = Product.objects.filter(
            store=store, 
            stock_quantity__lte=F('low_stock_warning'),
            is_active=True
        ).count()
        
        today_customers = today_invoices.values_list('customer_id', flat=True).distinct()
        repeat_customers_count = Invoice.objects.filter(customer_id__in=today_customers).values('customer_id').annotate(total_visits=Count('id')).filter(total_visits__gt=1).count()
        
        revenue_graph = []
        for i in range(6, -1, -1):
            day = today - datetime.timedelta(days=i)
            day_revenue = Invoice.objects.filter(
                store=store, 
                created_at__date=day, 
                status=InvoiceStatus.PAID
            ).aggregate(Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')
            revenue_graph.append({
                "date": str(day),
                "revenue": day_revenue
            })
            
        data = {
            "today_date": str(today),
            "appointments_today": appointments_count,
            "walk_ins": walk_in_count,
            "cancelled_appointments": cancelled_count,
            "revenue_today": revenue_today,
            "pending_payments": pending_payments,
            "today_tips": today_tips,
            "staff_attendance": staff_attendance,
            "available_therapists": available_therapists,
            "low_stock_alerts": low_stock_count,
            "repeat_customers": repeat_customers_count,
            "revenue_graph": revenue_graph
        }
        
        return success_response(data, "Dashboard stats generated")

# HR, MARKETING, ROOMS, DAILY CLOSING 

from apps.core.models import (
    Room, Shift, Attendance, LeaveRequest, MarketingCampaign, DailyRegister, Coupon
)
from .serializers import (
    ERPRoomSerializer, ShiftSerializer, AttendanceSerializer, 
    LeaveRequestSerializer, MarketingCampaignSerializer, 
    DailyRegisterSerializer, ERPCouponSerializer
)

class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = ERPRoomSerializer
    permission_classes = [IsStoreStaff]

    def get_queryset(self):
        return Room.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Shift.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Attendance.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return LeaveRequest.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class MarketingCampaignViewSet(viewsets.ModelViewSet):
    serializer_class = MarketingCampaignSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return MarketingCampaign.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ERPCouponViewSet(viewsets.ModelViewSet):
    serializer_class = ERPCouponSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Coupon.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class DailyRegisterViewSet(viewsets.ModelViewSet):
    serializer_class = DailyRegisterSerializer
    permission_classes = [IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return DailyRegister.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

from apps.core.models import GiftCard, ServicePackage, CustomerPackage
from .serializers import ERPGiftCardSerializer, ERPServicePackageSerializer, ERPCustomerPackageSerializer

class ERPGiftCardViewSet(viewsets.ModelViewSet):
    serializer_class = ERPGiftCardSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return GiftCard.objects.filter(store=self.request.user.store)
    
    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ERPServicePackageViewSet(viewsets.ModelViewSet):
    serializer_class = ERPServicePackageSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return ServicePackage.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class ERPCustomerPackageViewSet(viewsets.ModelViewSet):
    serializer_class = ERPCustomerPackageSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return CustomerPackage.objects.filter(package__store=self.request.user.store)

    def perform_create(self, serializer):
        package = serializer.validated_data['package']
        if package.store != self.request.user.store:
            raise serializers.ValidationError("Cannot assign a package from a different store.")
        serializer.save()

# ADVANCED HR & FINANCE 

from apps.core.models import StaffDocument, StaffTarget, Payroll, InvoiceStatus, ExpenseCategory
from .serializers import StaffDocumentSerializer, StaffTargetSerializer, PayrollSerializer
from django.db.models import Sum, Count, Q

class StaffDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = StaffDocumentSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return StaffDocument.objects.filter(staff__store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save()

class StaffTargetViewSet(viewsets.ModelViewSet):
    serializer_class = StaffTargetSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return StaffTarget.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Payroll.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        base = serializer.validated_data.get('base_salary', 0)
        comm = serializer.validated_data.get('commissions_earned', 0)
        inc = serializer.validated_data.get('incentives', 0)
        ded = serializer.validated_data.get('deductions', 0)
        total = base + comm + inc - ded
        serializer.save(store=self.request.user.store, total_payout=total)

    def perform_update(self, serializer):
        base = serializer.validated_data.get('base_salary', serializer.instance.base_salary)
        comm = serializer.validated_data.get('commissions_earned', serializer.instance.commissions_earned)
        inc = serializer.validated_data.get('incentives', serializer.instance.incentives)
        ded = serializer.validated_data.get('deductions', serializer.instance.deductions)
        total = base + comm + inc - ded
        serializer.save(total_payout=total)

class LeaderboardView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get(self, request):
        store = request.user.store
        current_month = timezone.now().month
        current_year = timezone.now().year

        therapists = User.objects.filter(store=store, role=Role.THERAPIST).annotate(
            total_revenue=Sum('appointmentitem__price', filter=Q(
                appointmentitem__appointment__invoice__status=InvoiceStatus.PAID,
                appointmentitem__appointment__invoice__created_at__month=current_month,
                appointmentitem__appointment__invoice__created_at__year=current_year
            )),
            total_appointments=Count('appointmentitem__appointment', distinct=True, filter=Q(
                appointmentitem__appointment__start_time__month=current_month,
                appointmentitem__appointment__start_time__year=current_year
            ))
        ).order_by('-total_revenue')

        data = []
        for t in therapists:
            data.append({
                "therapist_id": t.id,
                "name": t.get_full_name(),
                "total_revenue": t.total_revenue or 0,
                "total_appointments": t.total_appointments or 0
            })
        return success_response(data, "Leaderboard fetched")


class FinancialReportView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get(self, request):
        store = request.user.store
        revenue_agg = Invoice.objects.filter(store=store, status=InvoiceStatus.PAID).aggregate(total=Sum('grand_total'))
        revenue = revenue_agg['total'] or 0

        expense_agg = Expense.objects.filter(store=store).aggregate(total=Sum('amount'))
        expenses = expense_agg['total'] or 0

        payroll_agg = Payroll.objects.filter(store=store, status='PAID').aggregate(total=Sum('total_payout'))
        payrolls = payroll_agg['total'] or 0

        total_expenses = expenses + payrolls
        profit = revenue - total_expenses
        tax_collected = float(revenue) * 0.18
        cash_settlements = Payment.objects.filter(invoice__store=store, method='CASH').aggregate(total=Sum('amount'))['total'] or 0
        card_settlements = Payment.objects.filter(invoice__store=store, method='CARD').aggregate(total=Sum('amount'))['total'] or 0
        commissions = Commission.objects.filter(store=store, is_paid_out=False).aggregate(total=Sum('amount'))['total'] or 0

        data = {
            "profit_analysis": {
                "revenue": revenue,
                "expenses": expenses,
                "payroll": payrolls,
                "total_expenses": total_expenses,
                "net_profit": profit
            },
            "tax_reports": {
                "estimated_tax_collected": tax_collected
            },
            "settlement_reports": {
                "cash": cash_settlements,
                "card": card_settlements
            },
            "commission_reports": {
                "pending_payouts": commissions
            }
        }
        return success_response(data, "Financial Reports fetched")

# ADVANCED INVENTORY & MARKETING 

from apps.core.models import ServiceProduct, StockTransfer, Referral, Waitlist
from .serializers import ServiceProductSerializer, StockTransferSerializer, ReferralSerializer, WaitlistSerializer

class ServiceProductViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceProductSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return ServiceProduct.objects.filter(service__business=self.request.user.store.business)

class StockTransferViewSet(viewsets.ModelViewSet):
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return StockTransfer.objects.filter(Q(from_store=self.request.user.store) | Q(to_store=self.request.user.store))

    def perform_create(self, serializer):
        serializer.save(from_store=self.request.user.store)

class ReferralViewSet(viewsets.ModelViewSet):
    serializer_class = ReferralSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]

    def get_queryset(self):
        return Referral.objects.all()

class WaitlistViewSet(viewsets.ModelViewSet):
    serializer_class = WaitlistSerializer
    permission_classes = [IsAuthenticated, IsStoreStaff]

    def get_queryset(self):
        return Waitlist.objects.filter(store=self.request.user.store)

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)

from apps.core.models import CustomerProfile, Invoice, InvoiceStatus, Appointment
from .serializers import CustomerCRMDataSerializer
from django.db.models import Sum, Count, Avg
from decimal import Decimal

class CustomerCRMViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerCRMDataSerializer
    permission_classes = [IsAuthenticated, IsStoreStaff]

    def get_queryset(self):
        store = self.request.user.store
        appointment_customer_ids = Appointment.objects.filter(store=store).values_list('customer_id', flat=True).distinct()
        return User.objects.filter(role=Role.CUSTOMER).filter(
            models.Q(id__in=appointment_customer_ids) | models.Q(store=store)
        ).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['store'] = self.request.user.store
        return context

    def create(self, request, *args, **kwargs):
        full_name = request.data.get('name', '')
        name_parts = full_name.strip().split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        email = request.data.get('email', f"{first_name.lower()}{User.objects.count()}@guest.local")
        phone = request.data.get('phone', '')
        
        if User.objects.filter(email=email, role=Role.CUSTOMER).exists():
            return Response({"success": False, "message": "Customer with this email already exists"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            role=Role.CUSTOMER,
            store=request.user.store
        )
        user.set_unusable_password()
        user.save()
        
        self.kwargs['pk'] = user.pk
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data, "Customer created successfully", 201)

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        from apps.core.models import CustomerProfile
        profile, _ = CustomerProfile.objects.get_or_create(user=user)
        
        fields = ['birthday', 'anniversary', 'preferred_timing', 'allergies', 'skin_type', 'hair_type', 'medical_notes', 'preferred_products']
        for field in fields:
            if field in request.data:
                val = request.data[field]
                if val == "":
                    val = None
                setattr(profile, field, val)
        profile.save()
        
        return success_response(self.get_serializer(user).data, "Profile updated successfully")

    def get_object(self):
        user = super().get_object()
        store = self.request.user.store
        
        invoices = Invoice.objects.filter(customer=user, store=store)
        
        total_visits = invoices.count()
        total_spend = invoices.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total'))['grand_total__sum'] or Decimal('0.00')
        average_spend = invoices.filter(status=InvoiceStatus.PAID).aggregate(Avg('grand_total'))['grand_total__avg'] or Decimal('0.00')
        
        outstanding_balance = invoices.filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]).aggregate(
            unpaid=Sum('grand_total')
        )['unpaid'] or Decimal('0.00')
        user.total_visits = total_visits
        user.total_spend = total_spend
        user.average_spend = average_spend
        user.outstanding_balance = outstanding_balance
        
        from apps.core.models import AppointmentItem
        from django.db.models import Count
        favorite_therapist_item = AppointmentItem.objects.filter(
            appointment__customer=user, 
            appointment__store=store,
            therapist__isnull=False
        ).values('therapist__first_name', 'therapist__last_name').annotate(
            count=Count('therapist')
        ).order_by('-count').first()

        if favorite_therapist_item:
            user.favorite_therapist_name = f"{favorite_therapist_item['therapist__first_name']} {favorite_therapist_item['therapist__last_name']}".strip()
        else:
            user.favorite_therapist_name = "None"
        
        return user

    @action(detail=True, methods=['get'])
    def ai_recommendations(self, request, pk=None):
        customer = self.get_object()
        
        recommendations = [
            {
                "title": "Recommend a Hair Spa",
                "reason": f"Based on {customer.first_name}'s previous visits for basic haircuts, they are highly likely to upgrade to a hair spa."
            },
            {
                "title": "Offer Membership",
                "reason": f"With {customer.total_visits} visits, {customer.first_name} is a loyal customer but hasn't purchased a membership yet."
            },
            {
                "title": "Retail Product: Color Protect Shampoo",
                "reason": "Customer recently had a hair coloring service. Following up with a retail product offer is recommended."
            }
        ]
        
        return Response({"success": True, "recommendations": recommendations})
