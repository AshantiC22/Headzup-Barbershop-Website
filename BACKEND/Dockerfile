FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-create staticfiles dir so whitenoise warning disappears
RUN mkdir -p /app/staticfiles

# Migrate and collect static files before the server starts taking requests;
# a failed migration stops the deploy instead of serving an old schema. The
# admin account, service list and reminder loop run alongside the server and
# can't block it. exec hands gunicorn the container's signals for clean
# shutdowns.
CMD python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput --clear && \
    ( (python manage.py make_admin; python manage.py seed_data; \
       while true; do python manage.py send_reminders; sleep 1800; done) & ) && \
    exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 120
