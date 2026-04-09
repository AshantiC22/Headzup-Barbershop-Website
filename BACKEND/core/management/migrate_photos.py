"""
management/commands/migrate_photos.py

Run once after deploying: python manage.py migrate_photos
Converts any barber photos stored on the filesystem into base64
stored in the photo_data field so they survive redeploys.
"""
from django.core.management.base import BaseCommand
import base64, logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Convert filesystem barber photos to base64 in photo_data field"

    def handle(self, *args, **kwargs):
        from core.models import Barber
        converted = 0
        for barber in Barber.objects.all():
            if barber.photo_data:
                self.stdout.write(f"  {barber.name}: already has photo_data — skipping")
                continue
            if not barber.photo:
                self.stdout.write(f"  {barber.name}: no photo — skipping")
                continue
            try:
                barber.photo.open("rb")
                raw = barber.photo.read()
                barber.photo.close()
                name = barber.photo.name.lower()
                mime = "image/png" if name.endswith(".png") else "image/webp" if name.endswith(".webp") else "image/jpeg"
                b64  = base64.b64encode(raw).decode("utf-8")
                barber.photo_data = f"data:{mime};base64,{b64}"
                barber.save(update_fields=["photo_data"])
                converted += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {barber.name} — photo converted ({len(raw)//1024}KB)"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ {barber.name} — failed: {e}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone. {converted} photo(s) converted to base64."))