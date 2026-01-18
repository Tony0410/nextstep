# Next Step

A calm, reliable health management app for families supporting a loved one through treatment. Built to be "mum-proof" — simple, clear, and accessible.

![Next Step](https://via.placeholder.com/800x400/3a9563/ffffff?text=Next+Step)

## Features

### Today Dashboard
- **Next appointment** with location and map link
- **Medications due** with one-tap "Taken" button
- **Quick note** for jotting down thoughts
- **Call clinic** button for easy access

### Appointments
- Simple timeline view with date groupings
- Add title, date/time, location, map link, and notes
- Soft delete with recovery

### Medications
- **Multiple schedule types:**
  - Fixed times daily (e.g., 8am, 8pm)
  - Every X hours (e.g., every 8 hours)
  - Specific weekdays (e.g., Mon/Wed/Fri at 9am)
  - PRN/As needed with cooldown period
- One-tap dose logging with 5-minute undo window
- "What did I take?" history view (last 7 days)
- Overdue indicators with grace period

### Notes
- **Questions for doctor** — track what to ask, mark as asked
- **General notes** — timestamped thoughts
- Copy questions for appointments

### Family Sharing
- Workspace model (e.g., "Grace's Plan")
- Invite family via link
- Roles: Owner, Editor, Viewer
- Audit log of all changes

### Offline-First
- Works without internet connection
- IndexedDB local cache
- Automatic sync when online
- Conflict detection with "updated on another device" banner

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Session cookies with argon2 password hashing
- **Offline:** IndexedDB via Dexie.js
- **Deployment:** Docker Compose

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Tailscale (for external access)

### 1. Clone and Configure

```bash
cd /path/to/nextstep

# Copy environment template
cp .env.example .env

# Edit .env and set:
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - DB_PASSWORD (choose a secure password)
# - NEXT_PUBLIC_APP_URL (your Tailscale Funnel URL)
```

### 2. Start the Application

```bash
docker compose up -d
```

The app will:
1. Build the Next.js application
2. Start PostgreSQL
3. Run database migrations
4. Start the app on `127.0.0.1:3000`

### 3. Set Up Tailscale Funnel

Tailscale Funnel exposes your local app to the internet with automatic HTTPS.

```bash
# Enable Funnel (one-time setup)
tailscale funnel --https=443 http://127.0.0.1:3000 --bg

# Check status
tailscale funnel status

# Your app is now accessible at:
# https://[your-machine-name].[your-tailnet].ts.net
```

### 4. Update Your Environment

Edit `.env` and set `NEXT_PUBLIC_APP_URL` to your Funnel URL:

```
NEXT_PUBLIC_APP_URL=https://your-machine.your-tailnet.ts.net
```

Then restart the app:

```bash
docker compose down
docker compose up -d
```

### 5. Create Your Account

1. Open your Funnel URL in a browser
2. Click "Create Account"
3. Accept the disclaimer
4. Create your workspace (e.g., "Grace's Plan")
5. Add your clinic phone number

## Development

### Local Development

```bash
# Install dependencies
npm install

# Set up local PostgreSQL (or use Docker)
docker run -d \
  --name nextstep-postgres \
  -e POSTGRES_USER=nextstep \
  -e POSTGRES_PASSWORD=nextstep \
  -e POSTGRES_DB=nextstep \
  -p 5432:5432 \
  postgres:16-alpine

# Set up environment
cp .env.example .env
# Edit .env with DATABASE_URL=postgresql://nextstep:nextstep@localhost:5432/nextstep

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start dev server
npm run dev
```

### Running Tests

```bash
npm test
```

Tests cover:
- Medication scheduling logic
- PRN cooldown calculations
- Fixed times, interval, and weekday schedules

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Session encryption secret (min 32 chars) | Yes |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app | Yes |
| `DB_PASSWORD` | PostgreSQL password (for Docker) | Yes |
| `TZ` | Timezone (default: Australia/Perth) | No |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per minute (default: 100) | No |
| `LOGIN_MAX_ATTEMPTS` | Failed logins before lockout (default: 5) | No |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration (default: 15) | No |
| `SESSION_MAX_AGE_DAYS` | Session lifetime (default: 30) | No |

## API Endpoints

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `POST /api/auth/logout` — Sign out
- `GET /api/auth/me` — Get current user

### Workspaces
- `GET /api/workspaces` — List user's workspaces
- `POST /api/workspaces` — Create workspace
- `GET /api/workspaces/[id]` — Get workspace details
- `PATCH /api/workspaces/[id]` — Update workspace settings
- `POST /api/workspaces/[id]/invite` — Create invite link
- `GET /api/invite/[token]` — Get invite details
- `POST /api/invite/[token]` — Accept invite

### Sync
- `GET /api/sync?workspaceId=...&since=...` — Pull changes
- `POST /api/sync` — Push offline operations

### Health
- `GET /api/health` — Health check

## Security

- **Password hashing:** Argon2id with secure parameters
- **Session cookies:** HTTPOnly, Secure, SameSite=Lax
- **Rate limiting:** Per-IP request limits
- **Login protection:** Lockout after failed attempts
- **Input validation:** Zod schemas on all endpoints
- **HTTPS:** Enforced via Tailscale Funnel

## Tailscale Funnel Commands

```bash
# Start Funnel (background mode)
tailscale funnel --https=443 http://127.0.0.1:3000 --bg

# Check Funnel status
tailscale funnel status

# Stop Funnel
tailscale funnel off

# View Funnel logs
tailscale funnel status --json
```

## Backup & Restore

### Backup Database

```bash
docker exec nextstep-db pg_dump -U nextstep nextstep > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker exec -i nextstep-db psql -U nextstep nextstep
```

### Export User Data

Users can export their data as JSON from Settings > Export Data.

## Troubleshooting

### App won't start

```bash
# Check logs
docker compose logs app

# Common issues:
# - Database not ready: wait a few seconds, it will retry
# - Missing env vars: check .env file
```

### Database connection failed

```bash
# Check database is running
docker compose ps

# Check database logs
docker compose logs db

# Verify connection string in .env
```

### Tailscale Funnel not working

```bash
# Ensure Funnel is enabled for your tailnet
# (requires admin access to Tailscale admin console)

# Check if Funnel is running
tailscale funnel status

# Restart Funnel
tailscale funnel off
tailscale funnel --https=443 http://127.0.0.1:3000 --bg
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Tailscale Funnel                     │
│                  (HTTPS termination)                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Next.js App                           │
│                 (127.0.0.1:3000)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   App       │  │   API       │  │   Auth          │  │
│  │   Router    │  │   Routes    │  │   (Sessions)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                           │
│                   (Internal only)                       │
└─────────────────────────────────────────────────────────┘
```

## License

MIT License. See LICENSE file for details.

## Disclaimer

**Next Step is a tracking tool only.** It does not provide medical advice. Always consult your healthcare team for medical decisions. For emergencies, call 000 (Australia) or your local emergency services.
