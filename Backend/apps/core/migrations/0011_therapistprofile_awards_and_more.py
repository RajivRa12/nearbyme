from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_customerprofile'),
    ]

    operations = [
        migrations.AddField(
            model_name='therapistprofile',
            name='awards',
            field=models.JSONField(blank=True, default=list, help_text='List of awards'),
        ),
        migrations.AddField(
            model_name='therapistprofile',
            name='certificates',
            field=models.JSONField(blank=True, default=list, help_text='List of certificate names/urls'),
        ),
        migrations.AddField(
            model_name='therapistprofile',
            name='languages',
            field=models.JSONField(blank=True, default=list, help_text='List of spoken languages'),
        ),
        migrations.CreateModel(
            name='BeforeAfterGallery',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('before_photo_url', models.URLField(blank=True, null=True)),
                ('after_photo_url', models.URLField(blank=True, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transformation_galleries', to=settings.AUTH_USER_MODEL)),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.service')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='galleries', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
