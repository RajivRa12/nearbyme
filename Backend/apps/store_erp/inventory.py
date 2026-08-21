from apps.core.models import ServiceProduct, StockMovement, Notification, User, Role
def deduct_stock_for_invoice(invoice):
    for item in invoice.items.select_related('store_service', 'service').all():
        if item.store_service_id:
            service_products = ServiceProduct.objects.filter(store_service_id=item.store_service_id)
        elif item.service_id:
            service_products = ServiceProduct.objects.filter(service_id=item.service_id)
        else:
            continue
        for sp in service_products.select_related('product'):
            product = sp.product
            qty = sp.quantity_used * item.quantity
            product.stock_quantity -= qty
            product.save(update_fields=['stock_quantity'])
            StockMovement.objects.create(
                product=product, invoice=invoice, quantity_deducted=qty,
                reason=f"Auto-deducted for invoice {invoice.invoice_number}",
            )
            if product.stock_quantity <= product.low_stock_warning:
                _notify_low_stock(product, invoice.outlet)
def _notify_low_stock(product, outlet):
    if not outlet:
        return
    admins = User.objects.filter(outlet=outlet, role__in=[Role.STORE_ADMIN, Role.RECEPTIONIST])
    for admin in admins:
        Notification.objects.create(
            user=admin, title="Low stock alert", type="INVENTORY",
            message=f"{product.name} is down to {product.stock_quantity} units (threshold {product.low_stock_warning}).",
        )
