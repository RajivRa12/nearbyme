from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_therapistprofile_awards_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='gateway_fee',
            field=models.DecimalField(decimal_places=2, default=0.0, help_text='Calculated payment processing fee', max_digits=10),
        ),
        migrations.AddField(
            model_name='invoice',
            name='platform_fee',
            field=models.DecimalField(decimal_places=2, default=0.0, help_text='Calculated revenue for Nearbyme', max_digits=10),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='gateway_fee_percentage',
            field=models.DecimalField(decimal_places=2, default=2.0, help_text='Payment processing fee', max_digits=5),
        ),
        migrations.AddField(
            model_name='platformsettings',
            name='platform_commission_percentage',
            field=models.DecimalField(decimal_places=2, default=10.0, help_text='Platform cut from marketplace bookings', max_digits=5),
        ),
        migrations.AddField(
            model_name='service',
            name='is_premium_listing',
            field=models.BooleanField(default=False, help_text='Bumps service in marketplace search for a fee'),
        ),
        migrations.AddField(
            model_name='store',
            name='is_premium_listing',
            field=models.BooleanField(default=False, help_text='Bumps store in marketplace search for a fee'),
        ),
        migrations.AddField(
            model_name='trainingvideo',
            name='is_premium',
            field=models.BooleanField(default=False, help_text='Requires payment to access'),
        ),
        migrations.AddField(
            model_name='trainingvideo',
            name='price',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
    ]
