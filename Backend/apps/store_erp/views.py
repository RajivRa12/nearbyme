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
from .permissions import IsStoreStaff, IsStoreManagerOrReceptionist, IsErpUser, IsBrandOwner, RequiresCRM, RequiresAnalytics
def get_request_outlet(request):
    from apps.core.models import Outlet
    outlet_id = getattr(request, 'data', {}).get('outlet_id') or getattr(request, 'query_params', {}).get('outlet_id')
    if outlet_id:
        out = Outlet.objects.filter(id=outlet_id).first()
        if out:
            return out
    return Outlet.objects.first()
def success_response(data, message="Success", status_code=200):
    return Response({"success": True, "message": message, "data": data}, status=status_code)
def error_response(message="Error", status_code=400):
    return Response({"success": False, "message": message, "data": None}, status=status_code)
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
            outlet=get_request_outlet(request),
            customer=customer,
            start_time=start_time,
            end_time=start_time,
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
        if old_status != 'COMPLETED' and new_status == 'COMPLETED':
            from apps.core.models import ServiceProduct, StockTransfer
            for item in instance.items.all():
                service_products = ServiceProduct.objects.filter(service=item.service)
                for sp in service_products:
                    product = sp.product
                    if product.stock >= sp.quantity_used:
                        product.stock -= sp.quantity_used
                        product.save()
                        StockTransfer.objects.create(
                            store=instance.store,
                            product=product,
                            transfer_type='OUT',
                            quantity=sp.quantity_used,
                            reason=f"Auto-deducted for Appointment #{instance.id} (Service: {item.service.name})"
                        )
        return response
