# Reference check

Compares the engine with two independent Ethiopian calendar libraries, [Kenat](https://github.com/MelakuDemeke/kenat) and [AbushakirJs](https://github.com/Nabute/AbushakirJs), for every Ethiopian year from 1890 to 2090:

1. Bahire Hasab values (Wenber, Abekte, Metqi, Mebaja Hamer) and Nineveh
2. Every movable feast and fast
3. Start and end dates of each fasting period
4. Ethiopian → Gregorian conversion of every date the engine returns

It runs on demand, not in CI, so CI never downloads and runs these packages.

## Run it

```bash
# Terminal 1: the API
dotnet run --project EthiopianCalendar.Api --urls http://localhost:5199

# Terminal 2: the comparison
cd tools/reference-check
npm install
node compare.mjs
```

Or against the live site, for a shorter range: `node compare.mjs https://ethiopian-calendar.onrender.com 2010 2030`

**Note:** AbushakirJs 1.5.2 loads `@js-temporal/polyfill` at runtime but only declares it as a devDependency, so a plain install of the library crashes with "Cannot find module '@js-temporal/polyfill'". This tool's `package.json` installs it explicitly.

A difference isn't automatically a bug in the engine. Check which side matches a published church calendar, then record the outcome below.

## Results

Run on Ethiopian years 1890–2090 (November 2026), Kenat 4.0.0 and AbushakirJs 1.5.2.

### Kenat: agrees on everything after 1900, except three fast boundaries

After 1900, Kenat matches the engine on **every** Bahire Hasab value (1005 checks), **every** movable feast (2211) and **every** Ethiopian→Gregorian conversion (3618). The remaining differences:

| Difference | Years | Verdict |
|---|---|---|
| Everything in Ethiopian years 1890–1891 (Gregorian 1897–1899) | 2 | **Engine correct.** Before March 1, 1900 the Julian–Gregorian gap was 12 days, not 13. Kenat assumes 13, so its dates are a day late: it puts Genna 1898 on January 7 (it was January 6) and Nineveh 1890 on a Sunday (Nineveh is always a Monday). |
| Tsome Nebiyat ends Tahsas 27 (engine) vs Tahsas 28 (Kenat) | every 4th year (1892, 1896 … 2088) | **Engine correct.** In the year after a leap year, Genna moves to Tahsas 28, so the fast ends on Tahsas 27. Kenat ends the fast on Genna itself. |
| Abiy Tsom ends Saturday (engine) vs Friday (Kenat) | every year | **Convention.** The engine ends the fast on the Saturday before Fasika, giving the traditional 55 days; Kenat stops at Siklet (54 days). Pending confirmation. |
| Tsome Filseta ends Nehase 15 (engine) vs Nehase 14 (Kenat) | every year | **Convention.** The feast is Nehase 16; the question is whether the 15th is fasted. Pending confirmation. |

### AbushakirJs: three bugs

| Bug | Evidence |
|---|---|
| **Day-30 rollover:** a feast on the 30th of a month is reported on the 30th of the *next* month | `getSingleBealOrTsom` both sets the day to 30 and advances the month. E.g. Paraclete 1895: Ginbot 30, reported as Sene 30. |
| **Wenber when Amete Alem is divisible by 19:** `Math.max(0, (ameteAlem % 19) - 1)` returns 0 instead of 18, so every movable feast is wrong that year | Every 19 years: 1910, 1929, 1948, 1967, 1986, 2005, **2024**, 2043 … E.g. Fasika 1910: engine Miyazya 27, AbushakirJs Miyazya 13. |
| **Missing runtime dependency:** requires `@js-temporal/polyfill` but declares it only as a devDependency | A fresh `npm install abushakir` crashes with `MODULE_NOT_FOUND`. |

The engine's dates for all these years also match the Julian Easter computus, an algorithm independent of all three implementations.
