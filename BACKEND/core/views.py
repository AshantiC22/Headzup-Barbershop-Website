from rest_framework import serializers
from django.contrib.auth import get_user_model
import stripe
from django.conf import settings
from django.db import IntegrityError
from django.shortcuts import redirect
from rest_framework import viewsets
from .models import Appointment, Barber, BarberAvailability, BarberTimeOff, Service, UserProfile
from .serializers import AppointmentSerializer, BarberSerializer, ServiceSerializer, UserProfileSerializer, RegisterSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
import logging
from datetime import date as date_type, datetime, timedelta
import math

stripe.api_key = settings.STRIPE_SECRET_KEY
User = get_user_model()
logger = logging.getLogger(__name__)


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
            "message": "Welcome to your dashboard",
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
        from datetime import date as date_type
        barber_id = serializer.validated_data.get("barber").id
        date      = serializer.validated_data.get("date")
        time      = serializer.validated_data.get("time")

        # Block past dates
        if date < date_type.today():
            raise serializers.ValidationError("Cannot book appointments in the past.")
        # Block Sundays
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
        # On reschedule, check the new slot isn't already taken (excluding this appointment)
        instance  = self.get_object()
        barber_id = serializer.validated_data.get("barber", instance.barber).id
        date      = serializer.validated_data.get("date", instance.date)
        time      = serializer.validated_data.get("time", instance.time)
        conflict  = Appointment.objects.filter(barber_id=barber_id, date=date, time=time).exclude(pk=instance.pk)
        if conflict.exists():
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")
        try:
            appt = serializer.save()
            send_booking_confirmation(appt)  # send reschedule confirmation too
        except IntegrityError:
            raise serializers.ValidationError("That time slot is already booked. Please choose another.")


# ── Check if username exists (used for smart login errors) ───────────────────
class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "Username required"}, status=400)
        exists = User.objects.filter(username__iexact=username).exists()
        if exists:
            return Response({"exists": True})
        return Response({"exists": False}, status=404)


# ── Password reset request ────────────────────────────────────────────────────
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import force_bytes
        from django.core.mail import send_mail

        identifier = request.data.get("identifier", "").strip()
        if not identifier:
            return Response({"error": "Username or email required"}, status=400)

        # Find user by username OR email
        user = None
        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            user = User.objects.filter(username__iexact=identifier).first()

        if not user:
            return Response({"error": "No account found"}, status=404)

        if not user.email:
            return Response({"error": "No email on file for this account"}, status=400)

        # Generate reset token
        token  = default_token_generator.make_token(user)
        uid    = urlsafe_base64_encode(force_bytes(user.pk))
        link   = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"

        # Mask the email for display: b***@gmail.com
        email = user.email
        parts = email.split("@")
        masked = parts[0][0] + "***@" + parts[1] if len(parts[0]) > 1 else "***@" + parts[1]

        # Send email (silently skips if email not configured)
        try:
            send_mail(
                subject="HEADZ UP — Reset Your Password ✂️",
                message=(
                    f"Hey {user.username},\n\n"
                    f"We got a request to reset your HEADZ UP password.\n\n"
                    f"Click here to reset it:\n{link}\n\n"
                    f"This link expires in 24 hours.\n\n"
                    f"If you didn't request this, just ignore this email.\n\n"
                    f"— HEADZ UP Barbershop\n4 Hub Dr, Hattiesburg, MS 39402"
                ),
                from_email=getattr(settings, "EMAIL_HOST_USER", None) or "noreply@headzup.com",
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        return Response({
            "message": "Reset link sent",
            "email_hint": masked,
        })


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
                success_url="http://127.0.0.1:8000/api/payment-success/?session_id={CHECKOUT_SESSION_ID}",
                cancel_url="http://localhost:3000/dashboard?canceled=true",
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
            return redirect("http://localhost:3000/dashboard?booked=true")

        try:
            session  = stripe.checkout.Session.retrieve(session_id)
            metadata = session.metadata

            user    = User.objects.get(id=metadata.get("user_id"))
            service = Service.objects.get(id=metadata.get("service_id"))
            barber  = Barber.objects.get(id=metadata.get("barber_id"))

            Appointment.objects.get_or_create(
                user=user, service=service, barber=barber,
                date=metadata.get("date"), time=metadata.get("time"),
                defaults={"payment_method": "online"},
            )
            # Redirect to the frontend success page with the session_id
            return redirect(f"http://localhost:3000/payment-success?session_id={session_id}")

        except Exception as e:
            return redirect(f"http://localhost:3000/dashboard?booked=true&error={str(e)}")


# ── Check if username exists (used for smart login errors) ────────────────────
class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        if not username:
            return Response({"error": "Username required"}, status=400)
        exists = User.objects.filter(username__iexact=username).exists()
        if exists:
            return Response({"exists": True})
        return Response({"exists": False}, status=404)


# ── Recover account — find user by username OR email ─────────────────────────
class RecoverAccountView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        email    = request.data.get("email", "").strip().lower()

        if username:
            try:
                user = User.objects.get(username__iexact=username)
                return Response({"username": user.username})
            except User.DoesNotExist:
                return Response({"error": "No account found with that username."}, status=404)

        if email:
            try:
                user = User.objects.get(email__iexact=email)
                return Response({"username": user.username})
            except User.DoesNotExist:
                return Response({"error": "No account found with that email address."}, status=404)

        return Response({"error": "Provide username or email."}, status=400)


# ── Reset password — no token needed for dev; add token flow before production ─
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username     = request.data.get("username", "").strip()
        new_password = request.data.get("new_password", "")

        if not username or not new_password:
            return Response({"error": "Username and new_password required."}, status=400)
        if len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=400)

        try:
            user = User.objects.get(username__iexact=username)
            user.set_password(new_password)
            user.save()
            return Response({"message": "Password updated successfully."})
        except User.DoesNotExist:
            return Response({"error": "Account not found."}, status=404)



