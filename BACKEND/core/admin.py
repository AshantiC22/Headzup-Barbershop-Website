from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Count, Sum
from .models import (
    UserProfile, Barber, Service, Appointment,
    BarberAvailability, BarberTimeOff,
    PushSubscription, Review, WaitlistEntry,
    BarberClient, RescheduleRequest, NewsletterPost,
)

# ── Branding ──────────────────────────────────────────────────────────────────
admin.site.site_header  = "✂ HEADZ UP  |  Shop Command Center"
admin.site.site_title   = "HEADZ UP Admin"
admin.site.index_title  = "Welcome back, boss. Here's what's happening."


# ── Custom CSS injected into every admin page ─────────────────────────────────
HEADZ_CSS = """
<style>
/* ── FONTS ── */
@import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=DM+Mono:wght@300;400;500&display=swap');

/* ── GLOBAL ── */
*, *::before, *::after { box-sizing: border-box; }
body {
  background: #030303 !important;
  color: #e5e5e5 !important;
  font-family: 'DM Mono', monospace !important;
  font-size: 13px !important;
}

/* ── HEADER / NAV ── */
#header {
  background: #000 !important;
  border-bottom: 1px solid rgba(245,158,11,0.3) !important;
  padding: 12px 20px !important;
}
#header a:link, #header a:visited { color: #f59e0b !important; }
#site-name a {
  font-family: 'Syncopate', sans-serif !important;
  font-size: 18px !important;
  font-weight: 900 !important;
  letter-spacing: -0.05em !important;
  color: white !important;
}
#user-tools { color: #71717a !important; font-size: 11px !important; }
#user-tools a { color: #f59e0b !important; }

/* ── BREADCRUMBS ── */
div.breadcrumbs {
  background: #0a0a0a !important;
  border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  color: #71717a !important;
  padding: 10px 20px !important;
  font-size: 11px !important;
  letter-spacing: 0.1em !important;
}
div.breadcrumbs a { color: #f59e0b !important; }

/* ── SIDEBAR / NAV ── */
#nav-sidebar {
  background: #050505 !important;
  border-right: 1px solid rgba(255,255,255,0.06) !important;
}
.sticky { background: #050505 !important; }
.toggle-nav-sidebar {
  background: #050505 !important;
  border-color: rgba(255,255,255,0.06) !important;
}
th.column-header, caption { color: #f59e0b !important; }

/* ── MODULE HEADERS (app group titles) ── */
.app-headz_up.module caption,
.module caption, caption {
  background: #000 !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 8px !important;
  letter-spacing: 0.5em !important;
  text-transform: uppercase !important;
  padding: 10px 14px !important;
  border-bottom: 1px solid rgba(245,158,11,0.2) !important;
}

/* ── MODULE / CARD ── */
.module {
  background: #0a0a0a !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-radius: 0 !important;
  margin-bottom: 16px !important;
}
.module h2, .module h3 {
  background: #000 !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 9px !important;
  letter-spacing: 0.4em !important;
  text-transform: uppercase !important;
  padding: 10px 14px !important;
  margin: 0 !important;
  border-bottom: 1px solid rgba(245,158,11,0.15) !important;
}

/* ── CONTENT AREA ── */
#content {
  background: #030303 !important;
  padding: 20px !important;
}
#content h1 {
  font-family: 'Syncopate', sans-serif !important;
  font-size: 18px !important;
  font-weight: 900 !important;
  color: white !important;
  text-transform: uppercase !important;
  letter-spacing: -0.03em !important;
  margin-bottom: 16px !important;
}
#content-main { background: transparent !important; }

/* ── TABLES ── */
#result_list {
  background: #0a0a0a !important;
  border: 1px solid rgba(255,255,255,0.07) !important;
  border-collapse: collapse !important;
  width: 100% !important;
}
#result_list thead th {
  background: #000 !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 7px !important;
  letter-spacing: 0.4em !important;
  text-transform: uppercase !important;
  border-bottom: 1px solid rgba(245,158,11,0.2) !important;
  padding: 12px 14px !important;
}
#result_list thead th a { color: #f59e0b !important; }
#result_list thead th.sorted { color: white !important; }
#result_list tr {
  border-bottom: 1px solid rgba(255,255,255,0.04) !important;
}
#result_list tr:hover {
  background: rgba(245,158,11,0.04) !important;
}
#result_list tr.row1 { background: #0a0a0a !important; }
#result_list tr.row2 { background: #080808 !important; }
#result_list td, #result_list th {
  color: #d4d4d4 !important;
  padding: 11px 14px !important;
  font-size: 12px !important;
}
#result_list td a { color: #f59e0b !important; }
#result_list td.action-checkbox { width: 20px !important; }

/* ── CHECKBOXES ── */
input[type="checkbox"] {
  accent-color: #f59e0b !important;
}

/* ── FILTERS (right sidebar) ── */
#changelist-filter {
  background: #050505 !important;
  border-left: 1px solid rgba(255,255,255,0.06) !important;
}
#changelist-filter h2 {
  background: #000 !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 7px !important;
  letter-spacing: 0.4em !important;
  padding: 10px 14px !important;
  border-bottom: 1px solid rgba(245,158,11,0.15) !important;
}
#changelist-filter h3 {
  color: #a1a1aa !important;
  font-size: 10px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.2em !important;
}
#changelist-filter a { color: #a1a1aa !important; }
#changelist-filter a:hover { color: #f59e0b !important; }
#changelist-filter li.selected a { color: #f59e0b !important; font-weight: bold !important; }

/* ── SEARCH BAR ── */
#toolbar { background: #0a0a0a !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; padding: 10px 14px !important; }
#searchbar {
  background: #000 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: white !important;
  padding: 8px 14px !important;
  font-family: 'DM Mono', monospace !important;
  font-size: 12px !important;
  outline: none !important;
  border-radius: 0 !important;
}
#searchbar:focus { border-color: #f59e0b !important; }
#toolbar label { color: #71717a !important; font-size: 11px !important; }
input[type="submit"].default, .button, button[type="submit"] {
  background: #f59e0b !important;
  color: black !important;
  border: none !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 7px !important;
  font-weight: 700 !important;
  letter-spacing: 0.2em !important;
  text-transform: uppercase !important;
  padding: 9px 18px !important;
  cursor: pointer !important;
  border-radius: 0 !important;
}
input[type="submit"].default:hover { background: white !important; }
.button.default { background: #f59e0b !important; color: black !important; }

/* ── FORMS ── */
.form-row { border-bottom: 1px solid rgba(255,255,255,0.04) !important; }
label { color: #a1a1aa !important; font-size: 11px !important; letter-spacing: 0.1em !important; }
input[type="text"], input[type="email"], input[type="password"],
input[type="number"], input[type="url"], textarea, select {
  background: #000 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: white !important;
  padding: 8px 12px !important;
  font-family: 'DM Mono', monospace !important;
  font-size: 13px !important;
  border-radius: 0 !important;
}
input[type="text"]:focus, textarea:focus, select:focus {
  border-color: #f59e0b !important;
  outline: none !important;
}
.help { color: #52525b !important; font-size: 11px !important; }
.errornote { background: rgba(239,68,68,0.08) !important; border: 1px solid rgba(239,68,68,0.3) !important; color: #f87171 !important; }
.errorlist li { color: #f87171 !important; }

/* ── OBJECT ACTIONS ── */
.object-tools a {
  background: transparent !important;
  border: 1px solid rgba(245,158,11,0.3) !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 6px !important;
  letter-spacing: 0.25em !important;
  text-transform: uppercase !important;
  padding: 8px 14px !important;
  border-radius: 0 !important;
}
.object-tools a:hover { background: rgba(245,158,11,0.08) !important; }
.object-tools a.addlink { background: rgba(245,158,11,0.1) !important; color: #f59e0b !important; }

/* ── PAGINATION ── */
.paginator {
  background: #0a0a0a !important;
  border-top: 1px solid rgba(255,255,255,0.06) !important;
  color: #71717a !important;
  font-size: 11px !important;
  padding: 10px 14px !important;
}
.paginator a, .paginator a:link { color: #f59e0b !important; }

/* ── ACTION BAR ── */
.actions { background: #0a0a0a !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
select[name="action"] {
  background: #000 !important;
  border: 1px solid rgba(255,255,255,0.1) !important;
  color: white !important;
}

/* ── SUCCESS / WARNING MESSAGES ── */
ul.messagelist li {
  font-size: 12px !important;
  padding: 10px 14px !important;
  border-radius: 0 !important;
}
ul.messagelist li.success {
  background: rgba(34,197,94,0.08) !important;
  border-left: 3px solid #22c55e !important;
  color: #4ade80 !important;
}
ul.messagelist li.warning {
  background: rgba(245,158,11,0.08) !important;
  border-left: 3px solid #f59e0b !important;
  color: #f59e0b !important;
}
ul.messagelist li.error {
  background: rgba(239,68,68,0.08) !important;
  border-left: 3px solid #ef4444 !important;
  color: #f87171 !important;
}

/* ── DASHBOARD APP LIST ── */
.app-headzup_core, .app-core {
  border: 1px solid rgba(245,158,11,0.15) !important;
}
.model-appointment a, .model-barber a, .model-service a {
  color: #f59e0b !important;
}
.model-appointment a:hover { color: white !important; }
table.model-list td { padding: 8px 14px !important; }

/* ── INLINE ADMIN ── */
.inline-group {
  background: #080808 !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
}
.inline-related h3 {
  background: #000 !important;
  color: #f59e0b !important;
  font-family: 'Syncopate', sans-serif !important;
  font-size: 7px !important;
  letter-spacing: 0.4em !important;
}
.delete-confirmation { color: #f87171 !important; }

/* ── CALENDAR / DATE WIDGET ── */
.calendarbox, .clockbox {
  background: #0a0a0a !important;
  border: 1px solid rgba(245,158,11,0.2) !important;
  color: white !important;
}
.calendar caption { background: #000 !important; color: #f59e0b !important; }
.calendar td a { color: #a1a1aa !important; }
.calendar td a:hover, .calendar td.selected a { color: #f59e0b !important; }

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #000; }
::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); }
::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.6); }

/* ── TOP AMBER LINE ── */
body::before {
  content: '';
  display: block;
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(to right, #ef4444, #f59e0b, #ef4444);
  z-index: 9999;
}
</style>
"""


