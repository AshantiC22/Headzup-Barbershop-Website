from rest_framework import serializers
from django.contrib.auth import get_user_model
import stripe
from decimal import Decimal
from django.conf import settings
from django.db import IntegrityError
from django.shortcuts import redirect
from rest_framework import viewsets
from .models import Appointment, Barber, BarberAvailability, BarberTimeOff, Service, UserProfile, PushSubscription, Review, WaitlistEntry, BarberClient, RescheduleRequest, NewsletterPost, BarberServicePrice
from .serializers import AppointmentSerializer, BarberSerializer, ServiceSerializer, UserProfileSerializer, RegisterSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
import logging
from datetime import date as date_type, datetime, timedelta
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

# ── Custom JWT — adds is_staff to token payload so frontend can read it instantly
class HeadzUpTokenSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["is_staff"]  = user.is_staff
        token["username"]  = user.username
        return token

class HeadzUpTokenView(TokenObtainPairView):
    serializer_class = HeadzUpTokenSerializer
import math
import json

stripe.api_key = settings.STRIPE_SECRET_KEY
User = get_user_model()
logger = logging.getLogger(__name__)

FRONTEND_URL = getattr(settings, "FRONTEND_URL", "https://headzup-barbershop-website.vercel.app")
BACKEND_URL  = getattr(settings, "BACKEND_URL",  "https://headzup-barbershop-website-production.up.railway.app")


# ── Email confirmation helper ────────────────────────────────────────────────
def send_booking_confirmation(appointment):
    """
    Fires confirmation email in a background thread.
    Sends to BOTH the client AND the barber.
    NEVER blocks or crashes a booking — email is best-effort only.
    """
    import threading

    try:
        user_email    = appointment.user.email
        username      = appointment.user.username
        service_name  = appointment.service.name if appointment.service else "Appointment"
        barber_name   = appointment.barber.name  if appointment.barber  else "Your barber"
        barber_email  = appointment.barber.user.email if (appointment.barber and appointment.barber.user) else None
        appt_date     = appointment.date.strftime("%A, %B %d, %Y")
        appt_time     = appointment.time.strftime("%I:%M %p").lstrip("0")
        payment_label = "Paid online via Stripe" if appointment.payment_method == "online" else "Pay in shop (cash or card)"
        client_notes  = appointment.client_notes or ""
    except Exception:
        return

    def _send():
        try:
            import urllib.request
            import json as json_lib
            import re
            import logging
            logger = logging.getLogger(__name__)

            api_key    = getattr(settings, "SENDGRID_API_KEY", "")
            from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")

            if not api_key:
                logger.warning("SENDGRID_API_KEY not set — skipping confirmation email")
                return
            if not user_email:
                logger.warning(f"No email for user {username} — skipping")
                return

            # Build email content
            subject = f"Booking Confirmed - {service_name} at HEADZ UP"
            message = (
                f"Hey {username},\n\nYour appointment is confirmed.\n\n"
                f"Service:  {service_name}\nBarber:   {barber_name}\n"
                f"Date:     {appt_date}\nTime:     {appt_time}\n"
                f"Payment:  {payment_label}\n\n"
                f"Please arrive 5 minutes early.\n\nHEADZ UP Barbershop\n2509 W 4th St, Hattiesburg, MS 39401"
            )

            ticket_rows = ""
            for label, value in [
                ("Service", service_name), ("Barber", barber_name),
                ("Date", appt_date), ("Time", appt_time), ("Payment", payment_label),
                ("Location", "2509 W 4th St, Hattiesburg, MS 39401"),
            ]:
                ticket_rows += f"""<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
                  <p style="font-size:14px;color:white;margin:0;font-weight:700;">{value}</p>
                </td></tr>"""

            html_message = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span></p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-block;text-align:center;line-height:52px;">
            <span style="color:black;font-size:24px;font-weight:900;">&#10003;</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;text-transform:uppercase;margin:0;">Booking<br><span style="color:#f59e0b;font-style:italic;">Confirmed_</span></h1>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <p style="color:#71717a;font-size:13px;margin:0;">Hey {username}, you're all set. See you soon.</p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">{ticket_rows}</table>
        </td></tr>
        <tr><td style="padding:16px 0;">
          <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">Please arrive <strong style="color:white;">5 minutes early</strong>. Slots held <strong style="color:white;">15 minutes</strong> past appointment time.</p>
        </td></tr>
        <tr><td style="padding:8px 0 32px;">
          <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">View My Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;line-height:1.7;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401<br>Mon-Sat 9AM-6PM &middot; Closed Sundays</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

            # Send via SendGrid HTTP API
            match        = re.search(r'<(.+?)>', from_email)
            sender_email = match.group(1) if match else from_email
            sender_name  = from_email.split("<")[0].strip() if "<" in from_email else "HEADZ UP"

            payload = {
                "personalizations": [{"to": [{"email": user_email}]}],
                "from": {"email": sender_email, "name": sender_name},
                "reply_to": {"email": sender_email, "name": sender_name},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": message},
                    {"type": "text/html",  "value": html_message},
                ],
                "headers": {
                    "List-Unsubscribe": f"<mailto:{sender_email}?subject=unsubscribe>",
                    "X-Entity-Ref-ID": f"headzup-booking-{user_email}",
                },
                "mail_settings": {
                    "bypass_spam_management": {"enable": True},
                },
            }

            data = json_lib.dumps(payload).encode("utf-8")
            req  = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=data,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                logger.info(f"Confirmation email sent to {user_email} — SendGrid {resp.status}")

            # Also email the BARBER so they know a new client booked
            if barber_email:
                barber_subject = f"📅 New Booking — {username} at {appt_time}"
                barber_rows = ""
                notes_row = f"""<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Client Notes</p>
                  <p style="font-size:14px;color:#f59e0b;margin:0;font-style:italic;">"{client_notes}"</p>
                </td></tr>""" if client_notes else ""
                for label, value in [
                    ("Client",   username),
                    ("Service",  service_name),
                    ("Date",     appt_date),
                    ("Time",     appt_time),
                    ("Payment",  payment_label),
                    ("Location", "2509 W 4th St, Hattiesburg, MS 39401"),
                ]:
                    barber_rows += f"""<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                      <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
                      <p style="font-size:14px;color:white;margin:0;font-weight:700;">{value}</p>
                    </td></tr>"""
                barber_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span></p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f59e0b;font-size:22px;">📅</span></div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;">New<br><span style="color:#f59e0b;font-style:italic;">Booking_</span></h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#71717a;font-size:13px;margin:0;">Hey {barber_name}, you have a new appointment booked.</p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">{barber_rows}{notes_row}</table>
        </td></tr>
        <tr><td style="padding:16px 0 32px;">
          <a href="{FRONTEND_URL}/barber-dashboard" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">View Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                barber_plain = f"New booking!\nClient: {username}\nService: {service_name}\nDate: {appt_date}\nTime: {appt_time}\nPayment: {payment_label}"
                if client_notes:
                    barber_plain += f"\nNotes: {client_notes}"
                try:
                    match2 = re.search(r'<(.+?)>', from_email)
                    sender2 = match2.group(1) if match2 else from_email
                    payload2 = {
                        "personalizations": [{"to": [{"email": barber_email}]}],
                        "from": {"email": sender2, "name": sender_name},
                        "subject": barber_subject,
                        "content": [
                            {"type": "text/plain", "value": barber_plain},
                            {"type": "text/html",  "value": barber_html},
                        ],
                    }
                    data2 = json_lib.dumps(payload2).encode("utf-8")
                    req2  = urllib.request.Request(
                        "https://api.sendgrid.com/v3/mail/send",
                        data=data2,
                        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                        method="POST",
                    )
                    with urllib.request.urlopen(req2, timeout=10) as resp2:
                        logger.info(f"Barber booking notification sent to {barber_email} — {resp2.status}")
                except Exception as eb:
                    logger.error(f"Barber email failed: {eb}")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Email send failed: {e}")

    threading.Thread(target=_send, daemon=True).start()