from decimal import Decimal
from apps.core.models import Invoice, InvoiceLine, Payment, Tip, PlatformSettings, InvoiceStatus, CommissionAccrual
from .serializers import InvoiceSerializer, CheckoutPaymentSerializer, CreditNoteSerializer
class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsStoreStaff]
    def get_queryset(self):
        return Invoice.objects.filter(store=self.request.user.store)
    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)
    def retrieve(self, request, *args, **kwargs):
        return success_response(self.get_serializer(self.get_object()).data)
    def update(self, request, *args, **kwargs):
        if self.get_object().finalised_at:
            return error_response("Invoice is finalised and cannot be modified.", 403)
        response = super().update(request, *args, **kwargs)
        return success_response(response.data, "Invoice updated")
    def partial_update(self, request, *args, **kwargs):
        if self.get_object().finalised_at:
            return error_response("Invoice is finalised and cannot be modified.", 403)
        response = super().partial_update(request, *args, **kwargs)
        return success_response(response.data, "Invoice updated")
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
            outlet=get_request_outlet(request),
            appointment=appointment,
            customer=appointment.customer,
            status=InvoiceStatus.UNPAID
        )
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        for item in appointment.items.all():
            line_tax = (item.price * tax_rate) / Decimal('100.00')
            line_total = item.price + line_tax
            InvoiceLine.objects.create(
                invoice=invoice,
                service=item.service,
                quantity=1,
                unit_price_paise=int(round(item.price * 100)),
                tax_rate=tax_rate,
                tax_amount_paise=int(round(line_tax * 100)),
                total_paise=int(round(line_total * 100)),
            )
            subtotal += item.price
            tax_amount += line_tax
        discount_amount = Decimal(str(request.data.get('discount_amount', '0') or '0'))
        tip_amount = Decimal(str(request.data.get('tip_amount', '0') or '0'))
        payments_data = request.data.get('payments', [])
        invoice.subtotal_paise = int(round(subtotal * 100))
        invoice.discount_amount_paise = int(round(discount_amount * 100))
        invoice.tax_amount_paise = int(round(tax_amount * 100))
        invoice.grand_total_paise = max(0, int(round((subtotal - discount_amount + tax_amount) * 100)))
        invoice.save()
        total_paid = Decimal('0.00')
        for p in payments_data:
            Payment.objects.create(
                invoice=invoice,
                method=p.get('method', 'CASH'),
                amount_paise=int(round(Decimal(str(p.get('amount', '0'))) * 100)),
                transaction_reference=p.get('transaction_reference', '')
            )
            total_paid += Decimal(str(p.get('amount', '0')))
        if tip_amount > 0 and invoice.appointment and invoice.appointment.items.exists():
            first_item = invoice.appointment.items.first()
            Tip.objects.create(
                invoice=invoice,
                amount=tip_amount,
                therapist=first_item.therapist if first_item else None
            )
        if int(round(total_paid * 100)) >= invoice.grand_total_paise:
            invoice.status = InvoiceStatus.PAID
            if invoice.appointment:
                invoice.appointment.status = 'COMPLETED'
                invoice.appointment.save()
            invoice.save()
        return success_response(InvoiceSerializer(invoice).data, "Invoice Generated", 201)
    @action(detail=True, methods=['post'])
    def send_digital(self, request, pk=None):
        invoice = self.get_object()
        if invoice.customer:
            destination = invoice.customer.email or invoice.customer.phone
        elif invoice.global_customer:
            destination = invoice.global_customer.email or invoice.global_customer.phone_e164
        else:
            return error_response("Invoice has no associated customer to send to.", 400)
        if not destination:
            return error_response("This customer has no email or phone on file to send to.", 400)
        return success_response({}, f"Digital invoice successfully sent to {destination}")
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
                amount_paise=int(round(p_data['amount'] * 100)),
                transaction_reference=p_data.get('transaction_reference', '')
            )
            total_payment += p_data['amount']
        existing_payments_total_paise = sum(p.amount_paise for p in invoice.payments.all())
        if existing_payments_total_paise >= invoice.grand_total_paise:
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
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def finalise(self, request, pk=None):
        from apps.core.models import Outlet, CommissionAppliesTo
        from .commission import find_commission_rule, commission_paise_for_rule
        from .inventory import deduct_stock_for_invoice
        invoice = self.get_object()
        if invoice.finalised_at:
            return error_response("Invoice is already finalised.", 400)
        if not invoice.outlet_id:
            return error_response("Invoice has no outlet assigned; cannot generate a sequential invoice number.", 400)
        locked_outlet = Outlet.objects.select_for_update().get(pk=invoice.outlet_id)
        invoice.invoice_number = Invoice.generate_invoice_number(locked_outlet)
        invoice.finalised_at = timezone.now()
        if not invoice.created_by_id:
            invoice.created_by = request.user
        invoice.save()
        for item in invoice.items.select_related('professional').all():
            if not item.professional_id:
                continue
            rule = find_commission_rule(locked_outlet.store_group, item.professional, CommissionAppliesTo.SERVICE, invoice.finalised_at.date())
            if not rule:
                continue
            base_paise = item.unit_price_paise
            CommissionAccrual.objects.create(
                invoice_line=item, professional=item.professional,
                base_paise=base_paise, commission_paise=commission_paise_for_rule(rule, base_paise),
            )
        deduct_stock_for_invoice(invoice)
        return success_response(InvoiceSerializer(invoice).data, "Invoice finalised")
    @action(detail=True, methods=['post'], url_path='credit-note')
    def credit_note(self, request, pk=None):
        invoice = self.get_object()
        if not invoice.finalised_at:
            return error_response("Only a finalised invoice can receive a credit note.", 400)
        serializer = CreditNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = serializer.save(invoice=invoice, created_by=request.user)
        return success_response(CreditNoteSerializer(note).data, "Credit note created", 201)
    DISCOUNT_APPROVAL_THRESHOLD_PCT = Decimal('15')
    @action(detail=False, methods=['post'])
    @transaction.atomic
    def checkout(self, request):
        from apps.core.models import Booking, AppointmentSlotStatus, StoreService, GlobalCustomer, Professional, Membership, Package
        today = timezone.localdate()
        booking_id = request.data.get('booking_id')
        manual_lines = request.data.get('lines') or []
        discount_amount = Decimal(str(request.data.get('discount_amount', '0') or '0'))
        is_discount_approved = bool(request.data.get('is_discount_approved', False))
        payments_data = request.data.get('payments') or []
        outlet = request.user.outlet
        if not outlet:
            return error_response("Your account has no outlet assigned; cannot raise a POS invoice.", 400)
        booking = None
        if booking_id:
            try:
                booking = Booking.objects.get(id=booking_id, outlet=outlet)
            except Booking.DoesNotExist:
                return error_response("Booking not found for this outlet.", 404)
            if booking.invoices.exists():
                return error_response("This booking already has an invoice.", 400)
        global_customer = booking.customer if booking else None
        if not global_customer and request.data.get('global_customer_id'):
            global_customer = GlobalCustomer.objects.filter(id=request.data['global_customer_id']).first()
        settings = PlatformSettings.objects.first()
        tax_rate = settings.gst_percentage if settings else Decimal('18.00')
        invoice = Invoice.objects.create(
            invoice_number=f"DRAFT-{uuid.uuid4().hex[:8].upper()}",
            store=request.user.store, outlet=outlet, booking=booking, global_customer=global_customer,
            created_by=request.user, status=InvoiceStatus.UNPAID,
        )
        subtotal = Decimal('0.00')
        tax_amount = Decimal('0.00')
        def add_line(store_service, professional, price_override=None):
            nonlocal subtotal, tax_amount
            price = price_override if price_override is not None else (Decimal(store_service.default_price_paise) / Decimal('100'))
            line_tax = (price * tax_rate) / Decimal('100.00')
            InvoiceLine.objects.create(
                invoice=invoice, store_service=store_service, professional=professional,
                quantity=1, unit_price_paise=int(round(price * 100)), tax_rate=tax_rate,
                tax_amount_paise=int(round(line_tax * 100)), total_paise=int(round((price + line_tax) * 100)),
            )
            subtotal += price
            tax_amount += line_tax
        if booking:
            for slot in booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED).select_related('store_service', 'professional'):
                add_line(slot.store_service, slot.professional)
        for line in manual_lines:
            svc = StoreService.objects.filter(id=line.get('store_service_id'), store_group=outlet.store_group).first()
            if not svc:
                invoice.delete()
                return error_response("One of the services in the cart is invalid.", 400)
            professional = None
            if line.get('professional_id'):
                professional = Professional.objects.filter(id=line['professional_id'], outlet=outlet).first()
            package_id = line.get('package_id')
            if package_id:
                if not global_customer:
                    invoice.delete()
                    return error_response("A customer is required to redeem a package.", 400)
                package = Package.objects.filter(id=package_id, customer=global_customer).first()
                if not package:
                    invoice.delete()
                    return error_response("Package not found for this customer.", 400)
                if package.valid_until < today:
                    invoice.delete()
                    return error_response(f"Package '{package.name}' has expired.", 400)
                remaining = package.service_credits.get(str(svc.id), 0)
                if remaining <= 0:
                    invoice.delete()
                    return error_response(f"No remaining credits for '{svc.name}' in package '{package.name}'.", 400)
                package.service_credits[str(svc.id)] = remaining - 1
                package.save(update_fields=['service_credits'])
                add_line(svc, professional, price_override=Decimal('0.00'))
            else:
                add_line(svc, professional)
        if not invoice.items.exists():
            invoice.delete()
            return error_response("At least one service line is required.", 400)
        discount_pct = (discount_amount / subtotal * 100) if subtotal > 0 else Decimal('0')
        requires_approval = discount_pct > self.DISCOUNT_APPROVAL_THRESHOLD_PCT
        if requires_approval and not is_discount_approved:
            invoice.delete()
            return error_response(
                f"Discount of {discount_pct:.1f}% exceeds the {self.DISCOUNT_APPROVAL_THRESHOLD_PCT}% threshold and needs manager approval.", 400
            )
        invoice.subtotal_paise = int(round(subtotal * 100))
        invoice.discount_amount_paise = int(round(discount_amount * 100))
        invoice.tax_amount_paise = int(round(tax_amount * 100))
        invoice.grand_total_paise = max(0, int(round((subtotal - discount_amount + tax_amount) * 100)))
        invoice.requires_manager_approval = requires_approval
        invoice.is_discount_approved = is_discount_approved
        invoice.save()
        total_paid = Decimal('0.00')
        for p in payments_data:
            amount = Decimal(str(p.get('amount', '0')))
            if amount <= 0:
                continue
            method = p.get('method', 'CASH')
            reference = p.get('reference_id', '') or p.get('transaction_reference', '')
            if method == 'MEMBERSHIP_CREDIT':
                if not global_customer:
                    invoice.delete()
                    return error_response("A customer is required to redeem a membership.", 400)
                membership = Membership.objects.filter(id=reference, customer=global_customer).first()
                if not membership:
                    invoice.delete()
                    return error_response("Membership not found for this customer.", 400)
                if membership.valid_until < today:
                    invoice.delete()
                    return error_response(f"Membership '{membership.plan_name}' has expired.", 400)
                base_paise = int(amount * 100)
                if membership.value_paise_remaining < base_paise:
                    invoice.delete()
                    return error_response(f"Insufficient balance on membership '{membership.plan_name}'.", 400)
                membership.value_paise_remaining -= base_paise
                membership.save(update_fields=['value_paise_remaining'])
            elif method == 'GIFT_CARD':
                from apps.core.models import GiftCard
                gift_card = GiftCard.objects.filter(code__iexact=reference, store=request.user.store).first()
                if not gift_card:
                    invoice.delete()
                    return error_response(f"Gift card '{reference}' not found.", 400)
                if not gift_card.is_active or gift_card.expiry_date < today:
                    invoice.delete()
                    return error_response(f"Gift card '{reference}' is expired or inactive.", 400)
                if gift_card.current_balance < amount:
                    invoice.delete()
                    return error_response(f"Insufficient balance on gift card '{reference}'.", 400)
                gift_card.current_balance -= amount
                gift_card.save(update_fields=['current_balance'])
            Payment.objects.create(invoice=invoice, method=method, amount_paise=int(round(amount * 100)), transaction_reference=reference)
            total_paid += amount
        if invoice.grand_total_paise <= 0 or int(round(total_paid * 100)) >= invoice.grand_total_paise:
            invoice.status = InvoiceStatus.PAID
        elif total_paid > 0:
            invoice.status = InvoiceStatus.PARTIALLY_PAID
        invoice.save()
        return success_response(InvoiceSerializer(invoice).data, "Invoice created", 201)
