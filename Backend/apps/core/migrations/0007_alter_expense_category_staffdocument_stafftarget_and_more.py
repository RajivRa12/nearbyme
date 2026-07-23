from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_favoritetherapist'),
    ]

    operations = [
        migrations.AlterField(
            model_name='expense',
            name='category',
            field=models.CharField(choices=[('RENT', 'Rent'), ('UTILITIES', 'Utilities'), ('SALARY', 'Salary'), ('MARKETING', 'Marketing'), ('SUPPLIES', 'Supplies'), ('PETTY_CASH', 'Petty Cash'), ('OTHER', 'Other')], max_length=20),
        ),
        migrations.CreateModel(
            name='StaffDocument',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('document_url', models.URLField()),
                ('document_type', models.CharField(choices=[('ID', 'ID Proof'), ('CERTIFICATE', 'Certificate'), ('CONTRACT', 'Contract')], max_length=50)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='StaffTarget',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month_year', models.CharField(help_text='MM-YYYY', max_length=7)),
                ('revenue_target', models.DecimalField(decimal_places=2, max_digits=10)),
                ('achieved_revenue', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='targets', to=settings.AUTH_USER_MODEL)),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='staff_targets', to='core.store')),
            ],
            options={
                'unique_together': {('staff', 'month_year')},
            },
        ),
        migrations.CreateModel(
            name='Payroll',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('month_year', models.CharField(help_text='MM-YYYY', max_length=7)),
                ('base_salary', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('commissions_earned', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('incentives', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('deductions', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_payout', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PAID', 'Paid')], default='PENDING', max_length=20)),
                ('processed_at', models.DateTimeField(auto_now_add=True)),
                ('staff', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payrolls', to=settings.AUTH_USER_MODEL)),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payrolls', to='core.store')),
            ],
            options={
                'unique_together': {('staff', 'month_year')},
            },
        ),
    ]
