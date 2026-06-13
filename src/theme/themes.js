/**
 * Theme registry — the list the switcher renders and the apply helper.
 *
 * Actual color values live in src/index.css ([data-theme] blocks). Here we
 * keep the order, display names, group, and small swatch colors used by the
 * Appearance card previews. Keys must match the index.css [data-theme] keys.
 */
export const THEMES = [
  { key: 'nocturne',  name: 'Nocturne',          group: 'dark',  sw: { bg: '#070B09', c: '#0D1411', a: '#3DDC97', p: '#3DDC97', n: '#F2705B', h: '#D4A94E' } },
  { key: 'onyx',      name: 'Onyx Gold',         group: 'dark',  sw: { bg: '#0B0B0C', c: '#141416', a: '#D4AF54', p: '#5BD0A0', n: '#E5736B', h: '#E8D6A0' } },
  { key: 'sapphire',  name: 'Midnight Sapphire', group: 'dark',  sw: { bg: '#080C16', c: '#0F1626', a: '#4DA8F0', p: '#3FD3A5', n: '#F2705B', h: '#7CC4FF' } },
  { key: 'aubergine', name: 'Aubergine',         group: 'dark',  sw: { bg: '#120D18', c: '#1B1424', a: '#C77DFF', p: '#54D6A0', n: '#F2708A', h: '#E0B0FF' } },
  { key: 'graphite',  name: 'Graphite Amber',    group: 'dark',  sw: { bg: '#0E0F11', c: '#17191C', a: '#E0A33E', p: '#57C98A', n: '#EF6F5B', h: '#F0C277' } },
  { key: 'copper',    name: 'Copper Slate',      group: 'dark',  sw: { bg: '#0E1216', c: '#161C22', a: '#D08A5C', p: '#57C99A', n: '#EE7361', h: '#E3AE84' } },
  { key: 'teal',      name: 'Teal Abyss',        group: 'dark',  sw: { bg: '#05121A', c: '#0B1E28', a: '#2DD4BF', p: '#3DDC97', n: '#F2705B', h: '#6FE6D6' } },
  { key: 'carbon',    name: 'Carbon Mono',       group: 'dark',  sw: { bg: '#0B0B0C', c: '#161618', a: '#E8E8EC', p: '#6FD08A', n: '#E87A72', h: '#B8B8BE' } },
  { key: 'porcelain', name: 'Porcelain',         group: 'light', sw: { bg: '#F5F6F8', c: '#FFFFFF', a: '#3B5BDB', p: '#18794E', n: '#C0392B', h: '#1E4FD0' } },
  { key: 'sand',      name: 'Warm Sand',         group: 'light', sw: { bg: '#F3F0E8', c: '#FBFAF5', a: '#1E6A4A', p: '#1E7A4A', n: '#B3402A', h: '#B98A2F' } },
]

export const THEME_KEYS = THEMES.map((t) => t.key)
export const DEFAULT_THEME = 'nocturne'

/** Apply a theme by setting (or clearing, for the default) the data-theme attr. */
export function applyTheme(key) {
  const k = THEME_KEYS.includes(key) ? key : DEFAULT_THEME
  const el = document.documentElement
  if (k === DEFAULT_THEME) el.removeAttribute('data-theme')
  else el.dataset.theme = k
}