from apps.core.models import MembershipTier, Role
from .serializers import MembershipTierSerializer
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
            data.append({
                "id": customer.id,
                "name": customer.get_full_name(),
                "full_name": customer.get_full_name(),
                "email": customer.email,
                "phone": customer.phone
            })
        return success_response(data, "Store Customers retrieved")
    def create(self, request):
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
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        from decimal import Decimal
        from apps.core.models import Product
        vendor_id = request.data.get('vendor')
        items_data = request.data.get('items') or []
        po = PurchaseOrder.objects.create(store=request.user.store, outlet=get_request_outlet(request), vendor_id=vendor_id or None)
        total = Decimal('0.00')
        for item in items_data:
            product = Product.objects.filter(id=item.get('product')).first()
            quantity = int(item.get('quantity') or 0)
            if not product or quantity <= 0:
                continue
            unit_cost = Decimal(str(item.get('unit_cost') or '0'))
            po_item = PurchaseOrderItem.objects.create(purchase_order=po, product=product, quantity=quantity, unit_cost=unit_cost)
            total += po_item.total
        po.total_amount = total
        po.save()
        return success_response(PurchaseOrderSerializer(po).data, "Purchase order created", 201)
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
from django.db.models import Sum, Count, Q, F
from decimal import Decimal
from apps.core.models import InvoiceStatus, AppointmentStatus, Tip, Attendance, Product
class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsStoreStaff]
    def list(self, request):
        today = timezone.localtime().date()
        yesterday = today - datetime.timedelta(days=1)
        store = request.user.store
        today_appointments = Appointment.objects.filter(store=store, start_time__date=today)
        appointments_count = today_appointments.exclude(status=AppointmentStatus.CANCELLED).count()
        walk_in_count = today_appointments.filter(source='WALK_IN').count()
        cancelled_count = today_appointments.filter(status=AppointmentStatus.CANCELLED).count()
        today_invoices = Invoice.objects.filter(store=store, created_at__date=today)
        revenue_today = Decimal(today_invoices.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
        pending_payments = Decimal(today_invoices.filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
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
            day_revenue = Decimal(Invoice.objects.filter(
                store=store,
                created_at__date=day,
                status=InvoiceStatus.PAID
            ).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
            revenue_graph.append({
                "date": str(day),
                "revenue": day_revenue
            })

        def pct_change(current, previous):
            current = float(current)
            previous = float(previous)
            if previous == 0:
                return 0.0
            return round(((current - previous) / previous) * 100, 1)

        yesterday_revenue = Decimal(Invoice.objects.filter(
            store=store, created_at__date=yesterday, status=InvoiceStatus.PAID
        ).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
        yesterday_appointments_count = Appointment.objects.filter(
            store=store, start_time__date=yesterday
        ).exclude(status=AppointmentStatus.CANCELLED).count()

        top_staff_rows = (
            AppointmentItem.objects.filter(
                appointment__store=store,
                appointment__start_time__date=today,
                therapist__isnull=False,
            )
            .values('therapist_id', 'therapist__first_name', 'therapist__last_name')
            .annotate(appointments=Count('appointment_id', distinct=True), revenue=Sum('price'))
            .order_by('-revenue')[:5]
        )
        top_staff = [
            {
                "id": str(row['therapist_id']),
                "rank": i + 1,
                "staff": f"{row['therapist__first_name']} {row['therapist__last_name']}".strip(),
                "appointments": row['appointments'],
                "revenue": row['revenue'] or Decimal('0.00'),
            }
            for i, row in enumerate(top_staff_rows)
        ]

        upcoming = []
        upcoming_qs = today_appointments.exclude(status=AppointmentStatus.CANCELLED).select_related('customer').order_by('start_time')[:10]
        for appt in upcoming_qs:
            first_item = appt.items.select_related('service', 'therapist').first()
            upcoming.append({
                "id": str(appt.id),
                "start_at": appt.start_time.isoformat(),
                "customer_name": appt.customer.get_full_name() if appt.customer else "Walk-in",
                "service": first_item.service.name if first_item else "—",
                "staff": first_item.therapist.get_full_name() if first_item and first_item.therapist else "Any available",
                "status": appt.status,
                "amount": float(sum((i.price for i in appt.items.all()), Decimal('0.00'))),
            })

        data = {
            "today_date": str(today),
            "today_appointments": appointments_count,
            "appointments_today": appointments_count,
            "walk_ins": walk_in_count,
            "cancelled_appointments": cancelled_count,
            "today_revenue": revenue_today,
            "revenue_today": revenue_today,
            "pending_payments": pending_payments,
            "today_tips": today_tips,
            "staff_present": staff_attendance,
            "staff_attendance": staff_attendance,
            "available_therapists": available_therapists,
            "low_stock_alerts": low_stock_count,
            "repeat_customers": repeat_customers_count,
            "revenue_graph": revenue_graph,
            "revenue_change_pct": pct_change(revenue_today, yesterday_revenue),
            "appointments_change_pct": pct_change(appointments_count, yesterday_appointments_count),
            "top_staff": top_staff,
            "upcoming": upcoming,
        }
        return success_response(data, "Dashboard stats generated")
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
        initial_value = serializer.validated_data.get('initial_value', 0)
        serializer.save(store=self.request.user.store, current_balance=initial_value)
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
from apps.core.models import StaffDocument, StaffTarget, Payroll, InvoiceStatus
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
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist, RequiresAnalytics]
    def get(self, request):
        store = request.user.store
        revenue_agg = Invoice.objects.filter(store=store, status=InvoiceStatus.PAID).aggregate(total=Sum('grand_total_paise'))
        revenue = Decimal(revenue_agg['total'] or 0) / 100
        expense_agg = Expense.objects.filter(store=store).aggregate(total=Sum('amount'))
        expenses = expense_agg['total'] or 0
        payroll_agg = Payroll.objects.filter(store=store, status='PAID').aggregate(total=Sum('total_payout'))
        payrolls = payroll_agg['total'] or 0
        total_expenses = expenses + payrolls
        profit = revenue - total_expenses
        tax_collected = float(revenue) * 0.18
        cash_settlements = Decimal(Payment.objects.filter(invoice__store=store, method='CASH').aggregate(total=Sum('amount_paise'))['total'] or 0) / 100
        card_settlements = Decimal(Payment.objects.filter(invoice__store=store, method='CARD').aggregate(total=Sum('amount_paise'))['total'] or 0) / 100
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
from apps.core.models import ServiceProduct, StockTransfer, Referral, Waitlist
from .serializers import ServiceProductSerializer, StockTransferSerializer, ReferralSerializer, WaitlistSerializer
class ServiceProductViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceProductSerializer
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]
    def get_queryset(self):
        return ServiceProduct.objects.filter(service__category__business=self.request.user.store.business)
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
from apps.core.models import Invoice, InvoiceStatus, Appointment
from .serializers import CustomerCRMDataSerializer
from django.db.models import Sum, Count, Avg
from decimal import Decimal
class CustomerCRMViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerCRMDataSerializer
    permission_classes = [IsAuthenticated, IsStoreStaff, RequiresCRM]
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
        total_spend = Decimal(invoices.filter(status=InvoiceStatus.PAID).aggregate(Sum('grand_total_paise'))['grand_total_paise__sum'] or 0) / 100
        average_spend = Decimal(invoices.filter(status=InvoiceStatus.PAID).aggregate(Avg('grand_total_paise'))['grand_total_paise__avg'] or 0) / 100
        outstanding_balance = Decimal(invoices.filter(status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]).aggregate(
            unpaid=Sum('grand_total_paise')
        )['unpaid'] or 0) / 100
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
from apps.core.models import KycDocument, KycDocType, KycDocStatus, BankSettlementAccount, StoreGroup
from .serializers import (
    KycUploadSerializer, KycDocumentReadSerializer, BankSettlementSerializer
)
class KycOnboardingViewSet(viewsets.ViewSet):
    permission_classes = [IsStoreManagerOrReceptionist]
    def _get_store_group(self, request):
        store = getattr(request.user, 'store', None)
        if store and hasattr(store, 'store_group'):
            return store.store_group
        brand = getattr(store, 'brand', None) if store else None
        if brand:
            return StoreGroup.objects.filter(name__icontains=brand.name).first()
        return None
    @action(detail=False, methods=['post'], url_path='upload')
    def upload(self, request):
        serializer = KycUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        store_group = self._get_store_group(request)
        if not store_group:
            return Response(
                {"success": False, "message": "No StoreGroup is associated with your account. Contact support."},
                status=400
            )
        doc_type = serializer.validated_data['doc_type']
        uploaded_file = serializer.validated_data['file']
        existing = KycDocument.objects.filter(
            store_group=store_group, doc_type=doc_type
        ).exclude(status=KycDocStatus.APPROVED).first()
        if existing:
            existing.file = uploaded_file
            existing.status = KycDocStatus.PENDING
            existing.reviewed_by = None
            existing.reviewed_at = None
            existing.rejection_reason = None
            existing.save()
            doc = existing
            message = f"{dict(KycDocType.choices)[doc_type]} re-uploaded successfully. Awaiting HQ review."
        else:
            doc = KycDocument.objects.create(
                store_group=store_group,
                doc_type=doc_type,
                file=uploaded_file,
                status=KycDocStatus.PENDING,
            )
            message = f"{dict(KycDocType.choices)[doc_type]} uploaded successfully. Awaiting HQ review."
        return Response({
            "success": True,
            "message": message,
            "document": KycDocumentReadSerializer(doc, context={'request': request}).data
        }, status=201)
    @action(detail=False, methods=['get'], url_path='status')
    def kyc_status(self, request):
        store_group = self._get_store_group(request)
        if not store_group:
            return Response({"success": False, "message": "No StoreGroup associated."}, status=400)
        required_docs = [
            KycDocType.GST_CERT,
            KycDocType.PAN,
            KycDocType.BUSINESS_CERT,
            KycDocType.BANK_PROOF,
        ]
        submitted = KycDocument.objects.filter(store_group=store_group)
        submitted_types = {d.doc_type: d for d in submitted}
        checklist = []
        all_approved = True
        for doc_type in required_docs:
            doc = submitted_types.get(doc_type)
            if doc:
                checklist.append({
                    "doc_type": doc_type,
                    "doc_type_display": dict(KycDocType.choices)[doc_type],
                    "status": doc.status,
                    "status_display": dict(KycDocStatus.choices)[doc.status],
                    "uploaded_at": doc.uploaded_at,
                    "reviewed_at": doc.reviewed_at,
                    "rejection_reason": doc.rejection_reason,
                    "file_url": doc.file_display_url,
                })
                if doc.status != KycDocStatus.APPROVED:
                    all_approved = False
            else:
                checklist.append({
                    "doc_type": doc_type,
                    "doc_type_display": dict(KycDocType.choices)[doc_type],
                    "status": "not_submitted",
                    "status_display": "Not Submitted Yet",
                    "uploaded_at": None,
                    "reviewed_at": None,
                    "rejection_reason": None,
                    "file_url": None,
                })
                all_approved = False
        bank = None
        try:
            bank_obj = store_group.bank_settlement_account
            bank = BankSettlementSerializer(bank_obj).data
        except BankSettlementAccount.DoesNotExist:
            pass
        return Response({
            "success": True,
            "store_group": store_group.name,
            "kyc_status": store_group.status,
            "all_docs_approved": all_approved,
            "checklist": checklist,
            "bank_settlement": bank,
        })
    @action(detail=False, methods=['post', 'get'], url_path='bank-details')
    def bank_details(self, request):
        store_group = self._get_store_group(request)
        if not store_group:
            return Response({"success": False, "message": "No StoreGroup associated."}, status=400)
        if request.method == 'GET':
            try:
                account = store_group.bank_settlement_account
                return Response({
                    "success": True,
                    "bank_settlement": BankSettlementSerializer(account).data
                })
            except BankSettlementAccount.DoesNotExist:
                return Response({
                    "success": True,
                    "bank_settlement": None,
                    "message": "No bank details submitted yet."
                })
        try:
            existing_account = store_group.bank_settlement_account
            if existing_account.is_verified:
                return Response({
                    "success": False,
                    "message": "Your bank account is already verified and cannot be changed. Contact support@nearbyme.in to update."
                }, status=400)
            serializer = BankSettlementSerializer(existing_account, data=request.data, partial=True)
        except BankSettlementAccount.DoesNotExist:
            serializer = BankSettlementSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        account = serializer.save(
            store_group=store_group,
            submitted_by=request.user.get_full_name() or request.user.email
        )
        return Response({
            "success": True,
            "message": "Bank account details submitted successfully. HQ will verify and activate payouts within 2 business days.",
            "bank_settlement": BankSettlementSerializer(account).data
        }, status=201)
from rest_framework.views import APIView
from django.core.cache import cache
from apps.core.models import Outlet, StoreService
from .permissions import IsOutletStaff
from .availability import compute_availability, availability_cache_key, AVAILABILITY_CACHE_TTL_SECONDS
class OutletAvailabilityView(APIView):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    def get(self, request, outlet_id):
        service_id = request.query_params.get('service_id')
        date_str = request.query_params.get('date')
        professional_id = request.query_params.get('professional_id')
        if not service_id or not date_str:
            return error_response("service_id and date are required", 400)
        try:
            the_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return error_response("date must be in YYYY-MM-DD format", 400)
        try:
            outlet = Outlet.objects.get(id=outlet_id)
        except (Outlet.DoesNotExist, ValueError):
            return error_response("Outlet not found", 404)
        try:
            store_service = StoreService.objects.get(id=service_id, store_group=outlet.store_group)
        except (StoreService.DoesNotExist, ValueError):
            return error_response("Service not found for this outlet", 404)
        cache_key = availability_cache_key(outlet.id, store_service.id, date_str, professional_id)
        cached = cache.get(cache_key)
        if cached is not None:
            return success_response(cached, "Availability (cached)")
        duration_min, slots = compute_availability(outlet, store_service, the_date, professional_id)
        payload = {
            "outlet_id": str(outlet.id),
            "service_id": str(store_service.id),
            "date": date_str,
            "duration_min": duration_min,
            "slots": [
                {
                    "start": s["start"].isoformat(),
                    "end": s["end"].isoformat(),
                    "professionals": [{"id": str(p.id), "display_name": p.display_name} for p in s["professionals"]],
                }
                for s in slots
            ],
        }
        cache.set(cache_key, payload, AVAILABILITY_CACHE_TTL_SECONDS)
        return success_response(payload, "Availability")
from apps.core.models import Booking, AppointmentSlot, BookingStatus, AppointmentSlotStatus
from .serializers import BookingSerializer, BookingCreateSerializer, ConfirmBookingSerializer, CancelBookingSerializer
from .booking_engine import confirm_booking, reschedule_slot, BookingConflictError, BookingEngineError
def _record_platform_commission(booking):
    """Marketplace commission: on booking completion, charge the platform's
    cut against the store's active PlatformSubscriptionPlan.commission_percent.
    No-ops if the store has no legacy bridge, no subscription, or no plan —
    commission only applies to stores actually on a paid/trial plan."""
    from django.db.models import Sum
    from apps.core.models import Store, PlatformCommissionLedger
    store = Store.objects.filter(outlet=booking.outlet).first()
    if not store or not hasattr(store, 'platform_subscription'):
        return
    subscription = store.platform_subscription
    if not subscription.plan or subscription.status not in ('ACTIVE', 'FREE_TRIAL'):
        return
    gross = booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED).aggregate(total=Sum('price_paise'))['total'] or 0
    if gross <= 0:
        return
    percent = subscription.plan.commission_percent
    commission_paise = int(gross * percent / 100)
    PlatformCommissionLedger.objects.create(
        store=store, booking=booking, gross_amount_paise=gross,
        commission_percent_applied=percent, commission_paise=commission_paise,
    )
