---
name: PvPancham
description: Pokémon GO PvP team builder for the leagues and cups on this week.
colors:
  orange: "#f66c40"
  on-orange: "#151618"
  ember: "#b83d12"
  ember-dark: "#f66c40"
  paper: "#f0f0f3"
  paper-dark: "#111214"
  dot: "rgb(21 22 24 / 0.13)"
  dot-dark: "rgb(255 255 255 / 0.07)"
  sheet: "#f8f8fb"
  sheet-dark: "#1b1d22"
  field: "#f0f0f3"
  field-dark: "#111214"
  ink: "#151618"
  ink-dark: "#f2f2f5"
  pencil: "#676a70"
  pencil-dark: "#a3a5ad"
  rule: "#d4d5db"
  rule-dark: "#383b43"
  band: "#1b1d22"
  band-dark: "#23262c"
  band-raised: "#26292f"
  band-raised-dark: "#2c2f36"
  band-field: "#17181b"
  band-rule: "#3a3d45"
  win: "#187a42"
  win-dark: "#5cc98d"
  even: "#8a6400"
  even-dark: "#e2b53e"
  loss: "#b3123f"
  loss-dark: "#f7728f"
  live: "#187a42"
  live-dark: "#5cc98d"
  error: "#b3123f"
  error-dark: "#f7728f"
  league-great: "#2a62c9"
  league-great-dark: "#6b9cf0"
  league-ultra: "#8a6400"
  league-ultra-dark: "#e2b53e"
  league-master: "#6a3fc4"
  league-master-dark: "#b195f2"
  league-cup: "#4a5361"
  league-cup-dark: "#b4bcc6"
  shadow-glow: "#8a3fd1"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2.25rem, 4vw + 1rem, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.005em"
  score:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.2
  label:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  voice:
    fontFamily: "Platypi, Georgia, serif"
    fontWeight: 500
  role:
    fontFamily: "Platypi, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 500
    lineHeight: 1.2
  figures:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  swatch: "4px"
  inner: "8px"
  sheet: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  section: "32px"
components:
  panel:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  chip-league:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  chip-league-selected:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.on-orange}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  chip-quick:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "4px 14px"
    height: "32px"
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.on-orange}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.on-orange}"
    textColor: "{colors.orange}"
  input-search:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 44px 10px 18px"
    height: "48px"
  select-pill:
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    padding: "8px 34px 8px 16px"
    height: "40px"
  team-row:
    textColor: "{colors.ink}"
    padding: "12px 8px"
  team-rank-selected:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.on-orange}"
    size: "30px"
  team-block:
    backgroundColor: "{colors.band}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.sheet}"
    padding: "24px"
  member-card:
    backgroundColor: "{colors.band-raised}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.inner}"
    padding: "16px"
  tag-mega:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.on-orange}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 7px"
---

# Design System: PvPancham

<!-- Recorded from the code (styles.css, index.html, js/app.js, fonts/) after the redesign,
     milestone 14 in PLAN.md. The build is the source of truth: keep this file in step with
     styles.css whenever it changes. -->

## Overview

**Creative North Star: "The Trainer's Studio Sheet"**

A confident working sheet rather than a quiet dashboard. The page is pale dotted paper with
charcoal colour blocks laid on it: a charcoal header band, the selected team as a charcoal block,
and a charcoal footer. One loud orange marks every place to act and everything that is chosen, so
a player on a phone sees at a glance where to tap and what is selected. A serif italic gives the
tool a voice in exactly one word per heading and in the role words, while a plain sans does all
the working text.

Density stays high and calm: hairline rows instead of boxes, flat sheets with no resting
shadows, numbered rows in grey, and pills for every control. The Pokémon icons and
the game's own type colours are the only pictures. Pancham's icon sits in an orange disc in the
header as the one decorative use of orange.

**Key Characteristics:**
- Dotted pale paper, flat light sheets, charcoal bands that stay light-on-dark in both themes.
- One action colour: orange fill with ink text; Ember where orange must be text or a line.
- Be Vietnam Pro for everything; Platypi italic for one voice word per heading and the role words.
- Every control is a full pill; lists are numbered hairline rows.
- Flat at rest: the floating dropdown is the only thing that casts a shadow.

## Colors

Cool near-white paper and charcoal blocks, one orange for action, and meaning colours (bands,
league stamps, game types) kept small and never confused with the orange.

