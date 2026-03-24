from rest_framework import serializers
from django.contrib.auth import get_user_model
import stripe
from django.conf import settings
from django.db import IntegrityError
from django.shortcuts import redirect
from rest_framework import viewsets
from .models import Appointment, Barber, BarberAvailability, BarberTimeOff, Service, UserProfile, PushSubscription, Review
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
            from django.core.mail import send_mail

            # Skip if email is not configured yet
            host_pw = getattr(settings, "EMAIL_HOST_PASSWORD", "")
            if not host_pw or host_pw in ("your-app-password-here", ""):
                return

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

            send_mail(
                subject        = subject,
                message        = message,
                from_email     = settings.DEFAULT_FROM_EMAIL,
                recipient_list = [user_email],
                html_message   = html_message,
                fail_silently  = True,
            )
        except Exception:
            pass  # never crash — email is best-effort only

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

        # Validate invite code
        invite_code = request.data.get("invite_code", "").strip()
        valid_code  = getattr(django_settings, "BARBER_INVITE_CODE", "HEADZUP2026")
        if invite_code != valid_code:
            return Response({"invite_code": "Invalid invite code."}, status=status.HTTP_400_BAD_REQUEST)

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
        service_id = request.data.get("service")
        barber_id  = request.data.get("barber")
        date       = request.data.get("date")
        time       = request.data.get("time")

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
                    "user_id":    request.user.id,
                    "service_id": service_id,
                    "barber_id":  barber_id,
                    "date":       date,
                    "time":       time,
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
                defaults={"payment_method": "online"},
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
        date_str = request.query_params.get("date", str(date_type.today()))
        queryset = Appointment.objects.filter(barber=barber, date=date_str).select_related("user", "service").order_by("time")
        data = [{
            "id":               appt.id,
            "client":           appt.user.username,
            "client_email":     appt.user.email,
            "service":          appt.service.name if appt.service else "",
            "service_price":    str(appt.service.price) if appt.service else "",
            "service_duration": appt.service.duration_minutes if appt.service else 30,
            "date":             str(appt.date),
            "time":             str(appt.time),
            "status":           appt.status,
            "payment_method":   appt.payment_method,
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

        if new_status in ["confirmed", "completed", "no_show", "cancelled"]:
            appt.status = new_status
        if new_date:
            appt.date = new_date
        if new_time:
            appt.time = new_time

        try:
            appt.save()
        except Exception:
            return Response({"error": "That slot is already booked"}, status=400)

        # If barber manually marks completed, send review notification immediately
        if new_status == "completed":
            _schedule_review_notification(appt)

        return Response({"message": "Updated", "id": appt.id})

    def delete(self, request, pk):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk, barber=barber)
            appt.delete()
            return Response({"message": "Deleted"}, status=204)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)


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