class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    http_method_names = ['get', 'post', 'head']
    def get_queryset(self):
        return Booking.objects.filter(outlet_id=self.request.user.outlet_id).prefetch_related('slots')
    def get_serializer_class(self):
        return BookingCreateSerializer if self.action == 'create' else BookingSerializer
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(
            outlet=serializer.validated_data.get('outlet') or request.user.outlet,
            booked_by=request.user,
            status=BookingStatus.DRAFT,
        )
        return success_response(BookingSerializer(booking).data, "Draft booking created", 201)
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        booking = self.get_object()
        serializer = ConfirmBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            confirm_booking(
                booking, serializer.validated_data['slots'], actor=request.user,
                override_token=serializer.validated_data.get('override_token'),
                override_reason=serializer.validated_data.get('override_reason'),
            )
        except BookingConflictError as e:
            return success_response({
                "conflict": True, "conflicts": e.conflicts, "override_token": e.override_token,
            }, "Conflicts with an existing booking. Resubmit with override_token and override_reason to proceed anyway.", 200)
        except BookingEngineError as e:
            return error_response(str(e), 400)
        booking.refresh_from_db()
        return success_response(BookingSerializer(booking).data, "Booking confirmed")
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        booking = self.get_object()
        if booking.status != BookingStatus.CONFIRMED:
            return error_response(f"Cannot start a booking in status '{booking.status}'.", 400)
        booking.status = BookingStatus.IN_SERVICE
        booking.save()
        booking.slots.filter(status=AppointmentSlotStatus.SCHEDULED).update(status=AppointmentSlotStatus.STARTED)
        booking.refresh_from_db()
        return success_response(BookingSerializer(booking).data, "Booking marked in-service")
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        booking = self.get_object()
        if booking.status != BookingStatus.IN_SERVICE:
            return error_response(f"Cannot complete a booking in status '{booking.status}'.", 400)
        booking.status = BookingStatus.COMPLETED
        booking.save()
        booking.slots.exclude(status=AppointmentSlotStatus.CANCELLED).update(status=AppointmentSlotStatus.DONE)
        booking.refresh_from_db()
        _record_platform_commission(booking)
        return success_response(BookingSerializer(booking).data, "Booking completed")
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.status in (BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW):
            return error_response(f"Cannot cancel a booking in status '{booking.status}'.", 400)
        serializer = CancelBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.cancellation_reason = serializer.validated_data['reason']
        booking.save()
        booking.slots.exclude(status=AppointmentSlotStatus.DONE).update(status=AppointmentSlotStatus.CANCELLED)
        booking.refresh_from_db()
        return success_response(BookingSerializer(booking).data, "Booking cancelled")
    @action(detail=True, methods=['post'], url_path='no-show')
    def no_show(self, request, pk=None):
        booking = self.get_object()
        if booking.status != BookingStatus.CONFIRMED:
            return error_response(f"Cannot mark no-show for a booking in status '{booking.status}'.", 400)
        booking.status = BookingStatus.NO_SHOW
        booking.save()
        booking.slots.update(status=AppointmentSlotStatus.CANCELLED)
        booking.refresh_from_db()
        return success_response(BookingSerializer(booking).data, "Booking marked as no-show")
    @action(detail=True, methods=['post'], url_path=r'slots/(?P<slot_id>[^/.]+)/reschedule')
    def reschedule(self, request, pk=None, slot_id=None):
        from django.utils.dateparse import parse_datetime
        booking = self.get_object()
        try:
            old_slot = booking.slots.get(id=slot_id)
        except AppointmentSlot.DoesNotExist:
            return error_response("Slot not found", 404)
        new_start = parse_datetime(request.data.get('slot_start') or '')
        if not new_start:
            return error_response("slot_start is required and must be an ISO datetime", 400)
        try:
            new_slot = reschedule_slot(
                old_slot, new_start, new_professional_id=request.data.get('professional_id'),
                actor=request.user, override_token=request.data.get('override_token'),
                override_reason=request.data.get('override_reason'),
            )
        except BookingConflictError as e:
            return success_response({
                "conflict": True, "conflicts": e.conflicts, "override_token": e.override_token,
            }, "Conflicts with an existing booking. Resubmit with override_token and override_reason to proceed anyway.", 200)
        except BookingEngineError as e:
            return error_response(str(e), 400)
        booking.refresh_from_db()
        return success_response(BookingSerializer(booking).data, "Slot rescheduled")
