# Ethiopian Calendar Engine

![CI](https://github.com/DawitZelleke/ethiopian-calendar/actions/workflows/ci.yml/badge.svg)

A C# / .NET 10 library that converts between the Ethiopian and Gregorian calendars and computes the moveable feasts and fasts of the Ethiopian Orthodox Tewahedo Church using **Bahire Hasab**, the church's traditional calculation.

I built it because the fasting calendar shapes my year, and most apps either skip the Ethiopian calendar or hard-code a few years of dates. This computes any year from the rules themselves.

## What it does

- Converts any date between the Ethiopian and Gregorian calendars, including Pagume and its leap day
- Computes Bahire Hasab step by step (Amete Alem → Wenber → Metqi → Tewsak → Nineveh) and exposes every intermediate value, so the result can be explained rather than just shown
- Derives all moveable observances from Nineveh: Abiy Tsom, Hosanna, Siklet, Fasika, Erget, Paraclete, Tsome Hawaryat and more

## How I know it's correct

- **Round trip:** every day from 1900 to 2100 (about 73,000 dates) converts to Ethiopian and back unchanged.
- **Two independent algorithms:** Fasika from Bahire Hasab matches the Julian Easter computus (Meeus) for every year from 1900 to 2099.
- **Published dates:** Fasika matches published dates from 2015 to 2030.
- **The Metqi = 0 edge case:** once every 19 years the Metqi value is 0 and must be read as 30. Without that rule Fasika comes out about a month late (for example in 1995). It has its own test.

## Run it

```bash
dotnet test
```

Requires the .NET 10 SDK.

## Design

- `EthiopianDate` is an immutable value type that validates in its constructor, so an invalid date can't exist.
- All conversion goes through the Julian Day Number, which turns date arithmetic across months and years into integer addition.
- Moveable observances are a data table of offsets from Nineveh, not separate functions. Adding one is a one-line change.

## Roadmap

- [x] Ethiopian ↔ Gregorian conversion
- [x] Bahire Hasab and moveable observances
- [ ] Fixed feasts and fasts (Genna, Timkat, Tsome Nebiyat, Filseta, weekly Wednesday and Friday fasts)
- [ ] REST API
- [ ] iCal subscription feed
- [ ] Web UI in English and Amharic
