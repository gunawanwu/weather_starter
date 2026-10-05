# Backend / Weather Client

## SingaporeWeatherClient (`backend/src/weather.ts`)

One `getCurrentWeather(lat, lon)` call fans out to **11 separate data.gov.sg endpoints** across three sequential `Promise.all` batches:

| Batch | Endpoints | Why first |
|---|---|---|
| 1 | 2-hr forecast, 24-hr forecast, air-temperature | Condition card + H/L — visible immediately |
| 2 | relative-humidity, rainfall, wind-speed | Metrics tile |
| 3 | wind-direction, UV, 4-day forecast, PSI, PM2.5 | Secondary tiles + air quality |

## Critical invariants — do not simplify these away

### 1. Preserve batch ordering and independent failure

The anonymous data.gov.sg quota reliably allows only ~6 requests per refresh window before 429s start. The three-batch structure is deliberate:
- Priority-ordered batches ensure the most visible data (condition, temperature, H/L) comes from Batch 1, which succeeds even when later batches are rate-limited.
- Every sub-fetch is wrapped in `.catch(() => null)` so one failing endpoint degrades only its own fields, never the whole snapshot.

**Do not collapse the batches into a single `Promise.all`.**

### 2. Preserve `mergeWeatherSnapshot` field-by-field fallback (`routes/locations.ts`)

After a refresh, `mergeWeatherSnapshot` falls back to the *previous* stored value for any field the new fetch returned `null` for. This means a rate-limited refresh never blanks out previously-known-good data.

**Do not replace this with a straight overwrite of the stored snapshot.**