# ── Check if username exists (used for specific login error messages) ─────────
class CheckUsernameView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        exists = User.objects.filter(username__iexact=username).exists()
        return Response({"exists": exists})


# ── Password reset — step 1: find account ─────────────────────────────────────
class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        if not identifier:
            return Response({"error": "identifier required"}, status=400)

        # Try username first, then email
        user = (
            User.objects.filter(username__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier).first()
        )
        if not user:
            return Response({"error": "No account found"}, status=404)

        # Use Django's built-in token generator
        from django.contrib.auth.tokens import default_token_generator
        token = default_token_generator.make_token(user)
        return Response({"token": token, "user_id": user.pk})


# ── Password reset — step 2: set new password ─────────────────────────────────
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = request.data.get("identifier", "").strip()
        token      = request.data.get("token", "").strip()
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


# ── Barber Admin Schedule View ────────────────────────────────────────────────
# Returns ALL appointments for a given date — staff/admin only
class BarberScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)

        date = request.query_params.get("date")
        barber_id = request.query_params.get("barber")

        queryset = Appointment.objects.select_related("user", "service", "barber").order_by("date", "time")

        if date:
            queryset = queryset.filter(date=date)
        if barber_id:
            queryset = queryset.filter(barber_id=barber_id)

        data = []
        for appt in queryset:
            data.append({
                "id":             appt.id,
                "client":         appt.user.username,
                "client_email":   appt.user.email,
                "service":        appt.service.name if appt.service else "",
                "service_price":  str(appt.service.price) if appt.service else "",
                "barber":         appt.barber.name if appt.barber else "",
                "barber_id":      appt.barber.id if appt.barber else None,
                "date":           str(appt.date),
                "time":           str(appt.time),
                "payment_method": appt.payment_method,
                "status":         getattr(appt, "status", "confirmed"),
            })

        # Summary stats
        total    = queryset.count()
        online   = queryset.filter(payment_method="online").count()
        in_shop  = queryset.filter(payment_method="shop").count()
        revenue  = sum(
            float(a["service_price"]) for a in data
            if a["payment_method"] == "online" and a["service_price"]
        )

        return Response({
            "appointments": data,
            "summary": {
                "total":      total,
                "paid_online": online,
                "pay_in_shop": in_shop,
                "online_revenue": f"{revenue:.2f}",
            }
        })


