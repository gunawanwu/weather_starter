---
title: HTTP API
description: Every endpoint the Express server exposes, with request and response shapes.
sidebar:
  order: 1
---

Every response is JSON. Errors use the shape `{ "detail": string }`.

## Endpoints

| Method   | Path                         | Success | Errors                  |
| -------- | ---------------------------- | ------- | ----------------------- |
| `GET`    | `/health`                    | 200     |                         |
| `POST`   | `/api/logs`                  | 204     | 422                     |
| `GET`    | `/api/locations`             | 200     | 500                     |
| `POST`   | `/api/locations`             | 201     | 409, 422, 500           |
| `GET`    | `/api/locations/:id`         | 200     | 404                     |
| `POST`   | `/api/locations/:id/refresh` | 200     | 404, 502                |
| `DELETE` | `/api/locations/:id`         | 204     | 404                     |

### `GET /health`

Returns `{ "status": "healthy" }`. `npm run doctor` uses it.

### `GET /api/locations`

Returns `{ "locations": Location[] }`, newest first (`created_at DESC, id DESC`). Reads from SQLite only.

### `POST /api/locations`

```json
{ "latitude": 1.35, "longitude": 103.85 }
```

1. Rejects non-numeric input with **422** `latitude and longitude are required`.
2. Rejects coordinates outside Singapore with **422**. Allowed range: latitude `1.1–1.5`, longitude `103.6–104.1`.
3. Inserts the row with placeholder weather. A row with the same `(latitude, longitude)` already existing returns **409** `Location already exists`.
4. Fetches weather. On success it stores the snapshot. If the fetch throws a `WeatherProviderError`, it logs a warning and keeps the placeholder.
5. Responds **201** with the `Location`.

### `GET /api/locations/:id`

Returns one `Location`, or **404** `Location not found`.

### `POST /api/locations/:id/refresh`

Fetches fresh weather, merges it into the stored snapshot field by field, and returns the updated `Location`.

- **404** if the location doesn't exist, including when it was deleted while the slow refresh was running.
- **502** with the provider's message if the weather client throws a `WeatherProviderError`.

### `DELETE /api/locations/:id`

Returns **204**, or **404** if nothing was deleted.

### `POST /api/logs`

The frontend's interaction-logging sink.

```json
{ "event": "location_refreshed", "metadata": { "locationId": 3 }, "page": "/" }
```

`event` must match `^[a-z][a-z0-9_.:-]{1,63}$`, otherwise the request gets **422**. A valid event is written to the pino log with `source: "frontend"`.

## The `Location` shape

```ts
interface Location {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;          // ISO timestamp, seconds precision, no zone
  weather: WeatherSnapshot;
}

interface WeatherSnapshot {
  condition: string | null;            // 2-hour forecast text, e.g. "Thundery Showers"
  observed_at: string | null;
  source: string | null;               // "api-open.data.gov.sg" or "not-refreshed"
  area: string | null;                 // nearest 2-hour forecast area, e.g. "Bishan"
  valid_period_text: string | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  rainfall_mm: number | null;
  wind_speed_knots: number | null;
  wind_direction_degrees: number | null;
  forecast_low_c: number | null;       // 24-hour forecast
  forecast_high_c: number | null;
  uv_index: number | null;
  psi_twenty_four_hourly: number | null;
  pm25_one_hourly: number | null;
  air_quality_region: string | null;   // west | north | central | south | east
  forecast_periods: { label: string; forecast: string }[];
  daily_forecast: {
    date: string;
    forecast: string;
    temperature_low_c: number | null;
    temperature_high_c: number | null;
  }[];
}
```

Any field can be `null` when its data.gov.sg source failed and there was no previous value to fall back on.

## Try it

```bash
curl -s -X POST http://weather-starter.localhost:1355/api/locations \
  -H "Content-Type: application/json" \
  -d '{"latitude": 1.35, "longitude": 103.85}'

curl -s -X POST http://weather-starter.localhost:1355/api/locations/1/refresh

curl -s -X DELETE -o /dev/null -w "%{http_code}\n" \
  http://weather-starter.localhost:1355/api/locations/1
```

## Logging

`backend/src/logger.ts` writes pino JSON to stdout **and** to `backend/logs/app.log`, tagging each entry with `service: "weather-starter"`. Request logging comes from `pino-http`. Unhandled route errors reach the final error middleware, which logs `request failed` and returns **500** `Internal server error`.