### Primary
- **Pancham Orange** (`orange`): fills only. Selected league and style chips, the selected team
  row's rank disc and its faint wash (8%, 12% on hover), the primary "Copy link" pill, the Mega move tag, the combobox active row (16%), `::selection` (32%),
  `accent-color` for native controls, the dark-mode top inset on the team block, and the Pancham
  disc. Text on an orange fill is always **On-orange Ink** (`on-orange`).
- **Ember** (`ember`, `ember-dark`): orange as text or as a line. On light grounds it is the deep
  ember that clears 4.5:1; in dark mode and inside every charcoal band it is plain orange. Links,
  focus rings, disclosure summaries and chevrons, the caret, the role words, and the Elite tag outline.

### Secondary: meaning colours
- **Win Green / Toss-up Gold / Loss Crimson** (`win`, `even`, `loss` and their dark values): the
  meta grid bands and tally swatches, on the verdict thresholds (win above 550, toss-up 450–550,
  loss below 450). Cells are a 16% tint over the sheet with a 50% border; toss-ups dashed; losses
  a 24% tint and a 2px border, so bands differ in more than hue.
- **Live Green** (`live`): the "Live until …" group label only.
- **Error Crimson** (`error`): load and data errors only; the same value as Loss.

### Tertiary: league stamps
- **Great Blue, Ultra Gold, Master Purple, Cup Slate** (`league-*`): a dot on each league chip
  and a dot before the team's league name in the team block (`data-league` on `<html>`, set by
  `applyAccent` from `leagueFamily`: open leagues and open Mega formats by CP cap, cups with their
  own rules slate). On a selected chip the dot stays, ringed in ink.

### Neutral
- **Dotted Paper** (`paper`, with `dot`): the page ground, a 1px radial dot every 24px.
- **Sheet** (`sheet`): panels and the dropdown.
- **Field** (`field`): search fields and IV inputs, sunk to paper tone inside the sheet.
- **Ink** (`ink`): text and names. **Pencil** (`pencil`): hints, row numbers, labels, slot
  counters. **Rule** (`rule`): every hairline and outline.
- **Charcoal Band** (`band`, `band-raised`, `band-field`, `band-rule`): header, team block and
  footer, with member cards one step raised.