def _html_email_wrapper(logo, icon_html, headline, subhead, body_rows, cta_url, cta_label, footer="HEADZ UP Barbershop · 2509 W 4th St, Hattiesburg, MS 39401"):
    """Shared HTML email shell."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">{icon_html}</td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;">{headline}</h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;">{subhead}</p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">{body_rows}</table>
        </td></tr>
        {"" if not cta_url else f'''<tr><td style="padding:20px 0;">
          <a href="{cta_url}" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">{cta_label} &rarr;</a>
        </td></tr>'''}
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;line-height:1.7;">{footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _ticket_rows(*pairs):
    rows = ""
    for label, value in pairs:
        rows += f"""<tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
          <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
          <p style="font-size:14px;color:white;margin:0;font-weight:700;">{value}</p>
        </td></tr>"""
    return rows


def _sendgrid_send(to_email, subject, plain, html):
    """Send email via SendGrid HTTP API — bypasses SMTP port blocks on Railway."""
    import urllib.request
    import json as json_lib
    import re
    import logging
    logger = logging.getLogger(__name__)

    api_key    = getattr(settings, "SENDGRID_API_KEY", "")
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "")

    if not api_key or not to_email:
        return

    match        = re.search(r'<(.+?)>', from_email)
    sender_email = match.group(1) if match else from_email
    sender_name  = from_email.split("<")[0].strip() if "<" in from_email else "HEADZ UP"

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": sender_email, "name": sender_name},
        "reply_to": {"email": sender_email, "name": sender_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": plain},
            {"type": "text/html",  "value": html},
        ],
        "headers": {
            "List-Unsubscribe": f"<mailto:{sender_email}?subject=unsubscribe>",
        },
        "mail_settings": {
            "bypass_spam_management": {"enable": True},
        },
    }

    try:
        data = json_lib.dumps(payload).encode("utf-8")
        req  = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=data,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"Email sent to {to_email} — SendGrid {resp.status}")
    except Exception as e:
        logger.error(f"SendGrid send failed to {to_email}: {e}")


def send_reschedule_request_email(reschedule_request):
    """
    Client requests reschedule:
      → email BARBER: full HTML with original time, requested time, Approve/Decline buttons
      → email CLIENT: "thank you, under review" confirmation

    Barber requests reschedule:
      → email CLIENT: full HTML with original time, proposed time, Accept/Reject buttons
    """
    import threading
    import logging
    logger = logging.getLogger(__name__)

    rr   = reschedule_request
    appt = rr.appointment

    try:
        client_email  = appt.user.email
        client_name   = appt.user.first_name or appt.user.username
        barber_name   = appt.barber.name
        barber_email  = appt.barber.user.email if appt.barber.user else None
        service_name  = appt.service.name if appt.service else "Appointment"
        old_date      = appt.date.strftime("%A, %B %d, %Y")
        old_time      = appt.time.strftime("%I:%M %p").lstrip("0")
        new_date_str  = rr.new_date.strftime("%A, %B %d, %Y")
        new_time_str  = rr.new_time.strftime("%I:%M %p").lstrip("0")
        accept_url    = f"{FRONTEND_URL}/reschedule/respond?token={rr.token}&action=accept"
        reject_url    = f"{FRONTEND_URL}/reschedule/respond?token={rr.token}&action=reject"
    except Exception as e:
        logger.error(f"send_reschedule_request_email prep failed: {e}")
        return

    def _build_reschedule_html(headline, headline_color, subhead, rows_html, cta_buttons_html):
        """Build a standalone reschedule email without using the fragile wrapper."""
        return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <div style="width:52px;height:52px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="color:#f59e0b;font-size:24px;">↻</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Reschedule<br><span style="color:{headline_color};font-style:italic;">{headline}</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">{subhead}</p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:24px;">
          {rows_html}
        </td></tr>
        {cta_buttons_html}
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;line-height:1.7;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    def _row(label, value, highlight=False):
        color = "#f59e0b" if highlight else "white"
        return f"""<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:0;">
          <tr><td style="padding:10px 0;">
            <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
            <p style="font-size:14px;color:{color};margin:0;font-weight:700;">{value}</p>
          </td></tr>
        </table>"""

    def _approve_reject_btns():
        return f"""<tr><td style="padding:20px 0 0;">
          <a href="{accept_url}" style="display:inline-block;padding:13px 26px;background:#22c55e;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;margin-right:10px;">✓ Approve</a>
          <a href="{reject_url}" style="display:inline-block;padding:13px 26px;background:#f87171;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;">✕ Decline</a>
        </td></tr>"""

    def _send():
        try:
            if rr.initiated_by == "client":
                # ── 1. Email BARBER: full details + approve/decline buttons ──
                if barber_email:
                    rows_html = (
                        _row("Client",         client_name) +
                        _row("Service",        service_name) +
                        _row("Original Date",  old_date) +
                        _row("Original Time",  old_time) +
                        _row("Requested Date", new_date_str, highlight=True) +
                        _row("Requested Time", new_time_str, highlight=True)
                    )
                    html_b = _build_reschedule_html(
                        headline       = "Request_",
                        headline_color = "#f59e0b",
                        subhead        = f"{client_name} wants to reschedule their appointment with you. Review the request below and approve or decline.",
                        rows_html      = rows_html,
                        cta_buttons_html = _approve_reject_btns(),
                    )
                    plain_b = (
                        f"Reschedule request from {client_name}\n\n"
                        f"Service: {service_name}\n"
                        f"Original: {old_date} at {old_time}\n"
                        f"Requested: {new_date_str} at {new_time_str}\n\n"
                        f"Approve: {accept_url}\n"
                        f"Decline: {reject_url}\n\n"
                        f"— HEADZ UP Barbershop"
                    )
                    _sendgrid_send(
                        barber_email,
                        f"↻ Reschedule Request from {client_name} — HEADZ UP",
                        plain_b, html_b
                    )
                    logger.info(f"Reschedule request email sent to barber: {barber_email}")

                # ── 2. Email CLIENT: "received, under review" confirmation ──
                if client_email:
                    rows_html = (
                        _row("Service",         service_name) +
                        _row("Barber",          barber_name) +
                        _row("Your Request",    f"{new_date_str} at {new_time_str}", highlight=True) +
                        _row("Current Booking", f"{old_date} at {old_time}") +
                        _row("Status",          "Under Review — awaiting barber approval", highlight=True)
                    )
                    html_c = _build_reschedule_html(
                        headline       = "Received_",
                        headline_color = "#22c55e",
                        subhead        = f"Hi {client_name}! Your reschedule request has been sent to {barber_name}. You'll get an email as soon as they approve or decline. Your original appointment on {old_date} at {old_time} remains active until then.",
                        rows_html      = rows_html,
                        cta_buttons_html = f"""<tr><td style="padding:20px 0 0;">
                          <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;">View My Dashboard &rarr;</a>
                        </td></tr>""",
                    )
                    plain_c = (
                        f"Hi {client_name},\n\n"
                        f"Your reschedule request has been received and sent to {barber_name}.\n\n"
                        f"Requested: {new_date_str} at {new_time_str}\n"
                        f"Service: {service_name}\n\n"
                        f"You'll get an email once {barber_name} approves or declines.\n"
                        f"Your original appointment ({old_date} at {old_time}) remains active until then.\n\n"
                        f"— HEADZ UP Barbershop"
                    )
                    _sendgrid_send(
                        client_email,
                        f"✓ Reschedule Request Received — HEADZ UP",
                        plain_c, html_c
                    )
                    logger.info(f"Reschedule confirmation email sent to client: {client_email}")

            else:
                # ── Barber-initiated: email CLIENT with accept/reject ──
                if client_email:
                    rows_html = (
                        _row("Service",       service_name) +
                        _row("Barber",        barber_name) +
                        _row("Original Date", old_date) +
                        _row("Original Time", old_time) +
                        _row("Proposed Date", new_date_str, highlight=True) +
                        _row("Proposed Time", new_time_str, highlight=True)
                    )
                    html = _build_reschedule_html(
                        headline       = "Proposed_",
                        headline_color = "#f59e0b",
                        subhead        = f"{barber_name} has proposed a new time for your appointment. Please accept or decline below.",
                        rows_html      = rows_html,
                        cta_buttons_html = f"""<tr><td style="padding:20px 0 0;">
                          <a href="{accept_url}" style="display:inline-block;padding:13px 26px;background:#22c55e;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;margin-right:10px;">✓ Accept</a>
                          <a href="{reject_url}" style="display:inline-block;padding:13px 26px;background:#f87171;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">✕ Decline</a>
                        </td></tr>""",
                    )
                    plain = (
                        f"Hi {client_name},\n\n"
                        f"{barber_name} wants to reschedule your appointment.\n\n"
                        f"Original: {old_date} at {old_time}\n"
                        f"Proposed: {new_date_str} at {new_time_str}\n\n"
                        f"Accept: {accept_url}\n"
                        f"Decline: {reject_url}\n\n"
                        f"— HEADZ UP Barbershop"
                    )
                    _sendgrid_send(
                        client_email,
                        f"↻ Appointment Reschedule Proposed — HEADZ UP",
                        plain, html
                    )
                    logger.info(f"Barber reschedule proposal sent to client: {client_email}")

        except Exception as e:
            logger.error(f"send_reschedule_request_email _send failed: {e}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()


def send_reschedule_response_email(reschedule_request, accepted):
    """
    Notify the CLIENT that their reschedule was approved or declined.
    Sends a polished HTML email with the new appointment details or original time.
    """
    import threading
    rr   = reschedule_request
    appt = rr.appointment

    try:
        client_email  = appt.user.email
        client_name   = appt.user.first_name or appt.user.username
        barber_name   = appt.barber.name
        service_name  = appt.service.name if appt.service else "Appointment"
        orig_date_str = appt.date.strftime("%A, %B %d, %Y")
        orig_time_str = appt.time.strftime("%I:%M %p").lstrip("0")
        new_date_str  = rr.new_date.strftime("%A, %B %d, %Y")
        new_time_str  = rr.new_time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    def _send():
        try:
            if rr.initiated_by == "client":
                if accepted:
                    # ── APPROVED — email client their new confirmed time ──
                    subject = f"✅ Reschedule Approved — {service_name} at HEADZ UP"
                    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-block;text-align:center;line-height:56px;">
            <span style="color:black;font-size:26px;font-weight:900;">✓</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Reschedule<br><span style="color:#22c55e;font-style:italic;">Approved_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">
            Great news, {client_name}! <strong style="color:white;">{barber_name}</strong> has approved your reschedule request. Your appointment has been updated.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{service_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Barber</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{barber_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">&#9003; Old Time</p>
              <p style="font-size:13px;color:#52525b;margin:0;text-decoration:line-through;">{orig_date_str} at {orig_time_str}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#22c55e;text-transform:uppercase;margin:0 0 4px;">✓ New Confirmed Time</p>
              <p style="font-size:18px;color:#22c55e;margin:0;font-weight:900;">{new_date_str}</p>
              <p style="font-size:18px;color:#22c55e;margin:4px 0 0;font-weight:900;">{new_time_str}</p>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Location</p>
              <p style="font-size:14px;color:white;margin:0;">2509 W 4th St, Hattiesburg, MS 39401</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 8px;">
          <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">Please arrive <strong style="color:white;">5 minutes early</strong>. Slots held <strong style="color:white;">15 minutes</strong> past appointment time.</p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#22c55e;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">View My Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                    plain = f"Hi {client_name},\n\nYour reschedule has been APPROVED by {barber_name}.\n\nNew Time: {new_date_str} at {new_time_str}\nService: {service_name}\nLocation: 2509 W 4th St, Hattiesburg, MS 39401\n\nSee you then!\n— HEADZ UP Barbershop"
                    _sendgrid_send(client_email, subject, plain, html)

                else:
                    # ── DECLINED — email client their original time still stands ──
                    subject = f"❌ Reschedule Declined — Your Original Appointment Stands"
                    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:20px;">
          <div style="width:56px;height:56px;background:rgba(248,113,113,0.12);border:1px solid rgba(248,113,113,0.3);display:inline-block;text-align:center;line-height:56px;">
            <span style="color:#f87171;font-size:26px;">✕</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Reschedule<br><span style="color:#f87171;font-style:italic;">Declined_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">
            Hey {client_name}, <strong style="color:white;">{barber_name}</strong> was unable to accommodate your reschedule request. Don't worry — your <strong style="color:white;">original appointment still stands</strong>.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{service_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Barber</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{barber_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#f59e0b;text-transform:uppercase;margin:0 0 4px;">Your Appointment (unchanged)</p>
              <p style="font-size:18px;color:#f59e0b;margin:0;font-weight:900;">{orig_date_str}</p>
              <p style="font-size:18px;color:#f59e0b;margin:4px 0 0;font-weight:900;">{orig_time_str}</p>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Location</p>
              <p style="font-size:14px;color:white;margin:0;">2509 W 4th St, Hattiesburg, MS 39401</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 0 8px;">
          <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">Need to cancel instead? You can do so from your dashboard up to 2 hours before your appointment.</p>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">View My Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                    plain = f"Hi {client_name},\n\nYour reschedule request was declined by {barber_name}.\n\nYour original appointment still stands:\n{orig_date_str} at {orig_time_str}\nService: {service_name}\n\n— HEADZ UP Barbershop"
                    _sendgrid_send(client_email, subject, plain, html)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Reschedule response email failed: {e}")

    threading.Thread(target=_send, daemon=True).start()


def send_cancellation_email(appointment, cancelled_by="client"):
    """
    Fires when an appointment is cancelled.
    - Client cancels → email BARBER: slot freed up notification
    - Barber cancels → email CLIENT: sorry, please rebook
    """
    import threading
    import logging
    logger = logging.getLogger(__name__)

    try:
        client_email  = appointment.user.email
        client_name   = appointment.user.first_name or appointment.user.username
        barber_name   = appointment.barber.name
        service_name  = appointment.service.name if appointment.service else "Appointment"
        appt_date     = appointment.date.strftime("%A, %B %d, %Y")
        appt_time     = appointment.time.strftime("%I:%M %p").lstrip("0")
        barber_email  = appointment.barber.user.email if appointment.barber.user else None
    except Exception as e:
        logger.error(f"send_cancellation_email prep failed: {e}")
        return

    def _send():
        try:
            if cancelled_by == "client" and barber_email:
                # ── Notify BARBER that client cancelled ──
                html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:22px;">📅</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Appointment<br><span style="color:#f87171;font-style:italic;">Cancelled_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">
            <strong style="color:white;">{client_name}</strong> has cancelled their appointment. That slot is now open.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:24px;margin-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Client</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{client_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{service_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Date</p>
              <p style="font-size:14px;color:#f87171;margin:0;font-weight:700;">{appt_date}</p>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Time</p>
              <p style="font-size:18px;color:#f87171;margin:0;font-weight:900;">{appt_time}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;">
          <a href="{FRONTEND_URL}/barber-dashboard" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">View Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                plain = (
                    f"{client_name} cancelled their appointment.\n\n"
                    f"Service: {service_name}\n"
                    f"Date: {appt_date} at {appt_time}\n\n"
                    f"That slot is now open.\n— HEADZ UP Barbershop"
                )
                _sendgrid_send(barber_email, f"📅 Appointment Cancelled by {client_name} — HEADZ UP", plain, html)
                logger.info(f"Cancellation email sent to barber: {barber_email}")

            elif cancelled_by == "barber" and client_email:
                # ── Notify CLIENT that barber cancelled ──
                html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:22px;">✕</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Appointment<br><span style="color:#f87171;font-style:italic;">Cancelled_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">
            Hey {client_name}, we're sorry — your appointment with <strong style="color:white;">{barber_name}</strong> has been cancelled. Please rebook at your convenience.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{service_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Barber</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{barber_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Was Scheduled For</p>
              <p style="font-size:14px;color:#f87171;margin:0;font-weight:700;">{appt_date} at {appt_time}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;">
          <a href="{FRONTEND_URL}/book" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">Book Again &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                plain = (
                    f"Hey {client_name},\n\nYour appointment with {barber_name} has been cancelled.\n\n"
                    f"Service: {service_name}\nDate: {appt_date} at {appt_time}\n\n"
                    f"Please rebook at your convenience: {FRONTEND_URL}/book\n\n"
                    f"— HEADZ UP Barbershop"
                )
                _sendgrid_send(client_email, f"Your Appointment Has Been Cancelled — HEADZ UP", plain, html)
                logger.info(f"Cancellation email sent to client: {client_email}")

        except Exception as e:
            logger.error(f"send_cancellation_email failed: {e}", exc_info=True)

    _send()  # synchronous so Railway doesn't kill it


def send_welcome_email(user):
    """
    Sent immediately when a new client registers.
    Welcomes them, introduces the platform, drives first booking.
    """
    import threading, logging
    logger = logging.getLogger(__name__)
    if not user.email:
        return
    name = user.first_name or user.username

    def _send():
        try:
            subject = "✂️ Welcome to HEADZ UP Barbershop"
            html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Welcome<br><span style="color:#f59e0b;font-style:italic;">{name}_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.8;">
            Your HEADZ UP account is ready. Book your first appointment in under a minute — pick your barber, choose a time, and lock in your spot.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:24px;margin-bottom:20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-size:13px;color:white;margin:0;">✂️ &nbsp;<strong>Pick your barber</strong> — view styles and specialties</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-size:13px;color:white;margin:0;">📅 &nbsp;<strong>Choose a time</strong> — see real-time availability</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-size:13px;color:white;margin:0;">💰 &nbsp;<strong>Pay in shop or online</strong> — your choice</p>
            </td></tr>
            <tr><td style="padding:12px 0;">
              <p style="font-size:13px;color:white;margin:0;">🔔 &nbsp;<strong>Get reminders</strong> — we'll remind you 24hr and 2hr before</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;">
          <a href="{FRONTEND_URL}/book" style="display:inline-block;padding:16px 32px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">Book Your First Appointment &rarr;</a>
        </td></tr>
        <tr><td style="padding:24px 0 0;">
          <p style="font-size:12px;color:#52525b;margin:0;line-height:1.7;">
            📍 2509 W 4th St, Hattiesburg, MS 39401<br>
            Mon–Fri 9AM–6PM &middot; Sat 9AM–4PM &middot; Closed Sundays
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            plain = (
                f"Welcome to HEADZ UP, {name}!\n\n"
                f"Your account is ready. Book your first appointment at:\n"
                f"{FRONTEND_URL}/book\n\n"
                f"📍 2509 W 4th St, Hattiesburg, MS 39401\n"
                f"Mon–Fri 9AM–6PM · Sat 9AM–4PM · Closed Sundays\n\n"
                f"— HEADZ UP Barbershop"
            )
            _sendgrid_send(user.email, subject, plain, html)
            logger.info(f"Welcome email sent to {user.email}")
        except Exception as e:
            logger.error(f"send_welcome_email failed: {e}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()


def send_deposit_paid_email(appointment):
    """
    Sent to the BARBER when a client pays their deposit online.
    Lets them know the booking is locked in with deposit.
    """
    import threading, logging
    logger = logging.getLogger(__name__)

    try:
        client_name  = appointment.user.first_name or appointment.user.username
        barber_name  = appointment.barber.name
        barber_email = appointment.barber.user.email if appointment.barber.user else None
        service_name = appointment.service.name if appointment.service else "Appointment"
        appt_date    = appointment.date.strftime("%A, %B %d, %Y")
        appt_time    = appointment.time.strftime("%I:%M %p").lstrip("0")
        deposit_amt  = appointment.deposit_amount or "10.00"
    except Exception as e:
        logger.error(f"send_deposit_paid_email prep failed: {e}")
        return

    if not barber_email:
        return

    def _send():
        try:
            subject = f"💰 Deposit Received from {client_name} — HEADZ UP"
            html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">💰</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            Deposit<br><span style="color:#22c55e;font-style:italic;">Received_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.6;">
            <strong style="color:white;">{client_name}</strong> has paid their deposit. This booking is locked in.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Client</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{client_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:14px;color:white;margin:0;font-weight:700;">{service_name}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Date & Time</p>
              <p style="font-size:14px;color:#f59e0b;margin:0;font-weight:700;">{appt_date} at {appt_time}</p>
            </td></tr>
            <tr><td style="padding:10px 0;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Deposit Paid</p>
              <p style="font-size:22px;color:#22c55e;margin:0;font-weight:900;">${deposit_amt} ✓</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 0 0;">
          <a href="{FRONTEND_URL}/barber-dashboard" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">View Dashboard &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            plain = (
                f"Hey {barber_name},\n\n"
                f"{client_name} paid their ${deposit_amt} deposit. Booking is confirmed.\n\n"
                f"Service: {service_name}\nDate: {appt_date} at {appt_time}\n\n"
                f"— HEADZ UP Barbershop"
            )
            _sendgrid_send(barber_email, subject, plain, html)
            logger.info(f"Deposit paid email sent to barber: {barber_email}")
        except Exception as e:
            logger.error(f"send_deposit_paid_email failed: {e}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()


def send_review_request_email(appointment):
    """
    Sent to the CLIENT after the barber marks their appointment as completed.
    Asks for a review of their experience.
    """
    import threading, logging
    logger = logging.getLogger(__name__)

    try:
        client_email = appointment.user.email
        client_name  = appointment.user.first_name or appointment.user.username
        barber_name  = appointment.barber.name
        service_name = appointment.service.name if appointment.service else "Appointment"
    except Exception as e:
        logger.error(f"send_review_request_email prep failed: {e}")
        return

    if not client_email:
        return

    review_url = f"{FRONTEND_URL}/dashboard"

    def _send():
        try:
            subject = f"How was your cut? ✂️ Leave a review for {barber_name}"
            html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">⭐</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:24px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.1;">
            How was<br><span style="color:#f59e0b;font-style:italic;">Your Cut_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.8;">
            Hey {client_name}! Hope you're looking fresh. <strong style="color:white;">{barber_name}</strong> just finished your <strong style="color:white;">{service_name}</strong>. 
            Take 10 seconds to leave a quick review — it means the world to your barber.
          </p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:28px;">
          <p style="font-size:32px;margin:0;letter-spacing:4px;">⭐⭐⭐⭐⭐</p>
          <p style="font-family:'Courier New',monospace;font-size:10px;color:#52525b;margin:8px 0 0;letter-spacing:0.3em;text-transform:uppercase;">Rate your experience</p>
        </td></tr>
        <tr><td style="text-align:center;padding-bottom:20px;">
          <a href="{review_url}" style="display:inline-block;padding:16px 32px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">Leave a Review &rarr;</a>
        </td></tr>
        <tr><td style="padding:16px 0 0;">
          <p style="font-size:12px;color:#52525b;margin:0;line-height:1.7;">
            Ready to book your next appointment? We're always here.<br>
            <a href="{FRONTEND_URL}/book" style="color:#f59e0b;text-decoration:none;">Book again &rarr;</a>
          </p>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:20px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop &middot; 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            plain = (
                f"Hey {client_name}!\n\n"
                f"Hope you're looking fresh after your {service_name} with {barber_name}.\n\n"
                f"Leave a quick review — it means a lot:\n{review_url}\n\n"
                f"Ready to book again? {FRONTEND_URL}/book\n\n"
                f"— HEADZ UP Barbershop"
            )
            _sendgrid_send(client_email, subject, plain, html)
            logger.info(f"Review request email sent to {client_email}")
        except Exception as e:
            logger.error(f"send_review_request_email failed: {e}", exc_info=True)

    threading.Thread(target=_send, daemon=True).start()


def _twilio_send(to_phone, body):
    """
    Send SMS via Twilio REST API — no SDK needed, pure HTTP.
    Silently skips if TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not set.
    to_phone must be E.164 format: +16015551234
    """
    import urllib.request
    import urllib.parse
    import base64
    import logging
    logger = logging.getLogger(__name__)

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token  = getattr(settings, "TWILIO_AUTH_TOKEN",  "")
    from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")

    if not account_sid or not auth_token or not from_number:
        logger.debug("Twilio not configured — skipping SMS")
        return
    if not to_phone or not to_phone.startswith("+"):
        logger.debug(f"Invalid phone number for SMS: {to_phone!r}")
        return

    # ── DEMO MODE — only send to verified number during Twilio trial ──────────
    DEMO_NUMBER = getattr(settings, "TWILIO_DEMO_NUMBER", "")
    if DEMO_NUMBER and to_phone != DEMO_NUMBER:
        logger.debug(f"Demo mode — redirecting SMS from {to_phone} to {DEMO_NUMBER}")
        to_phone = DEMO_NUMBER
    # ─────────────────────────────────────────────────────────────────────────

    url  = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    data = urllib.parse.urlencode({
        "To":   to_phone,
        "From": from_number,
        "Body": body,
    }).encode("utf-8")
    creds = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()

    try:
        req = urllib.request.Request(
            url, data=data,
            headers={
                "Authorization": f"Basic {creds}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info(f"SMS sent to {to_phone} — Twilio {resp.status}")
    except Exception as e:
        logger.error(f"Twilio SMS failed to {to_phone}: {e}")


class TestSMSView(APIView):
    """
    Admin-only endpoint to test Twilio SMS directly.
    POST /api/test-sms/ with {"to": "+16015551234"}
    Returns the raw Twilio response so we can debug.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        import urllib.request, urllib.parse, base64

        to_phone    = request.data.get("to", "").strip()
        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token  = getattr(settings, "TWILIO_AUTH_TOKEN",  "")
        from_number = getattr(settings, "TWILIO_FROM_NUMBER", "")

        # Report config status
        config = {
            "TWILIO_ACCOUNT_SID":  account_sid[:8] + "..." if account_sid else "NOT SET",
            "TWILIO_AUTH_TOKEN":   "SET" if auth_token else "NOT SET",
            "TWILIO_FROM_NUMBER":  from_number or "NOT SET",
            "to_phone":            to_phone,
        }

        if not account_sid or not auth_token or not from_number:
            return Response({"error": "Twilio not configured", "config": config}, status=400)

        if not to_phone or not to_phone.startswith("+"):
            return Response({"error": "to must be E.164 e.g. +16015551234", "config": config}, status=400)

        url  = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        data = urllib.parse.urlencode({
            "To":   to_phone,
            "From": from_number,
            "Body": "✂️ HEADZ UP test SMS — Twilio is working!",
        }).encode("utf-8")
        creds = base64.b64encode(f"{account_sid}:{auth_token}".encode()).decode()

        try:
            req = urllib.request.Request(
                url, data=data,
                headers={
                    "Authorization": f"Basic {creds}",
                    "Content-Type":  "application/x-www-form-urlencoded",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                import json
                body = json.loads(resp.read().decode())
                return Response({
                    "success": True,
                    "twilio_status": resp.status,
                    "message_sid": body.get("sid"),
                    "status": body.get("status"),
                    "config": config,
                })
        except urllib.error.HTTPError as e:
            import json
            error_body = e.read().decode()
            try:
                error_json = json.loads(error_body)
            except Exception:
                error_json = error_body
            return Response({
                "success": False,
                "http_status": e.code,
                "twilio_error": error_json,
                "config": config,
            }, status=400)
        except Exception as e:
            return Response({
                "success": False,
                "error": str(e),
                "config": config,
            }, status=500)



def _get_client_phone(user):
    """Get client phone from UserProfile. Returns None if not set."""
    try:
        profile = user.profile
        return profile.phone.strip() if profile.phone else None
    except Exception:
        return None


def _get_barber_phone(barber):
    """Get barber's phone from their User account (stored in UserProfile)."""
    try:
        if barber and barber.user:
            return _get_client_phone(barber.user)
    except Exception:
        pass
    return None


# ── SMS notification functions ────────────────────────────────────────────────

def sms_booking_confirmation(appointment):
    """Client + barber both get an SMS when a booking is made."""
    import threading
    try:
        client_phone = _get_client_phone(appointment.user)
        barber_phone = _get_barber_phone(appointment.barber)
        client_name  = appointment.user.first_name or appointment.user.username
        barber_name  = appointment.barber.name if appointment.barber else "Your barber"
        service_name = appointment.service.name if appointment.service else "Appointment"
        appt_date    = appointment.date.strftime("%a %b %d")
        appt_time    = appointment.time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    def _send():
        if client_phone:
            _twilio_send(client_phone,
                f"✂️ HEADZ UP: Booking confirmed!\n"
                f"{service_name} w/ {barber_name}\n"
                f"{appt_date} at {appt_time}\n"
                f"2509 W 4th St, Hattiesburg MS\n"
                f"Manage: {FRONTEND_URL}/dashboard"
            )
        if barber_phone:
            _twilio_send(barber_phone,
                f"📅 HEADZ UP: New booking!\n"
                f"Client: {client_name}\n"
                f"Service: {service_name}\n"
                f"{appt_date} at {appt_time}"
            )
    threading.Thread(target=_send, daemon=True).start()


def sms_reschedule_request(reschedule_request):
    """Client gets SMS confirmation; barber gets SMS alert to check email."""
    import threading
    rr   = reschedule_request
    appt = rr.appointment
    try:
        client_phone = _get_client_phone(appt.user)
        barber_phone = _get_barber_phone(appt.barber)
        client_name  = appt.user.first_name or appt.user.username
        barber_name  = appt.barber.name
        new_date     = rr.new_date.strftime("%a %b %d")
        new_time     = rr.new_time.strftime("%I:%M %p").lstrip("0")
        old_date     = appt.date.strftime("%a %b %d")
        old_time     = appt.time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    def _send():
        if client_phone:
            _twilio_send(client_phone,
                f"↻ HEADZ UP: Reschedule request received.\n"
                f"Requested: {new_date} at {new_time}\n"
                f"Original: {old_date} at {old_time}\n"
                f"{barber_name} will review and confirm soon."
            )
        if barber_phone:
            _twilio_send(barber_phone,
                f"↻ HEADZ UP: {client_name} wants to reschedule.\n"
                f"New: {new_date} at {new_time}\n"
                f"Check your email or dashboard to approve/decline:\n"
                f"{FRONTEND_URL}/barber-dashboard"
            )
    threading.Thread(target=_send, daemon=True).start()


def sms_reschedule_response(reschedule_request, accepted):
    """Client gets SMS with result of their reschedule request."""
    import threading
    rr   = reschedule_request
    appt = rr.appointment
    try:
        client_phone = _get_client_phone(appt.user)
        barber_name  = appt.barber.name
        new_date     = rr.new_date.strftime("%a %b %d")
        new_time     = rr.new_time.strftime("%I:%M %p").lstrip("0")
        old_date     = appt.date.strftime("%a %b %d")
        old_time     = appt.time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    def _send():
        if client_phone:
            if accepted:
                _twilio_send(client_phone,
                    f"✅ HEADZ UP: Reschedule APPROVED by {barber_name}!\n"
                    f"New appointment: {new_date} at {new_time}\n"
                    f"2509 W 4th St, Hattiesburg MS"
                )
            else:
                _twilio_send(client_phone,
                    f"❌ HEADZ UP: Reschedule declined by {barber_name}.\n"
                    f"Your original appointment stands:\n"
                    f"{old_date} at {old_time}"
                )
    threading.Thread(target=_send, daemon=True).start()


def sms_cancellation(appointment, cancelled_by="client"):
    """Notify the other party when an appointment is cancelled — synchronous."""
    try:
        client_phone = _get_client_phone(appointment.user)
        barber_phone = _get_barber_phone(appointment.barber)
        client_name  = appointment.user.first_name or appointment.user.username
        barber_name  = appointment.barber.name if appointment.barber else "barber"
        service_name = appointment.service.name if appointment.service else "appointment"
        appt_date    = appointment.date.strftime("%a %b %d")
        appt_time    = appointment.time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    if cancelled_by == "client" and barber_phone:
        _twilio_send(barber_phone,
            f"📅 HEADZ UP: {client_name} cancelled.\n"
            f"Service: {service_name}\n"
            f"{appt_date} at {appt_time} — slot is now open."
        )
    elif cancelled_by == "barber" and client_phone:
        _twilio_send(client_phone,
            f"📅 HEADZ UP: Your appointment with {barber_name} was cancelled.\n"
            f"Was: {appt_date} at {appt_time}\n"
            f"Please rebook: {FRONTEND_URL}/book"
        )


def sms_strike(user, profile, reason):
    """Client gets SMS when a strike is issued."""
    import threading
    try:
        phone      = _get_client_phone(user)
        label      = "No Show" if reason == "no_show" else "Late Cancellation"
        deposit    = profile.get_deposit_fee()
        strikes    = profile.strike_count
    except Exception:
        return

    def _send():
        if phone:
            _twilio_send(phone,
                f"⚡ HEADZ UP: Strike #{strikes} added ({label}).\n"
                f"Your next deposit: ${deposit:.2f}\n"
                f"View account: {FRONTEND_URL}/dashboard"
            )
    threading.Thread(target=_send, daemon=True).start()


def sms_welcome(user):
    """New client gets a welcome SMS — fires synchronously on registration."""
    try:
        phone = _get_client_phone(user)
        name  = user.first_name or user.username
    except Exception:
        return
    if phone:
        _twilio_send(phone,
            f"✂️ Welcome to HEADZ UP, {name}!\n"
            f"Book your first appointment:\n"
            f"{FRONTEND_URL}/book\n"
            f"2509 W 4th St, Hattiesburg MS"
        )


def sms_review_request(appointment):
    """Client gets SMS asking for a review after their cut."""
    import threading
    try:
        phone       = _get_client_phone(appointment.user)
        barber_name = appointment.barber.name if appointment.barber else "your barber"
    except Exception:
        return

    def _send():
        if phone:
            _twilio_send(phone,
                f"⭐ HEADZ UP: How was your cut with {barber_name}?\n"
                f"Leave a quick review:\n"
                f"{FRONTEND_URL}/dashboard"
            )
    threading.Thread(target=_send, daemon=True).start()


def sms_deposit_paid(appointment):
    """Barber gets SMS when client pays a deposit."""
    import threading
    try:
        barber_phone = _get_barber_phone(appointment.barber)
        client_name  = appointment.user.first_name or appointment.user.username
        service_name = appointment.service.name if appointment.service else "Appointment"
        appt_date    = appointment.date.strftime("%a %b %d")
        appt_time    = appointment.time.strftime("%I:%M %p").lstrip("0")
        deposit_amt  = appointment.deposit_amount or "10.00"
    except Exception:
        return

    def _send():
        if barber_phone:
            _twilio_send(barber_phone,
                f"💰 HEADZ UP: Deposit received!\n"
                f"{client_name} paid ${deposit_amt}\n"
                f"{service_name} — {appt_date} at {appt_time}"
            )
    threading.Thread(target=_send, daemon=True).start()


# ── Push notification helper ─────────────────────────────────────────────────
def send_push_notification(user, title, body, data=None):
    """Send a Web Push notification to a user. Silently fails if not subscribed."""
    try:
        from pywebpush import webpush, WebPushException
        sub = PushSubscription.objects.get(user=user)
        payload = json.dumps({"title": title, "body": body, "data": data or {}})
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
        )
    except Exception:
        pass


def get_barber_for_user(user):
    try:
        return user.barber_profile
    except Exception:
        return None


def is_barber(user):
    return get_barber_for_user(user) is not None


# ── ViewSets ──────────────────────────────────────────────────────────────────
class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        try:
            appt = serializer.save(user=self.request.user)
            appt_full = Appointment.objects.select_related(
                "user", "barber", "barber__user", "service"
            ).get(pk=appt.pk)
            send_booking_confirmation(appt_full)
            sms_booking_confirmation(appt_full)
        except IntegrityError:
            raise serializers.ValidationError("This time slot is already booked.")

    def get_permissions(self):
        if self.action == "list":
            return [IsAuthenticated()]
        if self.action == "create":
            return [AllowAny()]
        if self.action == "destroy":
            return [IsAdminUser()]
        return [IsAuthenticated()]


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "message":  "Welcome to your dashboard",
            "user":     request.user.username,
            "email":    request.user.email,
            "is_staff": request.user.is_staff,
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                # Always create a UserProfile on registration
                phone = request.data.get("phone", "").strip()
                # Normalize phone to E.164
                if phone and not phone.startswith("+"):
                    digits = "".join(c for c in phone if c.isdigit())
                    if len(digits) == 10:
                        phone = f"+1{digits}"
                    elif len(digits) == 11 and digits.startswith("1"):
                        phone = f"+{digits}"
                profile, _ = UserProfile.objects.get_or_create(
                    user=user,
                    defaults={"name": user.username}
                )
                if phone:
                    profile.phone = phone
                    profile.save(update_fields=["phone"])
                # Send welcome email + SMS
                send_welcome_email(user)
                sms_welcome(user)
                return Response({"message": "Account created successfully"}, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BarberRegisterView(APIView):
    """
    Barber self-registration with an invite code.
    Creates a User, sets is_staff=True, and creates a linked Barber profile.
    Requires BARBER_INVITE_CODE env variable to match.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django.conf import settings as django_settings

        # Validate invite code — case insensitive
        invite_code = request.data.get("invite_code", "").strip().upper()
        valid_code  = getattr(django_settings, "BARBER_INVITE_CODE", "HEADZUP2026").strip().upper()
        if invite_code != valid_code:
            return Response({"invite_code": "Invalid invite code. Contact the shop owner."}, status=status.HTTP_400_BAD_REQUEST)

        username  = request.data.get("username", "").strip()
        email     = request.data.get("email", "").strip()
        password  = request.data.get("password", "")
        full_name = request.data.get("full_name", "").strip()
        phone     = request.data.get("phone", "").strip()

        # Validate fields
        errors = {}
        if not username:
            errors["username"] = "Username is required."
        elif User.objects.filter(username__iexact=username).exists():
            errors["username"] = "That username is already taken."
        if not email:
            errors["email"] = "Email is required."
        elif User.objects.filter(email__iexact=email).exists():
            errors["email"] = "An account with that email already exists."
        if not password or len(password) < 6:
            errors["password"] = "Password must be at least 6 characters."
        if not full_name:
            errors["full_name"] = "Full name is required."
        # Phone is optional but must be valid E.164 if provided
        if phone and not phone.startswith("+"):
            errors["phone"] = "Phone must start with + (e.g. +16015551234)"
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            from django.contrib.auth import authenticate
            from rest_framework_simplejwt.tokens import RefreshToken

            # Create user with staff access
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
            user.is_staff = True
            user.save()

            # Save phone to UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if phone:
                profile.phone = phone
                profile.save(update_fields=["phone"])

            # Create linked Barber profile
            Barber.objects.create(
                name=full_name,
                user=user,
                bio="",
            )

            # Send welcome SMS to the new barber — synchronous so it doesn't get killed
            if phone:
                first = full_name.split()[0]
                _twilio_send(phone,
                    f"✂️ Welcome to HEADZ UP, {first}!\n"
                    f"You're officially part of the team. 🔥\n"
                    f"Log in to your dashboard to set your hours and start taking bookings:\n"
                    f"{FRONTEND_URL}/barber-dashboard"
                )

            # Return tokens directly — avoids second round-trip race condition
            refresh = RefreshToken.for_user(user)
            return Response({
                "message": "Barber account created successfully.",
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BarberViewSet(viewsets.ModelViewSet):
    queryset = Barber.objects.all()
    serializer_class = BarberSerializer
    permission_classes = [IsAuthenticated]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request, *args, **kwargs):
        """
        GET /api/services/?barber=<id>
        Returns services with prices overridden by the barber's custom prices if set.
        """
        barber_id = request.query_params.get("barber")
        services  = Service.objects.all()
        data      = []
        price_map = {}
        if barber_id:
            for cp in BarberServicePrice.objects.filter(barber_id=barber_id).select_related("service"):
                price_map[cp.service_id] = float(cp.price)
        for svc in services:
            price = price_map.get(svc.id, float(svc.price))
            data.append({
                "id":               svc.id,
                "name":             svc.name,
                "price":            f"{price:.2f}",
                "duration_minutes": svc.duration_minutes,
            })
        return Response(data)


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(user=self.request.user).order_by("date", "time")

    def perform_create(self, serializer):
        barber_id      = serializer.validated_data.get("barber").id
        date           = serializer.validated_data.get("date")
        time           = serializer.validated_data.get("time")
        payment_method = serializer.validated_data.get("payment_method", "shop")

        if date < date_type.today():
            raise serializers.ValidationError("Cannot book appointments in the past.")
        if date.weekday() == 6:
            raise serializers.ValidationError("We are closed on Sundays.")
        # Block slots already taken (exclude cancelled)
        if Appointment.objects.filter(
            barber_id=barber_id, date=date, time=time
        ).exclude(status="cancelled").exists():
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")
        try:
            # Pay-in-shop → pending_shop (barber must confirm arrival, auto-cancels if no-show)
            # Online deposit → confirmed (Stripe already secured the slot)
            initial_status = "confirmed" if payment_method == "online" else "pending_shop"
            appt = serializer.save(user=self.request.user, status=initial_status)
            appt_full = Appointment.objects.select_related(
                "user", "barber", "barber__user", "service"
            ).get(pk=appt.pk)
            send_booking_confirmation(appt_full)
            sms_booking_confirmation(appt_full)
        except IntegrityError:
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")

    def perform_update(self, serializer):
        instance   = self.get_object()
        barber_id  = serializer.validated_data.get("barber", instance.barber).id
        date       = serializer.validated_data.get("date", instance.date)
        time       = serializer.validated_data.get("time", instance.time)
        new_status = serializer.validated_data.get("status", instance.status)
        was_cancelled_before = instance.status == "cancelled"
        conflict   = Appointment.objects.filter(barber_id=barber_id, date=date, time=time).exclude(pk=instance.pk)
        if conflict.exists():
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")
        try:
            serializer.save()
            # If client just cancelled — notify barber by email + SMS
            if new_status == "cancelled" and not was_cancelled_before:
                appt_full = Appointment.objects.select_related(
                    "user", "barber", "barber__user", "service"
                ).get(pk=instance.pk)
                send_cancellation_email(appt_full, cancelled_by="client")
                sms_cancellation(appt_full, cancelled_by="client")
        except IntegrityError:
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")

    def perform_destroy(self, instance):
        """Client cancels appointment — email the barber."""
        appt_full = Appointment.objects.select_related(
            "user", "barber", "barber__user", "service"
        ).get(pk=instance.pk)
        send_cancellation_email(appt_full, cancelled_by="client")
        sms_cancellation(appt_full, cancelled_by="client")
        instance.delete()


# ── Auth helpers ──────────────────────────────────────────────────────────────
class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({"exists": exists})


SECURITY_QUESTIONS = [
    "What was your childhood nickname?",
    "What is your favorite food?",
    "What is your favorite color?",
    "What was the make of your first car?",
    "What is your mother's last name?",
]


class SetSecurityQuestionView(APIView):
    """
    Authenticated — let user save their security question and answer.
    Called during registration or from account settings.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "").strip()
        answer   = request.data.get("answer",   "").strip()
        if not question or not answer:
            return Response({"error": "Question and answer required"}, status=400)
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user,
            defaults={"name": request.user.username}
        )
        profile.security_question = question
        profile.security_answer   = answer.lower().strip()
        profile.save(update_fields=["security_question", "security_answer"])
        return Response({"message": "Security question saved"})

    def get(self, request):
        """Returns the list of available questions and current question (no answer)."""
        profile = getattr(request.user, "profile", None)
        return Response({
            "questions":        SECURITY_QUESTIONS,
            "current_question": profile.security_question if profile else "",
            "has_answer":       bool(profile and profile.security_answer),
        })


