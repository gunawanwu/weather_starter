---
title: Architecture overview
description: How the backend and frontend fit together, in development and in production.
sidebar:
  order: 1
---

## One process, one port

The backend and frontend never run as separate servers. `createApp()` in `backend/src/server.ts` builds a single Express app that serves the API and the React app together. The frontend calls relative `/api/...` paths, so no CORS or proxy configuration is needed.

```mermaid
flowchart TB
    subgraph App["createApp()"]
        direction TB
        Logger["pino-http request logging"]
        Json["express.json() body parser<br/>(skipped for /frontman)"]
        Health["GET /health"]
        Logs["POST /api/logs"]
        Locations["/api → createLocationsRouter()"]
        Frontend{"NODE_ENV?"}
        ViteMW["Vite dev server<br/>middlewareMode"]
        Static["express.static(frontend/dist)<br/>+ SPA fallback to index.html"]
        ErrorMW["Error handler → 500"]
    end

    Logger --> Json --> Health --> Logs --> Locations --> Frontend
    Frontend -- "development" --> ViteMW
    Frontend -- "production" --> Static
    ViteMW --> ErrorMW
    Static --> ErrorMW
```

Middleware order matters. The API routes are mounted **before** the frontend handler, so `/api/*` is never swallowed by Vite or by the SPA fallback.

`createApp()` takes options so tests can build the app without side effects:

| Option                 | Default                    | Purpose                                   |
| ---------------------- | -------------------------- | ----------------------------------------- |
| `serveFrontend`        | `NODE_ENV !== 'test'`      | Mount Vite middleware or static files     |
| `enableRequestLogging` | `NODE_ENV !== 'test'`      | Attach `pino-http`                        |
| `weatherClient`        | `SingaporeWeatherClient`   | Inject a fake weather provider            |

## Development vs production

```mermaid
flowchart LR
    subgraph Dev["npm run dev"]
        direction LR
        P["Portless proxy<br/>weather-starter.localhost:1355"] --> T["tsx watch<br/>backend/src/server.ts"]
        T --> V["Vite middleware<br/>(HMR, TSX on the fly)"]
    end
    subgraph Prod["npm run build && npm run start"]
        direction LR
        N["node backend/dist/server.js<br/>127.0.0.1:PORT"] --> S["frontend/dist<br/>static files"]
    end
```

- **Development:** `scripts/dev.mjs` runs `portless run --name weather-starter tsx watch backend/src/server.ts`. Portless picks an internal port and gives you a stable `*.localhost` URL without sudo or certificate prompts. `tsx watch` restarts the server whenever backend code changes, and Vite handles frontend HMR.
- **Production:** `npm run build` writes `frontend/dist` and `backend/dist`. `scripts/start.mjs` runs the compiled server with `NODE_ENV=production`, which serves the static build and falls back to `index.html` for client-side routes.

Both scripts add `--disable-warning=ExperimentalWarning` to `NODE_OPTIONS`, because `node:sqlite` still prints an experimental warning.

## Snapshot data flow

The app does **not** call data.gov.sg on page load. Weather is fetched only when the user does something explicit, and the result is stored as a snapshot on the location's row.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as React (StoreProvider)
    participant API as Express /api
    participant DB as SQLite
    participant Gov as data.gov.sg

    User->>UI: Open dashboard
    UI->>API: GET /api/locations
    API->>DB: SELECT * ORDER BY created_at DESC
    DB-->>API: rows
    API-->>UI: { locations }
    Note over API,Gov: No outbound call on read

    User->>UI: Add 1.35, 103.85
    UI->>API: POST /api/locations
    API->>DB: INSERT (placeholder weather)
    API->>Gov: getCurrentWeather (11 requests)
    Gov-->>API: partial or full data
    API->>DB: UPDATE snapshot
    API-->>UI: 201 Location
    UI->>API: GET /api/locations (reload list)

    User->>UI: Click Refresh
    UI->>API: POST /api/locations/:id/refresh
    API->>Gov: getCurrentWeather
    API->>API: mergeWeatherSnapshot(previous, next)
    API->>DB: UPDATE snapshot
    API-->>UI: 200 Location
```

Two rules keep the snapshot reliable:

1. **Creating a location never fails because the weather provider is down.** If the first fetch throws a `WeatherProviderError`, the row is still returned with `201` and the placeholder condition `Not refreshed`.
2. **A refresh never erases good data.** A field that fails to fetch keeps its previous stored value. See [Weather client](/backend/weather-client/#merging-on-refresh).

:::caution
Each location stores exactly **one** snapshot, and every refresh overwrites it. There is no readings history, so a historical chart would need a new `readings` table.
:::