# ── Admin appointment status update ──────────────────────────────────────────
class AdminAppointmentUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if not request.user.is_staff:
            return Response({"error": "Admin access required"}, status=403)
        try:
            appt = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        # Allow updating status or notes
        new_status = request.data.get("status")
        if new_status in ["confirmed", "completed", "no_show", "cancelled"]:
            # Store on model if status field exists, else just return success
            if hasattr(appt, "status"):
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


# ── Available slots endpoint ────────────────────────────────────────────────
# Returns list of already-booked time strings for a barber+date combo
class AvailableSlotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber_id = request.query_params.get("barber")
        date      = request.query_params.get("date")

        if not barber_id or not date:
            return Response({"error": "barber and date are required"}, status=400)

        # Validate: no past dates
        from datetime import date as date_type, datetime
        try:
            appt_date = date_type.fromisoformat(date)
        except ValueError:
            return Response({"error": "Invalid date format"}, status=400)

        if appt_date < date_type.today():
            return Response({"error": "Cannot book past dates"}, status=400)

        # Validate: no Sundays (weekday 6 = Sunday)
        if appt_date.weekday() == 6:
            return Response({"error": "We are closed on Sundays"}, status=400)

        booked = Appointment.objects.filter(
            barber_id=barber_id, date=date
        ).values_list("time", flat=True)

        # Return as HH:MM:SS strings
        return Response({"booked_slots": [str(t) for t in booked]})


# ── Backend guard: validate date on appointment create/update ─────────────────
# Monkey-patch perform_create to also block past dates and Sundays server-side
# (already in AppointmentViewSet above — this adds the date checks)


# ── Email confirmation helper ────────────────────────────────────────────────
def send_booking_confirmation(appointment):
    """
    Send a booking confirmation email to the client.
    Called after appointment creation and after reschedule.
    Silently fails if email is not configured — won't break booking flow.
    """
    from django.core.mail import send_mail
    from django.conf import settings

    try:
        user    = appointment.user
        service = appointment.service.name if appointment.service else "Appointment"
        barber  = appointment.barber.name  if appointment.barber  else "Your barber"
        date    = appointment.date.strftime("%A, %B %d, %Y")
        time    = appointment.time.strftime("%I:%M %p").lstrip("0")
        payment = "Paid online via Stripe" if appointment.payment_method == "online" else "Pay in shop (cash or card)"

        subject = f"Booking Confirmed — {service} at HEADZ UP"
        message = f"""Hey {user.username},

Your appointment is confirmed. Here's what you booked:

  Service:  {service}
  Barber:   {barber}
  Date:     {date}
  Time:     {time}
  Payment:  {payment}

HEADZ UP Barbershop
4 Hub Dr, Hattiesburg, MS 39402
Mon–Fri 9AM–6PM · Sat 9AM–4PM

Please arrive 5 minutes early. Slots are held for 15 minutes past appointment time.

Need to reschedule or cancel? Log in to your dashboard at headzupbarbershop.com/dashboard

See you soon,
— The HEADZ UP Team
"""

        # Build ticket rows separately (can't nest f-strings with triple quotes)
        ticket_rows = ""
        for label, value in [
            ("Service", service),
            ("Barber",  barber),
            ("Date",    date),
            ("Time",    time),
            ("Payment", payment),
        ]:
            ticket_rows += f"""
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <p style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:0.3em;color:#52525b;text-transform:uppercase;margin:0 0 4px;">{label}</p>
                  <p style="font-size:14px;color:white;margin:0;font-weight:700;">{value}</p>
                </td>
              </tr>"""

        html_message = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Booking Confirmed</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Header -->
        <tr>
          <td style="padding-bottom:32px;">
            <p style="font-family:'Courier New',monospace;font-size:22px;font-weight:900;letter-spacing:-0.05em;margin:0;text-transform:uppercase;">
              HEADZ<span style="color:#f59e0b;font-style:italic;">UP</span>
            </p>
          </td>
        </tr>

        <!-- Green check -->
        <tr>
          <td style="padding-bottom:24px;">
            <div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:black;font-size:24px;font-weight:900;">✓</span>
            </div>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding-bottom:8px;">
            <h1 style="font-family:'Courier New',monospace;font-size:28px;font-weight:900;text-transform:uppercase;margin:0;letter-spacing:-0.03em;">
              Booking<br><span style="color:#f59e0b;font-style:italic;">Confirmed_</span>
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:32px;">
            <p style="color:#71717a;font-size:13px;margin:0;">Hey {user.username}, you&rsquo;re all set. See you soon.</p>
          </td>
        </tr>

        <!-- Ticket -->
        <tr>
          <td style="background:#0a0a0a;border:1px solid rgba(255,255,255,0.1);padding:28px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              {ticket_rows}
            </table>
          </td>
        </tr>

        <!-- Reminder -->
        <tr>
          <td style="padding:16px 0;">
            <p style="font-size:12px;color:#71717a;margin:0;line-height:1.6;">
              Please arrive <strong style="color:white;">5 minutes early</strong>. Slots are held <strong style="color:white;">15 minutes</strong> past appointment time.
            </p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:8px 0 32px;">
            <a href="https://headzupbarbershop.com/dashboard"
               style="display:inline-block;padding:14px 28px;background:#f59e0b;color:black;font-family:'Courier New',monospace;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;text-decoration:none;">
              View My Dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px;">
            <p style="font-size:11px;color:#3f3f46;margin:0;line-height:1.7;">
              HEADZ UP Barbershop · 4 Hub Dr, Hattiesburg, MS 39402<br>
              Mon–Fri 9AM–6PM · Sat 9AM–4PM · Closed Sundays
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""

        send_mail(
            subject       = subject,
            message       = message,
            from_email    = settings.DEFAULT_FROM_EMAIL,
            recipient_list= [user.email],
            html_message  = html_message,
            fail_silently = True,   # never break booking if email fails
        )

    except Exception:
        pass  # fail silently always

