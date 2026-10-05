---
title: Database
description: SQLite schema, the db.ts data-access module, migrations, and duplicate handling.
sidebar:
  order: 3
---

The backend stores everything in a single SQLite file, accessed through Drizzle ORM. The driver is Node's built-in `node:sqlite` (`DatabaseSync`), connected through Drizzle's `sqlite-proxy` adapter, so there is no native addon to build.

## Schema

`backend/src/schema.ts` defines one table. Each row holds a location **and** its latest weather snapshot.

```mermaid
erDiagram
    locations {
        integer id PK "autoincrement"
        real latitude "NOT NULL"
        real longitude "NOT NULL"
        text created_at "NOT NULL"
        text condition
        text observed_at
        text source
        text area
        text valid_period_text
        real temperature_c
        real humidity_percent
        real rainfall_mm
        real wind_speed_knots
        real wind_direction_degrees
        real forecast_low_c
        real forecast_high_c
        real uv_index
        real psi_twenty_four_hourly
        real pm25_one_hourly
        text air_quality_region
        text forecast_periods "JSON, NOT NULL"
        text daily_forecast "JSON, NOT NULL"
    }
```

- A unique index `locations_latitude_longitude_unique` on `(latitude, longitude)` blocks duplicate coordinates.
- `forecast_periods` and `daily_forecast` are JSON columns (`text` with `mode: 'json'`).
- The file runs in **WAL mode** (`PRAGMA journal_mode = WAL`), which is why `npm run reset` also deletes the `-shm` and `-wal` files.

## `db.ts` is the only data-access module

Route handlers never import Drizzle or write SQL. They call the functions in `backend/src/db.ts`:

| Function                       | Behavior                                                                    |
| ------------------------------ | --------------------------------------------------------------------------- |
| `listLocations()`              | All rows, newest first                                                      |
| `createLocation(lat, lon)`     | Inserts with the placeholder snapshot (`condition: "Not refreshed"`)        |
| `getLocation(id)`              | Row or `null`                                                               |
| `updateWeather(id, snapshot)`  | Overwrites the weather columns and returns the row, or `null` if it no longer exists |
| `deleteLocation(id)`           | `true` if a row was deleted                                                 |
| `closeDatabase()` / `resetStore()` | Test helpers                                                            |

`db.ts` also translates between the camelCase Drizzle columns and the snake_case `WeatherSnapshot` that the API returns (`weatherToColumns` and `rowToRecord`).

## Duplicate locations

`createLocation()` relies on the unique index and does no `SELECT` pre-check. Two concurrent creates of the same point can't both pass a check that doesn't exist.

```mermaid
sequenceDiagram
    participant R as Router
    participant D as db.ts
    participant S as SQLite
    R->>D: createLocation(1.35, 103.85)
    D->>S: INSERT ... RETURNING
    S-->>D: UNIQUE constraint failed
    D->>D: isUniqueConstraintError (walks error.cause chain)
    D-->>R: throw DuplicateLocationError
    R-->>R: 409 { detail: "Location already exists" }
```

Drizzle sometimes wraps the driver error, so `isUniqueConstraintError()` walks the `cause` chain instead of checking only the top-level message.

## Migrations

Migrations live in `backend/drizzle/` and are **applied automatically when the server starts**: `db.ts` runs Drizzle's `migrate()` at import time.

```bash
npm run db:generate   # write a new SQL migration from schema.ts changes
npm run db:migrate    # apply pending migrations with drizzle-kit (optional; startup does this too)
npm run reset         # delete backend/weather.db* to start fresh
```

To change the schema, edit `schema.ts`, run `db:generate`, review the generated SQL, and commit it alongside the schema change.

## Location

The default path is `backend/weather.db`, resolved from `process.cwd()`, so run commands from the repository root. Set `DATABASE_PATH` to override it. The test suite points it at a temp directory.
