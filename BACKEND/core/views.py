from rest_framework import serializers
from django.contrib.auth import get_user_model
import stripe
from django.conf import settings
from django.db import IntegrityError
from django.shortcuts import redirect
from rest_framework import viewsets
from .models import Appointment, Barber, BarberAvailability, BarberTimeOff, Service, UserProfile, PushSubscription, Review, WaitlistEntry, BarberClient, RescheduleRequest
from .serializers import AppointmentSerializer, BarberSerializer, ServiceSerializer, UserProfileSerializer, RegisterSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
import logging
from datetime import date as date_type, datetime, timedelta
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
    NEVER blocks or crashes a booking — email is best-effort only.
    """
    import threading

    # Read all values before spawning thread (avoid DB access in thread)
    try:
        user_email    = appointment.user.email
        username      = appointment.user.username
        service_name  = appointment.service.name if appointment.service else "Appointment"
        barber_name   = appointment.barber.name  if appointment.barber  else "Your barber"
        appt_date     = appointment.date.strftime("%A, %B %d, %Y")
        appt_time     = appointment.time.strftime("%I:%M %p").lstrip("0")
        payment_label = "Paid online via Stripe" if appointment.payment_method == "online" else "Pay in shop (cash or card)"
    except Exception:
        return  # appointment data unavailable — skip silently

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
                logger.warning(f"No email for user {username} — skipping confirmation email")
                return

            # Extract name and email from "Name <email>" format
            match        = re.search(r'<(.+?)>', from_email)
            sender_email = match.group(1) if match else from_email
            sender_name  = from_email.split("<")[0].strip() if "<" in from_email else "HEADZ UP"

            payload = {
                "personalizations": [{"to": [{"email": user_email}]}],
                "from": {"email": sender_email, "name": sender_name},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": message},
                    {"type": "text/html",  "value": html_message},
                ],
            }

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
                logger.info(f"Confirmation email sent to {user_email} — SendGrid status {resp.status}")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Email send failed: {e}")

            subject = f"Booking Confirmed - {service_name} at HEADZ UP"
            message = (
                f"Hey {username},\n\n"
                f"Your appointment is confirmed.\n\n"
                f"Service:  {service_name}\n"
                f"Barber:   {barber_name}\n"
                f"Date:     {appt_date}\n"
                f"Time:     {appt_time}\n"
                f"Payment:  {payment_label}\n\n"
                f"Please arrive 5 minutes early.\n\n"
                f"HEADZ UP Barbershop\n4 Hub Dr, Hattiesburg, MS 39402"
            )

            ticket_rows = ""
            for label, value in [
                ("Service", service_name), ("Barber", barber_name),
                ("Date", appt_date), ("Time", appt_time), ("Payment", payment_label),
            ]:
                ticket_rows += f"""
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
                  <p style="font-size:14px;color:white;margin:0;font-weight:700;">{value}</p>
                </td>
              </tr>"""

            html_message = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:32px;">
          <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
            HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
          </p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-block;text-align:center;line-height:52px;">
            <span style="color:black;font-size:24px;font-weight:900;">&#10003;</span>
          </div>
        </td></tr>
        <tr><td style="padding-bottom:8px;">
          <h1 style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;text-transform:uppercase;margin:0;">
            Booking<br><span style="color:#f59e0b;font-style:italic;">Confirmed_</span>
          </h1>
        </td></tr>
        <tr><td style="padding-bottom:32px;">
          <p style="color:#71717a;font-size:13px;margin:0;">Hey {username}, you're all set. See you soon.</p>
        </td></tr>
        <tr><td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
          <table width="100%" cellpadding="0" cellspacing="0">{ticket_rows}</table>
        </td></tr>
        <tr><td style="padding:16px 0;">
          <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">
            Please arrive <strong style="color:white;">5 minutes early</strong>. Slots held <strong style="color:white;">15 minutes</strong> past appointment time.
          </p>
        </td></tr>
        <tr><td style="padding:8px 0 32px;">
          <a href="{FRONTEND_URL}/dashboard" style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">
            View My Dashboard &rarr;
          </a>
        </td></tr>
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
          <p style="font-size:11px;color:#3f3f46;margin:0;line-height:1.7;">
            HEADZ UP Barbershop &middot; 4 Hub Dr, Hattiesburg, MS 39402<br>
            Mon-Fri 9AM-6PM &middot; Sat 9AM-4PM &middot; Closed Sundays
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

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
                logger.info(f"Confirmation email sent to {user_email} — SendGrid status {resp.status}")
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Email send failed: {e}")

    threading.Thread(target=_send, daemon=True).start()


def _html_email_wrapper(logo, icon_html, headline, subhead, body_rows, cta_url, cta_label, footer="HEADZ UP Barbershop · 4 Hub Dr, Hattiesburg, MS 39402"):
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
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": plain},
            {"type": "text/html",  "value": html},
        ],
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
    Notify the other party about a reschedule request.
    - Client requests → email the BARBER with Accept/Reject links
    - Barber requests  → email the CLIENT with Accept/Reject links
    """
    import threading
    import secrets

    rr   = reschedule_request
    appt = rr.appointment

    try:
        client_email  = appt.user.email
        client_name   = appt.user.first_name or appt.user.username
        barber_name   = appt.barber.name
        service_name  = appt.service.name if appt.service else "Appointment"
        old_date      = appt.date.strftime("%A, %B %d, %Y")
        old_time      = appt.time.strftime("%I:%M %p").lstrip("0")
        new_date_str  = rr.new_date.strftime("%A, %B %d, %Y")
        new_time_str  = rr.new_time.strftime("%I:%M %p").lstrip("0")
        accept_url    = f"{FRONTEND_URL}/reschedule/respond?token={rr.token}&action=accept"
        reject_url    = f"{FRONTEND_URL}/reschedule/respond?token={rr.token}&action=reject"
    except Exception:
        return

    def _send():
        try:
            if not getattr(settings, "EMAIL_HOST_PASSWORD", ""):
                return

            if rr.initiated_by == "client":
                # Email the barber
                recipient  = appt.barber.user.email if appt.barber.user else None
                if not recipient:
                    return
                subject    = f"Reschedule Request from {client_name} — HEADZ UP"
                subhead    = f"{client_name} wants to reschedule their appointment."
                rows       = _ticket_rows(
                    ("Service", service_name),
                    ("Client",  client_name),
                    ("Current Date", old_date),
                    ("Current Time", old_time),
                    ("Requested Date", f"<span style='color:#f59e0b'>{new_date_str}</span>"),
                    ("Requested Time", f"<span style='color:#f59e0b'>{new_time_str}</span>"),
                )
                icon = '<div style="width:52px;height:52px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f59e0b;font-size:22px;">↻</span></div>'
                action_btns = f'''
                  <a href="{accept_url}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;margin-right:8px;">Accept</a>
                  <a href="{reject_url}" style="display:inline-block;padding:12px 24px;background:#f87171;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">Reject</a>
                '''
                html = _html_email_wrapper("", icon, "Reschedule<br><span style='color:#f59e0b;font-style:italic;'>Request_</span>", subhead, rows, None, "")
                html = html.replace("</table>\n        </td></tr>", f"</table></td></tr><tr><td style='padding:20px 0;'>{action_btns}</td></tr>")
                plain = f"Reschedule request from {client_name}\nFrom: {old_date} {old_time}\nTo: {new_date_str} {new_time_str}\nAccept: {accept_url}\nReject: {reject_url}"
            else:
                # Email the client
                recipient  = client_email
                subject    = f"Your Appointment Has Been Rescheduled — HEADZ UP"
                subhead    = f"{barber_name} has proposed a new time for your appointment."
                rows       = _ticket_rows(
                    ("Service", service_name),
                    ("Barber",  barber_name),
                    ("Original Date", old_date),
                    ("Original Time", old_time),
                    ("New Date", f"<span style='color:#f59e0b'>{new_date_str}</span>"),
                    ("New Time", f"<span style='color:#f59e0b'>{new_time_str}</span>"),
                )
                icon = '<div style="width:52px;height:52px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f59e0b;font-size:22px;">↻</span></div>'
                action_btns = f'''
                  <a href="{accept_url}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;margin-right:8px;">Accept Change</a>
                  <a href="{reject_url}" style="display:inline-block;padding:12px 24px;background:#f87171;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;text-decoration:none;">Reject Change</a>
                '''
                html = _html_email_wrapper("", icon, "Appointment<br><span style='color:#f59e0b;font-style:italic;'>Update_</span>", subhead, rows, None, "")
                html = html.replace("</table>\n        </td></tr>", f"</table></td></tr><tr><td style='padding:20px 0;'>{action_btns}</td></tr>")
                plain = f"Reschedule from {barber_name}\nFrom: {old_date} {old_time}\nTo: {new_date_str} {new_time_str}\nAccept: {accept_url}\nReject: {reject_url}"

            _sendgrid_send(recipient, subject, plain, html)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()