class RecoveryStep1View(APIView):
    """
    Step 1 — find the account by username or email.
    Returns the security question for that account (if set).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        if not identifier:
            return Response({"error": "Enter your username or email"}, status=400)

        user = (
            User.objects.filter(username__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier).first()
        )
        if not user:
            return Response({"error": "No account found with that username or email"}, status=404)

        profile = getattr(user, "profile", None)
        if not profile or not profile.security_question:
            return Response({
                "error": "This account has no security question set. Contact the shop owner.",
                "no_question": True,
            }, status=400)

        return Response({
            "user_id":          user.pk,
            "username":         user.username,
            "security_question": profile.security_question,
        })


class RecoveryStep1ByQuestionView(APIView):
    """
    Step 1 alternate — user doesn't remember username OR email.
    They provide just the security question answer to find their account.
    Only works if answers are unique — otherwise returns all matching usernames.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        answer   = request.data.get("answer", "").strip().lower()
        question = request.data.get("question", "").strip()
        if not answer or not question:
            return Response({"error": "Question and answer required"}, status=400)

        profiles = UserProfile.objects.filter(
            security_question__iexact=question,
            security_answer__iexact=answer,
        ).select_related("user")

        if not profiles.exists():
            return Response({"error": "No account found with that answer"}, status=404)

        # Return matching usernames so user can pick theirs
        matches = [{"username": p.user.username, "user_id": p.user.pk} for p in profiles]
        return Response({"matches": matches})


