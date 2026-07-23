from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_alter_expense_category_staffdocument_stafftarget_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customermembership',
            name='frozen_until',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='customermembership',
            name='is_frozen',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='invoice',
            name='is_review_reminder_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='membershiptier',
            name='tier_type',
            field=models.CharField(choices=[('STANDARD', 'Standard'), ('VIP', 'VIP'), ('CORPORATE', 'Corporate'), ('MONTHLY', 'Monthly'), ('ANNUAL', 'Annual')], default='STANDARD', max_length=50),
        ),
        migrations.AddField(
            model_name='product',
            name='barcode',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='product',
            name='expiry_date',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='StockTransfer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField()),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('from_store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfers_out', to='core.store')),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.product')),
                ('to_store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfers_in', to='core.store')),
            ],
        ),
        migrations.CreateModel(
            name='ServiceProduct',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_used', models.PositiveIntegerField(default=1)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.product')),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='products_used', to='core.service')),
            ],
        ),
        migrations.CreateModel(
            name='Referral',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('reward_points_awarded', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('referred_user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='referred_by', to=settings.AUTH_USER_MODEL)),
                ('referrer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='referrals_made', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
