# Promotion Tracker

A multi-user web app for managing the path to a promotion at IBM Canada. Each user tracks their own scorecard, goals, wins, people, action items, and pursuits privately. Users can share a read-only summary link and invite others to leave structured feedback.

Built for 2-3 IBMers targeting Partner, but the app is general enough for any promotion-tracking use case.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 (Vite 8) |
| Backend | Node.js + Express |
| Database | PostgreSQL (Supabase) |
| AI | Anthropic API (user-provided key) |
| Auth | JWT (email + password) |

## Local setup

```bash
# 1. Clone and install
git clone <your-repo-url>
cd promotion-app
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment files
cp backend/.env.example backend/.env     # fill in DATABASE_URL and JWT_SECRET
cp frontend/.env.example frontend/.env   # VITE_API_URL defaults to localhost

# 3. Run database migrations (Supabase SQL editor)
#    - backend/migration.sql
#    - backend/migration_phase12.sql

# 4. Start both servers (two terminals)
cd backend && npm run dev    # port 3001
cd frontend && npm run dev   # port 5173
```

After logging in, go to **Admin > GenAI** and enter your Anthropic API key to enable AI features.

## Deployment

See [DEPLOY.md](DEPLOY.md) for the full deployment workflow and environment variable reference.

## Project plan

See [PLAN.md](PLAN.md) for the full feature plan, data model, and phase history.