class RecoveryStep2View(APIView):
    """
    Step 2 — verify security question answer.
    Returns a reset token if correct.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get("user_id")
        answer  = request.data.get("answer", "").strip().lower()
        if not user_id or not answer:
            return Response({"error": "user_id and answer required"}, status=400)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        profile = getattr(user, "profile", None)
        if not profile or not profile.security_answer:
            return Response({"error": "No security question on this account"}, status=400)

        if profile.security_answer.strip().lower() != answer:
            return Response({"error": "Incorrect answer. Try again."}, status=400)

        # Correct — generate a reset token
        from django.contrib.auth.tokens import default_token_generator
        token = default_token_generator.make_token(user)
        return Response({
            "token":    token,
            "user_id":  user.pk,
            "username": user.username,
            "message":  "Answer correct — you can now reset your credentials",
        })


class RecoveryStep3View(APIView):
    """
    Step 3 — reset password and/or username using the verified token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user_id      = request.data.get("user_id")
        token        = request.data.get("token", "").strip()
        new_password = request.data.get("new_password", "").strip()
        new_username = request.data.get("new_username", "").strip()

        if not user_id or not token:
            return Response({"error": "user_id and token required"}, status=400)
        if not new_password and not new_username:
            return Response({"error": "Provide a new password or new username"}, status=400)

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        from django.contrib.auth.tokens import default_token_generator
        if not default_token_generator.check_token(user, token):
            return Response({"error": "Token expired. Start over."}, status=400)

        changes = []

        if new_username and new_username != user.username:
            if User.objects.filter(username__iexact=new_username).exclude(pk=user.pk).exists():
                return Response({"error": f"Username '{new_username}' is already taken"}, status=400)
            user.username = new_username
            changes.append("username")

        if new_password:
            if len(new_password) < 6:
                return Response({"error": "Password must be at least 6 characters"}, status=400)
            user.set_password(new_password)
            changes.append("password")

        user.save()
        return Response({
            "message":  f"Successfully updated: {', '.join(changes)}",
            "username": user.username,
        })


class SecurityQuestionsListView(APIView):
    """Returns the list of security questions for dropdowns."""
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"questions": SECURITY_QUESTIONS})


class PasswordResetView(APIView):
    """Legacy — kept for backwards compatibility."""
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        if not identifier:
            return Response({"error": "identifier required"}, status=400)
        user = (
            User.objects.filter(username__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier).first()
        )
        if not user:
            return Response({"error": "No account found"}, status=404)
        from django.contrib.auth.tokens import default_token_generator
        token = default_token_generator.make_token(user)
        return Response({"token": token, "user_id": user.pk})


class PasswordResetConfirmView(APIView):
    """Legacy — kept for backwards compatibility."""
    permission_classes = [AllowAny]

    def post(self, request):
        identifier   = request.data.get("identifier", "").strip()
        token        = request.data.get("token", "").strip()
        new_password = request.data.get("password", "")
        if not all([identifier, token, new_password]):
            return Response({"error": "identifier, token, and password required"}, status=400)
        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters"}, status=400)
        user = (
            User.objects.filter(username__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier).first()
        )
        if not user:
            return Response({"error": "Account not found"}, status=404)
        from django.contrib.auth.tokens import default_token_generator
        if not default_token_generator.check_token(user, token):
            return Response({"error": "Invalid or expired token"}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password updated successfully"})


# ── Strike & Deposit System ───────────────────────────────────────────────────

DEPOSIT_BASE   = Decimal("10.00")
DEPOSIT_INCR   = Decimal("1.50")   # per strike after the first
LATE_CANCEL_HRS = 2                # hours before appt = "last minute"


def issue_strike(user, reason="no_show"):
    """Add a strike to a client and recalculate their deposit fee."""
    from django.db import connection

    profile, _ = UserProfile.objects.get_or_create(
        user=user, defaults={"name": user.username}
    )

    # Check if strike_count column exists before trying to use it
    with connection.cursor() as cursor:
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='core_userprofile' AND column_name='strike_count'")
        has_strike_col = cursor.fetchone() is not None

    if has_strike_col:
        try:
            profile.refresh_from_db()
            profile.strike_count = (profile.strike_count or 0) + 1
            new_deposit = DEPOSIT_BASE + DEPOSIT_INCR * max(0, profile.strike_count - 1)
            profile.deposit_fee = new_deposit
            profile.save(update_fields=["strike_count", "deposit_fee"])
        except Exception as e:
            # Last resort — raw SQL update
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE core_userprofile SET strike_count = COALESCE(strike_count,0) + 1 WHERE user_id = %s",
                        [user.id]
                    )
                profile.refresh_from_db()
            except Exception:
                pass
    else:
        # Migration hasn't run yet — still record it succeeded
        # The strike count will start working once migration runs
        pass

    return profile


class ClientStrikeStatusView(APIView):
    """GET — returns the client's current strike count, deposit fee, and phone."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user, defaults={"name": request.user.username}
        )
        return Response({
            "strike_count":    profile.strike_count,
            "deposit_fee":     str(profile.get_deposit_fee()),
            "terms_accepted":  profile.terms_accepted,
            "phone":           profile.phone or "",
        })


class AcceptTermsView(APIView):
    """POST — client accepts the deposit & strike terms and conditions."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.utils import timezone
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user, defaults={"name": request.user.username}
        )
        profile.terms_accepted    = True
        profile.terms_accepted_at = timezone.now()
        profile.save(update_fields=["terms_accepted", "terms_accepted_at"])
        return Response({"message": "Terms accepted", "terms_accepted": True})


class UpdatePhoneView(APIView):
    """
    PATCH client/update-phone/
    Lets a client add or update their phone number for SMS reminders.
    Normalises to E.164 format (+1XXXXXXXXXX).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        import re, logging
        logger  = logging.getLogger(__name__)
        phone   = request.data.get("phone", "").strip()

        if not phone:
            # Allow clearing the phone number
            profile, _ = UserProfile.objects.get_or_create(
                user=request.user, defaults={"name": request.user.username}
            )
            profile.phone = ""
            profile.save(update_fields=["phone"])
            return Response({"message": "Phone number removed.", "phone": ""})

        # Normalise to +1XXXXXXXXXX
        digits = re.sub(r"\D", "", phone)
        if len(digits) == 10:
            normalised = f"+1{digits}"
        elif len(digits) == 11 and digits.startswith("1"):
            normalised = f"+{digits}"
        else:
            return Response(
                {"error": "Please enter a valid 10-digit US phone number."},
                status=400
            )

        profile, _ = UserProfile.objects.get_or_create(
            user=request.user, defaults={"name": request.user.username}
        )
        profile.phone = normalised
        profile.save(update_fields=["phone"])
        logger.info(f"Phone updated for user {request.user.username}: {normalised}")
        return Response({"message": "Phone number saved.", "phone": normalised})


class DepositCheckoutView(APIView):
    """
    POST — creates a Stripe checkout session for the deposit only.
    The deposit comes out of the total service price.
    e.g. $35 cut → $10 deposit now → $25 remaining paid at shop.
    If client is a repeat offender deposit is higher ($10 + $1.50 per strike).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_id   = request.data.get("service")
        barber_id    = request.data.get("barber")
        date         = request.data.get("date")
        time         = request.data.get("time")
        client_notes = request.data.get("client_notes", "")

        try:
            service = Service.objects.get(id=service_id)
            barber  = Barber.objects.get(id=barber_id)
        except (Service.DoesNotExist, Barber.DoesNotExist) as e:
            return Response({"error": str(e)}, status=404)

        # Get client's current deposit fee
        profile, _ = UserProfile.objects.get_or_create(
            user=request.user, defaults={"name": request.user.username}
        )

        deposit = profile.get_deposit_fee()
        service_price = Decimal(str(service.price))

        # Deposit can't exceed the service price
        deposit = min(deposit, service_price)
        remaining = service_price - deposit
        deposit_cents = int(deposit * 100)

        # Need barber's Stripe account to route deposit
        if not barber.stripe_account_id:
            return Response({
                "error": f"{barber.name} hasn't connected Stripe yet. Deposit not available.",
                "pay_in_shop": True,
            }, status=400)

        try:
            account = stripe.Account.retrieve(barber.stripe_account_id)
            if not account.charges_enabled:
                return Response({
                    "error": f"{barber.name}'s Stripe account isn't fully set up yet.",
                    "pay_in_shop": True,
                }, status=400)
        except Exception:
            pass

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency":     "usd",
                        "product_data": {
                            "name":        f"HEADZ UP — Deposit for {service.name}",
                            "description": (
                                f"${deposit:.2f} deposit to secure your chair with {barber.name}. "
                                f"Remaining balance ${remaining:.2f} due at appointment."
                            ),
                        },
                        "unit_amount": deposit_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                payment_intent_data={
                    "transfer_data": {"destination": barber.stripe_account_id},
                    "description":   f"HEADZ UP Deposit — {service.name} with {barber.name}",
                },
                success_url=f"{BACKEND_URL}/api/deposit-success/?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/book?deposit_canceled=true",
                customer_email=request.user.email or None,
                metadata={
                    "user_id":        str(request.user.id),
                    "service_id":     str(service_id),
                    "barber_id":      str(barber_id),
                    "date":           str(date),
                    "time":           str(time),
                    "client_notes":   client_notes[:500],
                    "deposit_amount": str(deposit),
                    "remaining":      str(remaining),
                    "service_name":   service.name,
                    "barber_name":    barber.name,
                    "strike_count":   str(profile.strike_count),
                },
            )
            return Response({
                "url":             session.url,
                "session_id":      session.id,
                "deposit_amount":  str(deposit),
                "remaining":       str(remaining),
                "service_price":   str(service_price),
                "strike_count":    profile.strike_count,
                "barber_name":     barber.name,
                "service_name":    service.name,
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class DepositSuccessView(APIView):
    """GET — called by Stripe after deposit paid. Books appointment, marks deposit paid."""
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.GET.get("session_id")
        if not session_id:
            return redirect(f"{FRONTEND_URL}/book")

        try:
            session  = stripe.checkout.Session.retrieve(session_id)
            metadata = session.metadata
            user     = User.objects.get(id=metadata["user_id"])
            service  = Service.objects.get(id=metadata["service_id"])
            barber   = Barber.objects.get(id=metadata["barber_id"])

            appt, created = Appointment.objects.get_or_create(
                user=user, service=service, barber=barber,
                date=metadata["date"], time=metadata["time"],
                defaults={
                    "payment_method":     "online",
                    "client_notes":       metadata.get("client_notes", ""),
                    "deposit_amount":     Decimal(metadata.get("deposit_amount", "10.00")),
                    "deposit_paid":       True,
                    "deposit_session_id": session_id,
                    "status":             "confirmed",
                },
            )
            if not created and not appt.deposit_paid:
                appt.deposit_paid       = True
                appt.deposit_session_id = session_id
                appt.deposit_amount     = Decimal(metadata.get("deposit_amount", "10.00"))
                appt.save(update_fields=["deposit_paid", "deposit_session_id", "deposit_amount"])

            if created:
                appt_full = Appointment.objects.select_related(
                    "user", "barber", "barber__user", "service"
                ).get(pk=appt.pk)
                send_booking_confirmation(appt_full)
                send_deposit_paid_email(appt_full)
                sms_booking_confirmation(appt_full)
                sms_deposit_paid(appt_full)
            elif not created and not appt.deposit_paid:
                appt_full = Appointment.objects.select_related(
                    "user", "barber", "barber__user", "service"
                ).get(pk=appt.pk)
                send_deposit_paid_email(appt_full)
                sms_deposit_paid(appt_full)

            return redirect(
                f"{FRONTEND_URL}/booking-confirmed"
                f"?service={metadata.get('service_name','')}"
                f"&barber={metadata.get('barber_name','')}"
                f"&date={metadata.get('date','')}"
                f"&time={metadata.get('time','')}"
                f"&deposit={metadata.get('deposit_amount','10.00')}"
                f"&remaining={metadata.get('remaining','0.00')}"
                f"&payment=deposit"
            )
        except Exception as e:
            return redirect(f"{FRONTEND_URL}/book?deposit_error=true")


def send_strike_email(user, profile, reason, appt):
    """Send email to client when a strike is issued."""
    email = user.email
    if not email:
        return

    reason_label = "No Show" if reason == "no_show" else "Late Cancellation (within 2 hours)"
    next_deposit = profile.get_deposit_fee()
    increase     = next_deposit - DEPOSIT_BASE
    service_name = appt.service.name if appt.service else "your appointment"
    appt_date    = appt.date.strftime("%B %d, %Y") if appt.date else "—"

    subject = f"⚡ Strike Added to Your HEADZ UP Account"

    plain = f"""
Hi {user.username},

A strike has been added to your HEADZ UP account.

Reason: {reason_label}
Appointment: {service_name} on {appt_date}
Your total strikes: {profile.strike_count}
Your next deposit fee: ${next_deposit:.2f}

What this means:
Your standard deposit is $10.00. Each strike after your first adds $1.50 to your
next booking deposit. Your current deposit is ${next_deposit:.2f}
{"(increased by $" + f"{increase:.2f}" + " due to your strikes)." if increase > 0 else "(standard rate — this was your first strike)."}

Please review our Deposit & Cancellation Policy when you next book.

Questions? Contact HEADZ UP Barbershop directly.

— HEADZ UP Barbershop
2509 W 4th St, Hattiesburg, MS 39401
"""

    html = f"""
<div style="background:#000;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;padding:0;">
  <div style="background:linear-gradient(to right,#ef4444,#f59e0b);height:3px;"></div>
  <div style="padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.5em;text-transform:uppercase;color:rgba(245,158,11,0.7);margin:0 0 8px;">HEADZ UP BARBERSHOP</p>
    <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 24px;color:#fff;">
      ⚡ Strike Added
    </h1>
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);padding:16px 18px;margin-bottom:20px;">
      <p style="font-size:12px;color:#f87171;margin:0 0 4px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Strike #{profile.strike_count} Issued</p>
      <p style="font-size:13px;color:#a1a1aa;margin:0;line-height:1.6;">Reason: <strong style="color:#fff;">{reason_label}</strong></p>
      <p style="font-size:13px;color:#a1a1aa;margin:4px 0 0;line-height:1.6;">Appointment: <strong style="color:#fff;">{service_name} on {appt_date}</strong></p>
    </div>
    <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);padding:16px 18px;margin-bottom:24px;">
      <p style="font-size:11px;color:rgba(245,158,11,0.6);text-transform:uppercase;letter-spacing:0.4em;margin:0 0 10px;">Your Next Deposit</p>
      <p style="font-size:28px;font-weight:900;color:#f59e0b;margin:0 0 6px;">${next_deposit:.2f}</p>
      <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">
        {"Your deposit stays at $10.00 for now — this is your first strike and serves as a warning." if profile.strike_count == 1 else f"Base $10.00 + ${increase:.2f} increase from {profile.strike_count - 1} previous strike{'s' if profile.strike_count > 2 else ''}."}<br/>
        Each additional strike adds $1.50 to your next booking deposit.
      </p>
    </div>
    <p style="font-size:12px;color:#52525b;line-height:1.8;margin:0 0 24px;">
      No-shows and last-minute cancellations cost your barber real money. Our deposit policy protects their time. Please review the Deposit &amp; Cancellation Policy next time you book.
    </p>
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;">
      <p style="font-size:11px;color:#27272a;margin:0;">HEADZ UP Barbershop · 2509 W 4th St, Hattiesburg, MS 39401</p>
    </div>
  </div>
  <div style="background:linear-gradient(to right,#ef4444,#f59e0b);height:2px;"></div>
</div>
"""
    _sendgrid_send(email, subject, plain, html)


class IssueStrikeView(APIView):
    """
    POST — barber marks a client as no-show or late cancel.
    Issues a strike and increases their next deposit fee by $1.50.
    Barber only.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found"}, status=404)

        reason = request.data.get("reason", "no_show")

        # Update appointment status
        try:
            if reason == "no_show":
                appt.status = "no_show"
                appt.save(update_fields=["status"])
            elif reason == "late_cancel":
                appt.status = "cancelled"
                appt.save(update_fields=["status"])
                # late_cancel field may not exist yet if migration hasn't run
                try:
                    appt.late_cancel = True
                    appt.save(update_fields=["late_cancel"])
                except Exception:
                    pass
        except Exception as e:
            return Response({"error": f"Could not update appointment: {str(e)}"}, status=400)

        # Issue strike to client
        try:
            profile = issue_strike(appt.user, reason)
        except Exception as e:
            return Response({"error": f"Strike error: {str(e)}"}, status=400)

        # Email the client
        try:
            send_strike_email(appt.user, profile, reason, appt)
            sms_strike(appt.user, profile, reason)
        except Exception:
            pass

        return Response({
            "message":      f"Strike issued for {reason.replace('_',' ')}",
            "client":       appt.user.username,
            "strike_count": profile.strike_count,
            "next_deposit": str(profile.get_deposit_fee()),
        })


class BarberClientStrikesView(APIView):
    """GET — barber sees all strikes/deposit info for their clients."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)

        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "No barber profile"}, status=403)

        # Get all clients who have booked with this barber
        client_ids = Appointment.objects.filter(
            barber=barber
        ).values_list("user_id", flat=True).distinct()

        results = []
        for uid in client_ids:
            try:
                user    = User.objects.get(pk=uid)
                profile = getattr(user, "profile", None)
                recent  = Appointment.objects.filter(
                    user=user, barber=barber
                ).order_by("-date", "-time").first()
                results.append({
                    "user_id":      uid,
                    "username":     user.username,
                    "strike_count": profile.strike_count if profile else 0,
                    "next_deposit": str(profile.get_deposit_fee()) if profile else "10.00",
                    "no_shows":     Appointment.objects.filter(user=user, barber=barber, status="no_show").count(),
                    "late_cancels": Appointment.objects.filter(user=user, barber=barber, late_cancel=True).count(),
                    "last_visit":   str(recent.date) if recent else None,
                })
            except User.DoesNotExist:
                continue

        return Response(results)