class HeadzUpAdminMixin:
    """Injects HEADZ UP dark theme CSS into every admin page."""
    class Media:
        pass

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context["headz_css"] = mark_safe(HEADZ_CSS)
        return super().changelist_view(request, extra_context=extra_context)

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["headz_css"] = mark_safe(HEADZ_CSS)
        return super().change_view(request, object_id, form_url=form_url, extra_context=extra_context)

    def add_view(self, request, form_url="", extra_context=None):
        extra_context = extra_context or {}
        extra_context["headz_css"] = mark_safe(HEADZ_CSS)
        return super().add_view(request, form_url=form_url, extra_context=extra_context)


# ── Custom display helpers ─────────────────────────────────────────────────────

def status_badge(status):
    colors = {
        "confirmed": ("#22c55e", "#0a2010"),
        "completed": ("#a78bfa", "#0e0a1f"),
        "cancelled": ("#f87171", "#1a0808"),
        "no_show":   ("#f59e0b", "#1a1000"),
        "pending":   ("#71717a", "#111"),
    }
    color, bg = colors.get(status, ("#71717a", "#111"))
    return format_html(
        '<span style="background:{};color:{};padding:3px 10px;font-size:10px;'
        'font-family:\'Courier New\',monospace;letter-spacing:0.2em;text-transform:uppercase;">'
        '{}</span>',
        bg, color, status.replace("_", " ")
    )