### Game type colours (a deliberate exception)
The 18 type colours are the game's own (`.type[data-type]`, e.g. fire #e62829, water #2980ef)
and carry meaning, so they stay as the game has them: a 22% tint with a 60% border on type chips
(text in ink) and a solid 10px dot before each move. Dark and ghost are lightened in dark mode
and in bands. Fighting (#e0712c) sits close to Pancham Orange; it is allowed because it only ever
appears as a tint or a dot, never as a fill behind an action. Shadow Pokémon icons get a purple
glow (`shadow-glow`).

### Named Rules
**The Act Here Rule.** Orange means "act here / this is chosen". As a fill its text is ink; as
text or a line on a light ground it is Ember; on dark it is plain orange. Nothing decorative is
orange except the Pancham disc.

**The Stamp Not Pen Rule.** League colours are stamps: a dot on chips and on the team's league.
They never mark selection, focus or links.

**The Crimson Loss Rule.** Loss and error are crimson so a bad result never reads as the brand
orange.

**The Band Rule.** A charcoal band redefines the tokens locally (sheet, field, ink, pencil, rule,
ember, bands, stamps) so everything inside is light-on-dark in both themes. Put a component in a
band and it adapts; never hard-code light-on-dark colours inside one.

## Typography

**Body Font:** Be Vietnam Pro 400 / 500 / 600 (with system-ui, -apple-system, Segoe UI, Roboto)
**Voice Font:** Platypi Italic 400–500 (with Georgia, serif)
**Figures Font:** the system face, tabular (`--figures`)

**Character:** a round, open working sans with a lively serif italic for the voice: the sans
does the job, the italic says one word with feeling.

Both faces are self-hosted woff2 in `fonts/` (Latin subsets) with their OFL texts beside them,
`font-display: swap`. Characters outside the subsets (e.g. ♀ ♂) fall back to the system face.

### Hierarchy
Five steps as custom properties, `--fs-xs` 12, `--fs-sm` 14, `--fs-md` 16, `--fs-lg` 24,
`--fs-xl` 40px, plus `--fs-display` for the header name only. `<small>` is pinned to 14px.
- **Display** (600, clamp 36–64px, 1, 0.005em): the header name "Pv*Pancham*", one line.
- **Score** (600, 40px, 1, −0.01em): the selected team's score, once per screen, with "of 100".
- **Headline** (600, 24px, 1.2): section headings, the team block's names, the meta grid and
  How to play it headings.
- **Title** (600, 16px, 1.3): member names, report headings, legends.
- **Body** (400, 16px, 1.5): running text and inputs; on phones also member details, threat
  lists and the IV checker.
- **Small** (500, 14px, 1.2 in controls; 400 in hints): chips, selects, hints, footer.
- **Label** (600, 12px, 0.06em, uppercase): league group labels and the quick-picks label;
  layout tags and the coming-up date badge use the same size with 0.03–0.04em.
- **Role** (Platypi italic 500, 20px, 1.2, Ember): the member's role word; 16px on the phone
  one-line card.

Headings use `text-wrap: balance`; hints and notes `text-wrap: pretty`.

### Named Rules
**The One Italic Word Rule.** A heading carries at most one Platypi italic word ("Top *teams*",
"Against the top *30*", "How to *play* it", "Pv*Pancham*"). Role words
("*Lead*", "*Safe swap*", "*Closer*") are set the same way. Names, numbers, moves and data are
never in the serif.

**The Aligned Figures Rule.** Be Vietnam Pro has no tabular figures, so anything that must line
up in a column (Rank 1 IVs, the IV inputs) uses the system face with
`tabular-nums`. Single figures (the score, row scores, grid ranks) stay in the sans.

**The Fixed Scale Rule.** Only the five steps and the display size ship. The documented
exceptions: team names drop to 20px at ≤520px, the header name clamps to 28–36px at ≤520px and
22–28px at ≤380px, and the role word is 20px.

## Layout

One centred column, max 960px with 16px side padding, inside full-width charcoal header and
footer bands. Sections are stacked sheets 16px apart: the form (league or cup, your Pokémon, then
a ruled-off options row), the results and top teams. With no
picks the results sheet is hidden and top teams sit right under the form. Inside the results:
the team list, the charcoal team block with three member cards in a row, then the meta
grid, How to play it and a two-column report, each set off by a hairline.

- **≤720px:** meta grid 10 across, report one column, member cards stack and collapse to one
  line each, team block padding 20px 16px.
- **≤520px:** header compacts (48px disc, theme label visually hidden). Once anything is picked
  the form folds to one summary line (league, picks, style) with an Edit pill, so the team comes
  first; see Form summary. League groups wrap under their labels, live first, so this week's cups
  are never off-screen; popular picks stay one sideways row that bleeds to the sheet edge so the
  cut-off chip shows there is more. Hints, notices, the meta note and role notes read at 16px.
  Pickers stack, style chips share the width, team rows put the names on their own line
  under rank, icons, layout and score. Meta grid 6 across. Member details, threats and the IV
  checker go up to body size. The team block head becomes a grid with the score beside the names.
- **≤380px:** the tagline wraps under the name, the disc is 40px, and the score sits on its own
  line above the names.

Spacing rhythm is 4 / 8 / 12 / 16 / 20 / 24px, with 32px between the main column and the footer.

## Elevation & Depth

Flat. Depth comes from colour blocks: dotted paper, a lighter sheet, a charcoal band, and a
raised member card one step lighter than its band. Rows are separated by 1px hairlines, not
boxes.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 32px rgb(17 17 26 / 0.1), 0 4px 16px rgb(17 17 26 / 0.08)`;
  dark `0 8px 32px rgb(0 0 0 / 0.4), 0 4px 16px rgb(0 0 0 / 0.3)`): the search dropdown only.
- **Dark-mode team inset** (`box-shadow: inset 0 3px 0 #f66c40`): a 3px orange top rule on the
  team block in dark mode only, where the charcoal block otherwise sits almost level with the
  dark page. A cited adaptation, kept after the finish review; it is a rule, not a shadow.

### Named Rules
**The Only Float Rule.** Resting surfaces never cast shadows; only the floating dropdown does.

## Shapes

Every control is a full pill (999px): league and style chips, quick picks, recovery fixes,
buttons, search fields, selects, type chips, move tags, layout tags and the
date badge. Sheets, the team block and the dropdown have 12px corners; member cards,
meta cells, IV inputs and dropdown rows 8px; tally swatches 4px. Rank discs, league dots, the
Pancham disc and the clear button are circles. Disclosure and chevron arrows are a 2px Ember
corner rotated 45°.

## Components

### Site header
A charcoal band. Pancham's icon (60px, decorative) in a 72px orange disc, then "Pv*Pancham*" at
display size and the tagline in pencil 14px; the theme select pill on the right. On phones the
disc shrinks (48px, 40px at ≤380px) and the name stays on one line beside the theme pill.

### Form summary (phones)
At ≤520px, with one or more picks, the form sheet shows one line: the league in ink 600, then the
picks and team style in pencil, separated by " · ", then an outline "+ Add Pokémon" pill (while
fewer than three are picked; it opens the form on the next empty field and focuses it) and an
outline "Edit" pill. The line wraps the pills under the text when they don't fit.
Edit opens the full form under the line (a hairline between them) and becomes "Done". A pick
folds the form again unless the viewer opened it with Edit; opening a top team or a shared link
folds it too. Focus moves to the pill when the control holding it folds away. Hidden above 520px.

### League groups and chips
Labelled groups side by side (Live until …, Always / Leagues, Coming up), the label in pencil
caps ("Live" in Live Green). Each chip is an outline pill (1px Rule, 40px tall) with a league
stamp dot, the format's short name and its CP or type list in weight 400 (full colour, so it
keeps its contrast on the orange fill). Selected: an
orange fill with ink text, the dot kept with an ink ring. A coming-up chip carries its start date
as an outlined uppercase badge. Radios are hidden inside the label; focus is a 2px Ember ring.
While the selected format is live, only the Live group shows, followed by an outline "Show all
leagues" pill (it becomes "Show only live"); a selected format outside the live group always shows
every group, and the pill is hidden. Under the row, a hint names the selected format's rules ("**Great League (Megas):** 1,500 CP cap.
Mega Pokémon are allowed."), so look-alike formats are told apart. A first visit opens on the
format live in GO Battle League this week, if one is offered. When a league change drops picks, a notice under the row names them ("**Groudon** and **Dialga**
aren't ranked in Great League, so they were removed.") with a "Back to …" outline pill beside it.

### Quick picks
A "Popular picks" label in pencil caps on its own line, then a row of 32px outline pills (40px on
phones); hover turns the border to ink. On phones the row scrolls sideways, bleeding to the sheet
edge with its right edge faded out, so the cut-off chip reads as "more".

### Search combobox
A 48px pill field on Field tone with a hairline border and a round clear button; focus is a 2px
Ember ring with a 2px offset, the caret is Ember. The dropdown is a 12px sheet with the Float
shadow and a thin scrollbar; rows (8px corners) show the icon, name, type chips and rank, and the
active or hovered row takes a 16% orange wash. Up to three fields side by side, stacked on
phones; the third appears once two are picked.

### Options row and "What do these mean?"
Above a hairline: the Team style segmented pills (selected orange), the "Use Elite moves"
checkbox (orange accent), and a disclosure whose summary is an underlined Ember link. Open, it is
a definition list (terms in ink 600, definitions in pencil). With three picks the style fieldset
dims to 50% with a pencil note saying why.

### Team rows
Suggestions and top teams share one pattern: a list of full-width hairline rows,
each a button with a 30px rank disc ("1", pencil), overlapping 36px icons, names (500), the
layout tag (outline pill, 12px) and the score (600). Selected: an orange rank disc with ink text
and an 8% orange wash, no border. Hover: a 4% ink wash (12% orange when selected). In suggestion
rows the viewer's own picks are pencil 400, so the new partners stand out in ink.
In results the five suggestions stay in view above the selected team block at every width: with
one or two picks they are the choice the viewer is making (a folded "other teams" disclosure was
tried and dropped for hiding it). The results head pairs the heading with the orange "Copy link" pill.

### Team block
The signature: a charcoal band with 12px corners. Head: the score (40px) with "of 100" under it;
the names (24px; 20px on phones); "Has a winning answer to **N of the top 100** Pokémon in
●League", the league name led by its stamp dot; the layout note as a hint. The block has no actions of its own (sharing is the
"Copy link" pill above it). In dark mode it carries the 3px orange top inset.

