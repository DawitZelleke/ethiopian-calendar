// Compares this engine's dates with two independent Ethiopian calendar libraries:
//   Kenat      (github.com/MelakuDemeke/kenat)
//   AbushakirJs (github.com/Nabute/AbushakirJs)
//
// It asks the running API for every Ethiopian year in the range, computes the same
// dates with each library, and reports every disagreement.
//
// Usage (API running locally: dotnet run --project EthiopianCalendar.Api --urls http://localhost:5199):
//   npm install
//   node compare.mjs                                  # years 1890-2090 against localhost:5199
//   node compare.mjs https://ethiopian-calendar.onrender.com 2000 2030

import { createRequire } from 'node:module'
import { getBahireHasab, getFastingPeriod, toGC } from 'kenat'

const require = createRequire(import.meta.url)
const { BahireHasab: AbushakirBahireHasab } = require('abushakir')

const baseUrl = (process.argv[2] ?? 'http://localhost:5199').replace(/\/$/, '')
const firstYear = Number(process.argv[3] ?? 1890)
const lastYear = Number(process.argv[4] ?? 2090)

// Kenat's movable feast keys -> this engine's observance ids.
const kenatFeasts = {
  nineveh: 'tsome-nenewe',
  abiyTsome: 'abiy-tsom',
  debreZeit: 'debre-zeit',
  hosanna: 'hosanna',
  siklet: 'siklet',
  fasika: 'fasika',
  rikbeKahnat: 'rikbe-kahnat',
  erget: 'erget',
  paraclete: 'paraclete',
  tsomeHawaryat: 'tsome-hawaryat',
  tsomeDihnet: 'tsome-dihnet',
}

// Kenat's fasting periods -> this engine's fast period ids.
const kenatFasts = {
  NINEVEH: 'tsome-nenewe',
  ABIY_TSOME: 'abiy-tsom',
  TSOME_HAWARYAT: 'tsome-hawaryat',
  TSOME_NEBIYAT: 'tsome-nebiyat',
  FILSETA: 'tsome-filseta',
}

// AbushakirJs names its movable feasts in Amharic.
const abushakirFeasts = {
  'ነነዌ': 'tsome-nenewe',
  'ዓቢይ ጾም': 'abiy-tsom',
  'ደብረ ዘይት': 'debre-zeit',
  'ሆሣዕና': 'hosanna',
  'ስቅለት': 'siklet',
  'ትንሳኤ': 'fasika',
  'ርክበ ካህናት': 'rikbe-kahnat',
  'ዕርገት': 'erget',
  'ጰራቅሊጦስ': 'paraclete',
  'ጾመ ሐዋርያት': 'tsome-hawaryat',
  'ጾመ ድህነት': 'tsome-dihnet',
}

// AbushakirJs returns month names; this is its own spelling, in order.
const abushakirMonths = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሳስ', 'ጥር', 'የካቲት', 'መጋቢት',
  'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ኃምሌ', 'ነሐሴ', 'ጷጉሜን',
]

/** One named check: how many comparisons ran, and every disagreement. */
class Check {
  constructor(name) {
    this.name = name
    this.compared = 0
    this.mismatches = []
    this.errors = []
  }

  /** year: the Ethiopian year; kind: what was compared, e.g. "fasika" or "abiy-tsom end". */
  compare(year, kind, ours, theirs) {
    this.compared++
    if (key(ours) !== key(theirs)) this.mismatches.push({ year, kind, ours: show(ours), theirs: show(theirs) })
  }

  /** Records a difference between two plain values (numbers). */
  compareValue(year, kind, ours, theirs) {
    this.compared++
    if (ours !== theirs) this.mismatches.push({ year, kind, ours, theirs })
  }

  error(label, e) {
    this.errors.push(`${label}: ${e?.message ?? e}`)
  }
}

const key = (d) => (d ? `${d.year}-${d.month}-${d.day}` : 'missing')
const show = (d) => (d ? `${d.year}/${d.month}/${d.day}` : 'missing')

async function getJson(path) {
  const response = await fetch(baseUrl + path)
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return response.json()
}

const checks = {
  bahireHasab: new Check('Kenat: Bahire Hasab values (Wenber, Abekte, Metqi, Mebaja Hamer)'),
  kenatFeasts: new Check('Kenat: movable feasts and fasts (Ethiopian dates)'),
  kenatFasts: new Check('Kenat: fasting period start and end dates'),
  conversion: new Check('Kenat: Ethiopian -> Gregorian conversion of every date above'),
  abushakir: new Check('AbushakirJs: movable feasts and fasts (Ethiopian dates)'),
}

console.log(`Comparing Ethiopian years ${firstYear}-${lastYear} against ${baseUrl}\n`)

