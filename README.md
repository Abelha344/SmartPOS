# Smart POS Monorepo

Production-oriented Point of Sale system with Django REST API and React (Vite) frontend.

## Monorepo Structure

- `backend/` Django + DRF service with RBAC, idempotency middleware, and reporting APIs.
- `frontend/` React client with role-aware routing, checkout simulation, analytics, and audit UI.

## Backend Highlights

- Custom `User` model in `apps.users` with strict role choices and DB default `CASHIER`.
- `Transaction` ledger and `RoleChangeLog` for append-only financial and privilege auditability.
- Redis-backed idempotency middleware for `POST /api/v1/transactions/*`.
- Admin-only reports for:
  - Net profit
  - Active terminal users
  - Blocked duplicate count/value
- JWT authentication (`/api/v1/auth/login/`) and secure registration (`/api/v1/auth/register/`) that strips role injection.

## Frontend Highlights

- Auth context with local token persistence.
- Protected routes with role checks (`ADMIN`, `AUDITOR`).
- Checkout view emits `X-Idempotency-Key` using UUID v4.
- Parallel idempotency stress test uses `Promise.all` with 4 concurrent requests.

## Infrastructure (Postgres + Redis)

If local Postgres auth fails (common on Ubuntu), start the bundled services:

```bash
cd SmartPOS
docker compose up -d
```

This exposes:
- Postgres: `127.0.0.1:55432` (`smartpos` / `smartpos` / `smartpos`)
- Redis: `127.0.0.1:6379`

> Port `55432` is used because local Postgres often already occupies `5432`/`5433`.

Set backend env vars (copy from `backend/.env.example`):

```bash
export POSTGRES_PORT=55432
export REDIS_URL=redis://127.0.0.1:6379/1
```

Verify DB connectivity:

```bash
PGPASSWORD=smartpos psql -h 127.0.0.1 -p 55432 -U smartpos -d smartpos -c "SELECT 1;"
```

## Run Backend

1. Create a virtual environment and install dependencies:
   - `cd backend`
   - `python3 -m venv .venv`
   - `source .venv/bin/activate`
   - `pip install -r requirements.txt`
2. Set environment variables as needed (`POSTGRES_*`, `REDIS_URL`, `DJANGO_SECRET_KEY`).
3. Generate and apply migrations:
   - `python manage.py makemigrations users transactions catalog`
   - `python manage.py migrate`
   - `python manage.py seed_catalog`
4. Create an admin user:
   - `python manage.py createsuperuser`
5. Start API:
   - `python manage.py runserver`

## Run Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`

Frontend defaults to `http://localhost:5173` and backend API to `http://127.0.0.1:8000/api/v1`.

## Chapa Payment Integration (Ethiopia)

**Yes — you need a payment gateway for real card/digital payments.** Cash sales work offline; **Chapa Card** uses [Chapa](https://chapa.co) for ETB payments (Telebirr, cards, banks).

### Setup

1. Create a Chapa account: https://dashboard.chapa.co
2. Copy test keys from Dashboard → Settings → API
3. Configure `backend/.env`:

```bash
CHAPA_SECRET_KEY=CHASECK_TEST-your-secret-key
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-your-public-key
CHAPA_MOCK_MODE=False
CHAPA_RETURN_URL=http://localhost:5173/checkout/payment-return
CHAPA_CALLBACK_URL=http://127.0.0.1:8000/api/v1/payments/chapa/webhook/
DEFAULT_CURRENCY=ETB
```

4. For local development without keys, keep `CHAPA_MOCK_MODE=True` (default) to simulate payments.

### Payment flow

| Method | Flow |
|--------|------|
| **Cash** | Instant checkout, stock deducted immediately |
| **Chapa Card** | Initialize → Chapa hosted checkout → verify → receipt |

API endpoints:
- `POST /api/v1/payments/chapa/initialize/`
- `POST /api/v1/payments/chapa/verify/`
- `POST /api/v1/payments/chapa/webhook/`

