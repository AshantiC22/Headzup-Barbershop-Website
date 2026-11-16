"""
Create or update the Django admin account from environment variables.

    DJANGO_SUPERUSER_USERNAME   default: headzup_admin
    DJANGO_SUPERUSER_PASSWORD   required to create or update the account
    DJANGO_SUPERUSER_EMAIL      optional

Runs on every deploy (see the Dockerfile). It never fails the deploy: with no
password set it only warns.

This command used to create `headzup_admin` with a password written in this
file, and reset it to that on every deploy. The repo is public, so that
password has to stop working even on a server where nobody has set
DJANGO_SUPERUSER_PASSWORD yet.
"""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

LEGACY_USERNAME = "headzup_admin"


class Command(BaseCommand):
    help = "Create or update the admin account from DJANGO_SUPERUSER_* environment variables"

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "").strip() or LEGACY_USERNAME
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "").strip()

        if password:
            user, created = User.objects.get_or_create(username=username, defaults={"email": email})
            user.set_password(password)
            user.is_staff = True
            user.is_superuser = True
            if email:
                user.email = email
            user.save()
            self.stdout.write(f"{'Created' if created else 'Updated'} admin account: {username}")
        else:
            self.stdout.write(
                self.style.WARNING(
                    "DJANGO_SUPERUSER_PASSWORD is not set, so no admin account was created or updated. "
                    "Set it (check the variable name has no trailing space) and redeploy to sign in to /admin."
                )
            )

        # Retire the old committed password unless this run just replaced it.
        if not (password and username == LEGACY_USERNAME):
            legacy = User.objects.filter(username=LEGACY_USERNAME).first()
            if legacy and legacy.has_usable_password():
                legacy.set_unusable_password()
                legacy.save(update_fields=["password"])
                self.stdout.write(
                    self.style.WARNING(f"Disabled password sign-in for {LEGACY_USERNAME}: its old password was public.")
                )