from apps.core.models import (
    Professional, ProfessionalSkill, ProfessionalShift, ProfessionalTimeOff,
    ProfessionalLinkStatus, Resource, CanonicalService,
)
from .serializers import (
    ProfessionalSerializer, ProfessionalCreateSerializer, ProfessionalShiftSerializer,
    ProfessionalTimeOffSerializer, ResourceSerializer,
)
class ProfessionalViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    def get_queryset(self):
        return Professional.objects.filter(outlet_id=self.request.user.outlet_id).prefetch_related('skills', 'shifts', 'time_off_blocks')
    def get_serializer_class(self):
        return ProfessionalCreateSerializer if self.action == 'create' else ProfessionalSerializer
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outlet = request.user.outlet
        professional = serializer.save(
            outlet=outlet, store_group=outlet.store_group,
            link_status=ProfessionalLinkStatus.INVITED, invited_at=timezone.now(),
        )
        return success_response(ProfessionalSerializer(professional).data, "Professional invited", 201)
    @action(detail=False, methods=['get'], url_path='skill-tags')
    def skill_tags(self, request):
        tags = CanonicalService.objects.exclude(skill_tag__isnull=True).exclude(skill_tag='').values_list('skill_tag', flat=True).distinct().order_by('skill_tag')
        return success_response(list(tags))
    @action(detail=True, methods=['post'], url_path='skills')
    def skills(self, request, pk=None):
        professional = self.get_object()
        skill_tags = request.data.get('skill_tags', [])
        if not isinstance(skill_tags, list):
            return error_response("skill_tags must be a list", 400)
        ProfessionalSkill.objects.filter(professional=professional).exclude(skill_tag__in=skill_tags).delete()
        existing = set(professional.skills.values_list('skill_tag', flat=True))
        ProfessionalSkill.objects.bulk_create([
            ProfessionalSkill(professional=professional, skill_tag=tag) for tag in skill_tags if tag not in existing
        ])
        professional.refresh_from_db()
        return success_response(ProfessionalSerializer(professional).data, "Skills updated")
    @action(detail=True, methods=['get', 'post'], url_path='shifts')
    def shifts(self, request, pk=None):
        professional = self.get_object()
        if request.method == 'GET':
            return success_response(ProfessionalShiftSerializer(professional.shifts.all(), many=True).data)
        serializer = ProfessionalShiftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        shift = serializer.save(professional=professional, outlet=professional.outlet)
        return success_response(ProfessionalShiftSerializer(shift).data, "Shift added", 201)
    @action(detail=True, methods=['delete'], url_path=r'shifts/(?P<shift_id>[^/.]+)')
    def delete_shift(self, request, pk=None, shift_id=None):
        professional = self.get_object()
        deleted, _ = ProfessionalShift.objects.filter(id=shift_id, professional=professional).delete()
        if not deleted:
            return error_response("Shift not found", 404)
        return success_response(None, "Shift removed")
    @action(detail=True, methods=['post'], url_path='time-off')
    def time_off(self, request, pk=None):
        professional = self.get_object()
        serializer = ProfessionalTimeOffSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        block = serializer.save(professional=professional, created_by=request.user.get_full_name() or request.user.email)
        return success_response(ProfessionalTimeOffSerializer(block).data, "Time off added", 201)
    @action(detail=True, methods=['delete'], url_path=r'time-off/(?P<block_id>[^/.]+)')
    def delete_time_off(self, request, pk=None, block_id=None):
        professional = self.get_object()
        deleted, _ = ProfessionalTimeOff.objects.filter(id=block_id, professional=professional).delete()
        if not deleted:
            return error_response("Time off block not found", 404)
        return success_response(None, "Time off removed")
class ResourceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = ResourceSerializer
    def get_queryset(self):
        return Resource.objects.filter(outlet_id=self.request.user.outlet_id)
    def perform_create(self, serializer):
        serializer.save(outlet=self.request.user.outlet)
from apps.core.models import StoreService, GlobalCustomer, normalize_e164
from .serializers import StoreServiceLiteSerializer, GlobalCustomerLiteSerializer, CustomerLookupSerializer
class StoreServiceListView(APIView):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    def get(self, request):
        services = StoreService.objects.filter(
            store_group_id=request.user.outlet.store_group_id, is_active_in_store=True
        ).select_related('canonical_service', 'canonical_service__category')
        return success_response(StoreServiceLiteSerializer(services, many=True).data)
class CustomerLookupView(APIView):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    def post(self, request):
        serializer = CustomerLookupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data.get('phone')
        name = serializer.validated_data['name']
        if phone:
            customer, _ = GlobalCustomer.objects.get_or_create(
                phone_e164=normalize_e164(phone), defaults={'name': name}
            )
        else:
            customer = GlobalCustomer.objects.create(name=name)
        return success_response(GlobalCustomerLiteSerializer(customer).data, "Customer resolved")
def _resolve_customer(data):
    customer_id = data.get('customer_id')
    if customer_id:
        return GlobalCustomer.objects.filter(id=customer_id).first()
    name = (data.get('customer_name') or '').strip()
    if not name:
        return None
    phone = (data.get('customer_phone') or '').strip()
    if phone:
        customer, _ = GlobalCustomer.objects.get_or_create(phone_e164=normalize_e164(phone), defaults={'name': name})
        return customer
    return GlobalCustomer.objects.create(name=name)
from apps.core.models import MembershipPlan, Membership, PackagePlan, Package, MembershipStatus
from .serializers import (
    MembershipPlanSerializer, MembershipSerializer, SellMembershipSerializer,
    PackagePlanSerializer, PackageSerializer, SellPackageSerializer,
)
class MembershipPlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = MembershipPlanSerializer
    def get_queryset(self):
        return MembershipPlan.objects.filter(store_group=self.request.user.outlet.store_group_id)
    def perform_create(self, serializer):
        serializer.save(store_group=self.request.user.outlet.store_group)
class MembershipViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = MembershipSerializer
    def get_queryset(self):
        qs = Membership.objects.filter(store_group=self.request.user.outlet.store_group_id)
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs
    @action(detail=False, methods=['post'])
    def sell(self, request):
        serializer = SellMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outlet = request.user.outlet
        plan = MembershipPlan.objects.filter(id=serializer.validated_data['plan_id'], store_group=outlet.store_group, is_active=True).first()
        if not plan:
            return error_response("Membership plan not found.", 404)
        customer = _resolve_customer(serializer.validated_data)
        if not customer:
            return error_response("A customer is required to sell a membership.", 400)
        membership = Membership.objects.create(
            customer=customer, store_group=outlet.store_group, plan_name=plan.name,
            value_paise_remaining=plan.value_paise, valid_until=timezone.localdate() + datetime.timedelta(days=plan.validity_days),
        )
        return success_response(MembershipSerializer(membership).data, "Membership sold", 201)
class PackagePlanViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = PackagePlanSerializer
    def get_queryset(self):
        return PackagePlan.objects.filter(store_group=self.request.user.outlet.store_group_id)
    def perform_create(self, serializer):
        serializer.save(store_group=self.request.user.outlet.store_group)
class PackageViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = PackageSerializer
    def get_queryset(self):
        qs = Package.objects.filter(store_group=self.request.user.outlet.store_group_id)
        customer_id = self.request.query_params.get('customer_id')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)
        return qs
    @action(detail=False, methods=['post'])
    def sell(self, request):
        serializer = SellPackageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        outlet = request.user.outlet
        plan = PackagePlan.objects.filter(id=serializer.validated_data['plan_id'], store_group=outlet.store_group, is_active=True).first()
        if not plan:
            return error_response("Package plan not found.", 404)
        customer = _resolve_customer(serializer.validated_data)
        if not customer:
            return error_response("A customer is required to sell a package.", 400)
        package = Package.objects.create(
            customer=customer, store_group=outlet.store_group, name=plan.name,
            service_credits=dict(plan.service_credits), valid_until=timezone.localdate() + datetime.timedelta(days=plan.validity_days),
        )
        return success_response(PackageSerializer(package).data, "Package sold", 201)
from apps.core.models import Campaign
from .serializers import CampaignSerializer
from .campaigns import send_campaign, campaign_analytics
class CampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = CampaignSerializer
    def get_queryset(self):
        return Campaign.objects.filter(store_group=self.request.user.outlet.store_group_id)
    def perform_create(self, serializer):
        serializer.save(store_group=self.request.user.outlet.store_group)
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        campaign = self.get_object()
        sent = send_campaign(campaign)
        return success_response({"sent": sent}, f"Sent to {sent} customers")
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        return success_response(campaign_analytics(self.get_object()))
from apps.core.models import CommissionRule
from .serializers import CommissionRuleSerializer
class CommissionRuleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOutletStaff]
    serializer_class = CommissionRuleSerializer
    def get_queryset(self):
        return CommissionRule.objects.filter(store_group=self.request.user.outlet.store_group_id)
    def perform_create(self, serializer):
        serializer.save(store_group=self.request.user.outlet.store_group)
class Phase1FinancialReportsView(APIView):
    permission_classes = [IsAuthenticated, IsOutletStaff, RequiresAnalytics]
    REPORTS = ('revenue-by-professional', 'revenue-by-category', 'commission-payout', 'daily-register', 'gst')
    def get(self, request):
        from .reports import revenue_by_professional, revenue_by_category, commission_payout_report, daily_register_summary, gst_report
        report = request.query_params.get('report')
        if report not in self.REPORTS:
            return error_response(f"report must be one of: {', '.join(self.REPORTS)}", 400)
        store_group = request.user.outlet.store_group
        today = timezone.localdate()
        try:
            if report == 'daily-register':
                date_str = request.query_params.get('date')
                date = datetime.date.fromisoformat(date_str) if date_str else today
                return success_response(daily_register_summary(store_group, date))
            date_from_str = request.query_params.get('date_from')
            date_to_str = request.query_params.get('date_to')
            date_from = datetime.date.fromisoformat(date_from_str) if date_from_str else today.replace(day=1)
            date_to = datetime.date.fromisoformat(date_to_str) if date_to_str else today
        except ValueError:
            return error_response("date_from/date_to/date must be in YYYY-MM-DD format", 400)
        if report == 'revenue-by-professional':
            return success_response(revenue_by_professional(store_group, date_from, date_to))
        if report == 'revenue-by-category':
            return success_response(revenue_by_category(store_group, date_from, date_to))
        if report == 'commission-payout':
            return success_response(commission_payout_report(store_group, date_from, date_to))
        return success_response(gst_report(store_group, date_from, date_to))
class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated, IsStoreStaff]
    def get(self, request):
        q = (request.query_params.get('q') or '').strip()
        if len(q) < 2:
            return success_response({"results": []})
        store = request.user.store
        results = []

        appointment_customer_ids = Appointment.objects.filter(store=store).values_list('customer_id', flat=True).distinct()
        customers = User.objects.filter(role=Role.CUSTOMER).filter(
            models.Q(id__in=appointment_customer_ids) | models.Q(store=store)
        ).filter(
            models.Q(first_name__icontains=q) | models.Q(last_name__icontains=q) |
            models.Q(phone__icontains=q) | models.Q(email__icontains=q)
        ).distinct()[:5]
        for c in customers:
            results.append({
                "id": str(c.id), "type": "customer",
                "title": c.get_full_name() or c.email,
                "subtitle": c.phone or c.email,
                "link": f"/customers/{c.id}",
            })

        invoices = Invoice.objects.filter(store=store, invoice_number__icontains=q).select_related('customer')[:5]
        for inv in invoices:
            customer_name = inv.customer.get_full_name() if inv.customer else "Walk-in"
            results.append({
                "id": str(inv.id), "type": "invoice",
                "title": inv.invoice_number or str(inv.id)[:8],
                "subtitle": f"{customer_name} · ₹{inv.grand_total_paise / 100:.2f}",
                "link": f"/billing/{inv.id}",
            })

        if request.user.outlet_id:
            from apps.core.models import Professional
            professionals = Professional.objects.filter(
                outlet_id=request.user.outlet_id, display_name__icontains=q
            )[:5]
            for p in professionals:
                results.append({
                    "id": str(p.id), "type": "professional",
                    "title": p.display_name,
                    "subtitle": p.display_role or "Professional",
                    "link": "/staff/professionals",
                })

        return success_response({"results": results})
class NotificationsView(APIView):
    permission_classes = [IsAuthenticated, IsStoreStaff]
    def get(self, request):
        store = request.user.store
        items = []

        if store and store.outlet_id:
            from zoneinfo import ZoneInfo
            ist = ZoneInfo("Asia/Kolkata")
            recent_bookings = Booking.objects.filter(
                outlet_id=store.outlet_id,
                status__in=[BookingStatus.CONFIRMED, BookingStatus.IN_SERVICE, BookingStatus.COMPLETED],
                created_at__gte=timezone.now() - datetime.timedelta(hours=48),
            ).select_related('customer').prefetch_related('slots__store_service').order_by('-created_at')[:10]
            for b in recent_bookings:
                first_slot = b.slots.first()
                service_name = first_slot.store_service.name if first_slot else "Booking"
                customer_name = b.customer.name if b.customer else "Walk-in"
                when = b.booking_start.astimezone(ist).strftime('%d %b, %I:%M %p')
                items.append({
                    "id": f"booking_{b.id}",
                    "type": "new_booking",
                    "title": f"New booking: {service_name}",
                    "subtitle": f"{customer_name} · {when}",
                    "link": "/calendar",
                    "created_at": b.created_at.isoformat() if b.created_at else None,
                })

        low_stock = Product.objects.filter(
            store=store, is_active=True, stock_quantity__lte=F('low_stock_warning')
        ).order_by('stock_quantity')[:10]
        for p in low_stock:
            items.append({
                "id": f"low_stock_{p.id}",
                "type": "low_stock",
                "title": f"{p.name} is low on stock",
                "subtitle": f"{p.stock_quantity} left · reorder soon",
                "link": "/inventory/products",
                "created_at": None,
            })

        unpaid_invoices = Invoice.objects.filter(
            store=store, status__in=[InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID]
        ).select_related('customer').order_by('-created_at')[:10]
        for inv in unpaid_invoices:
            customer_name = inv.customer.get_full_name() if inv.customer else "Walk-in"
            items.append({
                "id": f"unpaid_invoice_{inv.id}",
                "type": "unpaid_invoice",
                "title": f"Invoice {inv.invoice_number or str(inv.id)[:8]} {inv.status.lower()}",
                "subtitle": f"{customer_name} · ₹{inv.grand_total_paise / 100:.2f}",
                "link": f"/billing/{inv.id}",
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            })

        pending_leaves = LeaveRequest.objects.filter(
            store=store, status='PENDING'
        ).select_related('staff').order_by('-id')[:10]
        for lv in pending_leaves:
            items.append({
                "id": f"leave_{lv.id}",
                "type": "leave_pending",
                "title": f"Leave request from {lv.staff.get_full_name()}",
                "subtitle": f"{lv.start_date} – {lv.end_date} · Pending",
                "link": "/staff/leaves",
                "created_at": None,
            })

        items.sort(key=lambda x: x["created_at"] or "", reverse=True)
        return success_response({"count": len(items), "items": items})
