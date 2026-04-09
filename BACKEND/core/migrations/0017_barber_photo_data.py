from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0016_phone_and_pending_shop'),
    ]

    operations = [
        migrations.AddField(
            model_name='barber',
            name='photo_data',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Base64 encoded photo — persists across deploys',
            ),
        ),
    ]