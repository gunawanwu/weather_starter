---
name: sg-weather-api
description: >
  Singapore data.gov.sg weather API reference for the Weather Starter app —
  endpoints, exact response shapes, rate-limit behaviour, and the two-base-URL
  split. Use this skill whenever the user asks about adding a new weather
  endpoint, fixing a parsing bug, understanding why a field is null, changing
  how the client batches requests, or anything else touching the data.gov.sg
  API layer in this project.
---

# Singapore Weather API (data.gov.sg)

## Two base URLs — critical distinction

| Base URL | Used for |
|---|---|
| `https://api-open.data.gov.sg` | All v2 real-time endpoints |
| `https://api.data.gov.sg` | Legacy v1 endpoints (4-day forecast only) |

The v1 and v2 response envelopes differ meaningfully (see shapes below). Never mix them up when adding a new endpoint.

## Rate limits

- **Anonymous**: ~6 requests per refresh window. Requests 7+ return HTTP 429. Recovery takes 30–60 s.
- **With API key**: higher quota. Pass as `x-api-key` header; set `WEATHER_API_KEY` env var to activate.
- The client retries 429s twice with 400 ms back-off before throwing `WeatherProviderError`.
- This is why `getCurrentWeather()` runs three sequential `Promise.all` batches — to stay inside the anonymous budget by priority (condition + forecast first, metrics second, air quality last).

## Authentication

```
x-api-key: <your-key>
```

No key needed for local dev at normal refresh rates.

---

## Endpoints and response shapes

### 2-Hour Forecast (primary condition source)
```
GET https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast
```

**v2 envelope:**
```json
{
  "code": 0,
  "data": {
    "area_metadata": [
      { "name": "Ang Mo Kio", "label_location": { "latitude": 1.375, "longitude": 103.839 } }
    ],
    "items": [
      {
        "update_timestamp": "2024-01-01T12:00:00+08:00",
        "timestamp": "2024-01-01T12:00:00+08:00",
        "valid_period": { "text": "12 pm to 2 pm" },
        "forecasts": [
          { "area": "Ang Mo Kio", "forecast": "Partly Cloudy (Day)" }
        ]
      }
    ]
  }
}
```

`code !== 0` signals an error; `errorMsg` carries the reason. The nearest area is found by Euclidean distance from `label_location` coordinates. Falls back to `forecasts[0]` if no nearest area matches.

---

### Station Readings (temperature, humidity, rainfall, wind)
```
GET https://api-open.data.gov.sg/v2/real-time/api/air-temperature
GET https://api-open.data.gov.sg/v2/real-time/api/relative-humidity
GET https://api-open.data.gov.sg/v2/real-time/api/rainfall
GET https://api-open.data.gov.sg/v2/real-time/api/wind-speed
GET https://api-open.data.gov.sg/v2/real-time/api/wind-direction
```

**v2 envelope (shared shape for all five):**
```json
{
  "code": 0,
  "data": {
    "stations": [
      { "id": "S117", "name": "Ang Mo Kio Avenue 5", "location": { "latitude": 1.3764, "longitude": 103.8492 } }
    ],
    "readings": [
      {
        "timestamp": "2024-01-01T12:00:00+08:00",
        "data": [
          { "stationId": "S117", "value": 31.4 }
        ]
      }
    ],
    "readingType": "DBT 1M F",
    "readingUnit": "deg C"
  }
}
```

The nearest station to the requested lat/lon is selected by Euclidean distance, filtering to only stations that have a value in the latest reading. `readings[0]` is the most recent.

---