### Member cards
Three raised cards (band-raised, 8px, 16px padding) under the head. Each: the play-order counter
"01" / "02" / "03" in pencil 12px (the only zero-padded number on the page), the role in Platypi italic Ember, a role note in pencil (held to two lines tall on desktop so the three cards line up), then a
64px icon with the name (16px 600), type chips and the PvPoke rank ("**Ranked #52** of 1154 on
PvPoke (score 89.4)", the rank an Ember link), a definition list of
moves (type dot, name, Elite or Mega tag) and Rank 1 IVs labelled "Atk 1 · Def 15 · HP 15" in
the figures face, and a "Check your
IVs" disclosure with three tabular inputs. On ≤720px each card starts as one 64px-tall line
button: 44px icon, slot counter, name, the italic role on its own line and the moves on a
pencil line that wraps (never cut off), with an Ember chevron that turns down when open; the body below does not repeat the
icon, name, slot or role.

### Move tags
Elite (needs an Elite TM or Community Day) is an Ember outlined pill; Mega (a bonus third
charged move) is a filled orange pill with ink text. Both 12px, 600.

### Meta grid
"Against the top *30*": square 8px cells, 15 / 10 / 6 across, each with the icon (72%), its rank
in ink 12px on a small sheet-coloured tab top left (readable on every tint), and the band tint.
A tally of swatches sits beside the heading, and a hint under it says these are the 30 met most
often, out of the 100 the team score counts. Before the grid, a "Skip the 30 Pokémon" outline pill is visually hidden until it has keyboard
focus, and moves focus past the grid. A tapped or focused cell gets a 2px Ember outline
and writes the threat, its best answer and the verdict in a full-width note row that moves to
just under the tapped cell's row. Hover turns the border to the full band colour.

### How to play it
A disclosure under a hairline whose summary is the "How to *play* it" heading with an Ember
arrow. Numbered notes, "1", "2"… in pencil, capped at 62ch (about 75 characters of Be Vietnam Pro), up to five plain sentences with Pokémon names in
bold, then a hint on where they come from. No icons, no colour.

### Report
Two columns under a hairline (one on phones): **Closest matchups** (32px icon, name, type chips,
best answer and verdict) and **Shared weaknesses** (a type chip and the members it hits).

### Recovery fixes
A dead-end message (error, notice or placeholder) is followed by a row of ordinary outline chips
that fix it in one tap. Plain action labels, no icons, no colour beyond the chip.

### Interaction layer
- **Focus:** buttons, summaries, links, selects, inputs and grid cells get a 2px Ember outline.
- **Press:** chips, pills and team rows scale to 0.97 (grid cells 0.95) over 120ms on
  `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Hover** (only under `hover: hover`): outline pills turn their border to ink; the primary pill
  swaps orange and ink; rows take a faint wash.
- **Busy:** a new search dims the current results to 50% (150ms) until the new teams arrive.
- **Reduced motion:** no transitions, presses or arrow rotations.

### Footer band
A charcoal band 32px below the column: "Pv*Pancham*" in ink 16px 600, then the credits in pencil
14px with links in the band's ink.

## Do's and Don'ts

### Do:
- **Do** keep every colour on a custom property, defined for light and dark, and let `.band`
  redefine them for charcoal regions.
- **Do** put ink text on every orange fill, and use Ember for orange text or lines on light
  grounds.
- **Do** mark selection with orange and league identity with a stamp dot, never the reverse.
- **Do** set columns of figures that must align in the system face with `tabular-nums`
  (`--figures`).
- **Do** keep text in ink on type tints; the type colour is the tint or the dot, never the text.
- **Do** keep tap targets at 32px or more, and controls as full pills.

### Don't:
- **Don't** add shadows to resting surfaces; only the floating dropdown casts one.
- **Don't** use orange for decoration beyond the Pancham disc, or a league colour for selection.
- **Don't** put a game type colour behind an action as a fill, even Fighting.
- **Don't** set more than one Platypi italic word in a heading, or names, numbers, moves or data
  in the serif.
- **Don't** load fonts or any asset from a third-party URL; fonts are self-hosted from `fonts/`
  under the OFL.
- **Don't** use Niantic or The Pokémon Company branding beyond the credited icons.
