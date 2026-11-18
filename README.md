# Ethiopian Calendar Engine

![CI](https://github.com/DawitZelleke/ethiopian-calendar/actions/workflows/ci.yml/badge.svg)

A C# / .NET 10 library and REST API that converts between the Ethiopian and Gregorian calendars and computes the feasts and fasts of the Ethiopian Orthodox Tewahedo Church using **Bahire Hasab**, the church's traditional calculation.

I built it because the fasting calendar shapes my year, and most apps either skip the Ethiopian calendar or hard-code a few years of dates. This computes any year from the rules themselves.

## What it does

- Converts any date between the Ethiopian and Gregorian calendars, including Pagume and its leap day
- Computes Bahire Hasab step by step (Amete Alem → Wenber → Metqi → Tewsak → Nineveh) and exposes every intermediate value, so the result can be explained rather than just shown
- Derives all moveable observances from Nineveh: Abiy Tsom, Hosanna, Siklet, Fasika, Erget, Paraclete, Tsome Hawaryat and more
- Answers "is this a fast day, and why?" for any date: named fasts, the weekly Wednesday and Friday fasts, and their exceptions

## API

| Endpoint | Returns |
|---|---|
| `GET /api/days/{yyyy-MM-dd}` | The Ethiopian date, whether it's a fast day and which fast, and any feasts |
| `GET /api/years/{year}` | Every feast and fast period in an Ethiopian year |
| `GET /api/years/{year}/bahire-hasab` | The Bahire Hasab working for a year, step by step |
| `GET /api/convert/to-ethiopian/{yyyy-MM-dd}` | Gregorian → Ethiopian |
| `GET /api/convert/to-gregorian/{year}/{month}/{day}` | Ethiopian → Gregorian |

Invalid input (for example Pagume 6 in a non-leap year) returns `400 Bad Request` with a readable problem-details message, never a server error.

## How I know it's correct

- **Round trip:** every day from 1900 to 2100 (about 73,000 dates) converts to Ethiopian and back unchanged.
- **Two independent algorithms:** Fasika from Bahire Hasab matches the Julian Easter computus (Meeus) for every year from 1900 to 2099.
- **Published dates:** Fasika matches published dates from 2015 to 2030.
- **The Metqi = 0 edge case:** once every 19 years the Metqi value is 0 and must be read as 30. Without that rule Fasika comes out about a month late (for example in 1995). It has its own test.
- **Calendar drift:** Genna is January 7 only from 1901 to 2100, because the Julian and Gregorian calendars drift apart at century years. The tests cover both edges.
- **Fasting rules confirmed against practice:** no fasting on Wednesdays and Fridays in the 50 days after Fasika, and none when Genna or Timkat falls on those days.
- **API integration tests** call the real endpoints over HTTP, including invalid input.

## Run it

```bash
dotnet test
dotnet run --project EthiopianCalendar.Api
```

Requires the .NET 10 SDK.

## Design

- `EthiopianDate` is an immutable value type that validates in its constructor, so an invalid date can't exist.
- All conversion goes through the Julian Day Number, which turns date arithmetic across months and years into integer addition.
- Moveable observances are a data table of offsets from Nineveh, not separate functions. Adding one is a one-line change.
- The API is a thin layer over the core library. Validation lives once, in the core, and the API translates it into HTTP responses.

## Roadmap

- [x] Ethiopian ↔ Gregorian conversion
- [x] Bahire Hasab and moveable observances
- [x] Fixed feasts and fasts, with weekly fast exceptions
- [x] REST API
- [ ] iCal subscription feed
- [ ] Web UI in English and Amharic
- [ ] Deployed publicly