def send_reschedule_response_email(reschedule_request, accepted):
    """Notify originator of reschedule request that it was accepted or rejected."""
    import threading
    rr   = reschedule_request
    appt = rr.appointment

    try:
        client_email = appt.user.email
        client_name  = appt.user.first_name or appt.user.username
        barber_name  = appt.barber.name
        service_name = appt.service.name if appt.service else "Appointment"
        new_date_str = rr.new_date.strftime("%A, %B %d, %Y")
        new_time_str = rr.new_time.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return

    def _send():
        try:
            if not getattr(settings, "EMAIL_HOST_PASSWORD", ""):
                return

            if accepted:
                icon = '<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-block;text-align:center;line-height:52px;"><span style="color:black;font-size:24px;font-weight:900;">&#10003;</span></div>'
                if rr.initiated_by == "client":
                    # Barber accepted client's request — email client
                    subject = f"Reschedule Accepted — HEADZ UP"
                    subhead = f"{barber_name} accepted your reschedule request."
                    rows    = _ticket_rows(("Service", service_name), ("Barber", barber_name), ("New Date", new_date_str), ("New Time", new_time_str))
                    html    = _html_email_wrapper("", icon, "Reschedule<br><span style='color:#4ade80;font-style:italic;'>Accepted_</span>", subhead, rows, f"{FRONTEND_URL}/dashboard", "View My Dashboard")
                    plain   = f"Your reschedule was accepted.\nNew time: {new_date_str} {new_time_str}"
                    _sendgrid_send(client_email, subject, plain, html)
                else:
                    # Client accepted barber's change — email barber
                    barber_email = appt.barber.user.email if appt.barber.user else None
                    if barber_email:
                        subject = f"Client Accepted Reschedule — HEADZ UP"
                        subhead = f"{client_name} accepted the new appointment time."
                        rows    = _ticket_rows(("Client", client_name), ("Service", service_name), ("New Date", new_date_str), ("New Time", new_time_str))
                        html    = _html_email_wrapper("", icon, "Reschedule<br><span style='color:#4ade80;font-style:italic;'>Confirmed_</span>", subhead, rows, f"{FRONTEND_URL}/barber-dashboard", "View Dashboard")
                        plain   = f"{client_name} accepted the reschedule.\nNew time: {new_date_str} {new_time_str}"
                        _sendgrid_send(barber_email, subject, plain, html)
            else:
                icon = '<div style="width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f87171;font-size:22px;">✕</span></div>'
                if rr.initiated_by == "client":
                    subject = f"Reschedule Declined — HEADZ UP"
                    subhead = f"{barber_name} couldn't accommodate the new time. Your original appointment stands."
                    rows    = _ticket_rows(("Service", service_name), ("Barber", barber_name), ("Your Appointment", f"{appt.date.strftime('%A, %B %d')} at {appt.time.strftime('%I:%M %p').lstrip('0')}"))
                    html    = _html_email_wrapper("", icon, "Reschedule<br><span style='color:#f87171;font-style:italic;'>Declined_</span>", subhead, rows, f"{FRONTEND_URL}/dashboard", "View My Dashboard")
                    plain   = f"Your reschedule request was declined. Original appointment stands."
                    _sendgrid_send(client_email, subject, plain, html)
                else:
                    barber_email = appt.barber.user.email if appt.barber.user else None
                    if barber_email:
                        subject = f"Client Rejected Reschedule — HEADZ UP"
                        subhead = f"{client_name} declined the new time. Original appointment stands."
                        rows    = _ticket_rows(("Client", client_name), ("Service", service_name), ("Original Appt", f"{appt.date.strftime('%A, %B %d')} at {appt.time.strftime('%I:%M %p').lstrip('0')}"))
                        html    = _html_email_wrapper("", icon, "Reschedule<br><span style='color:#f87171;font-style:italic;'>Rejected_</span>", subhead, rows, f"{FRONTEND_URL}/barber-dashboard", "View Dashboard")
                        plain   = f"{client_name} rejected the reschedule."
                        _sendgrid_send(barber_email, subject, plain, html)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()


