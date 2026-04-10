from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0017_barber_photo_data'),
    ]

    operations = [
        migrations.CreateModel(
            name='BarberServicePrice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price', models.DecimalField(decimal_places=2, max_digits=6)),
                ('barber', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='custom_prices', to='core.barber')),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='barber_prices', to='core.service')),
            ],
            options={
                'unique_together': {('barber', 'service')},
            },
        ),
    ]