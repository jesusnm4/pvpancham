# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pokémon GO Battle League players, casual to mid level. They know their Pokémon and the leagues,
but not PvPoke's jargon. They are mostly on a phone, often opening a link someone shared in
Discord or a group chat, and they pick a team just before or between GBL sets.

## Product Purpose

PvP Team Helper turns one or two Pokémon the player has (or likes) into a complete three-Pokémon
team for the league or cup that's on right now: partners, moves, IVs, a role for each member, and
how the team fares against the meta. Success is a player who leaves with a team they understand
and can use in the next set, without needing to be an expert or read a ranking table.

## Positioning

- **Start from what you have:** pick one or two Pokémon, get the partners (or the best third);
  or pick all three to check a team you already have in mind.
- **Follows the live GBL schedule:** shows only the leagues and cups on now or starting within a
  week, Mega formats included, read from the game's own data.
- **Plain answers, fast:** a team, its moves and IVs, and why, in plain words.
- **Simple to use:** no expertise needed, and each team should come with short, concise advice on
  how to pilot it (not built yet; see below).
- **Shareable exact view:** one link reproduces the league, style, picks, team and settings.

## Operating Context

- Arrives from shared links (`#l=&s=&p=&t=&e=`) as often as from a fresh visit.
- Used in short sessions on a phone between battles, one thumb, sometimes outdoors.
- GBL weeks change the available cups; Megas appear in some formats.
- Players check their own Pokémon's IVs against rank-1 spreads before investing dust.

## Capabilities and Constraints

- Static site on GitHub Pages; no build step, no dependencies, plain IIFE scripts, works over
  `file://`, never fetches third-party URLs at runtime.
- Data is a PvPoke snapshot plus the GBL schedule from the Pokémon GO game master, refreshed daily.
- Terms used on the page: league, cup, team style (ABC, Shared type ABB/ABA, Best score), roles
  (lead, safe swap, closer), Elite moves, Mega move, IVs, team score out of 100, "answers to the
  top 100".
- Open decision: how the per-team piloting advice is written and shown (generated from roles,
  moves and matchups; never invented claims).

## Brand Commitments

- Name: PvP Team Helper. Unofficial fan project: no Niantic or The Pokémon Company branding beyond
  credited Pokémon GO icons; PvPoke credited as the data source (MIT).
- Voice: plain, honest, concise. A "weakness" can still be a win, so wording stays accurate.

## Evidence on Hand

- Real data only: PvPoke rankings and matchups, game master stats and moves, Pokémon GO icons in
  `img/pokemon/`.
- No users, testimonials, usage numbers or press exist; never fabricate them.

## Product Principles

1. Answer first: the team and why it works matter more than settings.
2. Assume no expertise: explain a term in a few words where it appears, and keep it short.
3. Only what's on now: the schedule decides what's shown.
4. Honest numbers: every figure comes from the data and says what it measures.
5. Phone first: one-thumb use on a small screen is the main case.

## Accessibility & Inclusion

Readable outdoors on a phone (strong contrast, 16px body text), full keyboard and screen-reader
use for the search combobox and pickers, and reduced motion respected.
