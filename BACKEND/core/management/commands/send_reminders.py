"""
management/commands/send_reminders.py

Runs every 5 minutes via background loop in start.sh.
Sends 4 reminder types:

  CLIENT 24HR    — day before appointment (window: 23-25 hrs out)
  CLIENT 2HR     — 2 hours before appointment (window: 1.5-2.5 hrs out)
  BARBER 2HR     — barber prep warning 2 hours before (window: 1.5-2.5 hrs out)
  BARBER AT-TIME — barber notification at appointment time (window: -5 to +10 min)

Example: Client books 10:00am tomorrow
  → Client gets email the day before at ~10:00am: "Tomorrow at 10:00am"
  → Client gets email at ~8:00am day-of: "Your appointment is in 2 hours"
  → Barber gets email at ~8:00am day-of: "Heads up — client in 2 hours"
  → Barber gets email at ~10:00am: "Your 10:00am client is here"
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Send appointment reminders to clients and barbers"

    def handle(self, *args, **kwargs):
        from core.models import Appointment
        from core.views import _sendgrid_send

        now   = timezone.localtime(timezone.now())
        today = now.date()

        # Fetch all confirmed appointments today and tomorrow
        appts = Appointment.objects.filter(
            date__in=[today, today + timedelta(days=1)],
            status="confirmed",
        ).select_related("user", "barber", "service", "barber__user")

        sent = 0

        for appt in appts:
            try:
                import datetime
                appt_dt = timezone.make_aware(
                    datetime.datetime.combine(appt.date, appt.time)
                )
            except Exception:
                continue

            diff_hours = (appt_dt - now).total_seconds() / 3600

            svc_name   = appt.service.name  if appt.service else "Appointment"
            barber_nm  = appt.barber.name   if appt.barber  else "Your barber"
            appt_time  = appt.time.strftime("%I:%M %p")
            appt_date  = appt.date.strftime("%A, %B %d")
            client_nm  = appt.user.first_name or appt.user.username
            client_email  = appt.user.email
            barber_email  = (appt.barber.user.email
                             if appt.barber and appt.barber.user else None)
            notes = appt.client_notes or ""

            # ── 1. CLIENT 24HR REMINDER ──────────────────────────────────────
            # Fires once when appointment is 23–25 hours away
            try:
                if not appt.reminder_sent and 23 <= diff_hours <= 25:
                    if client_email:
                        subj  = "⏰ Reminder: Your appointment tomorrow at HEADZ UP"
                        plain = (
                            f"Hey {client_nm},\n\n"
                            f"Just a heads up — you have an appointment tomorrow!\n\n"
                            f"  Service : {svc_name}\n"
                            f"  Barber  : {barber_nm}\n"
                            f"  Date    : {appt_date}\n"
                            f"  Time    : {appt_time}\n\n"
                            f"Need to cancel? Please do so at least 2 hours before your "
                            f"appointment to avoid a strike on your account.\n\n"
                            f"See you tomorrow!\n\n"
                            f"— HEADZ UP Barbershop\n  2509 W 4th St, Hattiesburg, MS 39401"
                        )
                        html = _build_client_html(
                            client_nm, svc_name, barber_nm, appt_date, appt_time,
                            "Your appointment is tomorrow", "#f59e0b", "⏰"
                        )
                        _sendgrid_send(client_email, subj, plain, html)
                        appt.reminder_sent = True
                        appt.save(update_fields=["reminder_sent"])
                        sent += 1
                        logger.info(f"CLIENT 24HR → {client_email} ({appt_time})")
            except Exception as e:
                logger.error(f"CLIENT 24HR failed {appt.id}: {e}")

            # ── 2. CLIENT 2HR REMINDER ───────────────────────────────────────
            # Fires once when appointment is 1.5–2.5 hours away
            try:
                reminder_2hr = getattr(appt, "reminder_2hr_sent", False)
                if not reminder_2hr and 1.5 <= diff_hours <= 2.5:
                    if client_email:
                        subj  = f"✂️ Your appointment is in 2 hours — HEADZ UP"
                        plain = (
                            f"Hey {client_nm},\n\n"
                            f"Your appointment is coming up in about 2 hours!\n\n"
                            f"  Service : {svc_name}\n"
                            f"  Barber  : {barber_nm}\n"
                            f"  Time    : {appt_time} today\n\n"
                            f"Please be on time — your barber is ready for you.\n\n"
                            f"— HEADZ UP Barbershop\n  2509 W 4th St, Hattiesburg, MS 39401"
                        )
                        html = _build_client_html(
                            client_nm, svc_name, barber_nm, "Today", appt_time,
                            "Your appointment is in 2 hours", "#ef4444", "✂️"
                        )
                        _sendgrid_send(client_email, subj, plain, html)
                        try:
                            appt.reminder_2hr_sent = True
                            appt.save(update_fields=["reminder_2hr_sent"])
                        except Exception:
                            pass
                        sent += 1
                        logger.info(f"CLIENT 2HR → {client_email} ({appt_time})")
            except Exception as e:
                logger.error(f"CLIENT 2HR failed {appt.id}: {e}")

            # ── 3. BARBER 2HR REMINDER ───────────────────────────────────────
            # Fires once when appointment is 1.5–2.5 hours away
            # Gives barber enough time to prepare for the next client
            try:
                barber_2hr = getattr(appt, "barber_reminder_2hr", False)
                if not barber_2hr and 1.5 <= diff_hours <= 2.5:
                    if barber_email:
                        subj  = f"⚡ Heads up — {client_nm} at {appt_time} (2 hours)"
                        plain = (
                            f"Hey {barber_nm},\n\n"
                            f"You have a client coming in 2 hours — time to get ready!\n\n"
                            f"  Client  : {client_nm}\n"
                            f"  Service : {svc_name}\n"
                            f"  Time    : {appt_time} today\n"
                            + (f"  Notes   : {notes}\n" if notes else "")
                            + f"\nGet set up and ready!\n\n— HEADZ UP"
                        )
                        html = _build_barber_html(
                            barber_nm, client_nm, svc_name, "Today", appt_time, notes,
                            f"{client_nm} arriving in 2 hours — get ready!", "#f59e0b", "⚡"
                        )
                        _sendgrid_send(barber_email, subj, plain, html)
                        try:
                            appt.barber_reminder_2hr = True
                            appt.save(update_fields=["barber_reminder_2hr"])
                        except Exception:
                            pass
                        sent += 1
                        logger.info(f"BARBER 2HR → {barber_email} ({appt_time})")
            except Exception as e:
                logger.error(f"BARBER 2HR failed {appt.id}: {e}")

            # ── 4. BARBER AT-TIME REMINDER ───────────────────────────────────
            # Fires once right at appointment time (-5 min to +10 min window)
            # "Your client is here now"
            try:
                barber_now = getattr(appt, "barber_reminder_now", False)
                if not barber_now and -0.1 <= diff_hours <= 0.2:
                    if barber_email:
                        subj  = f"🪑 {client_nm} is up NOW — {appt_time}"
                        plain = (
                            f"Hey {barber_nm},\n\n"
                            f"Your {appt_time} appointment is right now!\n\n"
                            f"  Client  : {client_nm}\n"
                            f"  Service : {svc_name}\n"
                            + (f"  Notes   : {notes}\n" if notes else "")
                            + f"\nLet's get it!\n\n— HEADZ UP"
                        )
                        html = _build_barber_html(
                            barber_nm, client_nm, svc_name, "Now", appt_time, notes,
                            f"{client_nm} is here — it's time!", "#22c55e", "🪑"
                        )
                        _sendgrid_send(barber_email, subj, plain, html)
                        try:
                            appt.barber_reminder_now = True
                            appt.save(update_fields=["barber_reminder_now"])
                        except Exception:
                            pass
                        sent += 1
                        logger.info(f"BARBER NOW → {barber_email} ({appt_time})")
            except Exception as e:
                logger.error(f"BARBER NOW failed {appt.id}: {e}")

        self.stdout.write(f"✓ Reminders checked at {now.strftime('%H:%M')} — sent: {sent}")


# ── Email HTML builders ────────────────────────────────────────────────────────

def _build_client_html(client, service, barber, date, time, headline, color, icon):
    return f"""
