from datetime import date, time
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


NOTIFIERS = (
    "send_booking_confirmation", "send_deposit_paid_email", "sms_booking_confirmation",
    "sms_deposit_paid", "send_push_notification", "_twilio_send",
)
WEBHOOK_SECRET = "whsec_test_secret"


class PaidCheckoutBase(TestCase):
    """A paid deposit checkout for one slot, and helpers to deliver it by
    redirect or by signed webhook with the notifiers stubbed out."""

    def setUp(self):
        import stripe

        self.stripe = stripe
        self.user = User.objects.create_user(username="client", password="pw-123456")
        self.service = Service.objects.create(name="Haircut & Shave", price="35.00")
        self.barber = Barber.objects.create(name="Marcus Bell")
        self.session_data = {
            "id": "cs_test_1",
            "object": "checkout.session",
            "payment_status": "paid",
            "metadata": {
                "kind": "deposit", "user_id": str(self.user.id), "service_id": str(self.service.id),
                "barber_id": str(self.barber.id), "date": "2026-11-20", "time": "10:00",
                "deposit_amount": "10.00", "remaining": "25.00",
                "service_name": "Haircut & Shave", "barber_name": "Marcus Bell",
            },
        }
        patcher = mock.patch.multiple("core.views", **{name: mock.DEFAULT for name in NOTIFIERS})
        self.notifiers = patcher.start()
        self.addCleanup(patcher.stop)

    def session(self, **changes):
        return self.stripe.checkout.Session.construct_from({**self.session_data, **changes}, "sk_test")

    def redirect(self, **changes):
        with mock.patch("core.views.stripe.checkout.Session.retrieve", return_value=self.session(**changes)):
            return self.client.get("/api/deposit-success/?session_id=cs_test_1")

    def webhook(self, event_type="checkout.session.completed", secret=WEBHOOK_SECRET, sign_with=None, **changes):
        import hashlib
        import hmac
        import json
        import time as clock

        payload = json.dumps({
            "id": "evt_1", "object": "event", "type": event_type,
            "data": {"object": {**self.session_data, **changes}},
        })
        stamp = int(clock.time())
        key = (sign_with or secret).encode()
        sig = hmac.new(key, f"{stamp}.{payload}".encode(), hashlib.sha256).hexdigest()
        with override_settings(STRIPE_WEBHOOK_SECRET=secret):
            return self.client.post(
                "/api/stripe/webhook/", payload, content_type="application/json",
                HTTP_STRIPE_SIGNATURE=f"t={stamp},v1={sig}",
            )

    def confirmations_sent(self):
        return self.notifiers["send_booking_confirmation"].call_count


@override_settings(FRONTEND_URL="https://headzupp.com")
class DepositRedirect(PaidCheckoutBase):
    def test_service_name_with_ampersand_survives_the_redirect(self):
        res = self.redirect()
        self.assertEqual(res.status_code, 302)
        query = parse_qs(urlparse(res["Location"]).query)
        self.assertEqual(query["service"], ["Haircut & Shave"])
        self.assertEqual(query["barber"], ["Marcus Bell"])
        self.assertEqual(query["payment"], ["deposit"])

    def test_books_the_appointment_with_the_deposit_paid(self):
        self.redirect()
        appt = Appointment.objects.get(user=self.user)
        self.assertTrue(appt.deposit_paid)
        self.assertEqual(appt.deposit_session_id, "cs_test_1")
        self.assertEqual(appt.date, date(2026, 11, 20))
        self.assertEqual(appt.time, time(10, 0))
        self.assertEqual(self.confirmations_sent(), 1)

    def test_an_unpaid_session_books_nothing(self):
        # A client could start checkout, copy the session id from Stripe's URL
        # and cancel; the redirect used to book it as paid anyway.
        res = self.redirect(payment_status="unpaid")
        self.assertIn("/book?deposit_canceled=true", res["Location"])
        self.assertFalse(Appointment.objects.exists())


