# Frontend State

## Stores

There is no Redux/Zustand/React Query. State is plain React Context:

| File | Context | What it holds |
|---|---|---|
| `frontend/src/state/store.tsx` | `StoreProvider` / `useStore` | Location list, selection, loading/refreshing/deleting flags, errors |
| `frontend/src/state/themeStore.tsx` | `ThemeProvider` / `useTheme` | Current theme ID, persisted to `localStorage` |

All API calls go through `frontend/src/api.ts`. Components do not call `fetch` directly.

## Interaction logging

User actions are logged to `POST /api/logs` via `logInteraction()` in `api.ts`. The backend validates the event name against `FRONTEND_EVENT_PATTERN`:

```
^[a-z][a-z0-9_.:-]{1,63}$
```

Follow the existing `resource_action_state` naming convention when adding new events:

```ts
logInteraction('location_create_submitted', { latitude, longitude });
logInteraction('location_created', { locationId, latitude, longitude });
logInteraction('location_refresh_failed', { locationId, error });
```
