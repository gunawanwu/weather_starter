import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SingaporeWeatherClient,
  WeatherProviderError,
  type ForecastArea,
  type WeatherSnapshot,
} from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [
    { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
  ],
};

// A subset of the two-hour forecast's area_metadata, with real label locations.
const forecastPayload = {
  code: 0,
  data: {
    area_metadata: [
      { name: 'Jurong West', label_location: { latitude: 1.34039, longitude: 103.705 } },
      { name: 'Jurong East', label_location: { latitude: 1.326, longitude: 103.737 } },
      { name: 'Bishan', label_location: { latitude: 1.350772, longitude: 103.839 } },
    ],
    items: [],
  },
};

// The real client's nearest-area lookup, fed a canned forecast payload.
function realNearestArea(latitude: number, longitude: number): Promise<ForecastArea> {
  const client = new SingaporeWeatherClient();
  vi.spyOn(client, 'fetchLatestForecastPayload').mockResolvedValue(forecastPayload as never);
  return client.getNearestArea(latitude, longitude);
}

describe('locations API', () => {
  let tempDir: string;
  // Tests can swap this to simulate provider behaviour per request.
  let getCurrentWeather: () => Promise<WeatherSnapshot>;
  let getNearestArea: (latitude: number, longitude: number) => Promise<ForecastArea>;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        getCurrentWeather: () => getCurrentWeather(),
        getNearestArea: (latitude, longitude) => getNearestArea(latitude, longitude),
      },
    });
  });

  beforeEach(() => {
    getCurrentWeather = async () => weather;
    getNearestArea = realNearestArea;
  });

  afterAll(async () => {
    const { closeDatabase } = await import('../db.js');
    closeDatabase();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes weather when a location is created', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
  });

  it('deletes a location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.3, longitude: 103.8 })
      .expect(201);

    await request(app).delete(`/api/locations/${created.body.id}`).expect(204);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(
      listResponse.body.locations.some(
        (location: { id: number }) => location.id === created.body.id,
      ),
    ).toBe(false);
  });

  it('returns 404 when deleting an unknown location', async () => {
    await request(app).delete('/api/locations/999999').expect(404);
  });

  it('returns 409 when creating a duplicate location', async () => {
    await request(app)
      .post('/api/locations')
      .send({ latitude: 1.32, longitude: 103.82 })
      .expect(201);
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.32, longitude: 103.82 })
      .expect(409);
    expect(response.body.detail).toBe('Location already exists');
  });

  it('returns 409, not 500, for concurrent duplicate creates', async () => {
    const send = () =>
      request(app).post('/api/locations').send({ latitude: 1.33, longitude: 103.83 });
    const statuses = (await Promise.all([send(), send()])).map((response) => response.status);
    expect(statuses.sort()).toEqual([201, 409]);
  });

  it('refreshes an existing location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.34, longitude: 103.84 })
      .expect(201);

    getCurrentWeather = async () => ({ ...weather, condition: 'Showers', temperature_c: 27 });
    const response = await request(app)
      .post(`/api/locations/${created.body.id}/refresh`)
      .expect(200);
    expect(response.body.weather).toMatchObject({ condition: 'Showers', temperature_c: 27 });
  });

  it('returns 404 when the location is deleted during a refresh', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.36, longitude: 103.86 })
      .expect(201);

    getCurrentWeather = async () => {
      const { deleteLocation } = await import('../db.js');
      await deleteLocation(created.body.id);
      return weather;
    };
    await request(app).post(`/api/locations/${created.body.id}/refresh`).expect(404);
  });

  describe('GET /api/areas/nearest', () => {
    it("returns the forecast area's name and label coordinates", async () => {
      const response = await request(app)
        .get('/api/areas/nearest')
        .query({ latitude: 1.3404, longitude: 103.7091 })
        .expect(200);
      expect(response.body).toEqual({ name: 'Jurong West', latitude: 1.34039, longitude: 103.705 });
    });

    it('picks whichever area is nearest', async () => {
      const response = await request(app)
        .get('/api/areas/nearest')
        .query({ latitude: 1.3329, longitude: 103.7436 })
        .expect(200);
      expect(response.body).toEqual({ name: 'Jurong East', latitude: 1.326, longitude: 103.737 });
    });

    it.each([
      ['missing parameters', {}],
      ['a missing longitude', { latitude: 1.34 }],
      ['non-numeric parameters', { latitude: 'abc', longitude: '103.7' }],
    ])('returns 422 for %s', async (_case, query) => {
      const response = await request(app).get('/api/areas/nearest').query(query).expect(422);
      expect(response.body.detail).toEqual(expect.any(String));
    });

    it('returns 422 for coordinates outside Singapore', async () => {
      const response = await request(app)
        .get('/api/areas/nearest')
        .query({ latitude: 3.139, longitude: 101.6869 })
        .expect(422);
      expect(response.body.detail).toMatch(/within Singapore/);
    });

    it('returns 502 when the weather provider fails', async () => {
      getNearestArea = async () => {
        throw new WeatherProviderError('Unable to reach weather provider');
      };
      const response = await request(app)
        .get('/api/areas/nearest')
        .query({ latitude: 1.34, longitude: 103.7 })
        .expect(502);
      expect(response.body).toEqual({ detail: 'Unable to reach weather provider' });
    });

    it('returns 502 when the provider returns no area metadata', async () => {
      getNearestArea = (latitude, longitude) => {
        const client = new SingaporeWeatherClient();
        vi.spyOn(client, 'fetchLatestForecastPayload').mockResolvedValue({
          code: 0,
          data: { area_metadata: [], items: [] },
        } as never);
        return client.getNearestArea(latitude, longitude);
      };
      const response = await request(app)
        .get('/api/areas/nearest')
        .query({ latitude: 1.34, longitude: 103.7 })
        .expect(502);
      expect(response.body.detail).toEqual(expect.any(String));
    });
  });
});

describe('SingaporeWeatherClient', () => {
  it('keeps other fields when the two-hour forecast payload is malformed', async () => {
    const client = new SingaporeWeatherClient();
    vi.spyOn(client, 'fetchLatestForecastPayload').mockResolvedValue({
      code: 0,
      data: { items: [] },
    } as never);
    vi.spyOn(client, 'fetchTwentyFourHourForecast').mockRejectedValue(new Error('offline'));
    vi.spyOn(client, 'fetchNearestReading').mockImplementation(async (endpoint) => ({
      value: endpoint === 'air-temperature' ? 30 : null,
      timestamp: null,
    }));
    vi.spyOn(client, 'fetchUvIndex').mockRejectedValue(new Error('offline'));
    vi.spyOn(client, 'fetchFourDayForecast').mockRejectedValue(new Error('offline'));
    vi.spyOn(client, 'fetchAirQuality').mockRejectedValue(new Error('offline'));

    const snapshot = await client.getCurrentWeather(1.35, 103.85);
    expect(snapshot.condition).toBe('Unavailable');
    expect(snapshot.area).toBeNull();
    expect(snapshot.temperature_c).toBe(30);
  });
});