def send_cancellation_email(appointment, cancelled_by="client"):
    """Notify the other party when an appointment is cancelled."""
    import threading

    try:
        client_email = appointment.user.email
        client_name  = appointment.user.first_name or appointment.user.username
        barber_name  = appointment.barber.name
        service_name = appointment.service.name if appointment.service else "Appointment"
        appt_date    = appointment.date.strftime("%A, %B %d, %Y")
        appt_time    = appointment.time.strftime("%I:%M %p").lstrip("0")
        barber_email = appointment.barber.user.email if appointment.barber.user else None
    except Exception:
        return

    def _send():
        try:
            if not getattr(settings, "EMAIL_HOST_PASSWORD", ""):
                return

            icon = '<div style="width:52px;height:52px;border-radius:50%;background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);display:inline-block;text-align:center;line-height:52px;"><span style="color:#f87171;font-size:22px;">✕</span></div>'
            rows = _ticket_rows(("Service", service_name), ("Date", appt_date), ("Time", appt_time))

            if cancelled_by == "client" and barber_email:
                # Notify barber
                subject = f"Appointment Cancelled by {client_name} — HEADZ UP"
                subhead = f"{client_name} has cancelled their appointment."
                html    = _html_email_wrapper("", icon, "Appointment<br><span style='color:#f87171;font-style:italic;'>Cancelled_</span>", subhead, rows, f"{FRONTEND_URL}/barber-dashboard", "View Dashboard")
                plain   = f"{client_name} cancelled their {service_name} on {appt_date} at {appt_time}."
                _sendgrid_send(barber_email, subject, plain, html)
            elif cancelled_by == "barber" and client_email:
                # Notify client
                subject = f"Your Appointment Has Been Cancelled — HEADZ UP"
                subhead = f"We're sorry — your appointment with {barber_name} has been cancelled. Please rebook at your convenience."
                html    = _html_email_wrapper("", icon, "Appointment<br><span style='color:#f87171;font-style:italic;'>Cancelled_</span>", subhead, rows, f"{FRONTEND_URL}/book", "Book Again")
                plain   = f"Your {service_name} on {appt_date} at {appt_time} with {barber_name} has been cancelled."
                _sendgrid_send(client_email, subject, plain, html)
        except Exception:
            pass

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
            serializer.save(user=self.request.user)
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
                serializer.save()
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
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Create user with staff access
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
            user.is_staff = True
            user.save()

            # Create linked Barber profile
            Barber.objects.create(
                name=full_name,
                user=user,
                bio="",
            )

            return Response({"message": "Barber account created successfully."}, status=status.HTTP_201_CREATED)
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


