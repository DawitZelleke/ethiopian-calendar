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

A difference isn't automatically a bug in the engine. Check which side matches a published church calendar, then record the outcome below.

## Results

_Not run yet._
