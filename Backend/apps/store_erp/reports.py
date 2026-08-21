from decimal import Decimal
from django.db.models import Sum, Count
from apps.core.models import InvoiceLine, CommissionAccrual, Payment, Invoice
def _finalised_items(store_group, date_from, date_to):
    return InvoiceLine.objects.filter(
        invoice__outlet__store_group=store_group, invoice__finalised_at__isnull=False,
        invoice__finalised_at__date__gte=date_from, invoice__finalised_at__date__lte=date_to,
    )
def revenue_by_professional(store_group, date_from, date_to):
    rows = _finalised_items(store_group, date_from, date_to).exclude(professional__isnull=True).values(
        'professional_id', 'professional__display_name'
    ).annotate(revenue_paise=Sum('total_paise'), line_count=Count('id')).order_by('-revenue_paise')
    return [
        {"professional_id": str(r['professional_id']), "professional_name": r['professional__display_name'],
         "revenue_paise": r['revenue_paise'], "line_count": r['line_count']}
        for r in rows
    ]
def revenue_by_category(store_group, date_from, date_to):
    items = _finalised_items(store_group, date_from, date_to).select_related('store_service__canonical_service__category')
    buckets = {}
    for item in items:
        name = "Uncategorized"
        if item.store_service_id and item.store_service.canonical_service_id and item.store_service.canonical_service.category_id:
            name = item.store_service.canonical_service.category.name
        buckets[name] = buckets.get(name, 0) + item.total_paise
    return [{"category": k, "revenue_paise": v} for k, v in sorted(buckets.items(), key=lambda kv: -kv[1])]
def commission_payout_report(store_group, date_from, date_to):
    rows = CommissionAccrual.objects.filter(
        invoice_line__invoice__outlet__store_group=store_group,
        created_at__date__gte=date_from, created_at__date__lte=date_to,
    ).values('professional_id', 'professional__display_name').annotate(
        total_commission_paise=Sum('commission_paise'), accrual_count=Count('id')
    ).order_by('-total_commission_paise')
    return [
        {"professional_id": str(r['professional_id']), "professional_name": r['professional__display_name'],
         "total_commission_paise": r['total_commission_paise'], "accrual_count": r['accrual_count']}
        for r in rows
    ]
def daily_register_summary(store_group, date):
    payments = Payment.objects.filter(invoice__outlet__store_group=store_group, invoice__finalised_at__date=date)
    by_method = payments.values('method').annotate(total_paise=Sum('amount_paise'), count=Count('id')).order_by('-total_paise')
    grand_total_paise = payments.aggregate(total=Sum('amount_paise'))['total'] or 0
    invoice_count = Invoice.objects.filter(outlet__store_group=store_group, finalised_at__date=date).count()
    return {
        "date": str(date), "invoice_count": invoice_count, "grand_total_paise": grand_total_paise,
        "by_method": [{"method": r['method'], "total_paise": r['total_paise'], "count": r['count']} for r in by_method],
    }
def gst_report(store_group, date_from, date_to):
    items = _finalised_items(store_group, date_from, date_to).select_related('store_service__canonical_service')
    buckets = {}
    for item in items:
        code = "N/A"
        if item.store_service_id and item.store_service.canonical_service_id:
            code = item.store_service.canonical_service.hsn_sac_code or "N/A"
        key = (code, item.tax_rate)
        b = buckets.setdefault(key, {"hsn_sac_code": code, "tax_rate": item.tax_rate, "taxable_value_paise": 0, "tax_collected_paise": 0})
        b["taxable_value_paise"] += item.unit_price_paise * item.quantity
        b["tax_collected_paise"] += item.tax_amount_paise
    return sorted(buckets.values(), key=lambda b: b["hsn_sac_code"])
