# Database

## Schema

`backend/src/schema.ts` defines one `locations` table. Each row holds a single weather snapshot (overwritten on each refresh — there is no history table). Persisted fields include: temperature, humidity, rainfall, wind speed/direction, UV, PSI, PM2.5, condition, area name, forecast periods (hourly), and 4-day daily forecasts.

## Migrations

```bash
npm run db:generate   # Generates a migration file from schema.ts changes (drizzle-kit)
npm run db:migrate    # Applies pending migrations to backend/weather.db
npm run reset         # Deletes backend/weather.db* — useful to start fresh in dev
```

`backend/src/db.ts` is the only file that touches the database directly. Route handlers call functions there; they do not import Drizzle or run queries themselves.

## Validation and constraints

**Coordinate bounds** — enforced server-side in `routes/locations.ts` before the row is written:
- Latitude: `1.1 – 1.5`
- Longitude: `103.6 – 104.1`

**Duplicate locations** — a unique index on `(latitude, longitude)` in `schema.ts` is caught in `db.ts` and re-thrown as `DuplicateLocationError`, which the route handler maps to HTTP 409.
