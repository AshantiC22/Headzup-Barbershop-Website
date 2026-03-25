FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start server — collectstatic runs at startup so env vars are available
CMD python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT