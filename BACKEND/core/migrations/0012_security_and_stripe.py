from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0011_reschedulerequest'),
    ]
    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='security_question',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='userprofile',
            name='security_answer',
            field=models.CharField(
                blank=True, default='',
                help_text='Stored lowercase stripped for comparison',
                max_length=200
            ),
        ),
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