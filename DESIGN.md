---
name: PvP Team Helper
description: Pokémon GO PvP team builder for the leagues and cups on this week.
colors:
  accent: "#2f6fde"
  accent-dark: "#6b9cf0"
  accent-text: "#ffffff"
  accent-text-dark: "#0d1014"
  live: "#187a42"
  live-dark: "#5cc98d"
  error: "#b42318"
  error-dark: "#f97066"
  paper: "#f6f7f9"
  paper-dark: "#121418"
  sheet: "#ffffff"
  sheet-dark: "#1c1f25"
  ink: "#1b1f24"
  ink-dark: "#e8eaed"
  pencil: "#5b6470"
  pencil-dark: "#9aa3ad"
  rule: "#d8dde3"
  rule-dark: "#30353d"
  shadow-glow: "#8a3fd1"
typography:
  score:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  tag: "4px"
  field: "6px"
  control: "8px"
  card: "10px"
  panel: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  panel:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
    padding: "16px"
  chip-league:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-league-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  chip-quick:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    height: "32px"
  input-search:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 36px 8px 10px"
  team-option:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
  member-card:
    rounded: "{rounded.card}"
    padding: "12px"
  badge-live:
    backgroundColor: "{colors.live}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 6px"
---

# Design System: PvP Team Helper

<!-- Recorded from the code at 2d8bc5c and updated through design phase 2 (type) in
     PLAN.md. Update this file as each phase lands. -->

## Overview

**Creative North Star: "The Trainer's Notebook"**

A clear, quiet field notebook a trainer keeps between battles: plain paper, legible handwriting,
confident figures, and colour only where it means something. The page is a tool used in short
sessions on a phone, so it stays calm and dense rather than decorative; the Pokémon icons and the
game's type colours are the only pictures, and they carry the GO flavour.

Today the system is a single column of white sheets on a light grey ground (dark mode: charcoal
sheets on near-black), the system font throughout, and one blue accent for selection, links and
focus. Depth comes from borders, not shadows. Controls are calm and tactile: quiet at rest, with a
clear selected state.

**Key Characteristics:**
- System font, one family, weight does the emphasis.
- One accent colour (blue) for selection, focus and links; green only for "Live".
- Game type colours as tints on chips, never as fills behind text.
- Flat, bordered surfaces; the one shadow is the search dropdown.
- Pill chips for choices, rounded rectangles for content.

## Colors

A cool neutral notebook with one blue pen and the game's type colours as small tints.

