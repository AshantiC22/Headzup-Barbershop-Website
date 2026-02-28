"""
Run this once to seed all services and barbers:
  python manage.py seed_data
"""

from django.core.management.base import BaseCommand
from core.models import Service, Barber


class Command(BaseCommand):
    help = "Seed the database with all services and barbers"

    def handle(self, *args, **kwargs):

        # ── Services ───────────────────────────────────────────────────────────
        services = [
            {"name": "Haircut & Shave",       "price": "35.00", "duration": "30 min"},
            {"name": "Haircut",                "price": "30.00", "duration": "30 min"},
            {"name": "Senior Cut and Shave",   "price": "30.00", "duration": "30 min"},
            {"name": "Kids Cutz (Age 1-12)",   "price": "25.00", "duration": "30 min"},
            {"name": "Line and Shave",         "price": "25.00", "duration": "30 min"},
            {"name": "Senior Cut",             "price": "25.00", "duration": "30 min"},
            {"name": "Beard Trim",             "price": "20.00", "duration": "15 min"},
            {"name": "Line",                   "price": "20.00", "duration": "15 min"},
            {"name": "Shave",                  "price": "20.00", "duration": "30 min"},
            {"name": "Kids Line",              "price": "15.00", "duration": "30 min"},
            {"name": "Senior Line",            "price": "15.00", "duration": "30 min"},
        ]

        created_count = 0
        for svc in services:
            obj, created = Service.objects.get_or_create(
                name=svc["name"],
                defaults={"price": svc["price"], "duration": svc["duration"]},
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Service: {obj.name} — ${obj.price}"))
            else:
                self.stdout.write(f"  – Service already exists: {obj.name}")

        # ── Barbers ────────────────────────────────────────────────────────────
        barbers = ["Jarvis", "Mr. J"]

        barber_count = 0
        for name in barbers:
            obj, created = Barber.objects.get_or_create(name=name)
            if created:
                barber_count += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Barber: {obj.name}"))
            else:
                self.stdout.write(f"  – Barber already exists: {obj.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. Created {created_count} service(s) and {barber_count} barber(s)."
            )
        )