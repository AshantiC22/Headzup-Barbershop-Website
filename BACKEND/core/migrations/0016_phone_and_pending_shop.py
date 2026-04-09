from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Combined migration — merges 0016_phone_fields and 0017_pending_shop_status.
    Depends only on 0015_newsletterpost which is confirmed in the repo.
    """

    dependencies = [
        ('core', '0015_newsletterpost'),
    ]

    operations = [
        # ── Phone field on UserProfile (from 0016) ──
        migrations.AddField(
            model_name='userprofile',
            name='phone',
            field=models.CharField(
                max_length=20,
                blank=True,
                default='',
                help_text='Mobile number for SMS e.g. +16015551234',
            ),
        ),

        # ── pending_shop status + shop_confirmed_at on Appointment (from 0017) ──
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