# Deployment cheatsheet

Quick reference for the local → production promotion workflow.
Full context is in `PLAN.md` § Phase 15.

---

## Environments at a glance

| | Local / dev | Production |
|---|---|---|
| Frontend | `http://localhost:5173` | Vercel (auto-deploy on merge to `main`) |
| Backend | `http://localhost:3001` | Render (auto-deploy on merge to `main`) |
| Database | Supabase `promotion-tracker-dev` | Supabase `promotion-tracker-prod` |
| Anthropic key | User's Admin setting (dev DB) | User's Admin setting (prod DB) |

---

## Day-to-day: making and shipping a change

```
local dev  →  push to `dev`  →  PR to `main`  →  merge  →  auto-deploy (~2 min)
```

1. **Work on `dev` branch** (or a short-lived feature branch off `dev`)
   ```bash
   git checkout dev
   # make your changes
   git add -A
   git commit -m "short description of change"
   git push origin dev
   ```

2. **Test locally** against `promotion-tracker-dev` Supabase
   ```bash
   cd backend && npm run dev   # port 3001
   cd frontend && npm run dev  # port 5173
   ```

3. **Open a pull request** on GitHub: `dev` → `main`
   - Review the diff — check for: secrets, debug `console.log`, `.env` files accidentally staged
   - If anything looks wrong, push a fix to `dev` before merging

4. **Merge the PR** — Vercel and Render pick it up automatically

5. **Verify production** — open the live site and confirm the change works

---

## Running the app locally (first time or after a fresh clone)

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment files
cp backend/.env.example backend/.env     # fill in DATABASE_URL and JWT_SECRET
cp frontend/.env.example frontend/.env  # VITE_API_URL=http://localhost:3001

# 3. Start both servers (two terminals)
cd backend && npm run dev
cd frontend && npm run dev
```

After logging in, go to **Admin → AI settings** and enter your Anthropic API key.

---

## Deploying a database schema change

When a phase adds new tables or columns:

1. Write the SQL in `backend/migration_phaseXX.sql` and commit it to the repo
2. Run it in the **dev** Supabase SQL editor and verify locally
3. Merge the code to `main` (step 3–4 above) and wait for auto-deploy
4. Run the same SQL in the **prod** Supabase SQL editor
5. Verify the live site works with the new schema

**Never modify an existing migration file.** Always add a new one.

---

## Checking deploy status

- **Vercel**: https://vercel.com/dashboard → your project → Deployments tab
- **Render**: https://dashboard.render.com → your service → Events tab
- Both show build logs and will flag errors on a failed deploy

---

## Environment variables reference

### Render (backend)
| Variable | Value |
|---|---|
| `DATABASE_URL` | Prod Supabase connection string (URI format) |
| `JWT_SECRET` | Long random string — same value used locally in `backend/.env` |

### Vercel (frontend)
| Variable | Value |
|---|---|
| `VITE_API_URL` | Your Render service URL, e.g. `https://your-app.onrender.com` |

The Anthropic API key is **not** an environment variable in either platform.
Each user sets their own key in the Admin tab after logging in.