def get_barber_for_user(user):
    """Returns the Barber linked to this user, or None."""
    try:
        return user.barber_profile
    except Exception:
        return None


def is_barber(user):
    return get_barber_for_user(user) is not None


# ── Barber identity ───────────────────────────────────────────────────────────
class BarberMeView(APIView):
    """Returns the logged-in barber's profile + today's summary."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        today       = date_type.today()
        today_appts = Appointment.objects.filter(barber=barber, date=today).count()
        total_appts = Appointment.objects.filter(barber=barber).count()

        return Response({
            "id":           barber.id,
            "name":         barber.name,
            "bio":          barber.bio,
            "today_count":  today_appts,
            "total_count":  total_appts,
        })


# ── Barber schedule (their own appointments only) ─────────────────────────────
class BarberScheduleOwnView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        date_str  = request.query_params.get("date", str(date_type.today()))

        queryset = (
            Appointment.objects
            .filter(barber=barber, date=date_str)
            .select_related("user", "service")
            .order_by("time")
        )

        data = []
        for appt in queryset:
            data.append({
                "id":             appt.id,
                "client":         appt.user.username,
                "client_email":   appt.user.email,
                "service":        appt.service.name if appt.service else "",
                "service_price":  str(appt.service.price) if appt.service else "",
                "service_duration": appt.service.duration_minutes if appt.service else 30,
                "date":           str(appt.date),
                "time":           str(appt.time),
                "status":         appt.status,
                "payment_method": appt.payment_method,
            })

        total   = queryset.count()
        revenue = sum(
            float(a["service_price"]) for a in data
            if a["payment_method"] == "online" and a["service_price"]
        )

        return Response({
            "appointments": data,
            "summary": {
                "total":           total,
                "paid_online":     queryset.filter(payment_method="online").count(),
                "pay_in_shop":     queryset.filter(payment_method="shop").count(),
                "online_revenue":  f"{revenue:.2f}",
            },
            "barber_name": barber.name,
        })


# ── Barber updates an appointment (status, reschedule, cancel) ────────────────
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


# ── Barber availability CRUD ──────────────────────────────────────────────────
class BarberAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        avail = BarberAvailability.objects.filter(barber=barber).order_by("day_of_week")
        data  = [{
            "id":          a.id,
            "day_of_week": a.day_of_week,
            "day_name":    a.get_day_of_week_display(),
            "start_time":  str(a.start_time),
            "end_time":    str(a.end_time),
            "is_working":  a.is_working,
        } for a in avail]
        return Response(data)

    def post(self, request):
        """Set/update availability for a single day."""
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
        return Response({
            "id":          avail.id,
            "day_of_week": avail.day_of_week,
            "day_name":    avail.get_day_of_week_display(),
            "start_time":  str(avail.start_time),
            "end_time":    str(avail.end_time),
            "is_working":  avail.is_working,
        })


# ── Barber time off CRUD ──────────────────────────────────────────────────────
class BarberTimeOffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        # Return upcoming time off only
        offs = BarberTimeOff.objects.filter(
            barber=barber, date__gte=date_type.today()
        ).order_by("date")
        return Response([{
            "id":     o.id,
            "date":   str(o.date),
            "reason": o.reason,
        } for o in offs])

    def post(self, request):
        barber = get_barber_for_user(request.user)
        if not barber:
            return Response({"error": "Not a barber account"}, status=403)

        date_val = request.data.get("date")
        reason   = request.data.get("reason", "")

        if not date_val:
            return Response({"error": "date required"}, status=400)

        off, created = BarberTimeOff.objects.get_or_create(
            barber=barber, date=date_val,
            defaults={"reason": reason}
        )
        return Response({"id": off.id, "date": str(off.date), "reason": off.reason},
                        status=201 if created else 200)

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


# ── Updated AvailableSlotsView — respects availability + duration ─────────────
class AvailableSlotsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        barber_id = request.query_params.get("barber")
        date_str  = request.query_params.get("date")
        service_id= request.query_params.get("service")

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

        # Check time off
        if BarberTimeOff.objects.filter(barber_id=barber_id, date=appt_date).exists():
            return Response({
                "booked_slots": [],
                "available_slots": [],
                "time_off": True,
                "message": "This barber is not available on this date."
            })

        # Get barber working hours for this day
        day_of_week = appt_date.weekday()
        try:
            avail = BarberAvailability.objects.get(barber_id=barber_id, day_of_week=day_of_week)
            if not avail.is_working:
                return Response({
                    "booked_slots": [],
                    "available_slots": [],
                    "time_off": True,
                    "message": "This barber doesn't work on this day."
                })
            work_start = avail.start_time
            work_end   = avail.end_time
        except BarberAvailability.DoesNotExist:
            # No availability set — fall back to 9AM-6PM
            work_start = datetime.strptime("09:00", "%H:%M").time()
            work_end   = datetime.strptime("18:00", "%H:%M").time()

        # Service duration
        duration = 30  # default
        if service_id:
            try:
                svc      = Service.objects.get(pk=service_id)
                duration = svc.duration_minutes
            except Service.DoesNotExist:
                pass

        # Generate all slots within working hours at 30-min intervals
        all_slots = []
        slot_dt   = datetime.combine(appt_date, work_start)
        end_dt    = datetime.combine(appt_date, work_end)
        # Last slot must finish by end_time
        while slot_dt + timedelta(minutes=duration) <= end_dt:
            all_slots.append(slot_dt.time())
            slot_dt += timedelta(minutes=30)

        # Get booked slots
        booked_times = set(
            Appointment.objects.filter(barber_id=barber_id, date=appt_date)
            .values_list("time", flat=True)
        )

        # Block slots that overlap with existing bookings (duration-aware)
        # For each booked slot, block it + enough preceding slots that would overlap
        blocked = set()
        for booked_time in booked_times:
            booked_dt = datetime.combine(appt_date, booked_time)
            # Block the booked slot itself
            blocked.add(booked_time)
            # Also block slots that would OVERLAP with this booking
            # (slots starting before booked_time but ending after it)
            slots_to_block_back = math.ceil(duration / 30) - 1
            for i in range(1, slots_to_block_back + 1):
                prev = booked_dt - timedelta(minutes=30 * i)
                blocked.add(prev.time())

        available = [
            str(s) for s in all_slots if s not in blocked
        ]
        booked_list = [str(s) for s in booked_times]

        return Response({
            "booked_slots":     booked_list,
            "available_slots":  available,
            "work_start":       str(work_start),
            "work_end":         str(work_end),
            "duration_minutes": duration,
            "time_off":         False,
        })
















































