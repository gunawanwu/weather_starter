---
title: Getting started
description: Install dependencies, run the app, and learn the npm scripts.
---

## Prerequisites

- **Node.js 22.5 or newer.** The backend uses the built-in `node:sqlite` module, so there is no native SQLite addon to compile.
- **npm**, because the repo uses npm workspaces.

## Install and run

```bash
npm install
npm run dev
```

`npm run dev` starts the whole stack (Express API and Vite-powered React app) as **one process**, behind [Portless](https://www.npmjs.com/package/portless). Open:

```
http://weather-starter.localhost:1355
```

The SQLite database is created at `backend/weather.db`, and pending migrations are applied when the server starts. You don't need a separate migrate step on a fresh checkout.

## npm scripts

All scripts run from the repository root.

| Script                | What it does                                                                     |
| --------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`         | Full stack in watch mode via Portless (`scripts/dev.mjs`)                        |
| `npm run build`       | Builds the frontend with Vite, then compiles the backend with `tsc`              |
| `npm run start`       | Runs the compiled server with `NODE_ENV=production` (`scripts/start.mjs`)        |
| `npm test`            | Runs the backend Vitest suite                                                    |
| `npm run doctor`      | Checks `/health` and `/api/locations` on a running server                       |
| `npm run reset`       | Deletes `backend/weather.db` and its `-shm` / `-wal` files                       |
| `npm run db:generate` | Generates a Drizzle migration from changes to `backend/src/schema.ts`            |
| `npm run db:migrate`  | Applies pending migrations with drizzle-kit                                      |
| `npm run docs`        | Starts this documentation site on `http://localhost:4321`                        |

:::note
There is no lint script, even though ESLint and Prettier are installed as dev dependencies. The `.husky/pre-commit` hook is empty, so commits are not checked either.
:::

## Environment variables

Copy `.env.example` to `.env`. Every variable is optional.

| Variable          | Default                       | Used by                                                     |
| ----------------- | ----------------------------- | ----------------------------------------------------------- |
| `WEATHER_API_KEY` | none                          | Sent as `x-api-key` to data.gov.sg for higher rate limits   |
| `PORT`            | `3000`                        | Port the Express server listens on (always `127.0.0.1`)      |
| `DATABASE_PATH`   | `backend/weather.db`          | SQLite file location (tests point this at a temp directory) |
| `LOG_FILE_PATH`   | `backend/logs/app.log`        | pino file destination (logs also go to stdout)              |
| `LOG_LEVEL`       | `info` (`silent` in tests)    | pino log level                                              |
| `PORTLESS_PORT`   | `1355`                        | Port of the Portless proxy in dev                           |
| `PORTLESS_HTTPS`  | `0`                           | Set to `1` to serve the dev URL over HTTPS                  |

`npm run doctor` defaults to `http://127.0.0.1:3000`. To check the Portless URL instead, set `WEATHER_STARTER_URL`.

## Project layout

```text
weather_starter/
├── backend/
│   ├── drizzle/              # Generated SQL migrations
│   └── src/
│       ├── server.ts         # createApp(): Express app, Vite middleware, static serving
│       ├── routes/
│       │   ├── locations.ts       # /api/locations router + snapshot merge
│       │   └── locations.test.ts  # Vitest + supertest
│       ├── weather.ts        # SingaporeWeatherClient (data.gov.sg)
│       ├── db.ts             # The only module that touches SQLite
│       ├── schema.ts         # Drizzle table definition
│       └── logger.ts         # pino (stdout + file)
├── frontend/
│   └── src/
│       ├── main.tsx, App.tsx
│       ├── api.ts            # The only module that calls fetch
│       ├── state/            # StoreProvider, ThemeProvider
│       ├── components/       # Sidebar, Hero, tiles, map, forecasts
│       └── themes.ts
├── docs/                     # This Starlight site
├── scripts/                  # dev / start / doctor / reset
└── drizzle.config.ts
```