class StripeWebhook(PaidCheckoutBase):
    def test_books_a_paid_checkout_when_the_client_never_comes_back(self):
        res = self.webhook()
        self.assertEqual(res.status_code, 200)
        appt = Appointment.objects.get(user=self.user)
        self.assertTrue(appt.deposit_paid)
        self.assertEqual(appt.payment_method, "online")
        self.assertEqual(self.confirmations_sent(), 1)
        self.notifiers["send_deposit_paid_email"].assert_called_once()

    def test_webhook_then_redirect_books_and_notifies_once(self):
        self.webhook()
        res = self.redirect()
        self.assertIn("/booking-confirmed?", res["Location"])
        self.assertNotIn("error", res["Location"])
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(self.confirmations_sent(), 1)
        self.assertEqual(self.notifiers["send_deposit_paid_email"].call_count, 1)

    def test_redirect_then_webhook_books_and_notifies_once(self):
        self.redirect()
        self.assertEqual(self.webhook().status_code, 200)
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(self.confirmations_sent(), 1)

    def test_stripe_retrying_the_same_event_is_harmless(self):
        self.webhook()
        self.webhook()
        self.assertEqual(Appointment.objects.count(), 1)
        self.assertEqual(self.confirmations_sent(), 1)

    def test_records_the_deposit_on_an_existing_unpaid_booking(self):
        Appointment.objects.create(
            user=self.user, service=self.service, barber=self.barber,
            date="2026-11-20", time="10:00", payment_method="shop",
        )
        self.webhook()
        appt = Appointment.objects.get(user=self.user)
        self.assertTrue(appt.deposit_paid)
        self.assertEqual(self.confirmations_sent(), 0)  # booking already confirmed earlier
        self.notifiers["send_deposit_paid_email"].assert_called_once()

    def test_wrong_signature_is_refused(self):
        res = self.webhook(sign_with="whsec_someone_else")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Appointment.objects.exists())

    def test_nothing_is_processed_without_a_configured_secret(self):
        res = self.webhook(secret="", sign_with="anything")
        self.assertEqual(res.status_code, 503)
        self.assertFalse(Appointment.objects.exists())

    def test_unpaid_sessions_and_other_events_are_ignored(self):
        self.assertEqual(self.webhook(payment_status="unpaid").status_code, 200)
        self.assertEqual(self.webhook(event_type="checkout.session.expired").status_code, 200)
        self.assertFalse(Appointment.objects.exists())

    def test_a_slot_taken_by_someone_else_is_logged_not_retried(self):
        other = User.objects.create_user(username="other", password="pw-123456")
        Appointment.objects.create(user=other, service=self.service, barber=self.barber, date="2026-11-20", time="10:00")
        with self.assertLogs("core.views", level="ERROR") as logs:
            res = self.webhook()
        self.assertEqual(res.status_code, 200)
        self.assertIn("slot taken", logs.output[0])
        self.assertEqual(Appointment.objects.get().user, other)
        self.assertEqual(self.confirmations_sent(), 0)


class MakeAdmin(TestCase):
    """The admin account comes from the environment, and the old committed
    password stops working whether or not the environment sets one."""

    def run_with(self, **env):
        from io import StringIO

        from django.core.management import call_command

        clean = {k: "" for k in ("DJANGO_SUPERUSER_USERNAME", "DJANGO_SUPERUSER_PASSWORD", "DJANGO_SUPERUSER_EMAIL")}
        with mock.patch.dict("os.environ", {**clean, **env}):
            call_command("make_admin", stdout=StringIO())

    def test_creates_the_admin_from_the_environment(self):
        self.run_with(DJANGO_SUPERUSER_USERNAME="owner", DJANGO_SUPERUSER_PASSWORD="a-long-new-password")
        owner = User.objects.get(username="owner")
        self.assertTrue(owner.is_superuser and owner.is_staff)
        self.assertTrue(owner.check_password("a-long-new-password"))

    def test_without_a_password_it_disables_the_legacy_account(self):
        User.objects.create_superuser("headzup_admin", "", "the-old-public-one")
        self.run_with()
        self.assertFalse(User.objects.get(username="headzup_admin").has_usable_password())

    def test_a_new_password_for_the_legacy_name_replaces_the_old_one(self):
        User.objects.create_superuser("headzup_admin", "", "the-old-public-one")
        self.run_with(DJANGO_SUPERUSER_PASSWORD="a-long-new-password")
        admin = User.objects.get(username="headzup_admin")
        self.assertTrue(admin.check_password("a-long-new-password"))
        self.assertFalse(admin.check_password("the-old-public-one"))

    def test_a_different_admin_name_still_retires_the_legacy_account(self):
        User.objects.create_superuser("headzup_admin", "", "the-old-public-one")
        self.run_with(DJANGO_SUPERUSER_USERNAME="owner", DJANGO_SUPERUSER_PASSWORD="a-long-new-password")
        self.assertFalse(User.objects.get(username="headzup_admin").has_usable_password())


