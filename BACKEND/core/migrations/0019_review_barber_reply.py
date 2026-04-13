from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_barber_service_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='barber_reply',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='review',
            name='replied_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
