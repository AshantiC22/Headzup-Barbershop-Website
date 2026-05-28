from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_newsletterpost"),
    ]
    operations = [
        migrations.AddField(
            model_name="review",
            name="barber_seen",
            field=models.BooleanField(default=False),
        ),
    ]
