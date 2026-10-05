---
title: data.gov.sg endpoints
description: The upstream endpoints the weather client calls, their base URLs, and rate limits.
sidebar:
  order: 4
---

## Two base URLs

Ten of the eleven endpoints are on the v2 real-time API:

```
https://api-open.data.gov.sg/v2/real-time/api/<endpoint>
```

The 4-day forecast is still only available on the legacy v1 API, which has a different host and a different response envelope:

```
https://api.data.gov.sg/v1/environment/4-day-weather-forecast
```

`apiBaseUrl()` can be overridden with the `baseUrl` constructor option. `legacyApiBaseUrl()` is hard-coded.

## Endpoints used

| Endpoint                   | Batch | Feeds                                                    |
| -------------------------- | ----- | -------------------------------------------------------- |
| `two-hr-forecast`          | 1     | `condition`, `area`, `observed_at`, `valid_period_text`  |
| `twenty-four-hr-forecast`  | 1     | `forecast_low_c`, `forecast_high_c`, `forecast_periods`  |
| `air-temperature`          | 1     | `temperature_c`                                          |
| `relative-humidity`        | 2     | `humidity_percent`                                       |
| `rainfall`                 | 2     | `rainfall_mm`                                            |
| `wind-speed`               | 2     | `wind_speed_knots`                                       |
| `wind-direction`           | 3     | `wind_direction_degrees`                                 |
| `uv`                       | 3     | `uv_index` (island-wide, `records[0].index[0].value`)    |
| v1 `4-day-weather-forecast`| 3     | `daily_forecast`                                         |
| `psi`                      | 4     | `psi_twenty_four_hourly`, `air_quality_region`           |
| `pm25`                     | 4     | `pm25_one_hourly`                                        |

## Response envelopes differ

- **v2** responses wrap the data in `{ code, errorMsg, data: {...} }`. A non-zero `code` is turned into a `WeatherProviderError`.
- **Station readings** return `data.stations[]` plus `data.readings[0].data[]`, keyed by `stationId`.
- **2-hour forecast** returns `area_metadata[]` plus `items[0].forecasts[]`, keyed by area name. The parser accepts these fields either under `data` or at the root.
- **24-hour forecast** returns `data.records[0]`, with `general.temperature` and `periods[].regions`.
- **PSI / PM2.5** return `data.regionMetadata[]` plus `data.items[0].readings.<metric>.<region>`.
- **v1 4-day forecast** returns `items[0].forecasts[]` with no `code` wrapper at all.

Check the actual payload before you add or change a parser. Every field is typed as optional, and numbers may arrive as strings, which is why the parsers use `numberOrNull()`.

## Rate limits and the API key

Without a key, roughly 6 requests per refresh window succeed before HTTP 429. With the retry policy, a full refresh can need up to 33 requests in the worst case. To raise the limit:

```bash
WEATHER_API_KEY=your_key npm run dev
```

The key is sent as the `x-api-key` header. You don't need one for occasional refreshes during local development.
