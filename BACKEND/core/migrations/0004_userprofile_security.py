from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_barber_stripe_account'),
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
            field=models.CharField(blank=True, default='',
                                   help_text='Stored lowercase stripped for comparison',
                                   max_length=200),
        ),
    ]