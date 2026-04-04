from django.db import migrations, models
import decimal

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0012_security_and_stripe'),
    ]
    operations = [
        # UserProfile — strike + deposit tracking
        migrations.AddField(
            model_name='userprofile',
            name='strike_count',
            field=models.PositiveIntegerField(default=0,
                help_text='Total no-shows + last-minute cancels'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='deposit_fee',
            field=models.DecimalField(max_digits=6, decimal_places=2,
                default=decimal.Decimal('10.00'),
                help_text='Base $10. Increases $1.50 per strike after first.'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='terms_accepted',
            field=models.BooleanField(default=False,
                help_text='Client accepted deposit & strike T&C'),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='terms_accepted_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        # Appointment — deposit fields
        migrations.AddField(
            model_name='appointment',
            name='deposit_amount',
            field=models.DecimalField(max_digits=6, decimal_places=2,
                default=decimal.Decimal('0.00'),
                help_text='Deposit charged at booking time'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='deposit_paid',
            field=models.BooleanField(default=False,
                help_text='True once deposit payment confirmed'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='deposit_session_id',
            field=models.CharField(max_length=200, blank=True, default='',
                help_text='Stripe session ID for deposit payment'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='late_cancel',
            field=models.BooleanField(default=False,
                help_text='True if cancelled within 2 hours of appointment'),
        ),
    ]