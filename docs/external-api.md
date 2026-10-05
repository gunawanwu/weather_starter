# External API

## data.gov.sg — two base URLs, two response shapes

Most endpoints use the v2 base URL:
```
https://api-open.data.gov.sg/v2/real-time/api/<endpoint>
```

The 4-day forecast uses a legacy v1 endpoint with a different base URL (see `legacyApiBaseUrl()` in `weather.ts`):
```
https://api.data.gov.sg/v1/environment/4-day-weather-forecast
```

**The v1 and v2 response shapes differ meaningfully.** Read the `README.md` "External API Reference" section before adding a new data.gov.sg integration — it documents the exact shapes for each endpoint.

## Rate limits and API key

Anonymous use allows roughly **6 requests per refresh window** before 429s start. This is why the weather client batches requests (see [Backend / Weather client](backend-weather.md)).

Set `WEATHER_API_KEY` in your environment to raise rate limits:
```bash
WEATHER_API_KEY=your_key npm run dev
```

No key is required for local development at normal refresh rates.
