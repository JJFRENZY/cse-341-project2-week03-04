# Library API (Week 03 — CRUD with Validation)

Two collections: **books** (>=7 fields) and **authors**. Full CRUD, validation (Zod), error handling, Swagger docs.

## Run
- Create `.env` (see `.env.example`)
- `npm i`
- `npx nodemon server.js`
- http://localhost:8080/api-docs

## Env
- `MONGODB_URI` (Atlas)
- `DB_NAME=librarydb`
- `PORT=8080`

## Deploy (Render)
- Build: `npm i`
- Start: `npm start`
- Health: `/healthz`
- Env vars in dashboard
