from django.contrib import admin
from .models import UserProfile
from .models import Barber, Service, Appointment

# Register your models here.
admin.site.register(UserProfile)
admin.site.register(Barber)
admin.site.register(Service)
admin.site.register(Appointment)