def payment_badge(method):
    if method == "online":
        return format_html(
            '<span style="background:rgba(99,91,255,0.12);color:#a78bfa;padding:3px 8px;'
            'font-size:10px;font-family:\'Courier New\',monospace;letter-spacing:0.15em;">ONLINE</span>'
        )
    return format_html(
        '<span style="background:rgba(245,158,11,0.08);color:#f59e0b;padding:3px 8px;'
        'font-size:10px;font-family:\'Courier New\',monospace;letter-spacing:0.15em;">IN SHOP</span>'
    )

def strike_badge(count):
    if not count:
        return format_html('<span style="color:#3f3f46;">—</span>')
    color = "#ef4444" if count >= 3 else "#f59e0b" if count >= 1 else "#22c55e"
    return format_html(
        '<span style="background:rgba(239,68,68,0.1);color:{};padding:3px 8px;'
        'font-size:10px;font-family:\'Courier New\',monospace;">⚡ {}</span>',
        color, count
    )

def bool_badge(val, true_label="Yes", false_label="No"):
    if val:
        return format_html(
            '<span style="color:#22c55e;font-size:11px;">✓ {}</span>', true_label
        )
    return format_html(
        '<span style="color:#3f3f46;font-size:11px;">✕ {}</span>', false_label
    )


