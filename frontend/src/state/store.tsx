import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  listLocations,
  createLocation,
  getNearestArea,
  refreshLocation,
  deleteLocation,
  logInteraction,
} from '../api';
import type { CreateLocationPayload, Location, ProviderProps, StoreValue } from '../types';

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: ProviderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<Location[]> => {
    try {
      const data = await listLocations();
      setLocations(data.locations);
      setError(null);
      return data.locations;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount syncs API → React state
    load().then((next) => {
      if (next.length > 0) setSelectedId((current) => current ?? next[0].id);
    });
  }, [load]);

  const effectiveSelectedId = (() => {
    if (locations.length === 0) return null;
    return locations.some((l) => l.id === selectedId) ? selectedId : locations[0].id;
  })();

  const create = useCallback(
    async (payload: CreateLocationPayload) => {
      setError(null);
      logInteraction('location_create_submitted', payload);
      try {
        const created = await createLocation(payload);
        const next = await load();
        const targetId = created?.id ?? next[next.length - 1]?.id;
        if (targetId) setSelectedId(targetId);
        setIsAdding(false);
        logInteraction('location_created', {
          locationId: targetId,
          latitude: created.latitude,
          longitude: created.longitude,
        });
      } catch (err) {
        setError(err);
        logInteraction('location_create_failed', {
          latitude: payload.latitude,
          longitude: payload.longitude,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load],
  );

  // Only the forecast area's label coordinates leave this function: the raw
  // browser position is never sent to create, stored, or logged.
  const locate = useCallback(async () => {
    setIsLocating(true);
    setError(null);
    logInteraction('location_geolocate_clicked');
    try {
      const position = await currentPosition();
      const area = await getNearestArea(position.coords.latitude, position.coords.longitude);
      logInteraction('location_geolocate_resolved', area);
      await create({ latitude: area.latitude, longitude: area.longitude });
    } catch (err) {
      setError(err);
    } finally {
      setIsLocating(false);
    }
  }, [create]);

  const refresh = useCallback(
    async (id: number) => {
      setRefreshingId(id);
      setError(null);
      setRefreshError(null);
      logInteraction('location_refresh_clicked', { locationId: id });
      try {
        await refreshLocation(id);
        await load();
        logInteraction('location_refreshed', { locationId: id });
      } catch (err) {
        setError(err);
        const message = err instanceof Error ? err.message : 'Could not refresh weather';
        setRefreshError(message);
        logInteraction('location_refresh_failed', { locationId: id, error: message });
      } finally {
        setRefreshingId(null);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      setDeletingId(id);
      setError(null);
      logInteraction('location_delete_clicked', { locationId: id });
      try {
        await deleteLocation(id);
        await load();
        logInteraction('location_deleted', { locationId: id });
      } catch (err) {
        setError(err);
        logInteraction('location_delete_failed', {
          locationId: id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setDeletingId(null);
      }
    },
    [load],
  );

  const value: StoreValue = {
    locations,
    selectedId: effectiveSelectedId,
    isAdding,
    isLoading,
    refreshingId,
    deletingId,
    error,
    refreshError,
    select: (id) => {
      setSelectedId(id);
      setRefreshError(null);
    },
    setAdding: (nextIsAdding) => {
      setIsAdding(nextIsAdding);
      if (nextIsAdding) logInteraction('location_form_opened');
    },
    isLocating,
    create,
    locate,
    refresh,
    remove,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// Standard precision is plenty for a km-scale forecast area.
function currentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60_000,
    });
  });
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useSelectedLocation(): Location | null {
  const { locations, selectedId } = useStore();
  return locations.find((l) => l.id === selectedId) ?? null;
}
