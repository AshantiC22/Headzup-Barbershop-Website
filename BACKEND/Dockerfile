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

# Force clean migrations every deploy + reminder loop in background
CMD python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput --clear && \
    python manage.py make_admin && \
    python manage.py seed_data && \
    (while true; do python manage.py send_reminders; sleep 1800; done) & \
    gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 120