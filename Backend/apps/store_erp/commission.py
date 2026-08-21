from decimal import Decimal
from apps.core.models import CommissionRule, CommissionRateType
def find_commission_rule(store_group, professional, applies_to, as_of_date):
    qs = CommissionRule.objects.filter(store_group=store_group, applies_to=applies_to, effective_from__lte=as_of_date)
    specific = qs.filter(professional=professional).order_by('-effective_from').first()
    if specific:
        return specific
    return qs.filter(professional__isnull=True).order_by('-effective_from').first()
def commission_paise_for_rule(rule, base_paise):
    if rule.rate_type == CommissionRateType.PERCENT:
        return int((Decimal(base_paise) * rule.rate_value / Decimal('100')).to_integral_value())
    return int((rule.rate_value * 100).to_integral_value())
