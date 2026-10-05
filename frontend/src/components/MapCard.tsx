import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import { useStore } from '../state/store';
import { logInteraction } from '../api';
import { CloseIcon, LocationIcon } from './icons';
import { formatTemperature } from './format';
import {
  buildPinIcon,
  SG_CENTER,
  SG_MAX_BOUNDS,
  SG_ZOOM_CARD,
  SG_ZOOM_FULLSCREEN,
  SINGLE_LOCATION_ZOOM,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  TILE_URL,
} from './mapPins';
import type { Location } from '../types';

// NOTE: react-leaflet v4 freezes every MapContainer prop at mount (the Leaflet map is
// built inside a `useCallback(..., [])` ref). Interaction options therefore cannot be
// toggled after mount, which is why the collapsed card and the fullscreen view are two
// separate MapContainer instances rather than one with an `expanded` prop.
// v4 is safe under React 18 StrictMode, but would break under React 19 — a React 19
// upgrade must bump react-leaflet to v5 in the same change.

const SHARED_MAP_OPTIONS = {
  minZoom: 10,
  maxZoom: 18,
  maxBounds: SG_MAX_BOUNDS,
  maxBoundsViscosity: 1,
} as const;

const CARD_MAP_OPTIONS = {
  dragging: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
  zoomControl: false,
} as const;

const FULLSCREEN_MAP_OPTIONS = {
  dragging: true,
  scrollWheelZoom: true,
  doubleClickZoom: true,
  touchZoom: true,
  boxZoom: true,
  keyboard: true,
  zoomControl: true,
} as const;

const CARD_CHROME =
  'isolate overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl';
const CARD_HEADER_LABEL =
  'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60';

/**
 * Owns both the container-size sync and the framing of the pins. These are one
 * component because ordering matters: fitBounds computed against a container Leaflet
 * has mis-measured (which it always has on first mount, before layout settles) picks a
 * wildly wrong zoom and pushes the pins off-screen. invalidateSize must run first.
 *
 * Framing is keyed on the coordinate list rather than the array identity, so a weather
 * refresh -- which replaces every Location object -- does not yank the user's view back.
 */
