from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies = [
        ('core', '0014_appointment_reminder_fields'),
    ]
    operations = [
        migrations.CreateModel(
            name='NewsletterPost',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title',      models.CharField(max_length=200)),
                ('body',       models.TextField()),
                ('category',   models.CharField(max_length=20, default='general',
                    choices=[('deal','Deal / Discount'),('promo','Promotion'),
                             ('update','Shop Update'),('event','Event'),('general','General')])),
                ('emoji',      models.CharField(max_length=8, blank=True, default='✂️')),
                ('active',     models.BooleanField(default=True)),
                ('pinned',     models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('barber',     models.ForeignKey(blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='posts', to='core.barber')),
            ],
            options={'ordering': ['-pinned', '-created_at']},
        ),
    ]