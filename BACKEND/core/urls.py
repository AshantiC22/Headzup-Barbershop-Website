from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from core.views import (
    BarberViewSet,
    ServiceViewSet,
    AppointmentViewSet,
    UserProfileViewSet,
    RegisterView,
    BarberRegisterView,
    DashboardView,
    CreateCheckoutSessionView,
    PaymentSuccessView,
    CheckUsernameView,
    PasswordResetView,
    PasswordResetConfirmView,
    AvailableSlotsView,
    HeadzUpTokenView,
    # Barber dashboard
    BarberMeView,
    BarberScheduleOwnView,
    BarberAppointmentUpdateView,
    BarberAvailabilityView,
    BarberTimeOffView,
    # New features
    WalkInBookingView,
    WaitlistView,
    SendRemindersView,
    BarberClientListView,
    BarberClientDetailView,
    BarberReportsView,
    ClientRescheduleRequestView,
    RescheduleResponseView,
    BarberRescheduleRequestView,
    TestEmailView,
    # Push notifications + reviews
    PushSubscriptionView,
    TriggerReviewNotificationView,
    HaircutReviewView,
    BarberReviewsView,
    VapidPublicKeyView,
)

router = DefaultRouter()
router.register(r"barbers",      BarberViewSet,      basename="barber")
router.register(r"services",     ServiceViewSet,     basename="service")
router.register(r"appointments", AppointmentViewSet, basename="appointment")
router.register(r"profiles",     UserProfileViewSet, basename="profile")

urlpatterns = [
    # Auth — custom token view embeds is_staff in JWT payload
    path("token/",         HeadzUpTokenView.as_view(),  name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(),  name="token_refresh"),
    path("register/",        RegisterView.as_view(),        name="register"),
    path("barber/register/", BarberRegisterView.as_view(),  name="barber_register"),
    path("dashboard/",       DashboardView.as_view(),       name="dashboard"),

    # Auth helpers
    path("check-username/",         CheckUsernameView.as_view(),        name="check_username"),
    path("password-reset/",         PasswordResetView.as_view(),        name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),

    # Booking
    path("available-slots/", AvailableSlotsView.as_view(), name="available_slots"),

    # Stripe
    path("create-checkout-session/", CreateCheckoutSessionView.as_view(), name="create_checkout_session"),
    path("payment-success/",         PaymentSuccessView.as_view(),        name="payment_success"),

    # Barber dashboard
    path("barber/me/",                    BarberMeView.as_view(),               name="barber_me"),
    path("barber/schedule/",              BarberScheduleOwnView.as_view(),      name="barber_schedule_own"),
    path("barber/appointments/<int:pk>/", BarberAppointmentUpdateView.as_view(),name="barber_appt_update"),
    path("barber/availability/",          BarberAvailabilityView.as_view(),     name="barber_availability"),
    path("barber/time-off/",              BarberTimeOffView.as_view(),          name="barber_time_off"),
    path("barber/time-off/<int:pk>/",     BarberTimeOffView.as_view(),          name="barber_time_off_delete"),
    path("barber/reviews/",               BarberReviewsView.as_view(),          name="barber_reviews"),
    # Walk-in + waitlist + reminders
    path("barber/walk-in/",               WalkInBookingView.as_view(),          name="barber_walk_in"),
    path("barber/waitlist/",              WaitlistView.as_view(),               name="barber_waitlist"),
    path("barber/waitlist/<int:pk>/",     WaitlistView.as_view(),               name="barber_waitlist_item"),
    path("barber/send-reminders/",        SendRemindersView.as_view(),          name="send_reminders"),
    # Client management
    path("barber/clients/",              BarberClientListView.as_view(),        name="barber_clients"),
    path("barber/clients/<int:pk>/",     BarberClientDetailView.as_view(),      name="barber_client_detail"),
    # Reports
    path("barber/reports/",              BarberReportsView.as_view(),           name="barber_reports"),
    # Test email (debug)
    path("test-email/",                  TestEmailView.as_view(),               name="test_email"),
    # Reschedule requests
    path("appointments/<int:pk>/reschedule/",        ClientRescheduleRequestView.as_view(),  name="client_reschedule"),
    path("barber/appointments/<int:pk>/reschedule/", BarberRescheduleRequestView.as_view(),  name="barber_reschedule"),
    path("reschedule/respond/",                      RescheduleResponseView.as_view(),       name="reschedule_respond"),

    # Push notifications
    path("push/subscribe/",              PushSubscriptionView.as_view(),             name="push_subscribe"),
    path("push/vapid-key/",              VapidPublicKeyView.as_view(),               name="vapid_key"),
    path("review/trigger/<int:pk>/",     TriggerReviewNotificationView.as_view(),    name="review_trigger"),
    path("review/submit/",               HaircutReviewView.as_view(),                name="review_submit"),

    path("", include(router.urls)),
]