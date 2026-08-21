from django.db import migrations, models
import django.db.models.deletion


def convert_decimal_to_paise(apps, schema_editor):
    Invoice = apps.get_model('core', 'Invoice')
    InvoiceLine = apps.get_model('core', 'InvoiceLine')
    Payment = apps.get_model('core', 'Payment')

    def paise(value):
        return int(round((value or 0) * 100))

    for inv in Invoice.objects.all():
        Invoice.objects.filter(pk=inv.pk).update(
            subtotal_paise=paise(inv.subtotal),
            discount_amount_paise=paise(inv.discount_amount),
            tax_amount_paise=paise(inv.tax_amount),
            grand_total_paise=paise(inv.grand_total),
            platform_fee_paise=paise(inv.platform_fee),
            gateway_fee_paise=paise(inv.gateway_fee),
        )
    for line in InvoiceLine.objects.all():
        InvoiceLine.objects.filter(pk=line.pk).update(
            unit_price_paise=paise(line.price),
            tax_amount_paise=paise(line.tax_amount),
            total_paise=paise(line.total),
        )
    for p in Payment.objects.all():
        Payment.objects.filter(pk=p.pk).update(amount_paise=paise(p.amount))


def noop_reverse(apps, schema_editor):
    # Old Decimal columns are gone by the time this migration would be
    # reversed past the RemoveField steps below — reversing would need
    # to reconstruct them from *_paise, which is out of scope for a
    # rollback path nobody expects to use on real financial data.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0029_payoutdestination_deleted_at_and_more'),
    ]

    operations = [
        migrations.RenameModel('InvoiceItem', 'InvoiceLine'),

        # --- Step 1: add new paise/line_type columns alongside the old ones ---
        migrations.AddField(model_name='invoice', name='subtotal_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoice', name='discount_amount_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoice', name='tax_amount_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoice', name='grand_total_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoice', name='platform_fee_paise', field=models.BigIntegerField(default=0, help_text='Calculated revenue for Nearbyme')),
        migrations.AddField(model_name='invoice', name='gateway_fee_paise', field=models.BigIntegerField(default=0, help_text='Calculated payment processing fee')),
        migrations.AddField(model_name='invoiceline', name='line_type', field=models.CharField(choices=[('service', 'Service'), ('product', 'Product')], default='service', max_length=20)),
        migrations.AddField(model_name='invoiceline', name='unit_price_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoiceline', name='tax_amount_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='invoiceline', name='total_paise', field=models.BigIntegerField(default=0)),
        migrations.AddField(model_name='payment', name='amount_paise', field=models.BigIntegerField(default=0)),

        # --- Step 2: copy + convert existing Decimal-rupee values (x100, rounded) ---
        migrations.RunPython(convert_decimal_to_paise, noop_reverse),

        # --- Step 3: drop the old Decimal columns ---
        migrations.RemoveField(model_name='invoice', name='subtotal'),
        migrations.RemoveField(model_name='invoice', name='discount_amount'),
        migrations.RemoveField(model_name='invoice', name='tax_amount'),
        migrations.RemoveField(model_name='invoice', name='grand_total'),
        migrations.RemoveField(model_name='invoice', name='platform_fee'),
        migrations.RemoveField(model_name='invoice', name='gateway_fee'),
        migrations.RemoveField(model_name='invoiceline', name='price'),
        migrations.RemoveField(model_name='invoiceline', name='tax_amount'),
        migrations.RemoveField(model_name='invoiceline', name='total'),
        migrations.RemoveField(model_name='payment', name='amount'),

        # --- Step 4: unit_price_paise/amount_paise have no default in the final model state ---
        migrations.AlterField(model_name='invoiceline', name='unit_price_paise', field=models.BigIntegerField()),
        migrations.AlterField(model_name='payment', name='amount_paise', field=models.BigIntegerField()),
    ]
