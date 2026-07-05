# WIRC Change Makers

Fundraising + team-competition web app for Western Islamic Relief Canada. See `CHANGE_MAKERS_PROJECT_SPEC.md` for the full product spec.

## Stack

- Frontend: React (Vite) + React Router + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL via Prisma ORM
- Auth: JWT in an httpOnly cookie, bcrypt-hashed passwords

## Local development

### 1. Start Postgres

```
docker compose up -d
```

### 2. Backend

```
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000` by default.

### 3. Frontend

```
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

## Seeded accounts

After `npm run seed`, all seeded users have the password `password123`. Includes:

- 1 overall admin: `overall.admin@wirc.test`
- 1 VP admin per House, e.g. `vp.finance@wirc.test`, `vp.events@wirc.test`, ... (see seed output)
- ~3 members per House with several weeks of sample entries

## Deployment

- Frontend: Vercel/Netlify
- Backend + Postgres: Render/Railway
- Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` on the backend host; run `npx prisma migrate deploy` as part of the deploy step.
- Set `VITE_API_URL` on the frontend host to the deployed backend URL.
