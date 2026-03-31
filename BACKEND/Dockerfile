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

# Force clean migrations every deploy
CMD python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput --clear && \
    python manage.py make_admin && \
    python manage.py seed_data && \
    gunicorn config.wsgi:application --bind 0.0.0.0:${PORT} --workers 2 --timeout 120