for (let year = firstYear; year <= lastYear; year++) {
  const [ours, working] = await Promise.all([getJson(`/api/years/${year}`), getJson(`/api/years/${year}/bahire-hasab`)])
  const observance = (id) => ours.observances.find((o) => o.id === id)?.date
  const fastPeriod = (id) => ours.fastPeriods.find((p) => p.id === id)

  // 1. Bahire Hasab intermediate values.
  try {
    const k = getBahireHasab(year, { lang: 'english' })
    checks.bahireHasab.compareValue(year, 'wenber', working.wenber, k.wenber)
    checks.bahireHasab.compareValue(year, 'abekte', working.abekte, k.abektie)
    checks.bahireHasab.compareValue(year, 'metqi', working.metqi, k.metqi)
    checks.bahireHasab.compareValue(year, 'mebajaHamer', working.mebajaHamer, k.mebajaHamer)
    checks.bahireHasab.compare(year, 'nineveh', working.nineveh, k.nineveh)

    // 2. Every movable feast and fast.
    for (const [kenatKey, id] of Object.entries(kenatFeasts)) {
      const theirs = k.movableFeasts[kenatKey]?.ethiopian
      checks.kenatFeasts.compare(year, id, observance(id), theirs)
    }
  } catch (e) {
    checks.bahireHasab.error(year, e)
  }

  // 3. Fasting period start and end dates.
  for (const [kenatKey, id] of Object.entries(kenatFasts)) {
    try {
      const theirs = getFastingPeriod(kenatKey, year)
      const period = fastPeriod(id)
      checks.kenatFasts.compare(year, `${id} start`, period?.start, theirs?.start)
      checks.kenatFasts.compare(year, `${id} end`, period?.end, theirs?.end)
    } catch (e) {
      checks.kenatFasts.error(`${year} ${kenatKey}`, e)
    }
  }

  // 4. Calendar conversion: every Ethiopian date the API returned, converted by Kenat.
  for (const o of ours.observances) {
    try {
      const [y, m, d] = o.date.gregorian.split('-').map(Number)
      checks.conversion.compare(year, o.id, { year: y, month: m, day: d }, toGC(o.date.year, o.date.month, o.date.day))
    } catch (e) {
      checks.conversion.error(o.date.display, e)
    }
  }

  // 5. AbushakirJs.
  try {
    const bh = new AbushakirBahireHasab(year)
    for (const [name, id] of Object.entries(abushakirFeasts)) {
      const r = bh.getSingleBealOrTsom(name)
      const month = abushakirMonths.indexOf(r?.month) + 1
      checks.abushakir.compare(year, id, observance(id), month > 0 ? { year, month, day: r.date } : undefined)
    }
  } catch (e) {
    checks.abushakir.error(year, e)
  }
}

/** "1890-1891, 1895, 1900-2090" */
function yearRanges(years) {
  const sorted = [...new Set(years)].sort((a, b) => a - b)
  const ranges = []
  for (const y of sorted) {
    const last = ranges.at(-1)
    if (last && y === last[1] + 1) last[1] = y
    else ranges.push([y, y])
  }
  return ranges.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(', ')
}

// Ethiopian years up to 1892 include dates before March 1, 1900, when the
// Julian-Gregorian gap grew from 12 to 13 days. Differences there usually mean
// a library assumes the modern 13-day gap; the engine's tests cover that edge.
const BEFORE_1900 = 1892

let kenatDisagrees = false
for (const check of Object.values(checks)) {
  const status = check.mismatches.length === 0 && check.errors.length === 0 ? 'AGREE' : 'DIFFER'
  console.log(`${status.padEnd(6)}  ${check.name}: ${check.compared} compared, ${check.mismatches.length} differ, ${check.errors.length} errors`)

  // Group differences by what was compared, so patterns are visible at a glance.
  const groups = new Map()
  for (const m of check.mismatches) {
    if (!groups.has(m.kind)) groups.set(m.kind, [])
    groups.get(m.kind).push(m)
  }
  for (const [kind, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const modern = list.filter((m) => m.year > BEFORE_1900)
    const example = modern[0] ?? list[0]
    console.log(
      `          ${kind}: ${list.length} years (${yearRanges(list.map((m) => m.year))})` +
        (modern.length < list.length ? `, ${list.length - modern.length} of them before 1900` : '') +
        `; e.g. ${example.year}: engine ${example.ours}, library ${example.theirs}`,
    )
  }
  for (const e of check.errors.slice(0, 5)) console.log(`          error: ${e}`)

  if (check !== checks.abushakir && check.mismatches.some((m) => m.year > BEFORE_1900)) kenatDisagrees = true
}

console.log(
  `\nKenat ${kenatDisagrees ? 'DISAGREES with the engine after 1900 (see above)' : 'agrees with the engine on every check after 1900'}.`,
)
process.exitCode = kenatDisagrees ? 1 : 0
