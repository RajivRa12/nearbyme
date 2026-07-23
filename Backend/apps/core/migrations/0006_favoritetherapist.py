from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0005_trainingvideo_therapistprofile_customernote_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='FavoriteTherapist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorite_therapists', to=settings.AUTH_USER_MODEL)),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='favorited_by', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('customer', 'therapist')},
            },
        ),
    ]