# ── Model Admins ───────────────────────────────────────────────────────────────

@admin.register(Appointment)
class AppointmentAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display   = ("client_name", "barber", "service_name", "date", "time",
                      "status_colored", "payment_colored", "deposit_info", "created_at")
    list_filter    = ("status", "payment_method", "barber", "date")
    search_fields  = ("user__username", "user__email", "barber__name", "service__name")
    ordering       = ("-date", "-time")
    date_hierarchy = "date"
    list_editable  = ("status",)
    list_per_page  = 25
    readonly_fields = ("created_at",)

    @admin.display(description="Client")
    def client_name(self, obj):
        return format_html(
            '<strong style="color:white;">{}</strong><br>'
            '<span style="color:#52525b;font-size:10px;">{}</span>',
            obj.user.username, obj.user.email or "no email"
        )

    @admin.display(description="Service")
    def service_name(self, obj):
        price = obj.service.price if obj.service else "—"
        name  = obj.service.name  if obj.service else "—"
        return format_html(
            '{} <span style="color:#f59e0b;font-size:11px;">${}</span>',
            name, price
        )

    @admin.display(description="Status")
    def status_colored(self, obj):
        return status_badge(obj.status)

    @admin.display(description="Payment")
    def payment_colored(self, obj):
        return payment_badge(obj.payment_method)

    @admin.display(description="Deposit")
    def deposit_info(self, obj):
        try:
            if obj.deposit_paid:
                return format_html(
                    '<span style="color:#22c55e;font-size:11px;">✓ ${}</span>',
                    obj.deposit_amount
                )
        except Exception:
            pass
        return format_html('<span style="color:#3f3f46;">—</span>')


@admin.register(UserProfile)
class UserProfileAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("username", "email", "strikes_colored", "deposit_amount", "terms", "created_at")
    search_fields = ("user__username", "user__email", "name")
    list_per_page = 30

    @admin.display(description="Username")
    def username(self, obj):
        return format_html('<strong style="color:white;">{}</strong>', obj.user.username)

    @admin.display(description="Email")
    def email(self, obj):
        return obj.user.email or format_html('<span style="color:#3f3f46;">—</span>')

    @admin.display(description="Strikes")
    def strikes_colored(self, obj):
        try:
            return strike_badge(obj.strike_count)
        except Exception:
            return format_html('<span style="color:#3f3f46;">—</span>')

    @admin.display(description="Next Deposit")
    def deposit_amount(self, obj):
        try:
            return format_html(
                '<span style="color:#f59e0b;font-weight:bold;">${}</span>',
                obj.deposit_fee
            )
        except Exception:
            return format_html('<span style="color:#3f3f46;">$10.00</span>')

    @admin.display(description="Terms")
    def terms(self, obj):
        try:
            return bool_badge(obj.terms_accepted, "Accepted", "Pending")
        except Exception:
            return format_html('<span style="color:#3f3f46;">—</span>')


@admin.register(Barber)
class BarberAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("barber_card", "username", "email", "stripe_status", "cashapp")
    search_fields = ("name", "user__username")
    list_per_page = 20

    @admin.display(description="Barber")
    def barber_card(self, obj):
        initial = obj.name[0].upper() if obj.name else "B"
        return format_html(
            '<div style="display:flex;align-items:center;gap:10px;">'
            '<div style="width:34px;height:34px;background:#f59e0b;display:flex;'
            'align-items:center;justify-content:center;font-family:\'Courier New\',monospace;'
            'font-weight:900;font-size:14px;color:black;">{}</div>'
            '<strong style="color:white;">{}</strong></div>',
            initial, obj.name
        )

    @admin.display(description="Username")
    def username(self, obj):
        return obj.user.username if obj.user else "—"

    @admin.display(description="Email")
    def email(self, obj):
        return obj.user.email if obj.user else "—"

    @admin.display(description="Stripe")
    def stripe_status(self, obj):
        try:
            if obj.stripe_account_id:
                return format_html(
                    '<span style="color:#a78bfa;">✓ Connected</span>'
                )
        except Exception:
            pass
        return format_html('<span style="color:#3f3f46;">Not connected</span>')

    @admin.display(description="Cash App")
    def cashapp(self, obj):
        try:
            if obj.cashapp_tag:
                return format_html(
                    '<span style="color:#22c55e;">{}</span>', obj.cashapp_tag
                )
        except Exception:
            pass
        return format_html('<span style="color:#3f3f46;">—</span>')