class StripeConnectOnboardView(APIView):
    """
    Step 1 — barber clicks "Connect Stripe" in dashboard.
    Creates a Stripe Express account and returns the onboarding URL.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        try:
            # If already has an account, generate a new onboarding link
            if barber.stripe_account_id:
                account_id = barber.stripe_account_id
            else:
                # Create new Express account
                account = stripe.Account.create(
                    type="express",
                    country="US",
                    email=request.user.email,
                    capabilities={
                        "card_payments": {"requested": True},
                        "transfers":     {"requested": True},
                    },
                    business_profile={
                        "name":  f"{barber.name} — HEADZ UP Barbershop",
                        "mcc":   "7241",  # Barber shops
                        "url":   FRONTEND_URL,
                    },
                    metadata={
                        "barber_id":   str(barber.id),
                        "barber_name": barber.name,
                    },
                )
                account_id = account.id
                barber.stripe_account_id = account_id
                barber.save(update_fields=["stripe_account_id"])

            # Generate onboarding link
            link = stripe.AccountLink.create(
                account=account_id,
                refresh_url=f"{FRONTEND_URL}/barber-dashboard?stripe=refresh",
                return_url=f"{FRONTEND_URL}/barber-dashboard?stripe=connected",
                type="account_onboarding",
            )
            return Response({"url": link.url, "account_id": account_id})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class StripeConnectStatusView(APIView):
    """
    GET — returns whether barber's Stripe account is fully set up.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        if not barber.stripe_account_id:
            return Response({"connected": False, "charges_enabled": False})

        try:
            account = stripe.Account.retrieve(barber.stripe_account_id)
            return Response({
                "connected":       True,
                "charges_enabled": account.charges_enabled,
                "payouts_enabled": account.payouts_enabled,
                "account_id":      barber.stripe_account_id,
                "details_submitted": account.details_submitted,
            })
        except Exception as e:
            return Response({"connected": False, "charges_enabled": False, "error": str(e)})


class StripeConnectDashboardView(APIView):
    """
    GET — returns a link to the barber's Stripe Express dashboard
    so they can see payouts, earnings, and withdraw to their bank.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber or not barber.stripe_account_id:
            return Response({"error": "No Stripe account connected"}, status=400)

        try:
            login_link = stripe.Account.create_login_link(barber.stripe_account_id)
            return Response({"url": login_link.url})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class CreateCheckoutSessionView(APIView):
    """
    Client pays for an appointment.
    If barber has Stripe Connect — payment goes directly to barber's Stripe.
    If not — falls back to cash app or pay in shop message.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_id   = request.data.get("service")
        barber_id    = request.data.get("barber")
        date         = request.data.get("date")
        time         = request.data.get("time")
        client_notes = request.data.get("client_notes", "")

        try:
            service = Service.objects.get(id=service_id)
            barber  = Barber.objects.get(id=barber_id)
        except (Service.DoesNotExist, Barber.DoesNotExist) as e:
            return Response({"error": str(e)}, status=404)

        amount_cents = int(float(service.price) * 100)

        # Check barber has connected Stripe
        if not barber.stripe_account_id:
            # Fallback — use Cash App if set
            cashtag = (barber.cashapp_tag or "").strip()
            if cashtag:
                if not cashtag.startswith("$"):
                    cashtag = f"${cashtag}"
                return Response({
                    "method":      "cashapp",
                    "cashapp_url": f"https://cash.app/{cashtag}/{float(service.price):.2f}",
                    "cashtag":     cashtag,
                    "amount":      f"{float(service.price):.2f}",
                    "barber_name": barber.name,
                })
            return Response({
                "error": f"{barber.name} hasn't connected Stripe yet. Please pay in shop.",
                "pay_in_shop": True,
            }, status=400)

        # Check Stripe account is ready to receive payments
        try:
            account = stripe.Account.retrieve(barber.stripe_account_id)
            if not account.charges_enabled:
                return Response({
                    "error": f"{barber.name}'s Stripe account isn't fully set up yet. Please pay in shop.",
                    "pay_in_shop": True,
                }, status=400)
        except Exception:
            pass

        # Platform fee — 0% for now (you can add a % later e.g. 50 cents per booking)
        # application_fee_amount = 50  # 50 cents platform fee

        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency":     "usd",
                        "product_data": {
                            "name":        f"HEADZ UP — {service.name}",
                            "description": f"Appointment with {barber.name} · {service.duration_minutes} min",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }],
                mode="payment",
                # This routes the payment directly to the barber's Stripe account
                payment_intent_data={
                    "transfer_data": {
                        "destination": barber.stripe_account_id,
                    },
                    "description": f"HEADZ UP — {service.name} with {barber.name}",
                },
                success_url=f"{BACKEND_URL}/api/payment-success/?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/book?canceled=true",
                customer_email=request.user.email or None,
                metadata={
                    "user_id":      str(request.user.id),
                    "service_id":   str(service_id),
                    "barber_id":    str(barber_id),
                    "date":         str(date),
                    "time":         str(time),
                    "client_notes": client_notes[:500],
                    "barber_name":  barber.name,
                    "service_name": service.name,
                },
            )
            return Response({
                "method":       "stripe",
                "url":          checkout_session.url,
                "session_id":   checkout_session.id,
                "amount":       f"{float(service.price):.2f}",
                "service_name": service.name,
                "barber_name":  barber.name,
            })
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class PaymentSuccessView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        session_id = request.GET.get("session_id")
        if not session_id:
            return redirect(f"{FRONTEND_URL}/dashboard?booked=true")

        try:
            session  = stripe.checkout.Session.retrieve(session_id)
            metadata = session.metadata
            user     = User.objects.get(id=metadata.get("user_id"))
            service  = Service.objects.get(id=metadata.get("service_id"))
            barber   = Barber.objects.get(id=metadata.get("barber_id"))

            appt, created = Appointment.objects.get_or_create(
                user=user, service=service, barber=barber,
                date=metadata.get("date"), time=metadata.get("time"),
                defaults={
                    "payment_method": "online",
                    "client_notes":   metadata.get("client_notes", ""),
                    "status":         "confirmed",
                },
            )
            if created:
                appt_full = Appointment.objects.select_related(
                    "user", "barber", "barber__user", "service"
                ).get(pk=appt.pk)
                send_booking_confirmation(appt_full)

            return redirect(
                f"{FRONTEND_URL}/booking-confirmed"
                f"?service={metadata.get('service_name','')}"
                f"&barber={metadata.get('barber_name','')}"
                f"&date={metadata.get('date','')}"
                f"&time={metadata.get('time','')}"
                f"&payment=online"
            )
        except Exception as e:
            return redirect(f"{FRONTEND_URL}/dashboard?booked=true")


# ── Admin schedule ────────────────────────────────────────────────────────────
class BarberScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)

        date      = request.query_params.get("date")
        barber_id = request.query_params.get("barber")
        month_view = request.query_params.get("month") == "true"

        queryset = Appointment.objects.select_related("user", "service", "barber").order_by("date", "time")

        if barber_id:
            queryset = queryset.filter(barber_id=barber_id)

        # Month view — return entire month for calendar dot indicators
        if month_view and date:
            try:
                from datetime import date as date_type
                parsed = date_type.fromisoformat(date)
                import calendar
                _, days_in_month = calendar.monthrange(parsed.year, parsed.month)
                month_start = date_type(parsed.year, parsed.month, 1)
                month_end   = date_type(parsed.year, parsed.month, days_in_month)
                queryset = queryset.filter(date__gte=month_start, date__lte=month_end)
            except Exception:
                pass
        elif date:
            queryset = queryset.filter(date=date)

        data = [{
            "id":               appt.id,
            "client":           appt.user.username,
            "client_email":     appt.user.email,
            "service":          appt.service.name if appt.service else "",
            "service_price":    str(appt.service.price) if appt.service else "",
            "service_duration": appt.service.duration_minutes if appt.service else 30,
            "barber":           appt.barber.name if appt.barber else "",
            "barber_id":        appt.barber.id if appt.barber else None,
            "date":             str(appt.date),
            "time":             str(appt.time),
            "payment_method":   appt.payment_method,
            "status":           appt.status,
        } for appt in queryset]

        total   = queryset.count()
        online  = queryset.filter(payment_method="online").count()
        in_shop = queryset.filter(payment_method="shop").count()
        revenue = sum(float(a["service_price"]) for a in data if a["payment_method"] == "online" and a["service_price"])

        return Response({
            "appointments": data,
            "summary": {
                "total": total, "paid_online": online,
                "pay_in_shop": in_shop, "online_revenue": f"{revenue:.2f}",
            }
        })


class AdminAppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        new_status = request.data.get("status")
        if new_status in ["confirmed", "completed", "no_show", "cancelled"]:
            appt.status = new_status
            appt.save()
        return Response({"message": "Updated", "id": appt.id})

    def delete(self, request, pk):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk)
            appt.delete()
            return Response({"message": "Deleted"}, status=204)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ── Available slots ───────────────────────────────────────────────────────────
class BarberWorkingDaysView(APIView):
    """
    GET barbers/<pk>/working-days/
    Returns ALL 7 days with working status so the booking calendar
    can accurately show which days have a slash (unavailable).
    Public — no auth required.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        from datetime import date as date_type, timedelta

        # Get all availability rows for this barber
        avail_qs  = BarberAvailability.objects.filter(barber_id=pk)
        avail_map = {a.day_of_week: a for a in avail_qs}

        has_any_schedule = len(avail_map) > 0

        # Return ALL 7 days so frontend knows explicitly what's off
        # Python weekday: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
        all_days = []
        for dow in range(7):
            a = avail_map.get(dow)
            if a:
                all_days.append({
                    "day_of_week": dow,
                    "is_working":  a.is_working,
                    "start_time":  str(a.start_time) if a.is_working else None,
                    "end_time":    str(a.end_time)   if a.is_working else None,
                })
            else:
                # No row saved for this day — treat as not working if barber has ANY schedule
                # If barber has NO schedule at all, treat every day as potentially available
                all_days.append({
                    "day_of_week": dow,
                    "is_working":  not has_any_schedule,  # unknown = allow if no schedule set
                    "start_time":  None,
                    "end_time":    None,
                })

        # Also get time-off dates for the next 180 days
        today    = date_type.today()
        end_date = today + timedelta(days=180)
        time_off_dates = list(
            BarberTimeOff.objects.filter(
                barber_id=pk, date__gte=today, date__lte=end_date
            ).values_list("date", flat=True)
        )

        return Response({
            "has_schedule":   has_any_schedule,
            "all_days":       all_days,
            "time_off_dates": [str(d) for d in time_off_dates],
        })


class AvailableSlotsView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        barber_id  = request.query_params.get("barber")
        date_str   = request.query_params.get("date")
        service_id = request.query_params.get("service")

        if not barber_id or not date_str:
            return Response({"error": "barber and date required"}, status=400)

        try:
            appt_date = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({"error": "Invalid date"}, status=400)

        if appt_date < date_type.today():
            return Response({"error": "Cannot book past dates"}, status=400)
        if appt_date.weekday() == 6:
            return Response({"error": "Closed Sundays"}, status=400)

        if BarberTimeOff.objects.filter(barber_id=barber_id, date=appt_date).exists():
            return Response({"booked_slots": [], "available_slots": [], "time_off": True, "message": "Barber not available."})

        day_of_week = appt_date.weekday()
        try:
            avail = BarberAvailability.objects.get(barber_id=barber_id, day_of_week=day_of_week)
            if not avail.is_working:
                return Response({"booked_slots": [], "available_slots": [], "time_off": True, "message": "Barber doesn't work this day."})
            work_start = avail.start_time
            work_end   = avail.end_time
        except BarberAvailability.DoesNotExist:
            work_start = datetime.strptime("09:00", "%H:%M").time()
            work_end   = datetime.strptime("18:00", "%H:%M").time()

        duration = 30
        if service_id:
            try:
                svc      = Service.objects.get(pk=service_id)
                duration = svc.duration_minutes
            except Service.DoesNotExist:
                pass

        all_slots = []
        slot_dt   = datetime.combine(appt_date, work_start)
        end_dt    = datetime.combine(appt_date, work_end)
        while slot_dt + timedelta(minutes=duration) <= end_dt:
            all_slots.append(slot_dt.time())
            slot_dt += timedelta(minutes=30)

        booked_times = set(Appointment.objects.filter(barber_id=barber_id, date=appt_date).values_list("time", flat=True))

        blocked = set()
        for booked_time in booked_times:
            booked_dt = datetime.combine(appt_date, booked_time)
            blocked.add(booked_time)
            slots_back = math.ceil(duration / 30) - 1
            for i in range(1, slots_back + 1):
                prev = booked_dt - timedelta(minutes=30 * i)
                blocked.add(prev.time())

        # Barber's custom price for this service (if any)
        service_price = None
        if service_id:
            try:
                _svc = Service.objects.get(pk=service_id)
                custom = BarberServicePrice.objects.filter(barber_id=barber_id, service=_svc).first()
                service_price = float(custom.price) if custom else float(_svc.price)
            except Service.DoesNotExist:
                pass

        return Response({
            "booked_slots":     [str(s) for s in booked_times],
            "available_slots":  [str(s) for s in all_slots if s not in blocked],
            "work_start":       str(work_start),
            "work_end":         str(work_end),
            "duration_minutes": duration,
            "time_off":         False,
            "service_price":    service_price,
        })


# ── Barber portal views ───────────────────────────────────────────────────────
class BarberMeUpdateView(APIView):
    """PATCH barber/me/update/ — lets barber update Cash App tag, bio, and profile photo"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        import base64, io
        from django.core.files.base import ContentFile
        import logging
        logger = logging.getLogger(__name__)

        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        if "cashapp_tag" in request.data:
            tag = request.data["cashapp_tag"].strip()
            if tag and not tag.startswith("$"):
                tag = f"${tag}"
            barber.cashapp_tag = tag

        if "bio" in request.data:
            barber.bio = request.data["bio"]

        # Photo upload — accepts base64 encoded image string
        # Format: "data:image/jpeg;base64,/9j/4AAQ..." or just the raw base64
        if "photo" in request.data:
            photo_data = request.data["photo"]
            try:
                # Store as full data URL so it can be used directly as img src
                # This persists in PostgreSQL — survives every Railway redeploy
                if "," in photo_data:
                    # Already a data URL — store as-is
                    barber.photo_data = photo_data
                else:
                    # Raw base64 — wrap in data URL
                    barber.photo_data = f"data:image/jpeg;base64,{photo_data}"

                # Also try to save to filesystem (works locally, optional on Railway)
                try:
                    raw_b64 = photo_data.split(",", 1)[-1]
                    img_bytes = base64.b64decode(raw_b64)
                    ext = "png" if "png" in photo_data[:30] else "webp" if "webp" in photo_data[:30] else "jpg"
                    barber.photo.save(f"barber_{barber.id}.{ext}", ContentFile(img_bytes), save=False)
                except Exception:
                    pass  # filesystem save is best-effort only

                logger.info(f"Photo saved for barber {barber.id}")
            except Exception as e:
                logger.error(f"Photo upload failed: {e}")
                return Response({"error": "Photo upload failed. Please try a smaller image."}, status=400)

        barber.save()

        # Return the base64 data URL — works even after filesystem wipe
        photo_url = barber.photo_data or None
        if not photo_url and barber.photo:
            try:
                photo_url = request.build_absolute_uri(barber.photo.url)
            except Exception:
                pass

        return Response({
            "message":     "Updated",
            "cashapp_tag": barber.cashapp_tag,
            "bio":         barber.bio,
            "photo_url":   photo_url,
        })


class BarberMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        today       = date_type.today()
        today_appts = Appointment.objects.filter(barber=barber, date=today, status__in=["confirmed","completed"]).count()
        total_appts = Appointment.objects.filter(barber=barber).count()
        online_appts = Appointment.objects.filter(barber=barber, payment_method="online", status__in=["confirmed","completed"])
        online_rev  = sum(float(a.service.price) for a in online_appts if a.service)
        shop_count  = Appointment.objects.filter(barber=barber, payment_method="shop", status__in=["confirmed","completed"]).count()
        photo_url = barber.photo_data or None
        if not photo_url and barber.photo:
            try:
                photo_url = request.build_absolute_uri(barber.photo.url)
            except Exception:
                pass

        return Response({
            "id":             barber.id,
            "name":           barber.name,
            "bio":            barber.bio,
            "cashapp_tag":    barber.cashapp_tag or "",
            "photo_url":      photo_url,
            "today_count":    today_appts,
            "total_count":    total_appts,
            "online_revenue": f"{online_rev:.2f}",
            "pay_in_shop":    shop_count,
        })