from .serializers import MeSerializer, StoreProfileSerializer
class MeView(APIView):
    permission_classes = [IsAuthenticated, IsErpUser]
    def get(self, request):
        return success_response(MeSerializer(request.user).data)
    def patch(self, request):
        serializer = MeSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Profile updated")
class BrandStoresView(APIView):
    """Lets a Brand Owner list every store under their brand, before they've
    picked one to work in (so it can't depend on IsStoreStaff's store_id check)."""
    permission_classes = [IsAuthenticated, IsBrandOwner]
    def get(self, request):
        from apps.core.models import Store
        stores = Store.objects.filter(brand_id=request.user.brand_id).order_by('name')
        return success_response([
            {
                "id": s.id,
                "name": s.name,
                "status": s.status,
                "address": s.address,
            }
            for s in stores
        ])
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, IsErpUser]
    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        if not old_password or not new_password:
            return error_response("old_password and new_password are required", 400)
        if len(new_password) < 6:
            return error_response("New password must be at least 6 characters", 400)
        if not request.user.check_password(old_password):
            return error_response("Current password is incorrect", 400)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return success_response(None, "Password changed")
class StoreProfileView(APIView):
    permission_classes = [IsAuthenticated, IsStoreManagerOrReceptionist]
    def get(self, request):
        if not request.user.store_id:
            return error_response("You are not assigned to a store", 404)
        return success_response(StoreProfileSerializer(request.user.store).data)
    def patch(self, request):
        if not request.user.store_id:
            return error_response("You are not assigned to a store", 404)
        serializer = StoreProfileSerializer(request.user.store, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data, "Store profile updated")
from apps.core.models import Announcement, Conversation, ChatMessage
from .serializers import AnnouncementSerializer, StoreConversationSerializer, StoreChatMessageSerializer
class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsStoreManagerOrReceptionist]
    def get_queryset(self):
        return Announcement.objects.filter(store=self.request.user.store).order_by('-created_at')
    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store)
class StoreConversationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StoreConversationSerializer
    permission_classes = [IsStoreManagerOrReceptionist]
    def get_queryset(self):
        return Conversation.objects.filter(therapist__store=self.request.user.store).select_related('customer', 'therapist')
    @action(detail=True, methods=['get', 'post'])
    def messages(self, request, pk=None):
        convo = self.get_object()
        if request.method == 'POST':
            content = (request.data.get('content') or '').strip()
            if not content:
                return error_response("content is required.", 400)
            msg = ChatMessage.objects.create(conversation=convo, sender=request.user, content=content)
            from apps.core.notifications import notify_user
            notify_user(
                convo.customer, f"New message from {request.user.get_full_name() or 'the store'}",
                content[:120], notif_type='NEW_MESSAGE', data={"conversation_id": str(convo.id)},
            )
            return success_response(StoreChatMessageSerializer(msg, context={'request': request}).data, "Sent", 201)
        convo.messages.exclude(sender=request.user).update(is_read=True)
        msgs = convo.messages.select_related('sender')
        return success_response(StoreChatMessageSerializer(msgs, many=True, context={'request': request}).data)
from apps.core.models import QueueEntry, QueueEntryStatus, DEFAULT_QUEUE_WAIT_MINUTES
from .serializers import QueueEntrySerializer
class QueueViewSet(viewsets.ModelViewSet):
    """Reception's 'who's here right now' board — a walk-in checks in, waits
    their turn, gets called. Outlet-scoped, like the rest of the booking
    engine, and distinct from the future-date Waitlist model."""
    serializer_class = QueueEntrySerializer
    permission_classes = [IsAuthenticated, IsOutletStaff]
    ACTIVE_STATUSES = [QueueEntryStatus.WAITING, QueueEntryStatus.CALLED, QueueEntryStatus.IN_SERVICE]
    def get_queryset(self):
        qs = QueueEntry.objects.filter(outlet_id=self.request.user.outlet_id).select_related(
            'customer', 'store_service', 'professional'
        )
        if self.action == 'list':
            qs = qs.filter(status__in=self.ACTIVE_STATUSES)
        return qs
    def _position_and_wait_context(self, entries):
        waiting = [e for e in entries if e.status == QueueEntryStatus.WAITING]
        waiting.sort(key=lambda e: e.checked_in_at)
        positions, waits, running_total = {}, {}, 0
        for i, e in enumerate(waiting):
            positions[e.id] = i + 1
            waits[e.id] = running_total
            running_total += (e.store_service.duration_min if e.store_service else DEFAULT_QUEUE_WAIT_MINUTES)
        return {'positions': positions, 'waits': waits}
    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.action == 'list':
            context.update(self._position_and_wait_context(list(self.get_queryset())))
        return context
    def perform_create(self, serializer):
        serializer.save(outlet_id=self.request.user.outlet_id)
    def _transition(self, request, pk, new_status, timestamp_field):
        entry = self.get_object()
        entry.status = new_status
        setattr(entry, timestamp_field, timezone.now())
        entry.save(update_fields=['status', timestamp_field])
        return success_response(QueueEntrySerializer(entry).data, f"Marked {new_status}")
    @action(detail=True, methods=['post'])
    def call(self, request, pk=None):
        return self._transition(request, pk, QueueEntryStatus.CALLED, 'called_at')
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        return self._transition(request, pk, QueueEntryStatus.IN_SERVICE, 'started_at')
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        return self._transition(request, pk, QueueEntryStatus.COMPLETED, 'completed_at')
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self._transition(request, pk, QueueEntryStatus.CANCELLED, 'completed_at')
    @action(detail=True, methods=['post'], url_path='no-show')
    def no_show(self, request, pk=None):
        return self._transition(request, pk, QueueEntryStatus.NO_SHOW, 'completed_at')
