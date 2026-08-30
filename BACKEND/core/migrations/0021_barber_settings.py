from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0020_merge_migrations"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="deposit_amount",
            field=models.DecimalField(
                decimal_places=2, default=10.0, max_digits=6,
                help_text="Deposit amount required to book online (default $10)"
            ),
        ),
        migrations.AddField(
            model_name="barber",
            name="strike_enabled",
            field=models.BooleanField(
                default=True,
                help_text="If True, no-show/late-cancel strikes increase deposit fee"
            ),
        ),
        migrations.AddField(
            model_name="barber",
            name="require_deposit",
            field=models.BooleanField(
                default=True,
                help_text="If True, clients must pay a deposit to book online"
            ),
        ),
    ]
