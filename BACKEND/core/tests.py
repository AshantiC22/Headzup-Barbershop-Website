from datetime import date, time
from types import SimpleNamespace
from unittest import mock
from urllib.parse import parse_qs, urlparse

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from core.models import Appointment, Barber, Service

User = get_user_model()


class PasswordResetRoutesRemoved(TestCase):
    """The old reset endpoints handed a reset token to anyone who typed a
    username. Recovery goes through the security-question flow instead."""

    def test_token_endpoint_is_gone(self):
        User.objects.create_user(username="victim", password="correct-horse-1")
        res = self.client.post("/api/password-reset/", {"identifier": "victim"}, content_type="application/json")
        self.assertEqual(res.status_code, 404)
        self.assertNotIn(b"token", res.content)

    def test_confirm_endpoint_is_gone(self):
        res = self.client.post("/api/password-reset/confirm/", {}, content_type="application/json")
        self.assertEqual(res.status_code, 404)


@override_settings(FRONTEND_URL="https://headzupp.com")
class DepositSuccessRedirect(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="client", password="pw-123456")
        self.service = Service.objects.create(name="Haircut & Shave", price="35.00")
        self.barber = Barber.objects.create(name="Marcus Bell")
        self.session = SimpleNamespace(metadata={
            "user_id": str(self.user.id), "service_id": str(self.service.id), "barber_id": str(self.barber.id),
            "date": "2026-11-20", "time": "10:00", "deposit_amount": "10.00", "remaining": "25.00",
            "service_name": "Haircut & Shave", "barber_name": "Marcus Bell",
        })

    def _get(self):
        quiet = {name: mock.DEFAULT for name in (
            "send_booking_confirmation", "send_deposit_paid_email", "sms_booking_confirmation",
            "sms_deposit_paid", "send_push_notification", "_twilio_send",
        )}
        with mock.patch("core.views.stripe.checkout.Session.retrieve", return_value=self.session), \
             mock.patch.multiple("core.views", **quiet):
            return self.client.get("/api/deposit-success/?session_id=cs_test_1")

    def test_service_name_with_ampersand_survives_the_redirect(self):
        res = self._get()
        self.assertEqual(res.status_code, 302)
        query = parse_qs(urlparse(res["Location"]).query)
        self.assertEqual(query["service"], ["Haircut & Shave"])
        self.assertEqual(query["barber"], ["Marcus Bell"])
        self.assertEqual(query["payment"], ["deposit"])

    def test_books_the_appointment_with_the_deposit_paid(self):
        self._get()
        appt = Appointment.objects.get(user=self.user)
        self.assertTrue(appt.deposit_paid)
        self.assertEqual(appt.date, date(2026, 11, 20))
        self.assertEqual(appt.time, time(10, 0))