class BarberServicePriceView(APIView):
    """
    GET  barber/service-prices/    — returns all services with barber's custom price (or default)
    POST barber/service-prices/    — set/update a custom price for one service
    DELETE barber/service-prices/<service_id>/  — reset to default price
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        services     = Service.objects.all().order_by("name")
        custom_map   = {
            cp.service_id: cp.price
            for cp in BarberServicePrice.objects.filter(barber=barber)
        }

        data = [{
            "id":               s.id,
            "name":             s.name,
            "duration_minutes": s.duration_minutes,
            "default_price":    float(s.price),
            "custom_price":     float(custom_map[s.id]) if s.id in custom_map else None,
            "effective_price":  float(custom_map[s.id]) if s.id in custom_map else float(s.price),
            "is_custom":        s.id in custom_map,
        } for s in services]

        return Response(data)

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        service_id = request.data.get("service_id")
        new_price  = request.data.get("price")

        if not service_id or new_price is None:
            return Response({"error": "service_id and price are required."}, status=400)

        try:
            new_price = float(new_price)
            if new_price < 0:
                raise ValueError
        except (ValueError, TypeError):
            return Response({"error": "Price must be a positive number."}, status=400)

        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({"error": "Service not found."}, status=404)

        obj, created = BarberServicePrice.objects.update_or_create(
            barber=barber, service=service,
            defaults={"price": new_price}
        )

        return Response({
            "message":         f"Price for {service.name} updated to ${new_price:.2f}",
            "service_id":      service.id,
            "service_name":    service.name,
            "custom_price":    float(obj.price),
            "default_price":   float(service.price),
        })

    def delete(self, request, service_id):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        deleted, _ = BarberServicePrice.objects.filter(
            barber=barber, service_id=service_id
        ).delete()

        if deleted:
            service = Service.objects.get(pk=service_id)
            return Response({
                "message":       f"Price reset to default (${service.price})",
                "default_price": float(service.price),
            })
        return Response({"error": "No custom price found."}, status=404)


class BarberScheduleOwnView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber   = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        date_str   = request.query_params.get("date", str(date_type.today()))
        month_view = request.query_params.get("month") == "true"

        if month_view:
            try:
                import calendar
                parsed = date_type.fromisoformat(date_str)
                _, days = calendar.monthrange(parsed.year, parsed.month)
                month_end = date_type(parsed.year, parsed.month, days)
                queryset = Appointment.objects.filter(barber=barber, date__gte=date_str, date__lte=month_end).select_related("user", "service").order_by("date", "time")
            except Exception:
                queryset = Appointment.objects.filter(barber=barber, date=date_str).select_related("user", "service").order_by("time")
        else:
            queryset = Appointment.objects.filter(barber=barber, date=date_str).select_related("user", "service").order_by("time")
        data = [{
            "id":               appt.id,
            "client":           appt.user.first_name if appt.is_walk_in and appt.user.first_name else appt.user.username,
            "client_email":     appt.user.email,
            "service":          appt.service.name if appt.service else "",
            "service_price":    str(appt.service.price) if appt.service else "",
            "service_duration": appt.service.duration_minutes if appt.service else 30,
            "date":             str(appt.date),
            "time":             str(appt.time),
            "status":           appt.status,
            "payment_method":   appt.payment_method,
            "barber_notes":     appt.barber_notes,
            "client_notes":     appt.client_notes,
            "is_walk_in":       appt.is_walk_in,
        } for appt in queryset]

        total   = queryset.count()
        revenue = sum(float(a["service_price"]) for a in data if a["payment_method"] == "online" and a["service_price"])
        return Response({
            "appointments": data,
            "summary": {"total": total, "paid_online": queryset.filter(payment_method="online").count(), "pay_in_shop": queryset.filter(payment_method="shop").count(), "online_revenue": f"{revenue:.2f}"},
            "barber_name": barber.name,
        })


class BarberAppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from django.utils import timezone as tz
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk, barber=barber)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        new_status = request.data.get("status")
        new_date   = request.data.get("date")
        new_time   = request.data.get("time")
        new_notes  = request.data.get("barber_notes")

        if new_status in ["pending_shop", "confirmed", "completed", "no_show", "cancelled"]:
            appt.status = new_status
            # When barber confirms a shop booking arrival, stamp the time
            if new_status == "confirmed" and appt.payment_method == "shop":
                appt.shop_confirmed_at = tz.now()

        if new_date:
            appt.date = new_date
        if new_time:
            appt.time = new_time
        if new_notes is not None:
            appt.barber_notes = new_notes

        try:
            appt.save()
        except Exception:
            return Response({"error": "That slot is already booked"}, status=400)

        if new_status == "completed":
            appt_full = Appointment.objects.select_related(
                "user", "barber", "barber__user", "service"
            ).get(pk=appt.pk)
            _schedule_review_notification(appt_full)
            send_review_request_email(appt_full)
            sms_review_request(appt_full)

        return Response({"message": "Updated", "id": appt.id, "barber_notes": appt.barber_notes})

    def delete(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            appt = Appointment.objects.select_related(
                "user", "barber", "barber__user", "service"
            ).get(pk=pk, barber=barber)
            send_cancellation_email(appt, cancelled_by="barber")
            sms_cancellation(appt, cancelled_by="barber")
            appt.delete()
            return Response({"message": "Deleted"}, status=204)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class WalkInBookingView(APIView):
    """Barber creates a walk-in appointment on the spot."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber and not request.user.is_staff:
            return Response({"error": "Not a barber account"}, status=403)

        client_name = request.data.get("client_name", "").strip()
        service_id  = request.data.get("service_id") or request.data.get("service")
        date_val    = request.data.get("date")
        time_val    = request.data.get("time")
        notes       = request.data.get("notes", "")
        payment     = request.data.get("payment_method", "shop")
        phone       = request.data.get("phone", "").strip()
        email       = request.data.get("email", "").strip()
        barber_id   = request.data.get("barber_id")

        # Allow staff/admin to specify a barber; barbers default to themselves
        if barber_id and (request.user.is_staff or barber):
            try:
                target_barber = Barber.objects.get(pk=barber_id)
            except Barber.DoesNotExist:
                return Response({"error": "Barber not found."}, status=404)
        else:
            target_barber = barber

        if not target_barber:
            return Response({"error": "No barber specified."}, status=400)

        if not all([client_name, service_id, date_val, time_val]):
            return Response({"error": "client_name, service, date and time are required."}, status=400)

        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({"error": "Service not found."}, status=404)

        # Create or get a placeholder user for walk-ins
        username = f"walkin_{client_name.lower().replace(' ', '_')}_{date_val.replace('-', '')}"
        user, _ = User.objects.get_or_create(
            username=username[:150],
            defaults={"first_name": client_name}
        )

        try:
            appt = Appointment.objects.create(
                user=user,
                barber=target_barber,
                service=service,
                date=date_val,
                time=time_val,
                status="confirmed",
                payment_method=payment,
                barber_notes=notes,
                is_walk_in=True,
            )
        except Exception:
            return Response({"error": "That slot is already booked."}, status=400)

        # ── Send welcome SMS + email to walk-in client (synchronous) ──────────
        import logging
        logger = logging.getLogger(__name__)

        try:
            from datetime import date as date_type
            try:
                appt_date = date_type.fromisoformat(str(date_val))
                date_str  = appt_date.strftime("%A, %B %d")
            except Exception:
                date_str = str(date_val)

            try:
                h, m, *_ = str(time_val).split(":")
                h = int(h); ampm = "PM" if h >= 12 else "AM"
                time_str = f"{h % 12 or 12}:{m} {ampm}"
            except Exception:
                time_str = str(time_val)

            welcome_msg = (
                f"Hey {client_name}! Welcome to HEADZ UP Barbershop ✂️🔥 "
                f"You're booked for {service.name} on {date_str} at {time_str} "
                f"with {target_barber.name}. We'll take care of you. See you in the chair!"
            )

            if phone:
                try:
                    raw = phone.strip().replace("-","").replace("(","").replace(")","").replace(" ","")
                    e164 = f"+1{raw}" if not raw.startswith("+") else raw
                    _twilio_send(e164, welcome_msg)
                except Exception as e:
                    logger.error(f"Walk-in SMS failed: {e}")

            if email:
                try:
                    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <div style="width:52px;height:52px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);display:inline-flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">✂️</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:26px;font-weight:900;text-transform:uppercase;margin:0;line-height:1.05;">
            You're Booked<br><span style="color:#f59e0b;font-style:italic;">Welcome In_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:28px;">
          <p style="color:#71717a;font-size:13px;margin:0;line-height:1.8;">
            Hey <strong style="color:white;">{client_name}</strong>! You just walked into the right place.
            You're officially part of the <strong style="color:#f59e0b;">HEADZ UP</strong> family.
          </p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:22px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:14px;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Your Appointment</p>
              <p style="font-size:18px;color:#f59e0b;margin:0;font-weight:900;font-family:'Courier New',monospace;">{date_str} · {time_str}</p>
            </td></tr>
            <tr><td style="padding-bottom:14px;border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Service</p>
              <p style="font-size:15px;color:white;margin:0;font-weight:700;">{service.name}</p>
            </td></tr>
            <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:14px;">
              <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">Your Barber</p>
              <p style="font-size:15px;color:white;margin:0;font-weight:700;">{target_barber.name}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;">
          <p style="font-size:13px;color:#71717a;margin:0;line-height:1.8;">
            We'll take care of you every time. Book your next appointment online anytime.
          </p>
        </td></tr>
        <tr><td style="padding-top:20px;">
          <a href="{FRONTEND_URL}/book" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;text-decoration:none;">Book Your Next Cut &rarr;</a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;margin-top:24px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;">HEADZ UP Barbershop · 2509 W 4th St, Hattiesburg, MS 39401</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
                    plain = (
                        f"Hey {client_name}! Welcome to HEADZ UP Barbershop. "
                        f"You're booked for {service.name} with {target_barber.name} "
                        f"on {date_str} at {time_str}. "
                        f"Book your next cut: {FRONTEND_URL}/book"
                    )
                    _sendgrid_send(
                        email,
                        f"You're Booked at HEADZ UP ✂️ — {date_str} at {time_str}",
                        plain, html
                    )
                except Exception as e:
                    logger.error(f"Walk-in email failed: {e}")
        except Exception as e:
            logger.error(f"Walk-in welcome failed: {e}")

        # ── Add to waitlist so barber sees them in Waitlist tab ───────────────
        try:
            WaitlistEntry.objects.create(
                barber=target_barber,
                service=service,
                client_name=client_name,
                client_phone=phone,
                client_email=email,
                date=date_val,
                notes=f"[WALK-IN] {notes}".strip(" []") if notes else "[WALK-IN]",
                notified=False,  # Barber still needs to see this in Waitlist tab
            )
        except Exception as e:
            logger.error(f"Walk-in waitlist entry failed: {e}")

        return Response({
            "message": "Walk-in booked.",
            "id":      appt.id,
            "client":  client_name,
            "service": service.name,
            "date":    str(appt.date),
            "time":    str(appt.time),
        }, status=201)


# ── Newsletter / News Feed ────────────────────────────────────────────────────

class NewsletterPostListView(APIView):
    """
    GET  /newsletter/          — public, returns all active posts
    GET  /newsletter/?category= — filter by category
    GET  /newsletter/?pinned=true — pinned only
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from core.models import NewsletterPost
        qs = NewsletterPost.objects.filter(active=True).select_related("barber")
        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)
        if request.query_params.get("pinned") == "true":
            qs = qs.filter(pinned=True)
        posts = []
        for p in qs[:50]:
            posts.append({
                "id":           p.id,
                "title":        p.title,
                "body":         p.body,
                "category":     p.category,
                "category_label": p.get_category_display(),
                "emoji":        p.emoji,
                "pinned":       p.pinned,
                "barber_name":  p.barber.name if p.barber else "HEADZ UP",
                "created_at":   p.created_at.strftime("%B %d, %Y"),
                "updated_at":   p.updated_at.isoformat(),
            })
        return Response(posts)


class NewsletterPostManageView(APIView):
    """
    POST   /newsletter/manage/         — barber creates a post
    PATCH  /newsletter/manage/<pk>/    — barber edits their post
    DELETE /newsletter/manage/<pk>/    — barber deletes their post
    GET    /newsletter/manage/         — barber sees their own posts
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)
        from core.models import NewsletterPost
        barber = get_barber_for_user(request.user)
        qs = NewsletterPost.objects.filter(barber=barber).order_by("-created_at")
        posts = [{
            "id":       p.id,
            "title":    p.title,
            "body":     p.body,
            "category": p.category,
            "emoji":    p.emoji,
            "active":   p.active,
            "pinned":   p.pinned,
            "created_at": p.created_at.strftime("%B %d, %Y"),
        } for p in qs]
        return Response(posts)

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)
        from core.models import NewsletterPost
        barber = get_barber_for_user(request.user)
        title    = request.data.get("title", "").strip()
        body     = request.data.get("body",  "").strip()
        category = request.data.get("category", "general")
        emoji    = request.data.get("emoji", "✂️")
        pinned   = request.data.get("pinned", False)
        if not title or not body:
            return Response({"error": "Title and body required"}, status=400)
        post = NewsletterPost.objects.create(
            barber=barber, title=title, body=body,
            category=category, emoji=emoji, pinned=pinned,
        )
        return Response({"message": "Post created", "id": post.id}, status=201)

    def patch(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)
        from core.models import NewsletterPost
        barber = get_barber_for_user(request.user)
        try:
            post = NewsletterPost.objects.get(pk=pk, barber=barber)
        except NewsletterPost.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        for field in ["title", "body", "category", "emoji", "active", "pinned"]:
            if field in request.data:
                setattr(post, field, request.data[field])
        post.save()
        return Response({"message": "Updated"})

    def delete(self, request, pk=None):
        if not request.user.is_staff:
            return Response({"error": "Barbers only"}, status=403)
        from core.models import NewsletterPost
        barber = get_barber_for_user(request.user)
        try:
            post = NewsletterPost.objects.get(pk=pk, barber=barber)
            post.delete()
            return Response({"message": "Deleted"})
        except NewsletterPost.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class WaitlistView(APIView):
    """Barber manages waitlist entries for their schedule."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        date = request.query_params.get("date")
        qs = WaitlistEntry.objects.filter(barber=barber)
        if date:
            qs = qs.filter(date=date)
        return Response([{
            "id":           w.id,
            "client_name":  w.client_name,
            "client_phone": w.client_phone,
            "client_email": w.client_email,
            "service":      w.service.name if w.service else "",
            "service_id":   w.service.id if w.service else None,
            "date":         str(w.date),
            "notes":        w.notes,
            "notified":     w.notified,
            "created_at":   w.created_at.isoformat(),
        } for w in qs])

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        client_name = request.data.get("client_name", "").strip()
        date        = request.data.get("date")
        if not client_name or not date:
            return Response({"error": "client_name and date required."}, status=400)

        service = None
        sid = request.data.get("service")
        if sid:
            try: service = Service.objects.get(pk=sid)
            except Service.DoesNotExist: pass

        entry = WaitlistEntry.objects.create(
            barber=barber,
            service=service,
            client_name=client_name,
            client_phone=request.data.get("client_phone", ""),
            client_email=request.data.get("client_email", ""),
            date=date,
            notes=request.data.get("notes", ""),
        )
        return Response({"message": "Added to waitlist.", "id": entry.id}, status=201)

    def delete(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            entry = WaitlistEntry.objects.get(pk=pk, barber=barber)
            entry.delete()
            return Response({"message": "Removed."}, status=204)
        except WaitlistEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)

    def patch(self, request, pk):
        """Mark waitlist entry as notified."""
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            entry = WaitlistEntry.objects.get(pk=pk, barber=barber)
            entry.notified = True
            entry.save()
            return Response({"message": "Marked as notified."})
        except WaitlistEntry.DoesNotExist:
            return Response({"error": "Not found."}, status=404)


class BarberAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        avail = BarberAvailability.objects.filter(barber=barber).order_by("day_of_week")
        return Response([{
            "id": a.id, "day_of_week": a.day_of_week, "day_name": a.get_day_of_week_display(),
            "start_time": str(a.start_time), "end_time": str(a.end_time), "is_working": a.is_working,
        } for a in avail])

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        day        = request.data.get("day_of_week")
        start      = request.data.get("start_time")
        end        = request.data.get("end_time")
        is_working = request.data.get("is_working", True)
        if day is None:
            return Response({"error": "day_of_week required"}, status=400)
        avail, _ = BarberAvailability.objects.update_or_create(
            barber=barber, day_of_week=day,
            defaults={"start_time": start, "end_time": end, "is_working": is_working}
        )
        return Response({"id": avail.id, "day_of_week": avail.day_of_week, "day_name": avail.get_day_of_week_display(), "start_time": str(avail.start_time), "end_time": str(avail.end_time), "is_working": avail.is_working})


class BarberTimeOffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        offs = BarberTimeOff.objects.filter(barber=barber, date__gte=date_type.today()).order_by("date")
        return Response([{"id": o.id, "date": str(o.date), "reason": o.reason} for o in offs])

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        date_val = request.data.get("date")
        reason   = request.data.get("reason", "")
        if not date_val:
            return Response({"error": "date required"}, status=400)
        off, created = BarberTimeOff.objects.get_or_create(barber=barber, date=date_val, defaults={"reason": reason})
        return Response({"id": off.id, "date": str(off.date), "reason": off.reason}, status=201 if created else 200)

    def delete(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            off = BarberTimeOff.objects.get(pk=pk, barber=barber)
            off.delete()
            return Response({"message": "Removed"}, status=204)
        except BarberTimeOff.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ── PWA Push Subscription ─────────────────────────────────────────────────────
class PushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Save or update the user's push subscription."""
        endpoint = request.data.get("endpoint")
        p256dh   = request.data.get("p256dh")
        auth     = request.data.get("auth")

        if not all([endpoint, p256dh, auth]):
            return Response({"error": "endpoint, p256dh, and auth required"}, status=400)

        sub, _ = PushSubscription.objects.update_or_create(
            user=request.user,
            defaults={"endpoint": endpoint, "p256dh": p256dh, "auth": auth},
        )
        return Response({"message": "Subscription saved"})

    def delete(self, request):
        """Remove push subscription (user opted out)."""
        PushSubscription.objects.filter(user=request.user).delete()
        return Response({"message": "Subscription removed"})


