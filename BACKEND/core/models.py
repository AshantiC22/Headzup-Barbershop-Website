from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user              = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    name              = models.CharField(max_length=100)
    created_at        = models.DateTimeField(auto_now_add=True)
    security_question = models.CharField(max_length=200, blank=True, default="")
    security_answer   = models.CharField(max_length=200, blank=True, default="",
                                         help_text="Stored lowercase stripped for comparison")
    # Strike system
    strike_count      = models.PositiveIntegerField(default=0,
                                                    help_text="Total no-shows + last-minute cancels")
    deposit_fee       = models.DecimalField(max_digits=6, decimal_places=2, default=10.00,
                                            help_text="Base $10. Increases $1.50 per strike after first.")
    terms_accepted    = models.BooleanField(default=False,
                                            help_text="Client accepted deposit & strike T&C")
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    def get_deposit_fee(self):
        """Base $10 + $1.50 for every strike beyond the first."""
        from decimal import Decimal
        extra = max(0, self.strike_count - 1) * Decimal("1.50")
        return Decimal("10.00") + extra

    def __str__(self):
        return f"{self.user.username} — strikes:{self.strike_count} deposit:${self.get_deposit_fee()}"


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
    name             = models.CharField(max_length=100)
    user             = models.OneToOneField(
        User, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="barber_profile"
    )
    bio              = models.TextField(blank=True, default="")
    photo            = models.ImageField(upload_to="barbers/", blank=True, null=True)
    cashapp_tag      = models.CharField(max_length=50, blank=True, default="",
                                        help_text="Cash App $cashtag for manual payouts")
    stripe_account_id = models.CharField(max_length=100, blank=True, default="",
                                         help_text="Stripe Connect Express account ID — set when barber connects Stripe")

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

    user              = models.ForeignKey(User, on_delete=models.CASCADE)
    barber            = models.ForeignKey(Barber, on_delete=models.CASCADE)
    service           = models.ForeignKey(Service, on_delete=models.CASCADE)
    date              = models.DateField()
    time              = models.TimeField()
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")
    payment_method    = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default="shop")
    created_at        = models.DateTimeField(auto_now_add=True)
    review_notified   = models.BooleanField(default=False)
    reminder_sent          = models.BooleanField(default=False)   # client 24hr reminder
    reminder_2hr_sent      = models.BooleanField(default=False)   # client 2hr reminder
    barber_reminder_2hr    = models.BooleanField(default=False)   # barber 2hr reminder
    barber_reminder_now    = models.BooleanField(default=False)   # barber at-time reminder
    barber_notes      = models.TextField(blank=True, default="")
    client_notes      = models.TextField(blank=True, default="")
    is_walk_in        = models.BooleanField(default=False)
    # Deposit system
    deposit_amount    = models.DecimalField(max_digits=6, decimal_places=2, default=0.00,
                                            help_text="Deposit charged at booking time")
    deposit_paid      = models.BooleanField(default=False,
                                            help_text="True once deposit payment confirmed")
    deposit_session_id= models.CharField(max_length=200, blank=True, default="",
                                         help_text="Stripe session ID for deposit payment")
    late_cancel       = models.BooleanField(default=False,
                                            help_text="True if cancelled within 2 hours of appointment")

    class Meta:
        unique_together = ("barber", "date", "time")

    def __str__(self):
        return f"{self.user.username} - {self.barber.name} {self.date} {self.time}"


class NewsletterPost(models.Model):
    """Barber-created news feed posts — deals, promotions, updates."""
    CATEGORY_CHOICES = [
        ("deal",      "Deal / Discount"),
        ("promo",     "Promotion"),
        ("update",    "Shop Update"),
        ("event",     "Event"),
        ("general",   "General"),
    ]
    barber      = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="posts",
                                    null=True, blank=True)
    title       = models.CharField(max_length=200)
    body        = models.TextField()
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="general")
    emoji       = models.CharField(max_length=8, blank=True, default="✂️")
    active      = models.BooleanField(default=True)
    pinned      = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-pinned", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


class WaitlistEntry(models.Model):
    """Client added to waitlist for a fully booked slot."""
    barber      = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="waitlist")
    service     = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    client_name = models.CharField(max_length=100)
    client_phone= models.CharField(max_length=30, blank=True, default="")
    client_email= models.CharField(max_length=200, blank=True, default="")
    date        = models.DateField()
    notes       = models.TextField(blank=True, default="")
    notified    = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Waitlist: {self.client_name} for {self.barber.name} on {self.date}"


class BarberClient(models.Model):
    """Barber's relationship with a client — notes, VIP status, block list."""
    barber     = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="clients")
    client     = models.ForeignKey(User, on_delete=models.CASCADE, related_name="barber_relationships")
    notes      = models.TextField(blank=True, default="")
    is_vip     = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("barber", "client")

    def __str__(self):
        return f"{self.barber.name} → {self.client.username}"


class RescheduleRequest(models.Model):
    """Tracks a pending reschedule request from client or barber."""
    STATUS_CHOICES = [
        ("pending",  "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("expired",  "Expired"),
    ]
    INITIATED_BY_CHOICES = [
        ("client", "Client"),
        ("barber", "Barber"),
    ]

    appointment  = models.ForeignKey(Appointment, on_delete=models.CASCADE, related_name="reschedule_requests")
    initiated_by = models.CharField(max_length=10, choices=INITIATED_BY_CHOICES)
    new_date     = models.DateField()
    new_time     = models.TimeField()
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    token        = models.CharField(max_length=64, unique=True)  # for email accept/reject links
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reschedule for appt {self.appointment_id} — {self.status}"


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