from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_phone_fields'),
    ]

    operations = [
        # Add pending_shop to status choices (no DB change needed — CharField)
        migrations.AlterField(
            model_name='appointment',
            name='status',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('pending_shop', 'Pending Shop Confirmation'),
                    ('confirmed',    'Confirmed'),
                    ('completed',    'Completed'),
                    ('no_show',      'No Show'),
                    ('cancelled',    'Cancelled'),
                ],
                default='confirmed',
            ),
        ),
        # Add shop_confirmed_at field
        migrations.AddField(
            model_name='appointment',
            name='shop_confirmed_at',
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text='When barber confirmed shop booking arrival',
            ),
        ),
    ]