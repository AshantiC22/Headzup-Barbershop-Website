from django.contrib import admin
from .models import (
    UserProfile, Barber, Service, Appointment,
    BarberAvailability, BarberTimeOff,
    PushSubscription, Review,
)

# ── Site branding ─────────────────────────────────────────────────────────────
admin.site.site_header  = "HEADZ UP Admin"
admin.site.site_title   = "HEADZ UP"
admin.site.index_title  = "Shop Management"


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ("user", "name", "created_at")
    search_fields = ("user__username", "user__email", "name")


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display  = ("name", "user", "bio")
    search_fields = ("name", "user__username")


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ("name", "price", "duration_minutes")
    search_fields = ("name",)


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display   = ("user", "barber", "service", "date", "time", "status", "payment_method", "created_at")
    list_filter    = ("status", "payment_method", "barber", "date")
    search_fields  = ("user__username", "user__email", "barber__name", "service__name")
    ordering       = ("-date", "-time")
    date_hierarchy = "date"
    list_editable  = ("status",)


@admin.register(BarberAvailability)
class BarberAvailabilityAdmin(admin.ModelAdmin):
    list_display  = ("barber", "day_of_week", "start_time", "end_time", "is_working")
    list_filter   = ("barber", "is_working")


@admin.register(BarberTimeOff)
class BarberTimeOffAdmin(admin.ModelAdmin):
    list_display  = ("barber", "date", "reason")
    list_filter   = ("barber",)
    ordering      = ("date",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ("client", "barber", "rating", "completed", "created_at")
    list_filter   = ("barber", "completed", "rating")
    ordering      = ("-created_at",)


@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display  = ("user", "created_at", "updated_at")
    search_fields = ("user__username",)