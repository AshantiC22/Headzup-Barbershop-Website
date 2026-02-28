from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)


class Service(models.Model):
    name            = models.CharField(max_length=100)
    price           = models.DecimalField(max_digits=6, decimal_places=2)
    duration_minutes= models.PositiveIntegerField(default=30)  # NEW — service duration

    def __str__(self):
        return self.name


DAYS_OF_WEEK = [
    (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
    (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
]


class Barber(models.Model):
    name = models.CharField(max_length=100)
    user = models.OneToOneField(             # NEW — links barber to a login account
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="barber_profile"
    )
    bio   = models.TextField(blank=True, default="")
    photo = models.CharField(max_length=200, blank=True, default="")  # path to image

    def __str__(self):
        return self.name


class BarberAvailability(models.Model):
    """Working hours per day of week for a barber."""
    barber     = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="availability")
    day_of_week= models.IntegerField(choices=DAYS_OF_WEEK)  # 0=Mon … 6=Sun
    start_time = models.TimeField()   # e.g. 09:00
    end_time   = models.TimeField()   # e.g. 18:00
    is_working = models.BooleanField(default=True)

    class Meta:
        unique_together = ("barber", "day_of_week")

    def __str__(self):
        return f"{self.barber.name} — {self.get_day_of_week_display()} {self.start_time}–{self.end_time}"


class BarberTimeOff(models.Model):
    """Specific dates a barber is unavailable (vacation, sick day, etc.)"""
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="time_off")
    date   = models.DateField()
    reason = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        unique_together = ("barber", "date")

    def __str__(self):
        return f"{self.barber.name} off on {self.date}"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("confirmed",  "Confirmed"),
        ("completed",  "Completed"),
        ("no_show",    "No Show"),
        ("cancelled",  "Cancelled"),
    ]
    PAYMENT_CHOICES = [
        ("online", "Online"),
        ("shop",   "Pay In Shop"),
    ]

    user           = models.ForeignKey(User, on_delete=models.CASCADE)
    barber         = models.ForeignKey(Barber, on_delete=models.CASCADE)
    service        = models.ForeignKey(Service, on_delete=models.CASCADE)
    date           = models.DateField()
    time           = models.TimeField()
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default="shop")
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("barber", "date", "time")

    def __str__(self):
        return f"{self.user.username} — {self.barber.name} {self.date} {self.time}"