@admin.register(Service)
class ServiceAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("service_display", "price_display", "duration_display")
    search_fields = ("name",)

    @admin.display(description="Service")
    def service_display(self, obj):
        return format_html('<strong style="color:white;">✂ {}</strong>', obj.name)

    @admin.display(description="Price")
    def price_display(self, obj):
        return format_html(
            '<span style="color:#f59e0b;font-size:16px;font-weight:bold;">${}</span>',
            obj.price
        )

    @admin.display(description="Duration")
    def duration_display(self, obj):
        return format_html(
            '<span style="color:#a1a1aa;">{} min</span>',
            obj.duration_minutes
        )


@admin.register(BarberAvailability)
class BarberAvailabilityAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("barber", "day_display", "hours_display", "working")
    list_filter   = ("barber", "is_working")

    DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

    @admin.display(description="Day")
    def day_display(self, obj):
        day = self.DAYS[obj.day_of_week] if 0 <= obj.day_of_week <= 6 else str(obj.day_of_week)
        color = "#f59e0b" if obj.is_working else "#3f3f46"
        return format_html('<span style="color:{};">{}</span>', color, day)

    @admin.display(description="Hours")
    def hours_display(self, obj):
        if not obj.is_working:
            return format_html('<span style="color:#3f3f46;">Day Off</span>')
        return format_html(
            '<span style="color:#a1a1aa;">{} — {}</span>',
            obj.start_time, obj.end_time
        )

    @admin.display(description="Working")
    def working(self, obj):
        return bool_badge(obj.is_working, "Working", "Off")


@admin.register(BarberTimeOff)
class BarberTimeOffAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("barber", "date", "reason_display")
    list_filter   = ("barber",)
    ordering      = ("date",)

    @admin.display(description="Reason")
    def reason_display(self, obj):
        if obj.reason:
            return format_html('<span style="color:#71717a;font-style:italic;">{}</span>', obj.reason)
        return format_html('<span style="color:#3f3f46;">—</span>')


@admin.register(Review)
class ReviewAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("client", "barber", "stars", "completed_display", "created_at")
    list_filter   = ("barber", "completed", "rating")
    ordering      = ("-created_at",)

    @admin.display(description="Rating")
    def stars(self, obj):
        filled = "★" * obj.rating
        empty  = "☆" * (5 - obj.rating)
        color  = "#f59e0b" if obj.rating >= 4 else "#f87171" if obj.rating <= 2 else "#a1a1aa"
        return format_html(
            '<span style="color:{};font-size:14px;">{}</span>'
            '<span style="color:#3f3f46;font-size:14px;">{}</span>',
            color, filled, empty
        )

    @admin.display(description="Completed")
    def completed_display(self, obj):
        return bool_badge(obj.completed, "Done", "No Show")


@admin.register(WaitlistEntry)
class WaitlistEntryAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("client_display", "barber", "service", "date", "notified_display", "created_at")
    list_filter   = ("barber", "notified", "date")
    ordering      = ("date", "created_at")

    @admin.display(description="Client")
    def client_display(self, obj):
        phone = f" · {obj.client_phone}" if obj.client_phone else ""
        return format_html(
            '<strong style="color:white;">{}</strong>'
            '<span style="color:#52525b;font-size:10px;">{}</span>',
            obj.client_name, phone
        )

    @admin.display(description="Notified")
    def notified_display(self, obj):
        return bool_badge(obj.notified, "Notified", "Pending")


