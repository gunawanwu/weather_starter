# Architecture

## Dev server — one process, one port

Backend and frontend run as **one Node process** in development — there are no separate frontend/backend ports to configure.

`scripts/dev.mjs` wraps the backend in Portless:

```
portless run --name weather-starter tsx watch backend/src/server.ts
```

This gives a stable `http://weather-starter.localhost:1355` URL without sudo or cert prompts. Portless assigns an internal port (e.g. 4269) and proxies it there.

`backend/src/server.ts` creates an Express app that:
- Serves `/health`, `/api/logs`, and `/api/*` (via `createLocationsRouter`) directly.
- In **dev**: mounts Vite's dev server as Express middleware (`middlewareMode: true`) for the React app.
- In **production** (`NODE_ENV=production`): serves the built `frontend/dist` as static files instead.

The frontend calls relative `/api/...` paths, so it works whether proxied through Portless or hit directly on `PORT` (default 3000).

## Data flow — snapshot pattern, not on-demand fetching

The app never calls the external weather API on page load. Weather data is fetched once per explicit user action and persisted to SQLite:

1. **`POST /api/locations`** — creates a row, immediately calls `SingaporeWeatherClient.getCurrentWeather`, and writes the snapshot before responding. If the weather fetch fails, the location is still created with placeholder weather. Location creation must not fail because the weather provider is down.

2. **`GET /api/locations`** / **`GET /api/locations/:id`** — read the last snapshot from `backend/weather.db` via `backend/src/db.ts`. No outbound calls.

3. **`POST /api/locations/:id/refresh`** — the only other place that calls the external API.
