from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_appointment_is_recurring_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomerProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('preferred_timing', models.CharField(blank=True, choices=[('MORNING', 'Morning'), ('AFTERNOON', 'Afternoon'), ('EVENING', 'Evening')], max_length=50, null=True)),
                ('birthday', models.DateField(blank=True, null=True)),
                ('anniversary', models.DateField(blank=True, null=True)),
                ('allergies', models.TextField(blank=True, null=True)),
                ('skin_type', models.CharField(blank=True, choices=[('NORMAL', 'Normal'), ('DRY', 'Dry'), ('OILY', 'Oily'), ('COMBINATION', 'Combination'), ('SENSITIVE', 'Sensitive')], max_length=20, null=True)),
                ('hair_type', models.CharField(blank=True, choices=[('STRAIGHT', 'Straight'), ('WAVY', 'Wavy'), ('CURLY', 'Curly'), ('COILY', 'Coily')], max_length=20, null=True)),
                ('medical_notes', models.TextField(blank=True, null=True)),
                ('churn_risk_score', models.IntegerField(default=0, help_text='AI calculated score 0-100')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='crm_profile', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