# ── Post-haircut review ───────────────────────────────────────────────────────
def _schedule_review_notification(appointment):
    """
    Send push notification to client asking how their haircut was.
    Called 30 minutes after appointment time (or immediately if barber marks complete).
    In production this would be a Celery task — here we send immediately when called.
    """
    if appointment.review_notified:
        return
    try:
        appointment.review_notified = True
        appointment.save(update_fields=["review_notified"])

        send_push_notification(
            user  = appointment.user,
            title = "How was your haircut? ✂️",
            body  = f"Did {appointment.barber.name} just cut your hair? Let us know!",
            data  = {
                "type":          "haircut_review",
                "appointment_id": appointment.id,
                "url":           f"{FRONTEND_URL}/review?appt={appointment.id}",
            }
        )
    except Exception:
        pass


class TriggerReviewNotificationView(APIView):
    """
    Called by the frontend 30 minutes after appointment start time.
    Sends the 'How was your haircut?' push notification to the client.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            appt = Appointment.objects.get(pk=pk, user=request.user)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        _schedule_review_notification(appt)
        return Response({"message": "Notification sent"})


class HaircutReviewView(APIView):
    """
    Client submits their review after receiving push notification.
    POST { appointment_id, completed: true/false }
    - If completed=true  -> marks appointment as completed + creates 5-star review
    - If completed=false -> marks as no_show
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        appt_id   = request.data.get("appointment_id")
        completed = request.data.get("completed", True)
        comment   = request.data.get("comment", "")

        try:
            appt = Appointment.objects.get(pk=appt_id, user=request.user)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found"}, status=404)

        # Update appointment status
        appt.status = "completed" if completed else "no_show"
        appt.save()

        # Create or update review
        Review.objects.update_or_create(
            appointment=appt,
            defaults={
                "barber":    appt.barber,
                "client":    request.user,
                "completed": completed,
                "rating":    5 if completed else 1,
                "comment":   comment,
            }
        )

        return Response({
            "message":   "Thank you for your feedback!" if completed else "Thanks for letting us know.",
            "status":    appt.status,
            "completed": completed,
        })


class BarberReviewsView(APIView):
    """Returns reviews for a barber (barber or admin only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber and not request.user.is_staff:
            return Response({"error": "Not authorized"}, status=403)

        barber_id = request.query_params.get("barber_id")
        if request.user.is_staff and barber_id:
            reviews = Review.objects.filter(barber_id=barber_id, completed=True).order_by("-created_at")
        elif barber:
            reviews = Review.objects.filter(barber=barber, completed=True).order_by("-created_at")
        else:
            return Response({"error": "barber_id required"}, status=400)

        data = [{
            "id":         r.id,
            "client":     r.client.username,
            "rating":     r.rating,
            "comment":    r.comment,
            "created_at": r.created_at.strftime("%B %d, %Y"),
        } for r in reviews]

        avg = sum(r["rating"] for r in data) / len(data) if data else 0
        return Response({"reviews": data, "average_rating": round(avg, 1), "total": len(data)})


class AdminStatsView(APIView):
    """
    GET admin/stats/
    Full platform analytics — staff only.
    Returns revenue, appointments, top clients, busiest days, barber breakdown.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Staff only"}, status=403)

        from django.db.models import Count, Sum, Avg
        from django.db.models.functions import TruncDate, TruncMonth
        from datetime import timedelta

        today  = date_type.today()
        t30    = today - timedelta(days=30)
        t7     = today - timedelta(days=7)
        t365   = today - timedelta(days=365)

        all_appts   = Appointment.objects.all()
        done_appts  = all_appts.filter(status__in=["confirmed","completed"])
        month_appts = done_appts.filter(date__gte=t30)
        week_appts  = done_appts.filter(date__gte=t7)
        today_appts = done_appts.filter(date=today)

        # Revenue (online deposits)
        total_revenue  = float(all_appts.filter(deposit_paid=True).aggregate(s=Sum("deposit_amount"))["s"] or 0)
        month_revenue  = float(all_appts.filter(deposit_paid=True, date__gte=t30).aggregate(s=Sum("deposit_amount"))["s"] or 0)
        week_revenue   = float(all_appts.filter(deposit_paid=True, date__gte=t7).aggregate(s=Sum("deposit_amount"))["s"] or 0)

        # Appointment counts
        total_bookings  = done_appts.count()
        month_bookings  = month_appts.count()
        week_bookings   = week_appts.count()
        today_bookings  = today_appts.count()
        cancelled_count = all_appts.filter(status="cancelled", date__gte=t30).count()
        no_show_count   = all_appts.filter(status="no_show",   date__gte=t30).count()
        pending_shop    = all_appts.filter(status="pending_shop").count()

        # Top clients (by total bookings)
        top_clients_qs = (
            done_appts
            .values("user__id","user__username","user__first_name","user__email")
            .annotate(visits=Count("id"), spent=Sum("deposit_amount"))
            .order_by("-visits")[:10]
        )
        top_clients = [{
            "id":       c["user__id"],
            "name":     c["user__first_name"] or c["user__username"],
            "email":    c["user__email"],
            "visits":   c["visits"],
            "spent":    float(c["spent"] or 0),
        } for c in top_clients_qs]

        # Busiest days of week (0=Mon..6=Sun)
        from django.db.models.functions import ExtractWeekDay
        dow_counts = (
            done_appts.filter(date__gte=t365)
            .annotate(dow=ExtractWeekDay("date"))
            .values("dow")
            .annotate(count=Count("id"))
            .order_by("dow")
        )
        DOW_NAMES = {1:"Sun",2:"Mon",3:"Tue",4:"Wed",5:"Thu",6:"Fri",7:"Sat"}
        busiest_days = [{"day": DOW_NAMES.get(r["dow"],"?"), "count": r["count"]} for r in dow_counts]

        # Bookings per month (last 12 months)
        monthly = (
            done_appts.filter(date__gte=t365)
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(count=Count("id"), revenue=Sum("deposit_amount"))
            .order_by("month")
        )
        monthly_data = [{
            "month":   r["month"].strftime("%b %Y"),
            "count":   r["count"],
            "revenue": float(r["revenue"] or 0),
        } for r in monthly]

        # Per-barber breakdown
        barbers = Barber.objects.all()
        barber_stats = []
        for barber in barbers:
            bq = done_appts.filter(barber=barber)
            rev = float(all_appts.filter(barber=barber, deposit_paid=True).aggregate(s=Sum("deposit_amount"))["s"] or 0)
            avg_r = Review.objects.filter(barber=barber, completed=True).aggregate(a=Avg("rating"))["a"]
            barber_stats.append({
                "id":         barber.id,
                "name":       barber.name,
                "total":      bq.count(),
                "this_month": bq.filter(date__gte=t30).count(),
                "revenue":    rev,
                "avg_rating": round(float(avg_r or 0), 1),
                "reviews":    Review.objects.filter(barber=barber, completed=True).count(),
                "no_shows":   all_appts.filter(barber=barber, status="no_show", date__gte=t30).count(),
            })

        # Recent reviews
        recent_reviews = []
        for r in Review.objects.filter(completed=True).select_related("barber","client").order_by("-created_at")[:20]:
            recent_reviews.append({
                "id":         r.id,
                "client":     r.client.first_name or r.client.username,
                "barber":     r.barber.name,
                "rating":     r.rating,
                "comment":    r.comment,
                "created_at": r.created_at.strftime("%b %d, %Y"),
            })

        # Waitlist count
        waitlist_count = WaitlistEntry.objects.filter(notified=False).count()

        return Response({
            "overview": {
                "total_bookings":  total_bookings,
                "month_bookings":  month_bookings,
                "week_bookings":   week_bookings,
                "today_bookings":  today_bookings,
                "cancelled_30d":   cancelled_count,
                "no_shows_30d":    no_show_count,
                "pending_shop":    pending_shop,
                "waitlist":        waitlist_count,
                "total_revenue":   round(total_revenue, 2),
                "month_revenue":   round(month_revenue, 2),
                "week_revenue":    round(week_revenue, 2),
            },
            "top_clients":   top_clients,
            "busiest_days":  busiest_days,
            "monthly_data":  monthly_data,
            "barber_stats":  barber_stats,
            "recent_reviews": recent_reviews,
        })


class ClientWaitlistView(APIView):
    """
    POST waitlist/join/  — client joins waitlist for a date+barber
    GET  waitlist/mine/  — client sees their active waitlist entries
    DELETE waitlist/<pk>/ — client removes themselves
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        barber_id = request.data.get("barber_id")
        service_id= request.data.get("service_id")
        date_val  = request.data.get("date")
        notes     = request.data.get("notes", "")

        if not barber_id or not date_val:
            return Response({"error": "barber_id and date required"}, status=400)

        try:
            barber  = Barber.objects.get(pk=barber_id)
            service = Service.objects.get(pk=service_id) if service_id else None
        except (Barber.DoesNotExist, Service.DoesNotExist):
            return Response({"error": "Barber or service not found"}, status=404)

        # Don't allow duplicate waitlist entries
        exists = WaitlistEntry.objects.filter(
            barber=barber, date=date_val,
            client_email=request.user.email
        ).exists()
        if exists:
            return Response({"error": "You are already on the waitlist for this date."}, status=400)

        profile = getattr(request.user, "profile", None)
        entry = WaitlistEntry.objects.create(
            barber       = barber,
            service      = service,
            client_name  = request.user.first_name or request.user.username,
            client_phone = profile.phone if profile else "",
            client_email = request.user.email,
            date         = date_val,
            notes        = notes,
        )

        # Notify barber of new waitlist entry
        import threading, logging
        logger = logging.getLogger(__name__)
        def _notify():
            try:
                barber_email = barber.user.email if barber.user else None
                if barber_email:
                    client_nm  = request.user.first_name or request.user.username
                    svc_nm     = service.name if service else "Any service"
                    date_str   = entry.date.strftime("%A, %B %d, %Y")
                    plain      = f"{client_nm} joined the waitlist for {date_str} ({svc_nm})"
                    from core.views import _sendgrid_send, FRONTEND_URL
                    html = f"""<!DOCTYPE html><html><body style="background:#050505;color:white;font-family:'Helvetica Neue',Arial;padding:40px 20px;">
<table style="max-width:520px;margin:0 auto;">
<tr><td style="padding-bottom:20px;"><p style="font-family:'Courier New',monospace;font-size:20px;font-weight:900;text-transform:uppercase;">HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span></p></td></tr>
<tr><td style="padding-bottom:8px;">
  <h1 style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;text-transform:uppercase;margin:0;">Waitlist<br><span style="color:#f59e0b;font-style:italic;">New Entry_</span></h1>
</td></tr>
<tr><td style="padding:20px 0;background:#0a0a0a;border:1px solid rgba(255,255,255,0.08);padding:20px;">
  <p style="font-size:13px;color:#a1a1aa;margin:0 0 8px;"><strong style="color:white;">{client_nm}</strong> wants in on <strong style="color:#f59e0b;">{date_str}</strong></p>
  <p style="font-size:12px;color:#52525b;">Service: {svc_nm}</p>
  <p style="font-size:12px;color:#52525b;">Email: {request.user.email}</p>
</td></tr>
<tr><td style="padding-top:20px;"><a href="{FRONTEND_URL}/barber-dashboard" style="display:inline-block;padding:13px 26px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">View Dashboard &rarr;</a></td></tr>
</table></body></html>"""
                    _sendgrid_send(barber_email, f"⏳ New Waitlist Entry — {client_nm}", plain, html)
            except Exception as e:
                logger.error(f"Waitlist notify failed: {e}")
        threading.Thread(target=_notify, daemon=True).start()

        return Response({
            "message": f"You're on the waitlist for {barber.name} on {entry.date.strftime('%A, %B %d')}. We'll email you if a slot opens up.",
            "id":      entry.id,
        }, status=201)

    def get(self, request):
        entries = WaitlistEntry.objects.filter(
            client_email=request.user.email,
            date__gte=date_type.today(),
        ).select_related("barber","service").order_by("date")
        return Response([{
            "id":           e.id,
            "barber_name":  e.barber.name,
            "service_name": e.service.name if e.service else "Any",
            "date":         e.date.strftime("%A, %B %d, %Y"),
            "date_iso":     str(e.date),
            "notified":     e.notified,
        } for e in entries])

    def delete(self, request, pk):
        try:
            entry = WaitlistEntry.objects.get(pk=pk, client_email=request.user.email)
            entry.delete()
            return Response({"message": "Removed from waitlist."}, status=204)
        except WaitlistEntry.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


# ── VAPID public key endpoint (needed by frontend to subscribe) ───────────────
class VapidPublicKeyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")})


class SendRemindersView(APIView):
    """
    POST — manually trigger all reminder types.
    Also called automatically every 30 minutes by the background loop in start.sh.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Staff only"}, status=403)

        try:
            from django.core.management import call_command
            from io import StringIO
            out = StringIO()
            call_command("send_reminders", stdout=out)
            return Response({"message": out.getvalue().strip() or "Reminders processed"})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class BarberClientListView(APIView):
    """
    GET  /barber/clients/         — list all unique clients who have booked this barber
    GET  /barber/clients/?search= — search by name or email
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        search = request.query_params.get("search", "").strip().lower()

        # Get all unique clients from appointments
        appt_clients = Appointment.objects.filter(
            barber=barber
        ).select_related("user", "user__profile").values("user").distinct()

        client_ids = [a["user"] for a in appt_clients]
        clients = User.objects.filter(id__in=client_ids).select_related("profile")

        if search:
            clients = clients.filter(
                username__icontains=search
            ) | clients.filter(
                email__icontains=search
            ) | clients.filter(
                first_name__icontains=search
            )

        # Get barber-client relationships
        bc_map = {
            bc.client_id: bc
            for bc in BarberClient.objects.filter(barber=barber, client_id__in=client_ids)
        }

        data = []
        for client in clients:
            bc = bc_map.get(client.id)
            # Get appointment stats for this client
            appts = Appointment.objects.filter(barber=barber, user=client).order_by("-date", "-time")
            total = appts.count()
            completed = appts.filter(status="completed").count()
            no_shows  = appts.filter(status="no_show").count()
            last_appt = appts.first()

            data.append({
                "id":           client.id,
                "username":     client.username,
                "email":        client.email,
                "name":         client.first_name or client.username,
                "total_visits": total,
                "completed":    completed,
                "no_shows":     no_shows,
                "last_visit":   str(last_appt.date) if last_appt else None,
                "last_service": last_appt.service.name if last_appt and last_appt.service else None,
                "notes":        bc.notes if bc else "",
                "is_vip":       bc.is_vip if bc else False,
                "is_blocked":   bc.is_blocked if bc else False,
                "is_walk_in":   client.username.startswith("walkin_"),
            })

        # Sort: VIP first, then by total visits
        data.sort(key=lambda x: (-x["is_vip"], -x["total_visits"]))

        return Response(data)


class BarberClientDetailView(APIView):
    """
    GET   /barber/clients/<id>/   — client profile + full appointment history
    PATCH /barber/clients/<id>/   — update notes, vip, blocked status
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        try:
            client = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Client not found"}, status=404)

        bc = BarberClient.objects.filter(barber=barber, client=client).first()

        appts = Appointment.objects.filter(
            barber=barber, user=client
        ).select_related("service").order_by("-date", "-time")

        history = [{
            "id":       a.id,
            "date":     str(a.date),
            "time":     str(a.time),
            "service":  a.service.name if a.service else "",
            "price":    str(a.service.price) if a.service else "",
            "status":   a.status,
            "payment":  a.payment_method,
            "notes":    a.barber_notes,
            "walk_in":  a.is_walk_in,
        } for a in appts]

        total_spent = sum(
            float(a["price"]) for a in history
            if a["status"] == "completed" and a["price"]
        )

        return Response({
            "id":           client.id,
            "username":     client.username,
            "email":        client.email,
            "name":         client.first_name or client.username,
            "notes":        bc.notes if bc else "",
            "is_vip":       bc.is_vip if bc else False,
            "is_blocked":   bc.is_blocked if bc else False,
            "total_visits": appts.count(),
            "completed":    appts.filter(status="completed").count(),
            "no_shows":     appts.filter(status="no_show").count(),
            "total_spent":  f"{total_spent:.2f}",
            "history":      history,
        })

    def patch(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        try:
            client = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "Client not found"}, status=404)

        bc, _ = BarberClient.objects.get_or_create(barber=barber, client=client)

        if "notes" in request.data:
            bc.notes = request.data["notes"]
        if "is_vip" in request.data:
            bc.is_vip = bool(request.data["is_vip"])
        if "is_blocked" in request.data:
            bc.is_blocked = bool(request.data["is_blocked"])

        bc.save()
        return Response({
            "message":    "Updated",
            "notes":      bc.notes,
            "is_vip":     bc.is_vip,
            "is_blocked": bc.is_blocked,
        })


