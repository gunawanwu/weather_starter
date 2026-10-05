export type ThemeId = 'apple' | 'aurora' | 'sunset' | 'ocean' | 'forest' | 'midnight' | 'storm' | 'tropical-storm';

export interface Theme {
  id: ThemeId;
  label: string;
  /** Small CSS gradient string shown in the swatch. */
  swatch: string;
}

export const THEMES: Theme[] = [
  {
    id: 'apple',
    label: 'Apple',
    swatch: 'linear-gradient(135deg, #6f8aa8, #4a627c, #3c5066)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    swatch: 'linear-gradient(135deg, #0d1b2a, #1a0640, #0a2a3a)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    swatch: 'linear-gradient(135deg, #7c1d4a, #9a2a30, #c24a1a)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    swatch: 'linear-gradient(135deg, #03071e, #023e8a, #0077b6)',
  },
  {
    id: 'forest',
    label: 'Forest',
    swatch: 'linear-gradient(135deg, #0d1a0f, #1a3a1e, #2d5c3f)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    swatch: 'linear-gradient(135deg, #0f0f0f, #1a1a1a, #212121)',
  },
  {
    id: 'storm',
    label: 'Storm',
    // near-black base with a yellow lightning flash at the corner
    swatch: 'linear-gradient(135deg, #0e1018 0%, #1a2030 65%, rgba(251,191,36,0.55) 100%)',
  },
  {
    id: 'tropical-storm',
    label: 'Tropical Storm',
    // near-black with heavy grey-blue cloud coverage and a muted yellow highlight
    swatch: 'linear-gradient(135deg, #111318 0%, #1a2030 50%, rgba(100,130,170,0.6) 100%)',
  },
];

export const DEFAULT_THEME: ThemeId = 'apple';