class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(user=self.request.user).order_by("date", "time")

    def perform_create(self, serializer):
        barber_id = serializer.validated_data.get("barber").id
        date      = serializer.validated_data.get("date")
        time      = serializer.validated_data.get("time")

        if date < date_type.today():
            raise serializers.ValidationError("Cannot book appointments in the past.")
        if date.weekday() == 6:
            raise serializers.ValidationError("We are closed on Sundays.")
        if Appointment.objects.filter(barber_id=barber_id, date=date, time=time).exists():
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")
        try:
            appt = serializer.save(user=self.request.user)
            send_booking_confirmation(appt)
        except IntegrityError:
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")

    def perform_update(self, serializer):
        instance  = self.get_object()
        barber_id = serializer.validated_data.get("barber", instance.barber).id
        date      = serializer.validated_data.get("date", instance.date)
        time      = serializer.validated_data.get("time", instance.time)
        conflict  = Appointment.objects.filter(barber_id=barber_id, date=date, time=time).exclude(pk=instance.pk)
        if conflict.exists():
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")
        try:
            appt = serializer.save()
            send_booking_confirmation(appt)
        except IntegrityError:
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")


# ── Auth helpers ──────────────────────────────────────────────────────────────
class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({"exists": exists})


class PasswordResetView(APIView):
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


