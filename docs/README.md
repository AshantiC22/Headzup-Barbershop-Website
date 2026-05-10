HEADZ UP Barbershop
A production-grade barbershop management and booking platform built and deployed solo. Real clients, live payments, and a full notification system — from architecture to deployment.
🔗 Live Site: headzupp.com

Tech Stack
LayerTechnologyFrontendNext.js 16, React, Tailwind CSSBackendDjango REST Framework, PythonDatabasePostgreSQLHostingVercel (frontend), Railway (backend)PaymentsStripe ConnectEmailSendGridSMSTwilio (A2P 10DLC)Push NotificationsWeb Push API (VAPID)AuthJWT (SimpleJWT), Role-Based Access ControlCI/CDGitHub ActionsPWAService Workers, Web App Manifest

Features

Real-time booking engine — availability management with barber schedules, time-off blocks, and walk-in slots
Stripe Connect — payments route directly to the barber's bank account with an automatic $1.50 platform fee per transaction
Full notification system — email, SMS, and push notifications across all 14 booking triggers
PWA — installable on iOS and Android, offline-capable
Role-based dashboards — separate client and barber portals with distinct permission layers
Strike and deposit system — automated fee escalation for no-shows and late cancellations
Client management — VIP flags, notes, booking history, and strike tracking
Mass messaging — email and SMS blast to all clients
News feed — barber posts that push to all clients
A2P 10DLC compliance — registered SMS campaign with US carriers
Custom design system — rubber hose animated UI with loading screen and micro-interactions
CI/CD pipeline — automated deploys via GitHub Actions


Screenshots

Coming soon


Local Setup
bash# Clone the repo
git clone https://github.com/AshantiC22/Headzup-Barbershop-Website.git
cd Headzup-Barbershop-Website

# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env  # add your environment variables
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
