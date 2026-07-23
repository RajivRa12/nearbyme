from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_customermembership_frozen_until_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='is_recurring',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='recurrence_pattern',
            field=models.CharField(blank=True, choices=[('DAILY', 'Daily'), ('WEEKLY', 'Weekly'), ('MONTHLY', 'Monthly')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='source',
            field=models.CharField(choices=[('WALK_IN', 'Walk In'), ('ONLINE', 'Online'), ('PHONE', 'Phone')], default='WALK_IN', max_length=20),
        ),
        migrations.AddField(
            model_name='invoice',
            name='is_discount_approved',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='invoice',
            name='requires_manager_approval',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='payment',
            name='method',
            field=models.CharField(choices=[('CASH', 'Cash'), ('CARD', 'Credit/Debit Card'), ('UPI', 'UPI'), ('WALLET', 'Wallet'), ('GIFT_CARD', 'Gift Card'), ('PACKAGE', 'Package Redemption')], max_length=20),
        ),
        migrations.CreateModel(
            name='Waitlist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('preferred_date', models.DateField()),
                ('preferred_time_slot', models.CharField(help_text='e.g. Morning, Afternoon, or specific time', max_length=100)),
                ('status', models.CharField(choices=[('WAITING', 'Waiting'), ('NOTIFIED', 'Notified'), ('BOOKED', 'Booked'), ('CANCELLED', 'Cancelled')], default='WAITING', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlists', to=settings.AUTH_USER_MODEL)),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.service')),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='waitlists', to='core.store')),
            ],
        ),
    ]