### UV Index
```
GET https://api-open.data.gov.sg/v2/real-time/api/uv
```

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "timestamp": "2024-01-01T12:00:00+08:00",
        "updatedTimestamp": "2024-01-01T12:05:00+08:00",
        "index": [
          { "hour": "2024-01-01T12:00:00+08:00", "value": 9 }
        ]
      }
    ]
  }
}
```

`index[0]` is the current reading. `value` is a number (0–11+).

---

### PSI and PM2.5 (air quality)
```
GET https://api-open.data.gov.sg/v2/real-time/api/psi
GET https://api-open.data.gov.sg/v2/real-time/api/pm25
```

Both use the same envelope shape:
```json
{
  "code": 0,
  "data": {
    "regionMetadata": [
      { "name": "west", "labelLocation": { "latitude": 1.35735, "longitude": 103.7 } },
      { "name": "central", "labelLocation": { "latitude": 1.35735, "longitude": 103.82 } }
    ],
    "items": [
      {
        "timestamp": "2024-01-01T12:00:00+08:00",
        "updatedTimestamp": "2024-01-01T12:05:00+08:00",
        "readings": {
          "psi_twenty_four_hourly": { "west": 42, "central": 38, "north": 35, "south": 41, "east": 40 },
          "psi_three_hourly": { "west": 44, "central": 40 }
        }
      }
    ]
  }
}
```

Region is selected by Euclidean distance from `labelLocation`. Five regions: `west`, `north`, `central`, `south`, `east`. For PSI the app reads `readings.psi_twenty_four_hourly[region]`; for PM2.5 it reads `readings.pm25_one_hourly[region]`.

---

### 24-Hour Forecast
```
GET https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast
```

```json
{
  "code": 0,
  "data": {
    "records": [
      {
        "timestamp": "2024-01-01T06:00:00+08:00",
        "updatedTimestamp": "2024-01-01T06:05:00+08:00",
        "general": {
          "temperature": { "low": 26, "high": 34 }
        },
        "periods": [
          {
            "timePeriod": { "start": "2024-01-01T06:00:00+08:00", "text": "6 am to 12 pm" },
            "regions": {
              "west": { "text": "Partly Cloudy (Day)", "code": "PC" },
              "central": { "text": "Partly Cloudy (Day)", "code": "PC" }
            }
          }
        ]
      }
    ]
  }
}
```

`general.temperature.low/high` are the day's forecast range (what the app shows). `periods[n].regions[region].text` gives the regional forecast string for each time band. Region falls back to `central` if no match.

---

### 4-Day Forecast (legacy v1 — different base URL)
```
GET https://api.data.gov.sg/v1/environment/4-day-weather-forecast
```

**v1 envelope — no `code`/`data` wrapper:**
```json
{
  "items": [
    {
      "update_timestamp": "2024-01-01T06:00:00+08:00",
      "timestamp": "2024-01-01T06:00:00+08:00",
      "forecasts": [
        {
          "date": "2024-01-01",
          "timestamp": "2024-01-01T00:00:00+08:00",
          "forecast": "Partly Cloudy",
          "temperature": { "low": 26, "high": 33 }
        }
      ]
    }
  ]
}
```

`items[0].forecasts` is an array of daily entries. No `code` field — error handling must rely on HTTP status. This is the only v1 endpoint still in use.

---

## Condition vocabulary

The 2-hour and 24-hour forecast `forecast`/`text` fields use a fixed vocabulary:

`Fair (Day)`, `Fair (Night)`, `Fair & Warm`, `Partly Cloudy (Day)`, `Partly Cloudy (Night)`,
`Cloudy`, `Hazy`, `Slightly Hazy`, `Windy`, `Mist`, `Fog`,
`Light Rain`, `Moderate Rain`, `Heavy Rain`,
`Passing Showers`, `Light Showers`, `Showers`, `Heavy Showers`,
`Thundery Showers`, `Heavy Thundery Showers`, `Heavy Thundery Showers with Gusty Winds`,
`Drizzle`

---

## WeatherSnapshot — the app's internal shape

All the API results above are merged into a single `WeatherSnapshot` stored per location in SQLite:

```ts
interface WeatherSnapshot {
  condition: string;           // from 2-hr forecast
  observed_at: string;         // ISO timestamp
  source: string;              // 'api-open.data.gov.sg'
  area: string | null;         // nearest 2-hr forecast area name
  valid_period_text: string | null;
  temperature_c: number | null;
  humidity_percent: number | null;
  rainfall_mm: number | null;
  wind_speed_knots: number | null;
  wind_direction_degrees: number | null;
  forecast_low_c: number | null;   // from 24-hr general.temperature
  forecast_high_c: number | null;
  uv_index: number | null;
  psi_twenty_four_hourly: number | null;
  pm25_one_hourly: number | null;
  air_quality_region: string | null;
  forecast_periods: ForecastPeriod[];  // JSON-serialised in SQLite
  daily_forecast: DailyForecast[];     // JSON-serialised in SQLite
}
```

Every field except `condition`, `observed_at`, and `source` can be `null` — a 429 on any single endpoint degrades only that field; the rest still populate.

---

## Key invariants — do not break

1. **Batch order is priority order.** The three `Promise.all` batches in `getCurrentWeather()` run sequentially so the condition + forecast lands in the first ~3 requests. Do not reorder or flatten them into one big `Promise.all`.
2. **Each source `.catch(() => null)`.** Every upstream call must degrade to `null` independently. A failing endpoint must never blank unrelated fields.
3. **`mergeWeatherSnapshot` is fallback, not overwrite.** The merge helper keeps the last non-null value for each field; it does not replace existing data with nulls.