### Primary
- **Notebook Blue** (#2f6fde light, #6b9cf0 dark): selected league and style chips, the selected
  team, member roles, links, focus rings, Elite tags, the top-teams panel border (45% mix).

### Secondary
- **Live Green** (#187a42 light, #5cc98d dark, `--live`): the "Live until …" label on the group of
  formats on in GBL this week. Nothing else.

### Neutral
- **Paper** (#f6f7f9 / #121418): page ground.
- **Sheet** (#ffffff / #1c1f25): panels, inputs, dropdown.
- **Ink** (#1b1f24 / #e8eaed): body text and names.
- **Pencil** (#5b6470 / #9aa3ad): hints, secondary notes, labels.
- **Rule** (#d8dde3 / #30353d): every border and divider; also the unselected rank dot.
- **Error Red** (#b42318 / #f97066): load and data errors only.

### Type and form colours
The 18 game type colours (`.type[data-type]`, e.g. fire #e62829, water #2980ef) tint type chips at
22% with a 60% border; text stays in Ink. Dark and ghost get lighter values in dark mode. Shadow
Pokémon icons get a purple glow (#8a3fd1).

**The One Pen Rule.** Blue is the only interactive colour. A second hue appears only when it carries
meaning the blue can't (Live, a type, an error).

## Typography

**Body Font:** system-ui (with -apple-system, Segoe UI, Roboto, sans-serif)

**Character:** the platform's own font, so it reads like part of the phone. Hierarchy comes from
weight and a small size step, not from a second family.

### Hierarchy
Five steps, as CSS custom properties: `--fs-xs` 12, `--fs-sm` 14, `--fs-md` 16, `--fs-lg` 20,
`--fs-xl` 32px. No other size ships; `<small>` is pinned to `--fs-sm`.
- **Score** (700, 32px, line-height 1, −0.02em, tabular): the selected team's score, once per
  screen, in the team header.
- **Headline** (700, 20px, 1.25, −0.01em): the site title, section headings, the team header's
  names.
- **Title** (700, 16px): member names, report headings.
- **Body** (400, 16px, 1.5): running text, inputs; on phones also member details, threat lists
  and the IV checker, which are the main reading there.
- **Small** (400, 14px): hints, chips, member details on desktop, footer.
- **Label** (600, 12px): member roles and layout tags (0.04em, uppercase), group labels, badges.

Headings use `text-wrap: balance`, hints `text-wrap: pretty`. Every figure that is compared
(scores, ranks, IVs, rank dots) uses `font-variant-numeric: tabular-nums`.

**The One Big Number Rule.** Only the selected team's score is set large. Every other figure
stays at its text size; the score's meaning ("Has a winning answer to N of the top 100") sits
right beside it.

## Layout

One centred column, max 960px with 16px side padding. Sections are stacked panels 16px apart:
the form (league or cup, your Pokémon, then a ruled-off options row with team style, Elite moves
and "What do these mean?"), then results, then top teams. With no picks the results panel is
hidden, so top teams sit right under the form as the starting point. Inside the
form, fieldsets are 16px apart. Results show a team list, then three member cards in a row, then a
two-column strengths/weaknesses report.

- **≤720px:** top teams, member cards and the report go to one column.
- **≤520px:** the league groups and popular picks become single sideways-scrolling rows that
  bleed to the panel edge (the cut-off chip shows there's more), and the selected league is
  scrolled into view; a cup's long type list is truncated (full rules in its title). The pickers
  stack, the style chips share the width equally, team rows put names on their own line, and
  dropdown type chips hide so full names fit.

Spacing rhythm is 4 / 8 / 12 / 16px.

## Elevation & Depth

Flat. Surfaces are separated by 1px Rule borders and the Paper/Sheet contrast. The only shadow is
the search dropdown (`0 8px 24px rgb(0 0 0 / 0.18)`), because it floats over content.

**The Border Not Shadow Rule.** Resting surfaces never cast shadows; only something floating
over the page does.

## Shapes

Gently rounded: tags 4px, fields 6px, controls and team rows 8px, member cards 10px, panels 12px.
Every choice (league, style, quick pick, type, Live) is a full pill (999px). Rank dots are circles.

## Components

### League and style chips
Calm and tactile. Pill, 1px Rule border, 6px 14px, at least 40px tall, never wrapping inside.
Selected: Notebook Blue fill, white text. League chips sit in labelled groups (Live until …,
Always, Coming up); a coming-up chip carries its start date as an outlined badge. Keyboard focus: 2px blue outline, 2px offset. Radio
inputs are visually hidden inside the label.

### Quick picks
Pill buttons, 32px tall, transparent; border turns blue on hover.

### Search combobox
Field with 8px corners and a clear (×) button; 2px blue focus outline. The dropdown is a Sheet
with the one shadow; the active row gets a 14% blue tint. Rows show icon, name, types and rank.

### Top teams
A panel with a blue-tinted border holding three team buttons (icons, names, score); one column
on phones. It is the empty state before any pick, and stays below the results after.

### Options row
Team style chips, the Elite moves checkbox and a "What do these mean?" disclosure on one row
above a 1px rule; the disclosure opens a definition list explaining each choice.

### Team list
Full-width rows: rank dot, icons (overlapping by 6px), names, layout tag (ABC / ABB / ABA), score.
Selected (`aria-pressed`): blue border, 10% blue tint, blue rank dot.

### Team header
Above the member cards: the score (32px) with "of 100" under it, then the team's names (20px),
"Has a winning answer to N of the top 100 Pokémon in …" with the figure in bold, and the layout
note as a hint. 24px above, 16px below.

### Member card
10px card: 64px icon, role label in blue caps, name, type chips, PvPoke rank link, then a
definition list of moves (Elite and Mega tags), IVs, and a collapsible "Check your IVs".

### Report
Strengths and weaknesses as lists of 32px icons with name, verdict and a small note.

## Do's and Don'ts

### Do:
- **Do** keep every colour on a CSS custom property, defined for light and dark.
- **Do** keep text in Ink on type tints; the type colour is the tint, never the text.
- **Do** use tabular figures for anything compared across rows.
- **Do** keep tap targets at 32px or more.

### Don't:
- **Don't** add shadows to resting surfaces.
- **Don't** add a second interactive colour beside Notebook Blue.
- **Don't** add web fonts or third-party assets; the site never fetches third-party URLs.
- **Don't** use Niantic or The Pokémon Company branding beyond the credited icons.
