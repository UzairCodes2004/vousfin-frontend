/**
 * Replace white-alpha utility fills/borders with themeable glass tokens so
 * subtle surfaces stay visible on light themes (white-on-white vanishes).
 *   bg-white/[..]      → bg-glass-panel   (hover: → bg-glass-hover)
 *   border-white/[..]  → border-glass-2
 * Preserves variant prefixes. Leaves bg-black/.. (dark overlays read on both).
 *
 * Run from vousfin-frontend-main:  node scripts/white-alpha-codemod.mjs
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'src')
const VARIANT = '(?:(?:hover|focus|focus-visible|focus-within|active|group-hover|peer-hover|disabled|sm|md|lg|xl|2xl|first|last|odd|even):)*'
const RE = new RegExp(`(${VARIANT})(bg|border)-white(?:\\/(?:\\d{1,3}|\\[[^\\]]+\\]))?`, 'g')

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
  const after = before.replace(RE, (_m, variant, type) => {
    hits++
    if (type === 'border') return `${variant}border-glass-2`
    const isHover = /hover:/.test(variant)
    return `${variant}bg-${isHover ? 'glass-hover' : 'glass-panel'}`
  })
  if (hits > 0) {
    writeFileSync(file, after)
    totalFiles++
    totalHits += hits
    console.log(`${hits.toString().padStart(4)}  ${file.replace(process.cwd(), '')}`)
  }
}
console.log(`\n${totalHits} replacements across ${totalFiles} files`)
