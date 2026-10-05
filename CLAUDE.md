# Weather Starter

Singapore weather dashboard — Express + React/Vite monorepo, SQLite via Drizzle ORM, live data from data.gov.sg APIs.

## Commands

```bash
npm run dev          # Start full stack (Express + Vite) via Portless → http://weather-starter.localhost:1355
npm run build        # Compile backend TS + vite build frontend
npm run start        # Run compiled production server
npm test             # Run backend API tests (vitest run)
npm run format       # Prettier --write over frontend/ and backend/ (config: .prettierrc.json)
npm run lint         # ESLint over frontend/ (React + hooks) and backend/ (config: eslint.config.js)
npm run docs         # Start the Astro Starlight docs site (docs/ workspace) → http://localhost:4321
npm run doctor       # Verify /health and /api/locations against a running server
npm run reset        # Delete the local SQLite database (backend/weather.db*)
npm run db:generate  # Generate a Drizzle migration from schema.ts changes
npm run db:migrate   # Apply Drizzle migrations to backend/weather.db
```

Single test file: `npx vitest run backend/src/routes/locations.test.ts`

`.husky/pre-commit` is empty — it doesn't enforce anything.

## Before you start

**Check actual code before assuming a README "Feature Task" is unbuilt.** Several tasks listed in README.md are already fully implemented end-to-end (e.g. weather metrics, air quality, forecast cards, map card, delete-location flow, theme selector). What's actually missing tends to be narrower than the task description implies. The one genuinely unbuilt piece from the task list is per-location reading history — the schema stores one snapshot per location, overwritten on each refresh, so historical charts would need a new `readings` table.

## Further reading

- [Architecture](docs/architecture.md) — dev server, one-process setup, data-flow snapshot pattern
- [Backend / Weather client](docs/backend-weather.md) — **critical invariants** for the batching and fallback logic
- [Frontend state](docs/frontend-state.md) — Context stores, logInteraction convention, API layer
- [Database](docs/database.md) — schema, migrations, coordinate validation, duplicate handling
- [External API](docs/external-api.md) — data.gov.sg v1/v2 quirks, rate limits, API key
- [Testing](docs/testing.md) — test isolation model, temp database, parallelism

## Agent skills

### Issue tracker

GitHub Issues on the fork `gunawanwu/weather_starter` (not `origin`, which is read-only). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.
