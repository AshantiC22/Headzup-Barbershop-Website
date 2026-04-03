from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0002_barber_cashapp_tag'),
    ]
    operations = [
        migrations.AddField(
            model_name='barber',
            name='stripe_account_id',
            field=models.CharField(
                blank=True, default='',
                help_text='Stripe Connect Express account ID',
                max_length=100
            ),
        ),
    ]