# ── Stripe ────────────────────────────────────────────────────────────────────
class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        service_id   = request.data.get("service")
        barber_id    = request.data.get("barber")
        date         = request.data.get("date")
        time         = request.data.get("time")
        client_notes = request.data.get("client_notes", "")

        try:
            service = Service.objects.get(id=service_id)
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{
                    "price_data": {
                        "currency": "usd",
                        "product_data": {"name": service.name},
                        "unit_amount": int(service.price * 100),
                    },
                    "quantity": 1,
                }],
                mode="payment",
                success_url=f"{BACKEND_URL}/api/payment-success/?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/dashboard?canceled=true",
                metadata={
                    "user_id":      request.user.id,
                    "service_id":   service_id,
                    "barber_id":    barber_id,
                    "date":         date,
                    "time":         time,
                    "client_notes": client_notes[:500],  # Stripe metadata limit
                },
            )
            return Response({"url": checkout_session.url})
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
                },
            )
            if created:
                send_booking_confirmation(appt)

            return redirect(f"{FRONTEND_URL}/payment-success?session_id={session_id}")
        except Exception as e:
            return redirect(f"{FRONTEND_URL}/dashboard?booked=true&error={str(e)}")


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
class AvailableSlotsView(APIView):
    permission_classes = [IsAuthenticated]

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

        return Response({
            "booked_slots":     [str(s) for s in booked_times],
            "available_slots":  [str(s) for s in all_slots if s not in blocked],
            "work_start":       str(work_start),
            "work_end":         str(work_end),
            "duration_minutes": duration,
            "time_off":         False,
        })


# ── Barber portal views ───────────────────────────────────────────────────────
class BarberMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        today       = date_type.today()
        today_appts = Appointment.objects.filter(barber=barber, date=today).count()
        total_appts = Appointment.objects.filter(barber=barber).count()
        return Response({"id": barber.id, "name": barber.name, "bio": barber.bio, "today_count": today_appts, "total_count": total_appts})


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

        if new_status in ["confirmed", "completed", "no_show", "cancelled"]:
            appt.status = new_status
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
            _schedule_review_notification(appt)

        return Response({"message": "Updated", "id": appt.id, "barber_notes": appt.barber_notes})

    def delete(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk, barber=barber)
            send_cancellation_email(appt, cancelled_by="barber")
            appt.delete()
            return Response({"message": "Deleted"}, status=204)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