class BarberReportsView(APIView):
    """
    Full business analytics for a barber.
    GET /barber/reports/?period=week|month|year|all
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        from datetime import date as date_type, timedelta
        from django.db.models import Count, Sum, Q
        from decimal import Decimal

        period = request.query_params.get("period", "month")
        today  = date_type.today()

        if period == "week":
            start = today - timedelta(days=today.weekday())  # Monday
        elif period == "month":
            start = today.replace(day=1)
        elif period == "year":
            start = today.replace(month=1, day=1)
        else:  # all time
            start = None

        # Base queryset
        qs = Appointment.objects.filter(barber=barber).select_related("service", "user")
        qs_period = qs.filter(date__gte=start) if start else qs

        # ── Overall summary ──
        total        = qs_period.count()
        completed    = qs_period.filter(status="completed").count()
        cancelled    = qs_period.filter(status="cancelled").count()
        no_shows     = qs_period.filter(status="no_show").count()
        confirmed    = qs_period.filter(status="confirmed").count()
        walk_ins     = qs_period.filter(is_walk_in=True).count()

        from django.db.models import Sum as _Sum
        online_appts   = qs_period.filter(payment_method="online", status="completed")
        shop_appts     = qs_period.filter(payment_method="shop", status__in=["confirmed","completed"])

        online_revenue = float(online_appts.filter(service__isnull=False)
                               .aggregate(t=_Sum("service__price"))["t"] or 0)
        shop_revenue   = float(shop_appts.filter(service__isnull=False)
                               .aggregate(t=_Sum("service__price"))["t"] or 0)
        total_revenue  = online_revenue + shop_revenue

        # Completion rate
        completion_rate = round((completed / total * 100) if total > 0 else 0, 1)
        no_show_rate    = round((no_shows  / total * 100) if total > 0 else 0, 1)

        # ── Service breakdown — single aggregated query ──
        from django.db.models import Count as _Count2, Sum as _Sum2
        svc_rows = (
            qs_period.filter(service__isnull=False)
            .values("service__id","service__name","service__price")
            .annotate(
                bookings=_Count2("id"),
                completed=_Count2("id", filter=Q(status="completed")),
            )
            .order_by("-bookings")
        )
        service_stats = []
        for row in svc_rows:
            if row["bookings"] == 0:
                continue
            svc_rev = row["completed"] * float(row["service__price"] or 0)
            service_stats.append({
                "name":      row["service__name"],
                "price":     str(row["service__price"]),
                "bookings":  row["bookings"],
                "completed": row["completed"],
                "revenue":   f"{svc_rev:.2f}",
            })

        # ── Daily revenue for chart (last 30 days) — bulk query, no per-day loops ──
        from collections import defaultdict
        chart_start = today - timedelta(days=29)

        chart_appts = list(qs.filter(date__gte=chart_start).filter(
            Q(payment_method="online", status="completed") |
            Q(payment_method="shop",   status__in=["confirmed", "completed"])
        ).select_related("service"))

        daily_rev  = defaultdict(float)
        daily_comp = defaultdict(int)
        for a in chart_appts:
            if a.service:
                daily_rev[a.date] += float(a.service.price)
            if a.status == "completed":
                daily_comp[a.date] += 1

        bookings_by_day = {
            row["date"]: row["cnt"]
            for row in qs.filter(date__gte=chart_start)
                          .values("date").annotate(cnt=Count("id"))
        }

        daily_data = []
        for i in range(30):
            day = chart_start + timedelta(days=i)
            daily_data.append({
                "date":      str(day),
                "label":     day.strftime("%b %d"),
                "revenue":   round(daily_rev.get(day, 0.0), 2),
                "bookings":  bookings_by_day.get(day, 0),
                "completed": daily_comp.get(day, 0),
            })

        # ── Weekly breakdown (last 8 weeks) — bulk query ──
        week0_start = today - timedelta(weeks=7, days=today.weekday())
        week_appts = list(qs.filter(date__gte=week0_start).filter(
            Q(payment_method="online", status="completed") |
            Q(payment_method="shop",   status__in=["confirmed", "completed"])
        ).select_related("service"))

        week_rev_map  = defaultdict(float)
        week_comp_map = defaultdict(int)
        for a in week_appts:
            delta = (a.date - week0_start).days
            idx   = delta // 7
            if 0 <= idx < 8:
                if a.service:
                    week_rev_map[idx] += float(a.service.price)
                if a.status == "completed":
                    week_comp_map[idx] += 1

        week_book_map = defaultdict(int)
        for a in qs.filter(date__gte=week0_start):
            delta = (a.date - week0_start).days
            idx   = delta // 7
            if 0 <= idx < 8:
                week_book_map[idx] += 1

        weekly_data = []
        for i in range(8):
            wk_start = today - timedelta(weeks=(7 - i), days=today.weekday())
            weekly_data.append({
                "week":      f"Wk {wk_start.strftime('%b %d')}",
                "revenue":   round(week_rev_map.get(i, 0.0), 2),
                "bookings":  week_book_map.get(i, 0),
                "completed": week_comp_map.get(i, 0),
            })

        # ── Busiest days of the week ──
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        busiest_days = []
        for dow in range(7):
            # Django week_day: 1=Sunday ... 7=Saturday, so Mon=2
            django_dow = (dow + 2) % 7 or 7
            count = qs_period.filter(date__week_day=django_dow).count()
            busiest_days.append({"day": day_names[dow], "bookings": count})

        # ── Busiest hours ──
        from django.db.models.functions import ExtractHour
        hour_counts = (
            qs_period.annotate(hour=ExtractHour("time"))
            .values("hour")
            .annotate(count=Count("id"))
            .order_by("hour")
        )
        busiest_hours = [{"hour": h["hour"], "label": f"{h['hour'] % 12 or 12}{'am' if h['hour'] < 12 else 'pm'}", "bookings": h["count"]} for h in hour_counts]

        # ── Top clients ──
        from django.db.models import Count
        top_clients_qs = (
            qs_period.values("user__id", "user__username", "user__first_name", "user__email")
            .annotate(visits=Count("id"))
            .order_by("-visits")[:5]
        )
        top_clients = [{
            "id":       c["user__id"],
            "name":     c["user__first_name"] or c["user__username"],
            "email":    c["user__email"],
            "visits":   c["visits"],
        } for c in top_clients_qs]

        # ── Reschedule count ──
        from django.db.models import Q
        reschedules = RescheduleRequest.objects.filter(
            appointment__barber=barber,
            initiated_by="client",
        ).filter(date__gte=start).count() if start else RescheduleRequest.objects.filter(
            appointment__barber=barber,
            initiated_by="client",
        ).count()

        # ── Strike count ──
        clients_with_strikes = 0
        try:
            client_ids = Appointment.objects.filter(barber=barber).values_list("user_id", flat=True).distinct()
            from django.contrib.auth import get_user_model as _gum
            _User = _gum()
            clients_with_strikes = UserProfile.objects.filter(
                user_id__in=client_ids, strike_count__gt=0
            ).count()
        except Exception:
            pass

        return Response({
            "period": period,
            "start":  str(start) if start else "all",
            "summary": {
                "total":             total,
                "completed":         completed,
                "cancelled":         cancelled,
                "no_shows":          no_shows,
                "confirmed":         confirmed,
                "walk_ins":          walk_ins,
                "reschedules":       reschedules,
                "clients_on_strike": clients_with_strikes,
                "completion_rate":   completion_rate,
                "no_show_rate":      no_show_rate,
                "online_revenue":    f"{online_revenue:.2f}",
                "shop_revenue":      f"{shop_revenue:.2f}",
                "total_revenue":     f"{total_revenue:.2f}",
                "online_count":      online_appts.count(),
                "shop_count":        shop_appts.count(),
            },
            "services":     service_stats,
            "daily":        daily_data,
            "weekly":       weekly_data,
            "busiest_days": busiest_days,
            "busiest_hours":busiest_hours,
            "top_clients":  top_clients,
        })


class BarberRescheduleListView(APIView):
    """
    GET  barber/reschedules/         — list all pending + recent reschedule requests for this barber
    POST barber/reschedules/<pk>/    — approve or reject a reschedule request
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        # Get all reschedule requests for this barber's appointments
        requests = RescheduleRequest.objects.filter(
            appointment__barber=barber,
            initiated_by="client",
        ).select_related(
            "appointment", "appointment__user", "appointment__service"
        ).order_by("-created_at")[:50]

        data = []
        for rr in requests:
            appt = rr.appointment
            data.append({
                "id":            rr.id,
                "status":        rr.status,
                "client_name":   appt.user.first_name or appt.user.username,
                "client_email":  appt.user.email,
                "service_name":  appt.service.name if appt.service else "Appointment",
                "service_price": str(appt.service.price) if appt.service else "—",
                "original_date": appt.date.strftime("%A, %B %d, %Y"),
                "original_time": appt.time.strftime("%I:%M %p").lstrip("0"),
                "requested_date": rr.new_date.strftime("%A, %B %d, %Y"),
                "requested_time": rr.new_time.strftime("%I:%M %p").lstrip("0"),
                "created_at":    rr.created_at.strftime("%b %d, %Y %I:%M %p"),
                "appointment_id": appt.id,
            })
        return Response(data)

    def post(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        action = request.data.get("action")  # "accept" or "reject"
        if action not in ("accept", "reject"):
            return Response({"error": "action must be accept or reject"}, status=400)

        try:
            rr = RescheduleRequest.objects.select_related(
                "appointment", "appointment__user",
                "appointment__barber", "appointment__service"
            ).get(pk=pk, appointment__barber=barber)
        except RescheduleRequest.DoesNotExist:
            return Response({"error": "Reschedule request not found"}, status=404)

        if rr.status != "pending":
            return Response({"error": f"This request is already {rr.status}"}, status=400)

        if action == "accept":
            rr.status = "accepted"
            rr.save()
            appt = rr.appointment
            appt.date = rr.new_date
            appt.time = rr.new_time
            appt.status = "confirmed"
            appt.save()
            # Re-fetch with all related data for email
            rr_full = RescheduleRequest.objects.select_related(
                "appointment","appointment__user",
                "appointment__barber","appointment__barber__user",
                "appointment__service",
            ).get(pk=rr.pk)
            send_reschedule_response_email(rr_full, accepted=True)
            sms_reschedule_response(rr_full, accepted=True)
            return Response({"message": "Reschedule approved — client has been notified."})
        else:
            rr.status = "rejected"
            rr.save()
            rr_full = RescheduleRequest.objects.select_related(
                "appointment","appointment__user",
                "appointment__barber","appointment__barber__user",
                "appointment__service",
            ).get(pk=rr.pk)
            send_reschedule_response_email(rr_full, accepted=False)
            sms_reschedule_response(rr_full, accepted=False)
            return Response({"message": "Reschedule declined — client has been notified."})


class ClientRescheduleRequestView(APIView):
    """Client requests to reschedule their appointment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        import secrets
        import logging
        logger = logging.getLogger(__name__)

        try:
            appt = Appointment.objects.select_related(
                "user", "barber", "barber__user", "service"
            ).get(pk=pk, user=request.user)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=404)

        new_date = request.data.get("new_date")
        new_time = request.data.get("new_time")
        if not new_date or not new_time:
            return Response({"error": "new_date and new_time required."}, status=400)

        # Cancel any existing pending requests
        RescheduleRequest.objects.filter(appointment=appt, status="pending").update(status="expired")

        token = secrets.token_urlsafe(32)
        rr = RescheduleRequest.objects.create(
            appointment=appt,
            initiated_by="client",
            new_date=new_date,
            new_time=new_time,
            token=token,
        )

        # Re-fetch with all related data so the email thread has everything it needs
        rr_full = RescheduleRequest.objects.select_related(
            "appointment",
            "appointment__user",
            "appointment__barber",
            "appointment__barber__user",
            "appointment__service",
        ).get(pk=rr.pk)

        logger.info(f"Reschedule request created id={rr.pk} for appt={appt.pk} by {request.user.username}")
        send_reschedule_request_email(rr_full)
        sms_reschedule_request(rr_full)
        return Response({"message": "Reschedule request sent to your barber.", "id": rr.id})


class RescheduleResponseView(APIView):
    """Accept or reject a reschedule request via token link from email."""
    permission_classes = [AllowAny]

    def get(self, request):
        token  = request.query_params.get("token")
        action = request.query_params.get("action")  # "accept" or "reject"

        if not token or action not in ("accept", "reject"):
            return redirect(f"{FRONTEND_URL}/?reschedule=invalid")

        try:
            rr = RescheduleRequest.objects.select_related("appointment", "appointment__user", "appointment__barber", "appointment__service").get(token=token)
        except RescheduleRequest.DoesNotExist:
            return redirect(f"{FRONTEND_URL}/?reschedule=invalid")

        if rr.status != "pending":
            return redirect(f"{FRONTEND_URL}/?reschedule=already_handled")

        if action == "accept":
            rr.status = "accepted"
            rr.save()
            # Update the actual appointment
            appt = rr.appointment
            appt.date = rr.new_date
            appt.time = rr.new_time
            appt.save()
            rr_full = RescheduleRequest.objects.select_related(
                "appointment","appointment__user",
                "appointment__barber","appointment__barber__user",
                "appointment__service",
            ).get(pk=rr.pk)
            send_reschedule_response_email(rr_full, accepted=True)
            sms_reschedule_response(rr_full, accepted=True)
            return redirect(f"{FRONTEND_URL}/dashboard?reschedule=accepted")
        else:
            rr.status = "rejected"
            rr.save()
            rr_full = RescheduleRequest.objects.select_related(
                "appointment","appointment__user",
                "appointment__barber","appointment__barber__user",
                "appointment__service",
            ).get(pk=rr.pk)
            send_reschedule_response_email(rr_full, accepted=False)
            sms_reschedule_response(rr_full, accepted=False)
            return redirect(f"{FRONTEND_URL}/dashboard?reschedule=rejected")


class BarberRescheduleRequestView(APIView):
    """Barber reschedules appointment immediately — updates calendar and emails client."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account."}, status=403)

        try:
            appt = Appointment.objects.get(pk=pk, barber=barber)
        except Appointment.DoesNotExist:
            return Response({"error": "Appointment not found."}, status=404)

        new_date = request.data.get("new_date")
        new_time = request.data.get("new_time")
        if not new_date or not new_time:
            return Response({"error": "new_date and new_time required."}, status=400)

        old_date = appt.date
        old_time = appt.time

        # Update the appointment immediately
        appt.date = new_date
        appt.time = new_time
        appt.save()

        # Email the client about the change
        import threading
        def _notify():
            try:
                client_email  = appt.user.email
                client_name   = appt.user.first_name or appt.user.username
                service_name  = appt.service.name if appt.service else "Appointment"
                old_date_str  = old_date.strftime("%A, %B %d, %Y")
                old_time_str  = old_time.strftime("%I:%M %p").lstrip("0")
                new_date_str  = appt.date.strftime("%A, %B %d, %Y") if hasattr(appt.date, 'strftime') else str(new_date)
                new_time_str  = appt.time.strftime("%I:%M %p").lstrip("0") if hasattr(appt.time, 'strftime') else str(new_time)

                subject = f"Your Appointment Has Been Rescheduled — HEADZ UP"
                plain   = (
                    f"Hi {client_name},\n\n"
                    f"Your {service_name} appointment with {barber.name} has been rescheduled.\n\n"
                    f"Original: {old_date_str} at {old_time_str}\n"
                    f"New Time: {new_date_str} at {new_time_str}\n\n"
                    f"If you have questions, please contact the shop.\n\n"
                    f"HEADZ UP Barbershop\n2509 W 4th St, Hattiesburg, MS"
                )
                rows = _ticket_rows(
                    ("Service",       service_name),
                    ("Barber",        barber.name),
                    ("Original Date", old_date_str),
                    ("Original Time", old_time_str),
                    ("New Date",      f"<span style='color:#f59e0b;font-weight:900'>{new_date_str}</span>"),
                    ("New Time",      f"<span style='color:#f59e0b;font-weight:900'>{new_time_str}</span>"),
                    ("Location",      "2509 W 4th St, Hattiesburg, MS 39401"),
                )
                icon = '<div style="width:52px;height:52px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f59e0b;font-size:22px;">↻</span></div>'
                html = _html_email_wrapper(
                    "",
                    icon,
                    "Appointment<br><span style='color:#f59e0b;font-style:italic;'>Rescheduled_</span>",
                    f"{barber.name} has updated your appointment time.",
                    rows,
                    f"{FRONTEND_URL}/dashboard",
                    "View My Appointments"
                )
                _sendgrid_send(client_email, subject, plain, html)
            except Exception:
                pass
        threading.Thread(target=_notify, daemon=True).start()

        return Response({
            "message":  "Appointment rescheduled and client notified.",
            "new_date": str(appt.date),
            "new_time": str(appt.time),
        })


class TestEmailView(APIView):
    """Debug endpoint — sends a test email via SendGrid HTTP API."""
    permission_classes = [AllowAny]

    def post(self, request):
        import urllib.request
        import json as json_lib
        from django.conf import settings as django_settings

        recipient  = request.data.get("to", "bdkshan18@gmail.com")
        api_key    = getattr(django_settings, "SENDGRID_API_KEY", "")
        from_email = getattr(django_settings, "DEFAULT_FROM_EMAIL", "")

        if not api_key:
            return Response({"error": "SENDGRID_API_KEY not set"}, status=500)

        # Extract plain email from "Name <email>" format
        import re
        match = re.search(r'<(.+?)>', from_email)
        sender_email = match.group(1) if match else from_email
        sender_name  = from_email.split("<")[0].strip() if "<" in from_email else "HEADZ UP"

        payload = {
            "personalizations": [{"to": [{"email": recipient}]}],
            "from": {"email": sender_email, "name": sender_name},
            "subject": "HEADZ UP — Test Email",
            "content": [{"type": "text/plain", "value": "This is a test email from HEADZ UP Barbershop. Email is working!"}],
        }

        try:
            data = json_lib.dumps(payload).encode("utf-8")
            req  = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=data,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type":  "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                status_code = resp.status
            return Response({"success": True, "sendgrid_status": status_code, "sent_to": recipient, "from": from_email})
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8")
            return Response({"error": f"SendGrid HTTP {e.code}: {body}", "sent_to": recipient}, status=500)
        except Exception as e:
            return Response({"error": str(e), "sent_to": recipient}, status=500)
