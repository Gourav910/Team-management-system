# Team Tracker

Full-stack task and project management with **JWT authentication**, **per-project Admin/Member roles**, **REST APIs**, and **PostgreSQL** (Prisma). The production image serves the **React SPA** and **JSON API** from a single Node process (suitable for **Railway**).

## Submission (fill in after deploy)

| Item | Link / value |
|------|----------------|
| **Live URL** paste your Railway public URL here after deploy | `https://________________.up.railway.app` |
| **GitHub repo** | `https://github.com/<you>/team-tracker` |

Fork or push this folder to your GitHub account; Railway deploys from the repo.

---

## Local development

### Database (PostgreSQL)

This project uses PostgreSQL everywhere (including local). Easiest options:

1. **Docker** (from repo root):

   ```bash
   docker compose up -d
   ```

2. Or [Neon](https://neon.tech) / any Postgres host.

### API

```bash
cd server
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET in .env
npm install
npx prisma migrate dev
npm run dev
```

API: `http://localhost:4000` (`GET /health`).

### Client (optional separate dev server)

```bash
cd client
npm install
npm run dev
```

UI: `http://localhost:5173` — Vite proxies `/api` to port 4000.

For a **production-like** check locally, build the client into `server/public` (see Dockerfile) or rely on the Docker image.

---

## Deploy on Railway

### 1. Push to GitHub

```bash
cd team-tracker
git init
git add .
git commit -m "Initial commit: Team Tracker"
# Create a new repo on GitHub, then:
git remote add origin https://github.com/<you>/team-tracker.git
git branch -M main
git push -u origin main
```

### 2. Create Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `team-tracker`.
2. Railway detects the root **`Dockerfile`** and builds it.

### 3. Add PostgreSQL

1. In the project: **New** → **Database** → **PostgreSQL**.
2. Open your **web service** → **Variables** → **Add reference** → choose the Postgres **`DATABASE_URL`** (Railway injects it).

### 4. Required environment variables (web service)

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Reference from the Postgres service (see above). |
| `JWT_SECRET` | Long random string (e.g. `openssl rand -hex 32`). |
| `NODE_ENV` | `production` |
| `PORT` | Usually set automatically by Railway; the app reads `process.env.PORT`. |

### 5. Public URL

1. Web service → **Settings** → **Networking** → **Generate domain**.
2. Paste that URL into the **Submission** table at the top of this README.

Migrations run on each deploy: `npx prisma migrate deploy` is the container **CMD** after the image boots.

Health check path (see `railway.toml`): **`/health`**.

---

## Production architecture

- **Dockerfile**: builds the Vite client → copies `client/dist` into `/app/public` in the runtime image; compiles the Express server to `/app/dist`.
- **Runtime**: `prisma migrate deploy` then `node dist/index.js`.
- **Static + SPA**: In production, Express serves files from `public/` and falls back to `index.html` for client routes; `/api/*` and `/health` stay on the API.

---

## API overview

| Method & path | Notes |
|---------------|--------|
| `POST /api/auth/register` | `{ email, password, name }` |
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /api/me` | Current user (Bearer token) |
| `GET /api/dashboard/summary` | Totals, overdue, my assignments |
| `GET/POST /api/projects` | List / create (creator becomes **ADMIN**) |
| `GET/PATCH/DELETE /api/projects/:projectId` | **Admin** for mutating/deleting |
| `POST /api/projects/:projectId/members` | **Admin** — `{ email, role }` |
| `PATCH/DELETE .../members/:userId` | **Admin** |
| `GET/POST /api/projects/:projectId/tasks` | Members |
| `PATCH /api/tasks/:taskId` | Admin, assignee, or creator |
| `DELETE /api/tasks/:taskId` | **Admin** |

## Role model

- **ADMIN**: Project settings, membership, roles, delete tasks, full task edits.
- **MEMBER**: Create tasks; edit tasks they created or are assigned to (no reassign/delete like admin).

## Features

### Account settings (`/settings`)
- Update display name
- Change password
- Notification preferences (email on assign / due soon)

### Project management
- **Accent color** per project
- **Archive / restore** projects (read-only when archived)
- **Leave project** (members; admins must promote another admin first)
- **Activity feed** — who did what, last 50 events
- **Team workload** — open / created / completed counts per member

### Tasks
- **Priority**: LOW, MEDIUM, HIGH, URGENT
- **Filters**: status, priority, assignee, text search
- **Comments** on tasks (click a task to open the side panel)
- Status updates inline in the table

### After pulling these changes

From `server/` run:

```bash
npx prisma migrate deploy
```

(or `npx prisma migrate dev` locally)

## Troubleshooting

### `Internal server error`

1. Confirm **`DATABASE_URL`** is set and points at **PostgreSQL** (`postgresql://` or `postgres://`).
2. Check deploy logs for `prisma migrate deploy` failures.
3. In non-production, API responses may include a **`detail`** field; the UI surfaces it when present.

### Local `Can't reach database server`

Start Postgres (`docker compose up -d`) or fix `DATABASE_URL` in `server/.env`.

---

## License

MIT (adjust for your course / organization if needed).
