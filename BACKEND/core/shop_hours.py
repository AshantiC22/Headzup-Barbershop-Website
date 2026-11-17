"""Shop hours: the week as the owner set it, with the hours the shop has
always kept as the fallback when nothing is saved (a fresh database, or a
row deleted by hand). Days are 0 = Monday … 6 = Sunday, like date.weekday().
"""
from datetime import datetime, time, timedelta

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

# Mon–Fri 9–6, Sat 9–4, closed Sunday
DEFAULT_WEEK = {
    **{d: (True, time(9), time(18)) for d in range(5)},
    5: (True, time(9), time(16)),
    6: (False, time(9), time(18)),
}


def get_week():
    """{day: (is_open, open_time, close_time)} for all seven days."""
    from .models import ShopHours

    week = dict(DEFAULT_WEEK)
    for row in ShopHours.objects.all():
        week[row.day_of_week] = (row.is_open, row.open_time, row.close_time)
    return week


def hours_on(day, week=None):
    """(is_open, open_time, close_time) for a date."""
    return (week or get_week())[day.weekday()]


def closed_message(day, week=None):
    """Why nothing can be booked on `day`, or None when the shop is open."""
    is_open, _, _ = hours_on(day, week)
    if is_open:
        return None
    return f"The shop is closed on {DAY_NAMES[day.weekday()]}s."


def outside_hours(day, start, minutes, week=None):
    """A message when an appointment at `start` for `minutes` doesn't fit
    inside the shop's hours that day; None when it fits."""
    is_open, opens, closes = hours_on(day, week)
    if not is_open:
        return closed_message(day, week)
    begin = datetime.combine(day, start)
    if begin.time() < opens or begin + timedelta(minutes=minutes) > datetime.combine(day, closes):
        return f"That time is outside shop hours ({_clock(opens)} to {_clock(closes)})."
    return None


def _clock(t):
    h = t.hour % 12 or 12
    suffix = "AM" if t.hour < 12 else "PM"
    return f"{h}:{t.minute:02d} {suffix}" if t.minute else f"{h} {suffix}"


def _same(a, b):
    # two closed days match whatever times happen to be stored on them
    return a == b or (not a[0] and not b[0])


def describe_week(week=None):
    """One line for emails: 'Mon–Fri 9 AM–6 PM · Sat 9 AM–4 PM · Closed Sun'.
    Neighbouring days with the same hours are grouped."""
    week = week or get_week()
    parts, d = [], 0
    while d < 7:
        cur = week[d]
        end = d
        while end + 1 < 7 and _same(week[end + 1], cur):
            end += 1
        days = SHORT[d] if end == d else f"{SHORT[d]}–{SHORT[end]}"
        parts.append(f"{days} {_clock(cur[1])}–{_clock(cur[2])}" if cur[0] else f"Closed {days}")
        d = end + 1
    return " · ".join(parts)