<div style="background:#000;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;">
  <div style="background:linear-gradient(to right,{color},{color}99);height:3px;"></div>
  <div style="padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.5em;text-transform:uppercase;color:rgba(245,158,11,0.7);margin:0 0 8px;">HEADZ UP BARBERSHOP</p>
    <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 24px;color:#fff;">
      {icon} {headline}
    </h1>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:20px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05);">Service</td>
          <td style="padding:10px 0;font-size:13px;color:#fff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{service}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05);">Barber</td>
          <td style="padding:10px 0;font-size:13px;color:#fff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{barber}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05);">Date</td>
          <td style="padding:10px 0;font-size:13px;color:#fff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{date}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;">Time</td>
          <td style="padding:10px 0;font-size:24px;font-weight:900;color:{color};text-align:right;">{time}</td>
        </tr>
      </table>
    </div>
    <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);padding:12px 16px;margin-bottom:20px;">
      <p style="font-size:12px;color:#f87171;margin:0;line-height:1.6;">
        ⚠ Cancellations within 2 hours of your appointment result in a strike and forfeit your deposit.
      </p>
    </div>
    <p style="font-size:12px;color:#52525b;margin:0;">HEADZ UP Barbershop · 2509 W 4th St, Hattiesburg, MS 39401</p>
  </div>
  <div style="background:linear-gradient(to right,{color},{color}99);height:2px;"></div>
</div>"""


def _build_barber_html(barber, client, service, date, time, notes, headline, color, icon):
    notes_row = f"""
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;">Notes</td>
          <td style="padding:10px 0;font-size:13px;color:#f59e0b;text-align:right;font-style:italic;">"{notes}"</td>
        </tr>""" if notes else ""
    return f"""
<div style="background:#000;color:#fff;font-family:'Helvetica Neue',Arial,sans-serif;max-width:520px;margin:0 auto;">
  <div style="background:linear-gradient(to right,{color},{color}99);height:3px;"></div>
  <div style="padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.5em;text-transform:uppercase;color:rgba(245,158,11,0.7);margin:0 0 8px;">HEADZ UP · BARBER ALERT</p>
    <h1 style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;margin:0 0 24px;color:#fff;">
      {icon} {headline}
    </h1>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);padding:20px;margin:0 0 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05);">Client</td>
          <td style="padding:10px 0;font-size:16px;font-weight:700;color:#fff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{client}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05);">Service</td>
          <td style="padding:10px 0;font-size:13px;color:#fff;text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{service}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:11px;color:#52525b;text-transform:uppercase;letter-spacing:0.3em;border-bottom:1px solid rgba(255,255,255,0.05) {';' if notes else ';'}">Time</td>
          <td style="padding:10px 0;font-size:24px;font-weight:900;color:{color};text-align:right;border-bottom:1px solid rgba(255,255,255,0.05);">{time}</td>
        </tr>
        {notes_row}
      </table>
    </div>
    <p style="font-size:12px;color:#52525b;margin:0;">HEADZ UP Barbershop · 2509 W 4th St, Hattiesburg, MS 39401</p>
  </div>
  <div style="background:linear-gradient(to right,{color},{color}99);height:2px;"></div>
</div>"""