"""
Run this once to seed all services:
  python manage.py seed_data
"""

from django.core.management.base import BaseCommand
from core.models import Service


class Command(BaseCommand):
    help = "Seed the database with all services"

    def handle(self, *args, **kwargs):

        # ── Services ───────────────────────────────────────────────────────────
        services = [
            {"name": "Haircut & Shave",       "price": "35.00", "duration_minutes": 30},
            {"name": "Haircut",                "price": "30.00", "duration_minutes": 30},
            {"name": "Senior Cut and Shave",   "price": "30.00", "duration_minutes": 30},
            {"name": "Kids Cutz (Age 1-12)",   "price": "25.00", "duration_minutes": 30},
            {"name": "Line and Shave",         "price": "25.00", "duration_minutes": 30},
            {"name": "Senior Cut",             "price": "25.00", "duration_minutes": 30},
            {"name": "Beard Trim",             "price": "20.00", "duration_minutes": 15},
            {"name": "Line",                   "price": "20.00", "duration_minutes": 15},
            {"name": "Shave",                  "price": "20.00", "duration_minutes": 30},
            {"name": "Kids Line",              "price": "15.00", "duration_minutes": 30},
            {"name": "Senior Line",            "price": "15.00", "duration_minutes": 30},
        ]

        created_count = 0
        for svc in services:
            obj, created = Service.objects.get_or_create(
                name=svc["name"],
                defaults={"price": svc["price"], "duration_minutes": svc["duration_minutes"]},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Service: {obj.name} — ${obj.price}"))
            else:
                self.stdout.write(f"  – Service already exists: {obj.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_count} service(s).\n"
                f"Barbers are created via the barber signup page using an invite code."
            )
        )