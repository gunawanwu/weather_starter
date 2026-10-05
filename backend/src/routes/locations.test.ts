import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SingaporeWeatherClient, type WeatherSnapshot } from '../weather.js';

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

describe('locations API', () => {
  let tempDir: string;
  // Tests can swap this to simulate provider behaviour per request.
  let getCurrentWeather: () => Promise<WeatherSnapshot>;
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
      },
    });
  });

  beforeEach(() => {
    getCurrentWeather = async () => weather;
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
