from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)


class Service(models.Model):
    name             = models.CharField(max_length=100)
    price            = models.DecimalField(max_digits=6, decimal_places=2)
    duration_minutes = models.PositiveIntegerField(default=30)

    def __str__(self):
        return self.name


DAYS_OF_WEEK = [
    (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
    (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
]


class Barber(models.Model):
    name  = models.CharField(max_length=100)
    user  = models.OneToOneField(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="barber_profile"
    )
    bio   = models.TextField(blank=True, default="")
    photo = models.CharField(max_length=200, blank=True, default="")

    def __str__(self):
        return self.name


class BarberAvailability(models.Model):
    barber      = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="availability")
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    start_time  = models.TimeField()
    end_time    = models.TimeField()
    is_working  = models.BooleanField(default=True)

    class Meta:
        unique_together = ("barber", "day_of_week")

    def __str__(self):
        return f"{self.barber.name} - {self.get_day_of_week_display()} {self.start_time}-{self.end_time}"


class BarberTimeOff(models.Model):
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="time_off")
    date   = models.DateField()
    reason = models.CharField(max_length=200, blank=True, default="")

    class Meta:
        unique_together = ("barber", "date")

    def __str__(self):
        return f"{self.barber.name} off on {self.date}"


class Appointment(models.Model):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("completed", "Completed"),
        ("no_show",   "No Show"),
        ("cancelled", "Cancelled"),
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
    # Track whether post-haircut notification was sent
    review_notified = models.BooleanField(default=False)

    class Meta:
        unique_together = ("barber", "date", "time")

    def __str__(self):
        return f"{self.user.username} - {self.barber.name} {self.date} {self.time}"


class Review(models.Model):
    """Client review submitted after haircut notification."""
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name="review")
    barber      = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="reviews")
    client      = models.ForeignKey(User, on_delete=models.CASCADE)
    completed   = models.BooleanField(default=True)   # True = yes haircut done, False = no
    rating      = models.PositiveSmallIntegerField(default=5)  # 1-5, auto 5 on yes
    comment     = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.client.username} -> {self.barber.name} ({'done' if self.completed else 'no-show'})"


class PushSubscription(models.Model):
    """Stores Web Push subscription for a user (for PWA notifications)."""
    user          = models.OneToOneField(User, on_delete=models.CASCADE, related_name="push_subscription")
    endpoint      = models.TextField()
    p256dh        = models.TextField()   # public key
    auth          = models.TextField()   # auth secret
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Push sub for {self.user.username}"