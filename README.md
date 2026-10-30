# PvPancham

A Pokémon GO PvP team builder (formerly PvP Team Helper), live at
https://jesusnm4.github.io/pvpancham/.

Pick a league and one Pokémon, and it suggests two partners to complete the team. Pick two, and it
suggests the third that fills the gap best. Each team member comes with recommended moves, IVs, and
a role (lead, safe swap, closer), and the team gets its top 3 strengths and weaknesses against the
current meta.

## Status

Live at **https://jesusnm4.github.io/pvpancham/**. Pick a league, a team style and one or
two Pokémon to get suggested teams, share them as a link, and check your own Pokémon's IVs. See
[PLAN.md](PLAN.md) for the design and milestones.

| Milestone | State |
| --- | --- |
| 1. Scaffold | ✅ done |
| 2. Data pipeline (PvPoke snapshot) | ✅ done |
| 3. Core engine | ✅ done |
| 4. UI | ✅ done |
| 5. Polish (share links, IV checker, mobile) | ✅ done |
| 6. Pokémon images | ✅ done |
| 7. Fantasy Cup | ✅ done (cup ended Oct 27, 2026) |
| 8. Top teams banner | ✅ done |
| 9. GO Battle League schedule | ✅ done |
| 10. Megas | ✅ done |
| 11. Use Elite moves option | ✅ done |
| 12. Design, phone first | ✅ done |
| 13. Piloting advice | ✅ done |

## Features

- Great (1500), Ultra (2500) and Master League, plus the cups in the current **GO Battle League
  schedule**, read from the game's own data: a cup appears a week before it starts, is tagged
  **Live** while it runs and disappears when it ends. A note lists what's on in GBL this week
- **Mega formats** (e.g. Great League (Megas), Mega Halloween Cup): Megas and Primals with their
  Mega stats, at most one per team (you can only have one Mega-Evolved Pokémon at a time), and
  the "+" Mega move some of them get as a third charged move, marked **Mega**
- Team styles: ABC (balanced, no shared types), Shared type (two members share a type, as ABB or
  ABA), or Best score (no typing rule); each suggested team is tagged with its layout
- Formats grouped as **Live** this week, **Always** (the open leagues) and **Coming up**; on a
  phone they sit in one row you swipe sideways
- **Top teams**: the three highest-scoring teams overall (any typing) built from the top 50
  Pokémon of the selected league or cup, shown under the form before you pick anything (and
  below your results after); pick one to open it
- Pokémon search by name or nickname (shadow forms included), plus one-tap popular picks
- Pick one Pokémon to get two partners, or two to get the best third, or all three (the third field
  appears once two are picked) to check a team you already have in mind ("Your team": its score, moves, IVs and matchups, no alternatives); the top 5 teams are listed
  with a team score out of 100, and the selected team leads with its score and how many of the
  top 100 it has a winning answer to
- Per Pokémon: role (lead, safe swap, closer), its PvPoke rank and score in the league (linked to
  PvPoke), recommended fast and charged moves (Elite TM moves marked), rank-1 IVs with level and CP
- Per team: how many of the league's top 100 it has a winning answer to; **Against the top 30**,
  a grid of the league's top 30 Pokémon tinted win / toss-up / loss by the team's best matchup
  (tap one to see which member answers it); its 3 closest matchups; and each attack type that
  hits two or more members super-effectively, with which ones
- The page takes the league's colour: blue for Great, gold for Ultra, purple for Master
- Each team member says what its role means (lead starts the battle, safe swap comes in when
  the lead is losing, closer finishes)
- **How to play it** (collapsible, remembered): short advice for each team: who to lead with, which opposing leads to
  switch away from, what the closer is kept for, fast moves to the first charged move, and types
  to watch out for, all from simulated battles against the top 30
- **Compare with** another suggested team: score, winning answers to the top 100, the top-30
  wins / toss-ups / losses, and the top-30 Pokémon one team handles better than the other (kept
  in the link)
- On a phone each team member is one line (icon, name, role, moves); tap it for the full card
- **Save team** keeps teams you like on this device under "Your saved teams"; tap one to reopen it
- Dead ends come with a one-tap fix: two Megas picked offers to remove either, picks dropped by a
  league change offer to go back, a team style with no team offers the other styles, and a failed
  data load offers to reload
- **Check your IVs** on any team member: your spread's rank among all IV combinations, its stat
  product as a % of rank 1, and the level and CP it reaches under the cap