class BarberInviteCode(TestCase):
    payload = {"username": "newbarber", "email": "nb@example.com", "password": "pw-123456", "full_name": "New Barber"}

    @override_settings(BARBER_INVITE_CODE="")
    def test_sign_up_is_off_without_a_configured_code(self):
        res = self.client.post("/api/barber/register/", {**self.payload, "invite_code": ""}, content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(User.objects.filter(username="newbarber").exists())

    @override_settings(BARBER_INVITE_CODE="SHOP-CODE")
    def test_wrong_code_is_refused_and_right_code_works(self):
        bad = self.client.post("/api/barber/register/", {**self.payload, "invite_code": "HEADZUP2026"}, content_type="application/json")
        self.assertEqual(bad.status_code, 400)
        good = self.client.post("/api/barber/register/", {**self.payload, "invite_code": "shop-code"}, content_type="application/json")
        self.assertIn(good.status_code, (200, 201))
        self.assertTrue(User.objects.get(username="newbarber").is_staff)


class Recovery(TestCase):
    """Security-question recovery: no lookup by answer alone, and guessing locks."""

    def setUp(self):
        from django.core.cache import cache

        from core.models import UserProfile

        cache.clear()
        self.user = User.objects.create_user(username="client", password="old-password-1")
        UserProfile.objects.update_or_create(
            user=self.user, defaults={"security_question": "What city were you born in?", "security_answer": "hattiesburg"}
        )

    def step2(self, answer):
        return self.client.post(
            "/api/recovery/step2/", {"user_id": self.user.pk, "answer": answer}, content_type="application/json"
        )

    def test_answer_only_lookup_is_gone(self):
        res = self.client.post(
            "/api/recovery/step1-by-question/",
            {"question": "What city were you born in?", "answer": "hattiesburg"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 404)

    def test_right_answer_gets_a_token(self):
        res = self.step2("Hattiesburg")
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.json())

    def test_five_wrong_answers_lock_the_account_for_an_hour(self):
        for guess in ("jackson", "biloxi", "meridian", "tupelo", "laurel"):
            self.assertEqual(self.step2(guess).status_code, 400)
        locked = self.step2("hattiesburg")
        self.assertEqual(locked.status_code, 429)
        self.assertNotIn("token", locked.json())

    def test_non_ascii_answers_do_not_crash(self):
        self.assertEqual(self.step2("héllo 🙂").status_code, 400)


class StaffOnlyEndpoints(TestCase):
    def test_test_email_needs_an_admin(self):
        res = self.client.post("/api/test-email/", {"to": "someone@example.com"}, content_type="application/json")
        self.assertIn(res.status_code, (401, 403))

    def test_barber_payments_loads(self):
        from rest_framework.test import APIClient

        user = User.objects.create_user(username="barber", password="pw-123456", is_staff=True)
        Barber.objects.create(name="Marcus Bell", user=user)
        api = APIClient()
        api.force_authenticate(user)
        for period in ("week", "month", "year"):
            res = api.get(f"/api/barber/payments/?period={period}")
            self.assertEqual(res.status_code, 200, res.content[:200])