@admin.register(BarberClient)
class BarberClientAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("barber", "client_display", "vip_display", "blocked_display", "notes_preview")
    list_filter   = ("barber", "is_vip", "is_blocked")
    search_fields = ("client__username", "client__email", "barber__name")

    @admin.display(description="Client")
    def client_display(self, obj):
        return format_html(
            '<strong style="color:white;">{}</strong><br>'
            '<span style="color:#52525b;font-size:10px;">{}</span>',
            obj.client.username, obj.client.email or "—"
        )

    @admin.display(description="VIP")
    def vip_display(self, obj):
        if obj.is_vip:
            return format_html('<span style="color:#f59e0b;">⭐ VIP</span>')
        return format_html('<span style="color:#3f3f46;">—</span>')

    @admin.display(description="Blocked")
    def blocked_display(self, obj):
        if obj.is_blocked:
            return format_html('<span style="color:#f87171;">🚫 Blocked</span>')
        return format_html('<span style="color:#3f3f46;">—</span>')

    @admin.display(description="Notes")
    def notes_preview(self, obj):
        if obj.notes:
            preview = obj.notes[:60] + "..." if len(obj.notes) > 60 else obj.notes
            return format_html('<span style="color:#71717a;font-style:italic;">{}</span>', preview)
        return format_html('<span style="color:#3f3f46;">—</span>')


@admin.register(RescheduleRequest)
class RescheduleRequestAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("appointment_info", "who", "old_time", "new_time_display", "status_display", "created_at")
    list_filter   = ("status", "initiated_by")
    ordering      = ("-created_at",)

    @admin.display(description="Appointment")
    def appointment_info(self, obj):
        appt = obj.appointment
        return format_html(
            '<strong style="color:white;">{}</strong> → '
            '<span style="color:#a1a1aa;">{}</span>',
            appt.user.username, appt.barber.name if appt.barber else "—"
        )

    @admin.display(description="Requested By")
    def who(self, obj):
        color = "#f59e0b" if obj.initiated_by == "client" else "#a78bfa"
        return format_html(
            '<span style="color:{};">↻ {}</span>', color, obj.initiated_by.title()
        )

    @admin.display(description="Original")
    def old_time(self, obj):
        appt = obj.appointment
        return format_html(
            '<span style="color:#52525b;">{} {}</span>',
            appt.date, appt.time
        )

    @admin.display(description="Requested")
    def new_time_display(self, obj):
        return format_html(
            '<span style="color:#f59e0b;">{} {}</span>',
            obj.new_date, obj.new_time
        )

    @admin.display(description="Status")
    def status_display(self, obj):
        colors = {
            "pending":  "#f59e0b",
            "accepted": "#22c55e",
            "rejected": "#f87171",
            "expired":  "#3f3f46",
        }
        color = colors.get(obj.status, "#a1a1aa")
        return format_html(
            '<span style="color:{};">● {}</span>', color, obj.status.title()
        )


@admin.register(PushSubscription)
class PushSubscriptionAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("user", "created_at", "updated_at")
    search_fields = ("user__username",)


@admin.register(NewsletterPost)
class NewsletterPostAdmin(HeadzUpAdminMixin, admin.ModelAdmin):
    list_display  = ("post_display", "barber", "category_badge", "pinned_display", "active_display", "created_at")
    list_filter   = ("category", "pinned", "active", "barber")
    search_fields = ("title", "body")
    ordering      = ("-created_at",)
    list_editable  = ("active",)

    @admin.display(description="Post")
    def post_display(self, obj):
        preview = obj.body[:80] + "..." if len(obj.body) > 80 else obj.body
        return format_html(
            '<strong style="color:white;">{} {}</strong><br>'
            '<span style="color:#52525b;font-size:10px;">{}</span>',
            obj.emoji, obj.title, preview
        )

    @admin.display(description="Category")
    def category_badge(self, obj):
        colors = {
            "deal":    "#22c55e",
            "promo":   "#f59e0b",
            "update":  "#a78bfa",
            "event":   "#38bdf8",
            "general": "#71717a",
        }
        color = colors.get(obj.category, "#71717a")
        return format_html(
            '<span style="color:{};font-size:10px;letter-spacing:0.2em;">{}</span>',
            color, obj.get_category_display().upper()
        )

    @admin.display(description="Pinned")
    def pinned_display(self, obj):
        if obj.pinned:
            return format_html('<span style="color:#f59e0b;">📌 Pinned</span>')
        return format_html('<span style="color:#3f3f46;">—</span>')

    @admin.display(description="Active")
    def active_display(self, obj):
        return bool_badge(obj.active, "Live", "Hidden")