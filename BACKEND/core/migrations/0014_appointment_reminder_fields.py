from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0013_strike_deposit_system'),
    ]
    operations = [
        migrations.AddField(
            model_name='appointment',
            name='reminder_2hr_sent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='barber_reminder_2hr',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='barber_reminder_now',
            field=models.BooleanField(default=False),
        ),
    ]