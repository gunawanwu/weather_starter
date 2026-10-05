# Testing

## Running tests

```bash
npm test                                                        # All backend tests
npx vitest run backend/src/routes/locations.test.ts            # Single file
```

There is no frontend test infrastructure — `vitest.config.ts` globs only `backend/src/**/*.test.ts` with `environment: 'node'`. Frontend verification is typecheck + build + browser.

## Test isolation model

Each test file spins up its own `createApp()` with a temp-directory SQLite file via the `DATABASE_PATH` environment variable. Tests run with `fileParallelism: false`.

Do not assume a shared test database. Do not write tests that depend on state left by another test file.

## File location convention

Tests live next to the source files they cover:

```
backend/src/routes/locations.ts
backend/src/routes/locations.test.ts   ← same directory
```
