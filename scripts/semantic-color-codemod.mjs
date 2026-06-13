/**
 * Map fixed Tailwind numbered color shades to themeable semantic tokens so
 * every theme stays consistent. Green→positive, red→negative, amber/yellow/
 * orange→amber(highlight), sky/blue/cyan/teal→cyan(accent), violet/purple/
 * indigo/fuchsia/pink→accent-2. Preserves variant prefixes, utility type, and
 * /opacity. Our own tokens (emerald-2/3, cyan-2) use single-digit suffixes and
 * are NOT matched (regex requires 2-3 digit shades).
 *
 * Run from vousfin-frontend-main:  node scripts/semantic-color-codemod.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src')

const FAMILY_TO_TOKEN = {
  emerald: 'positive', green: 'positive', lime: 'positive',
  red: 'negative', rose: 'negative',
  amber: 'amber', yellow: 'amber', orange: 'amber',
  sky: 'cyan', blue: 'cyan', cyan: 'cyan', teal: 'cyan',
  violet: 'accent-2', purple: 'accent-2', indigo: 'accent-2', fuchsia: 'accent-2', pink: 'accent-2',
}

const TYPES = 'bg|text|border|ring|fill|stroke|from|to|via|divide|placeholder|decoration|caret|outline|shadow'
const VARIANT = '(?:(?:hover|focus|focus-visible|focus-within|active|group-hover|peer-hover|disabled|sm|md|lg|xl|2xl|dark|first|last|odd|even):)*'
const FAMILIES = Object.keys(FAMILY_TO_TOKEN).join('|')

const RE = new RegExp(
  `(${VARIANT})(${TYPES})-(${FAMILIES})-(\\d{2,3})(\\/(?:\\d{1,3}|\\[[^\\]]+\\]))?`,
  'g',
)

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, files)
    else if (/\.(jsx|js)$/.test(name)) files.push(p)
  }
  return files
}

let totalFiles = 0
let totalHits = 0
for (const file of walk(ROOT)) {
  const before = readFileSync(file, 'utf8')
  let hits = 0
  const after = before.replace(RE, (_m, variant, type, family, _shade, opacity) => {
    hits++
    return `${variant}${type}-${FAMILY_TO_TOKEN[family]}${opacity || ''}`
  })
  if (hits > 0) {
    writeFileSync(file, after)
    totalFiles++
    totalHits += hits
    console.log(`${hits.toString().padStart(4)}  ${file.replace(process.cwd(), '')}`)
  }
}
console.log(`\n${totalHits} replacements across ${totalFiles} files`)
