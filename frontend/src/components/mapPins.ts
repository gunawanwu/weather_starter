import L from 'leaflet';
import { formatTemperature } from './format';

export const SG_CENTER: [number, number] = [1.3521, 103.8198];
export const SG_ZOOM_CARD = 11;
export const SG_ZOOM_FULLSCREEN = 12;
export const SINGLE_LOCATION_ZOOM = 13;

// Padded a little beyond the range the backend accepts (routes/locations.ts rejects
// lat outside 1.1-1.5 and lon outside 103.6-104.1) so the map never invites panning
// somewhere a location could not be added anyway.
export const SG_MAX_BOUNDS: [[number, number], [number, number]] = [
  [1.06, 103.55],
  [1.54, 104.15],
];

// OpenStreetMap standard tiles, darkened to match the app via a CSS filter on
// .wx-map .leaflet-tile-pane (see index.css). CARTO's dark_matter basemap would be
// the prettier option but basemaps.cartocdn.com now watermarks "API KEY REQUIRED"
// over unauthenticated tiles, so it needs a CARTO account to use.
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_SUBDOMAINS = 'abc';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const glyph = (body: string) =>
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

// CLOUD, SUN and WIND reuse the exact path data from icons.tsx so the map glyphs
// match the icons used elsewhere in the app.
const CLOUD = glyph(
  '<path d="M7 18h10a4 4 0 0 0 .8-7.92A6 6 0 0 0 6.1 11.4 3.5 3.5 0 0 0 7 18Z"/>',
);
const SUN = glyph(
  '<circle cx="12" cy="12" r="4"/>' +
    '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
);
const WIND = glyph('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9"/>');
// MoonIcon in icons.tsx is a filled disc with craters, which turns to mud at 12px.
const MOON = glyph('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z"/>');
const PARTLY = glyph(
  '<circle cx="8" cy="8" r="3"/><path d="M8 2v1.5M2 8h1.5M4.2 4.2l1 1M11.8 4.2l-1 1"/>' +
    '<path d="M9 19h8a3.2 3.2 0 0 0 .6-6.35A4.8 4.8 0 0 0 8.3 13.1 2.9 2.9 0 0 0 9 19Z"/>',
);
const RAIN = glyph(
  '<path d="M7 15h10a4 4 0 0 0 .8-7.92A6 6 0 0 0 6.1 8.4 3.5 3.5 0 0 0 7 15Z"/>' +
    '<path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21"/>',
);
const THUNDER = glyph(
  '<path d="M7 15h10a4 4 0 0 0 .8-7.92A6 6 0 0 0 6.1 8.4 3.5 3.5 0 0 0 7 15Z"/>' +
    '<path d="M13 17l-3 4h4l-2 3"/>',
);
const HAZE = glyph('<path d="M4 8h16M4 12h16M4 16h11"/>');

/**
 * Maps a data.gov.sg forecast string to a glyph. The vocabulary is a fixed enum
 * ("Fair (Day)", "Partly Cloudy (Night)", "Thundery Showers", "Light Rain",
 * "Windy", "Slightly Hazy", ...), plus the backend's own "Unknown"/"Unavailable"
 * fallbacks. Order matters: "Thundery Showers" must match thunder before showers.
 */
export function conditionGlyph(condition: string | null | undefined): string {
  const value = (condition ?? '').toLowerCase();
  const isNight = value.includes('night');

  if (!value || value.includes('unavailable') || value.includes('unknown')) return CLOUD;
  if (value.includes('thunder')) return THUNDER;
  if (value.includes('shower') || value.includes('rain') || value.includes('drizzle')) return RAIN;
  if (value.includes('wind') || value.includes('gust')) return WIND;
  if (value.includes('haz') || value.includes('mist') || value.includes('fog')) return HAZE;
  if (value.includes('partly')) return isNight ? MOON : PARTLY;
  if (value.includes('cloud') || value.includes('overcast')) return CLOUD;
  if (value.includes('fair') || value.includes('sunny') || value.includes('clear')) {
    return isNight ? MOON : SUN;
  }
  return CLOUD;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character]);
}

interface PinOptions {
  temperatureC: number | null | undefined;
  condition: string | null | undefined;
  selected: boolean;
  interactive: boolean;
}

export function buildPinIcon({
  temperatureC,
  condition,
  selected,
  interactive,
}: PinOptions): L.DivIcon {
  const label = formatTemperature(temperatureC);
  const modifiers =
    (selected ? ' wx-pin--selected' : '') + (interactive ? ' wx-pin--interactive' : '');

  return L.divIcon({
    // Must be set: Leaflet falls back to `.leaflet-div-icon`, which paints a white
    // box with a grey border behind every pin.
    className: 'wx-pin-icon',
    html:
      `<div class="wx-pin${modifiers}">` +
      '<div class="wx-pin__label">' +
      `<span class="wx-pin__glyph">${conditionGlyph(condition)}</span>` +
      `<span class="wx-pin__temp">${escapeHtml(label)}</span>` +
      '</div>' +
      '<div class="wx-pin__dot"></div>' +
      '</div>',
    iconSize: [72, 44],
    iconAnchor: [36, 44],
  });
}