function MapViewport({
  locations,
  refitOnResize,
}: {
  locations: Location[];
  refitOnResize: boolean;
}) {
  const map = useMap();
  const key = locations.map((l) => `${l.id}:${l.latitude},${l.longitude}`).join('|');
  const hasFramed = useRef(false);

  const frame = useCallback(() => {
    map.invalidateSize({ animate: false });

    // A container with no layout size yet (hidden tab, collapsed pane, display:none
    // ancestor) makes fitBounds pick a nonsense zoom and strand the pins off-screen.
    // Skip, and let the ResizeObserver below retry once it has real dimensions.
    const { x, y } = map.getSize();
    if (x === 0 || y === 0) return;
    if (locations.length === 0) return;

    if (locations.length === 1) {
      const only = locations[0];
      map.setView([only.latitude, only.longitude], SINGLE_LOCATION_ZOOM, { animate: false });
    } else {
      map.fitBounds(
        locations.map((l) => [l.latitude, l.longitude] as [number, number]),
        { padding: [48, 48], maxZoom: 14, animate: false },
      );
    }
    hasFramed.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the stable identity of `locations`
  }, [map, key]);

  useEffect(() => {
    hasFramed.current = false;
    const first = window.requestAnimationFrame(frame);
    return () => window.cancelAnimationFrame(first);
  }, [frame]);

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    // The card can't be panned, so it re-frames on every resize to keep all pins
    // visible. Fullscreen only re-measures, so a resize never yanks the user's pan --
    // except when it has never successfully framed, which is the zero-size case above.
    const observer = new ResizeObserver(() => {
      if (refitOnResize || !hasFramed.current) frame();
      else map.invalidateSize({ animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, frame, refitOnResize]);

  return null;
}

interface WeatherMapProps {
  locations: Location[];
  selectedId: number | null;
  variant: 'card' | 'fullscreen';
  /** Fullscreen only. When omitted, pins render non-interactive. */
  onSelectLocation?: (id: number) => void;
}

function WeatherMap({ locations, selectedId, variant, onSelectLocation }: WeatherMapProps) {
  const isFullscreen = variant === 'fullscreen';
  const interactive = Boolean(onSelectLocation);

  return (
    <MapContainer
      center={SG_CENTER}
      zoom={isFullscreen ? SG_ZOOM_FULLSCREEN : SG_ZOOM_CARD}
      style={{ height: '100%', width: '100%' }}
      attributionControl
      {...SHARED_MAP_OPTIONS}
      {...(isFullscreen ? FULLSCREEN_MAP_OPTIONS : CARD_MAP_OPTIONS)}
    >
      <TileLayer url={TILE_URL} subdomains={TILE_SUBDOMAINS} attribution={TILE_ATTRIBUTION} />
      <MapViewport locations={locations} refitOnResize={!isFullscreen} />
      {locations.map((location) => {
        const isSelected = location.id === selectedId;
        return (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={buildPinIcon({
              temperatureC: location.weather?.temperature_c,
              condition: location.weather?.condition,
              selected: isSelected,
              interactive,
            })}
            interactive={interactive}
            keyboard={interactive}
            zIndexOffset={isSelected ? 1000 : 0}
            alt={`${location.weather?.area ?? 'Location'}, ${formatTemperature(
              location.weather?.temperature_c,
            )}`}
            title={location.weather?.area ?? undefined}
            eventHandlers={
              onSelectLocation ? { click: () => onSelectLocation(location.id) } : undefined
            }
          />
        );
      })}
    </MapContainer>
  );
}

interface MapOverlayProps {
  locations: Location[];
  selectedId: number | null;
  onSelectLocation: (id: number) => void;
  onClose: () => void;
}

function MapOverlay({ locations, selectedId, onSelectLocation, onClose }: MapOverlayProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Weather map"
      onClick={onClose}
      className="fixed inset-0 z-50 isolate flex flex-col bg-slate-900/70 p-4 backdrop-blur-2xl lg:p-6"
    >
      <div
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06]"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <div className={CARD_HEADER_LABEL}>
            <LocationIcon className="h-3.5 w-3.5" />
            <span>Map</span>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close map"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>
        <div className="wx-map relative flex-1" data-react-grab="ignore">
          <WeatherMap
            locations={locations}
            selectedId={selectedId}
            variant="fullscreen"
            onSelectLocation={onSelectLocation}
          />
        </div>
      </div>
    </div>
  );
}

export function MapCard() {
  const { locations, selectedId, select, isLoading } = useStore();
  const [expanded, setExpanded] = useState(false);
  const expandRef = useRef<HTMLButtonElement | null>(null);

  const openMap = useCallback(() => {
    setExpanded(true);
    logInteraction('map_expanded', { locationCount: locations.length });
  }, [locations.length]);

  const closeMap = useCallback(() => {
    setExpanded(false);
    logInteraction('map_collapsed');
  }, []);

  const onSelectLocation = useCallback(
    (id: number) => {
      select(id);
      logInteraction('map_pin_selected', { locationId: id });
    },
    [select],
  );

  if (locations.length === 0) {
    return (
      <section className={CARD_CHROME}>
        <header className={`border-b border-white/10 px-4 py-2 ${CARD_HEADER_LABEL}`}>
          <LocationIcon className="h-3.5 w-3.5" />
          <span>Map</span>
        </header>
        <div className="flex h-60 items-center justify-center text-sm text-white/55">
          {isLoading ? 'Loading map…' : 'No locations to show yet.'}
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={CARD_CHROME}>
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <div className={CARD_HEADER_LABEL}>
            <LocationIcon className="h-3.5 w-3.5" />
            <span>Map</span>
          </div>
          <button
            ref={expandRef}
            type="button"
            onClick={openMap}
            aria-label="Expand weather map to fullscreen"
            className="rounded-full border border-white/15 bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/85 transition hover:bg-white/[0.16]"
          >
            Expand
          </button>
        </header>
        <div
          onClick={openMap}
          className="wx-map relative h-60 cursor-zoom-in"
          data-react-grab="ignore"
        >
          <WeatherMap locations={locations} selectedId={selectedId} variant="card" />
        </div>
      </section>

      {expanded &&
        createPortal(
          <MapOverlay
            locations={locations}
            selectedId={selectedId}
            onSelectLocation={onSelectLocation}
            onClose={closeMap}
          />,
          document.body,
        )}
    </>
  );
}
