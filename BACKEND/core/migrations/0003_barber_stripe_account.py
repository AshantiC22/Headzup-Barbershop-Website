from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0001_initial'),
    ]
    operations = [
        migrations.AddField(
            model_name='barber',
            name='cashapp_tag',
            field=models.CharField(
                blank=True, default='',
                help_text='Cash App $cashtag for manual payouts',
                max_length=50
            ),
        ),
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