"""
One-time cleanup command to remove hardcoded barber data.
Run: python manage.py clean_db
"""
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from core.models import Barber


class Command(BaseCommand):
    help = "Remove old hardcoded barber accounts from the database"

    def handle(self, *args, **kwargs):
        # Delete old barber profiles by name
        old_names = ["Jarvis", "Mr. J", "Mr.J", "jarvis", "mr.j"]
        deleted_barbers = Barber.objects.filter(name__in=old_names).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted barbers: {deleted_barbers}"))

        # Delete old user accounts by username
        old_usernames = ["jarvis", "mrj", "mr.j"]
        deleted_users = User.objects.filter(username__in=old_usernames).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted users: {deleted_users}"))

        # Show what's left
        remaining_barbers = list(Barber.objects.values_list("name", flat=True))
        remaining_users   = list(User.objects.values_list("username", flat=True))
        self.stdout.write(f"Remaining barbers: {remaining_barbers}")
        self.stdout.write(f"Remaining users: {remaining_users}")
        self.stdout.write(self.style.SUCCESS("Done."))