- **Use Elite moves** (on by default): turn it off and your team uses each Pokémon's next best moves
  on PvPoke instead of moves that need an Elite TM or a Community Day (the card notes what was
  replaced); opponents keep their usual moves
- **Copy link** shares the exact view (league, style, picks, selected team, Elite TM setting,
  comparison), e.g.
  `…/pvpancham/#l=great&s=abc&p=medicham&t=2`
- Pokémon GO icons for every ranked Pokémon (correct regional and other forms; shadows glow purple)
- Remembers your league, style, picks and entered IVs; light and dark theme; works on phones

## Running locally

No build step and no dependencies. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## How it works

Teams are scored with a simplified battle simulator: every Pokémon at its rank-1 IVs with PvPoke's
recommended moveset, battling each of the top 100 Pokémon in the league with 0, 1 and 2 shields.
It agrees with PvPoke's own results on the winner about 84% of the time in Great and Ultra League,
91% in Master League, and 81–92% in the cups and Mega formats (`node scripts/check-agreement.js`).
Suggestions favour teams
whose members cover each other's losses and don't share weaknesses. Details in [PLAN.md](PLAN.md).

## Tests

Open `tests.html` in a browser, or run them headless with Node (no dependencies):

```sh
node scripts/run-tests.js            # add --verbose to list every check
```

The **Tests** GitHub Action runs them on every push, and the daily data refresh runs them before
committing new data.

## Data

`data/` holds a trimmed snapshot of PvPoke's game master and overall rankings for Great, Ultra and
Master League and every scheduled cup, plus `formats.js`: the GO Battle League schedule.

The schedule comes from Pokémon GO's own game master, as mined from the game and published on
GitHub by [alexelgt/game_masters](https://github.com/alexelgt/game_masters) and
[PokeMiners/game_masters](https://github.com/PokeMiners/game_masters); whichever schedule reaches
furthest ahead wins. Each GBL league is matched to its PvPoke rankings by hand in `GBL_LEAGUES` in
`scripts/update_data.py`, since names, CP caps and rules don't line up reliably between the two.
If PvPoke stops publishing a cup's rankings, the refresh keeps the last snapshot instead of failing,
and rankings of cups that are over are removed.

The **Update PvPoke data** GitHub Action refreshes everything daily (PvPoke often publishes a cup's
rankings the day before it starts), plus Tuesdays at 18:17 UTC, before the GBL week changes at
20:00 UTC. It runs the tests and commits only when something changed. Anything that needs a person
(a scheduled league missing from `GBL_LEAGUES`, a schedule running out, missing rankings or icons)
opens a **Data refresh needs attention** issue, so GitHub emails you; it is updated only when the
warnings change and closes itself after a clean run. A failed run gets GitHub's usual failure
email. The page footer shows the game data date and how far ahead the schedule is known. To run it now: **Actions → Update PvPoke data → Run workflow**. To refresh
locally (Python 3, no dependencies):

```sh
python3 scripts/update_data.py
```

The files are `.js` rather than `.json` so the page still works when opened straight from disk.

Pokémon icons live in `img/pokemon/` (128 px WebP, ~4 MB for ~830 icons), copied from the game's
assets as mined by [PokeMiners](https://github.com/PokeMiners/pogo_assets). The same daily Action
fetches icons for newly ranked Pokémon and re-fetches only icons that changed upstream. To run it
locally (needs git and Pillow):

```sh
pip install pillow
python3 scripts/update_images.py
```

Forms are matched by name (Marowak (Alolan) → `pm105.fALOLA`); the few that don't follow the
pattern are listed in `OVERRIDES` in the script. A Pokémon with no match shows without an image,
never with a wrong one.

## Deploying

GitHub Pages: **Settings → Pages → Build and deployment → Deploy from a branch**, branch `main`,
folder `/ (root)`.

## Credits

Pokémon images are Pokémon GO assets, © Niantic and The Pokémon Company, obtained via
[PokeMiners/pogo_assets](https://github.com/PokeMiners/pogo_assets); used here for a
non-commercial fan tool and removable on request.

The GO Battle League schedule is read from Pokémon GO's game master (© Niantic), as published by
[alexelgt/game_masters](https://github.com/alexelgt/game_masters) and
[PokeMiners/game_masters](https://github.com/PokeMiners/game_masters).

Pokémon data and rankings come from [PvPoke](https://pvpoke.com)
([source](https://github.com/pvpoke/pvpoke), MIT License, © 2019 pvpoke). Pokémon and Pokémon GO
are trademarks of Nintendo, Creatures Inc., GAME FREAK and Niantic. This is an unofficial fan
project.
