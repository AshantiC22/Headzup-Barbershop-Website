from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = "Create the HEADZ UP superuser if it does not exist"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = "headzup_admin"
        password = "HeadzUp2026!"
        email    = "bdkshan18@gmail.com"

        if User.objects.filter(username=username).exists():
            u = User.objects.get(username=username)
            u.set_password(password)
            u.is_staff     = True
            u.is_superuser = True
            u.save()
            self.stdout.write(f"✓ Updated existing admin: {username}")
        else:
            User.objects.create_superuser(username, email, password)
            self.stdout.write(f"✓ Created admin: {username}")