class WalkInBookingView(APIView):
    """Barber creates a walk-in appointment on the spot."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        client_name = request.data.get("client_name", "").strip()
        service_id  = request.data.get("service")
        date        = request.data.get("date")
        time        = request.data.get("time")
        notes       = request.data.get("notes", "")
        payment     = request.data.get("payment_method", "shop")

        if not all([client_name, service_id, date, time]):
            return Response({"error": "client_name, service, date and time are required."}, status=400)

        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            return Response({"error": "Service not found."}, status=404)

        # Create or get a placeholder user for walk-ins
        username = f"walkin_{client_name.lower().replace(' ', '_')}_{date.replace('-', '')}"
        user, _ = User.objects.get_or_create(
            username=username[:150],
            defaults={"first_name": client_name}
        )

        try:
            appt = Appointment.objects.create(
                user=user,
                barber=barber,
                service=service,
                date=date,
                time=time,
                status="confirmed",
                payment_method=payment,
                barber_notes=notes,
                is_walk_in=True,
            )
        except Exception:
            return Response({"error": "That slot is already booked."}, status=400)

        return Response({
            "message": "Walk-in booked.",
            "id": appt.id,
            "client": client_name,
            "service": service.name,
            "date": str(appt.date),
            "time": str(appt.time),
        }, status=201)


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


# ── VAPID public key endpoint (needed by frontend to subscribe) ───────────────
class VapidPublicKeyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"public_key": getattr(settings, "VAPID_PUBLIC_KEY", "")})


class SendRemindersView(APIView):
    """
    Called by a cron job or manually to send 24-hour appointment reminders.
    Sends email to clients with appointments tomorrow.
    Only staff can trigger this.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not request.user.is_staff:
            return Response({"error": "Staff only"}, status=403)

        from datetime import date, timedelta
        from django.conf import settings as django_settings

        tomorrow = date.today() + timedelta(days=1)
        appts = Appointment.objects.filter(
            date=tomorrow,
            status="confirmed",
            reminder_sent=False,
        ).select_related("user", "barber", "service")

        sent = 0
        for appt in appts:
            if not appt.user.email:
                continue
            try:
                plain = (
                    f"Hey {appt.user.first_name or appt.user.username},\n\n"
                    f"Just a reminder that you have an appointment tomorrow:\n\n"
                    f"  Service: {appt.service.name}\n"
                    f"  Barber:  {appt.barber.name}\n"
                    f"  Date:    {appt.date.strftime('%A, %B %d')}\n"
                    f"  Time:    {appt.time.strftime('%I:%M %p')}\n\n"
                    f"See you then!\n\n"
                    f"— HEADZ UP Barbershop\n  Hattiesburg, MS"
                )
                _sendgrid_send(
                    appt.user.email,
                    "Reminder: Your appointment tomorrow at HEADZ UP",
                    plain, plain,
                )
                appt.reminder_sent = True
                appt.save(update_fields=["reminder_sent"])
                sent += 1
            except Exception:
                pass

        return Response({"message": f"Reminders sent: {sent}", "tomorrow": str(tomorrow)})


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

        online_appts = qs_period.filter(payment_method="online", status="completed")
        shop_appts   = qs_period.filter(payment_method="shop",   status="confirmed") | \
                       qs_period.filter(payment_method="shop",   status="completed")

        online_revenue = sum(
            float(a.service.price) for a in online_appts if a.service
        )
        shop_revenue = sum(
            float(a.service.price) for a in shop_appts if a.service
        )
        total_revenue = online_revenue + shop_revenue

        # Completion rate
        completion_rate = round((completed / total * 100) if total > 0 else 0, 1)
        no_show_rate    = round((no_shows  / total * 100) if total > 0 else 0, 1)

        # ── Service breakdown ──
        service_stats = []
        services = Service.objects.all()
        for svc in services:
            svc_qs = qs_period.filter(service=svc)
            svc_count = svc_qs.count()
            if svc_count == 0:
                continue
            svc_completed = svc_qs.filter(status="completed").count()
            svc_revenue   = svc_completed * float(svc.price)
            service_stats.append({
                "name":      svc.name,
                "price":     str(svc.price),
                "bookings":  svc_count,
                "completed": svc_completed,
                "revenue":   f"{svc_revenue:.2f}",
            })
        service_stats.sort(key=lambda x: -x["bookings"])

        # ── Daily revenue for chart (last 30 days always, regardless of period) ──
        chart_start = today - timedelta(days=29)
        daily_data  = []
        for i in range(30):
            day = chart_start + timedelta(days=i)
            day_qs = qs.filter(date=day)
            day_online  = day_qs.filter(payment_method="online", status="completed")
            day_shop    = day_qs.filter(payment_method="shop").filter(
                status__in=["confirmed", "completed"]
            )
            day_revenue = sum(float(a.service.price) for a in day_online if a.service) + \
                          sum(float(a.service.price) for a in day_shop   if a.service)
            daily_data.append({
                "date":       str(day),
                "label":      day.strftime("%b %d"),
                "revenue":    round(day_revenue, 2),
                "bookings":   day_qs.count(),
                "completed":  day_qs.filter(status="completed").count(),
            })

        # ── Weekly breakdown (last 8 weeks) ──
        weekly_data = []
        for i in range(7, -1, -1):
            week_start = today - timedelta(weeks=i, days=today.weekday())
            week_end   = week_start + timedelta(days=6)
            week_qs    = qs.filter(date__gte=week_start, date__lte=week_end)
            week_online = week_qs.filter(payment_method="online", status="completed")
            week_shop   = week_qs.filter(payment_method="shop").filter(
                status__in=["confirmed", "completed"]
            )
            week_rev = sum(float(a.service.price) for a in week_online if a.service) + \
                       sum(float(a.service.price) for a in week_shop   if a.service)
            weekly_data.append({
                "week":      f"Wk {week_start.strftime('%b %d')}",
                "revenue":   round(week_rev, 2),
                "bookings":  week_qs.count(),
                "completed": week_qs.filter(status="completed").count(),
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

        return Response({
            "period": period,
            "start":  str(start) if start else "all",
            "summary": {
                "total":           total,
                "completed":       completed,
                "cancelled":       cancelled,
                "no_shows":        no_shows,
                "confirmed":       confirmed,
                "walk_ins":        walk_ins,
                "completion_rate": completion_rate,
                "no_show_rate":    no_show_rate,
                "online_revenue":  f"{online_revenue:.2f}",
                "shop_revenue":    f"{shop_revenue:.2f}",
                "total_revenue":   f"{total_revenue:.2f}",
                "online_count":    online_appts.count(),
                "shop_count":      shop_appts.count(),
            },
            "services":     service_stats,
            "daily":        daily_data,
            "weekly":       weekly_data,
            "busiest_days": busiest_days,
            "busiest_hours":busiest_hours,
            "top_clients":  top_clients,
        })


class ClientRescheduleRequestView(APIView):
    """Client requests to reschedule their appointment."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        import secrets
        try:
            appt = Appointment.objects.get(pk=pk, user=request.user)
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
        send_reschedule_request_email(rr)
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
            send_reschedule_response_email(rr, accepted=True)
            return redirect(f"{FRONTEND_URL}/?reschedule=accepted")
        else:
            rr.status = "rejected"
            rr.save()
            send_reschedule_response_email(rr, accepted=False)
            return redirect(f"{FRONTEND_URL}/?reschedule=rejected")


class BarberRescheduleRequestView(APIView):
    """Barber proposes a reschedule — sends email to client with accept/reject."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        import secrets
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

        RescheduleRequest.objects.filter(appointment=appt, status="pending").update(status="expired")

        token = secrets.token_urlsafe(32)
        rr = RescheduleRequest.objects.create(
            appointment=appt,
            initiated_by="barber",
            new_date=new_date,
            new_time=new_time,
            token=token,
        )
        send_reschedule_request_email(rr)
        return Response({"message": "Reschedule proposal sent to client.", "id": rr.id})


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