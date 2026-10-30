#!/usr/bin/env python3
"""Download PvPoke's game master and overall rankings, trim them, and write data/*.js.

Also reads the GO Battle League schedule from Pokémon GO's own game master (as mined and published
on GitHub) and writes data/formats.js: the open leagues plus every cup that is live or scheduled,
with the weeks each one runs. Only cups listed in GBL_LEAGUES are offered; a scheduled league
missing from that table is reported so it can be added by hand.

Output is JavaScript (`window.PvpData.raw.<key> = {...};`) rather than JSON so the site still
works when index.html is opened over file://, where fetch() of local files is blocked.

Standard library only. Run from anywhere:  python3 scripts/update_data.py
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

SOURCE = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data"

# The open leagues are always offered: site format id -> (name, PvPoke cup, CP cap, short label).
OPEN_LEAGUES = {
    "great": ("Great League", "all", 1500, "1500"),
    "ultra": ("Ultra League", "all", 2500, "2500"),
    "master": ("Master League", "all", 10000, "no cap"),
}
OPEN_MIN_RANKED = 300   # a sane open-league rankings file has at least this many entries
CUP_MIN_RANKED = 50

# Pokémon GO's game master, mined from the game and published on GitHub. Its
# VS_SEEKER_SCHEDULE_SETTINGS holds the GO Battle League schedule. The freshest schedule wins.
GAME_MASTERS = [
    ("alexelgt/game_masters", "https://raw.githubusercontent.com/alexelgt/game_masters/master/GAME_MASTER.json"),
    ("PokeMiners/game_masters", "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json"),
]
GBL_PREFIX = "COMBAT_LEAGUE_VS_SEEKER_"

# GO Battle League league (game master id without GBL_PREFIX) -> how the site offers it:
#   a key of OPEN_LEAGUES, or (site format id, name, PvPoke cup, CP cap), or (None, name) for a
#   league PvPoke publishes no rankings for. Matched by hand: names, CP caps and rules don't line
#   up reliably between the two sources (the game stores Master League as 6000 CP, and Catch Cup
#   looks like PvPoke's general Mega format). Leagues that allow Megas are ordinary formats: Megas
#   are separate Pokémon in PvPoke's data (charizard_mega_y), sharing the base form's Pokédex number.
GBL_LEAGUES = {
    "GREAT": "great",
    "ULTRA": "ultra",
    "MASTER": "master",
    "GREAT_FANTASY": ("fantasy", "Fantasy Cup", "fantasy", 1500),
    "GREAT_RETRO": ("retro", "Retro Cup", "retro", 1500),
    "WILLPOWER": ("willpower", "Willpower Cup", "willpower", 1500),
    "GREAT_LITTLE": ("little", "Little Cup", "little", 500),
    "GREAT_MEGAS": ("great_megas", "Great League (Megas)", "mega", 1500),
    "ULTRA_MEGAS": ("ultra_megas", "Ultra League (Megas)", "mega", 2500),
    "MASTER_MEGAS": ("master_megas", "Master League (Megas)", "mega", 10000),
    "GREAT_HALLOWEEN_MEGAS": ("halloweenmega", "Mega Halloween Cup", "halloweenmega", 1500),
    "COLOR_GREAT_MEGAS": ("colormega", "Mega Color Cup", "colormega", 1500),
    "GREAT_CATCH_S24_MEGAS": ("catch", "Catch Cup (Megas)", "catch", 1500),
    "GREAT_CHAMPIONSHIP_SERIES": (None, "Championship Series"),
}
SCHEDULE_WARN_DAYS = 14   # warn when the known schedule runs out sooner than this
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")

# Guards against writing a broken snapshot if upstream changes shape or serves an error page.
MIN_POKEMON = 1000
MIN_MOVES = 250

POKEMON_TAGS = {"shadow", "shadoweligible", "legendary", "mythical", "ultrabeast", "untradeable", "wildlegendary",
                "mega", "supermega"}
MOVE_FIELDS = ("moveId", "name", "type", "power", "energy", "energyGain", "turns",
               "buffs", "buffTarget", "buffApplyChance", "buffsSelf", "buffsOpponent", "damageMethod", "isMegaMove")


def fetch_json(path):
    url = path if path.startswith("https://") else SOURCE + "/" + path
    with urllib.request.urlopen(url, timeout=120) as resp:
        return json.load(resp)


WARNINGS = []


def warn(message):
    # GitHub Actions shows ::warning:: lines on the run's summary page; the workflow also turns
    # them into an issue (see DATA_WARNINGS in main) so someone gets an email.
    WARNINGS.append(message)
    print(("::warning::" if os.environ.get("GITHUB_ACTIONS") else "warning: ") + message)


def ms_now():
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def day(ms):
    return datetime.fromtimestamp(ms / 1000, timezone.utc).strftime("%Y-%m-%d")


def trim_pokemon(p, all_by_id):
    out = {
        "id": p["speciesId"],
        "name": p["speciesName"],
        "dex": p["dex"],
        "types": [t for t in p["types"] if t != "none"],
        "stats": [p["baseStats"]["atk"], p["baseStats"]["def"], p["baseStats"]["hp"]],
        "fast": p["fastMoves"],
        "charged": p["chargedMoves"] + p.get("extraChargedMoves", []),
    }
    elite = p.get("eliteMoves", []) + p.get("legacyMoves", [])
    if elite:
        out["elite"] = sorted(set(elite))
    tags = sorted(POKEMON_TAGS.intersection(p.get("tags", [])))
    if tags:
        out["tags"] = tags
    if p.get("nicknames"):
        out["nicknames"] = p["nicknames"]
    if p.get("levelFloor"):
        out["levelFloor"] = p["levelFloor"]
    # Form-change abilities (Mimikyu's Disguise, Cramorant's Gulp Missile, ...): the engine models
    # the ones it recognises and ignores the rest.
    if p.get("formChange"):
        change = dict(p["formChange"])
        # The form changed into is often unreleased (mimikyu_busted) and so not in the snapshot;
        # carry its stat stages over.
        target = all_by_id.get(change.get("alternativeFormId"))
        if target and target.get("nativeStatBuffs"):
            change["alternativeStatBuffs"] = target["nativeStatBuffs"]
        out["formChange"] = change
    if p.get("nativeStatBuffs"):
        out["nativeStatBuffs"] = p["nativeStatBuffs"]
    return out


def trim_move(m):
    return {k: m[k] for k in MOVE_FIELDS if k in m}


def trim_gamemaster(gm):
    all_by_id = {p["speciesId"]: p for p in gm["pokemon"]}
    pokemon = [
        trim_pokemon(p, all_by_id) for p in gm["pokemon"]
        if p.get("released")
    ]
    moves = [trim_move(m) for m in gm["moves"]]
    if len(pokemon) < MIN_POKEMON or len(moves) < MIN_MOVES:
        sys.exit("game master looks wrong: %d pokemon, %d moves" % (len(pokemon), len(moves)))
    return {"timestamp": gm["timestamp"], "pokemon": pokemon, "moves": moves}


def trim_ranking(r):
    return {
        "id": r["speciesId"],
        "score": r["score"],
        # PvPoke order: lead, closer, switch, charger, attacker, consistency.
        "roles": r["scores"],
        # A Pokémon with a single charged move gets "none" as its second; drop it.
        "moveset": [m for m in r["moveset"] if m != "none"],
        "wins": [[m["opponent"], m["rating"]] for m in r.get("matchups", [])],
        "losses": [[m["opponent"], m["rating"]] for m in r.get("counters", [])],
    }


def trim_rankings(rankings, known_ids, minimum):
    """Trimmed entries, or None if there are fewer than `minimum` (upstream looks broken)."""
    out = [trim_ranking(r) for r in rankings if r["speciesId"] in known_ids]
    return out if len(out) >= minimum else None


# ---- GO Battle League schedule ----

def fetch_schedule():
    """(source, weeks, leagues) from the game master with the furthest-reaching schedule, or None.
    weeks: [(start ms, end ms, [league ids])]; leagues: {league id: combatLeague settings}."""
    best = None
    for name, url in GAME_MASTERS:
        try:
            templates = {t["templateId"]: t["data"] for t in fetch_json(url)}
            settings = templates["VS_SEEKER_SCHEDULE_SETTINGS"]["vsSeekerScheduleSettings"]
            weeks = []
            for season in settings["seasonSchedules"]:
                for w in season["vsSeekerSchedules"]:
                    # "Tempalte" is the game's own spelling.
                    ids = [t[len(GBL_PREFIX):] for t in w["vsSeekerLeagueTempalteId"] if t.startswith(GBL_PREFIX)]
                    weeks.append((int(w["startTimeMs"]), int(w["endTimeMs"]), ids))
            leagues = {t[len(GBL_PREFIX):]: d["combatLeague"] for t, d in templates.items()
                       if t.startswith(GBL_PREFIX) and "combatLeague" in d}
        except (urllib.error.URLError, ValueError, KeyError, TypeError) as e:
            warn("could not read the GBL schedule from %s (%s)" % (name, e))
            continue
        if not weeks:
            continue
        print("%s: GBL schedule %s to %s" % (name, day(weeks[0][0]), day(max(w[1] for w in weeks))))
        if best is None or max(w[1] for w in weeks) > max(w[1] for w in best[1]):
            best = (name, sorted(weeks), leagues)
    return best


def allowed_types(league):
    """Types a game league is restricted to (lowercase), or []."""
    for c in league.get("pokemonCondition", []):
        if c.get("type") == "WITH_POKEMON_TYPE":
            return sorted(t.replace("POKEMON_TYPE_", "").lower() for t in c["withPokemonType"]["pokemonType"])
    return []


def guess_cup(league, pvpoke_cups):
    """A PvPoke cup that looks like this game league (same allowed types), to suggest in a warning."""
    types = set(allowed_types(league))
    if not types:
        return None
    for cup in pvpoke_cups:
        inc = {v for f in cup.get("include", []) if f.get("filterType") == "type" for v in f["values"]}
        if inc == types:
            return cup["name"]
    return None


def type_label(types):
    names = [t.capitalize() for t in types]
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def build_formats(schedule, pvpoke_cups, now):
    """formats: open leagues, then every mapped cup with a week not yet over (newest last).
    other: scheduled leagues the site can't offer, with why. Each carries its weeks [start, end]."""
    formats = {}
    for fid, (name, cup, cp, label) in OPEN_LEAGUES.items():
        formats[fid] = {"id": fid, "name": name, "cup": cup, "cp": cp, "label": label, "weeks": []}
    other = {}
    for start, end, ids in (schedule[1] if schedule else []):
        for gid in ids:
            entry = GBL_LEAGUES.get(gid)
            league = schedule[2].get(gid, {})
            if entry is None:
                if end > now:
                    guess = guess_cup(league, pvpoke_cups)
                    warn("GBL league %s (%s to %s) is not in GBL_LEAGUES in scripts/update_data.py%s" % (
                        gid, day(start), day(end), "; it looks like PvPoke cup '%s'" % guess if guess else ""))
                continue
            if isinstance(entry, str):
                formats[entry]["weeks"].append([start, end])
                continue
            if entry[0] is None:
                item = other.setdefault(entry[1], {"name": entry[1], "reason": "no-rankings", "weeks": []})
                item["weeks"].append([start, end])
                continue
            fid, name, cup, cp = entry
            if fid not in formats:
                types = allowed_types(league)
                no_cap = cp >= OPEN_LEAGUES["master"][2]
                formats[fid] = {"id": fid, "name": name, "cup": cup, "cp": cp,
                                "label": " · ".join(t.capitalize() for t in types) if types else "no cap" if no_cap else str(cp),
                                "rules": "No CP cap." if no_cap else "%s CP cap." % "{:,}".format(cp),
                                "weeks": []}
                if types:
                    formats[fid]["types"] = types
                    formats[fid]["rules"] += " Only %s types are eligible." % type_label(types)
                if league.get("allowTempEvos"):
                    formats[fid]["megas"] = True
                    formats[fid]["rules"] += " Mega Pokémon are allowed."
            formats[fid]["weeks"].append([start, end])
    # Cups whose weeks are all over are dropped; the open leagues always stay.
    out = [f for f in formats.values() if f["id"] in OPEN_LEAGUES or any(e > now for _, e in f["weeks"])]
    others = [o for o in other.values() if any(e > now for _, e in o["weeks"])]
    return out, others


def read_previous_formats():
    path = os.path.join(OUT_DIR, "formats.js")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        text = f.read()
    return json.loads(text[text.index("=", text.index("raw[")) + 1:].rstrip().rstrip(";"))


def write_js(name, key, value):
    path = os.path.join(OUT_DIR, name)
    body = json.dumps(value, separators=(",", ":"), ensure_ascii=False)
    with open(path, "w", encoding="utf-8") as f:
        f.write("// Generated by scripts/update_data.py from PvPoke (MIT, (c) 2019 pvpoke) and the Pokémon GO game master. Do not edit.\n")
        f.write("window.PvpData=window.PvpData||{raw:{}};window.PvpData.raw[%s]=%s;\n" % (json.dumps(key), body))
    print("wrote %s (%d KB)" % (os.path.relpath(path), os.path.getsize(path) // 1024))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    raw_gm = fetch_json("gamemaster.min.json")
    gamemaster = trim_gamemaster(raw_gm)
    known_ids = {p["id"] for p in gamemaster["pokemon"]}
    now = ms_now()

    schedule = fetch_schedule()
    if schedule:
        formats, others = build_formats(schedule, raw_gm.get("cups", []), now)
        info = {"source": schedule[0], "end": max(w[1] for w in schedule[1])}
    else:
        previous = read_previous_formats()
        warn("no GBL schedule could be read; %s" % ("keeping the previous one" if previous else "offering the open leagues only"))
        if previous:
            formats = [f for f in previous["formats"] if f["id"] in OPEN_LEAGUES or any(e > now for _, e in f["weeks"])]
            others = [o for o in previous["other"] if any(e > now for _, e in o["weeks"])]
            info = previous["schedule"]
        else:
            formats = [{"id": fid, "name": n, "cup": c, "cp": cp, "label": lb, "weeks": []}
                       for fid, (n, c, cp, lb) in OPEN_LEAGUES.items()]
            others, info = [], None
    if info and info["end"] < now + SCHEDULE_WARN_DAYS * 86400000:
        warn("the known GBL schedule ends %s; the game master mirrors may have stopped updating" % day(info["end"]))

    rankings = {}
    for f in list(formats):
        fid, required = f["id"], f["id"] in OPEN_LEAGUES
        path = "rankings/%s/overall/rankings-%d.json" % (f["cup"], f["cp"])
        minimum = OPEN_MIN_RANKED if required else CUP_MIN_RANKED
        try:
            entries = trim_rankings(fetch_json(path), known_ids, minimum)
        except (urllib.error.HTTPError, ValueError) as e:
            entries, reason = None, str(e)
        else:
            reason = "fewer than %d ranked entries" % minimum
        if entries is not None:
            rankings[fid] = entries
        elif required:
            sys.exit("%s rankings look wrong (%s): %s" % (fid, path, reason))
        elif os.path.exists(os.path.join(OUT_DIR, "rankings-%s.js" % fid)):
            warn("%s rankings unavailable (%s); keeping the previous snapshot" % (fid, reason))
        else:
            warn("%s rankings unavailable (%s); not offering it" % (fid, reason))
            formats.remove(f)

    write_js("gamemaster.js", "gamemaster", gamemaster)
    for fid, entries in rankings.items():
        write_js("rankings-%s.js" % fid, "rankings-" + fid, entries)
    # Rankings of cups that are over (or no longer offered) go.
    ids = {f["id"] for f in formats}
    for name in sorted(os.listdir(OUT_DIR)):
        if name.startswith("rankings-") and name.endswith(".js") and name[len("rankings-"):-3] not in ids:
            os.remove(os.path.join(OUT_DIR, name))
            print("removed %s (no longer offered)" % name)
    write_js("formats.js", "formats", {"schedule": info, "formats": formats, "other": others})
    print("formats: %s; also scheduled: %s" % (", ".join(f["id"] for f in formats),
                                                ", ".join("%s (%s)" % (o["name"], o["reason"]) for o in others) or "none"))

    # One warning per line, for the workflow's "needs attention" issue.
    if os.environ.get("DATA_WARNINGS"):
        with open(os.environ["DATA_WARNINGS"], "w", encoding="utf-8") as f:
            f.write("".join(w + "\n" for w in WARNINGS))

    # Only upstream data goes in the data files (no fetch time), so an unchanged upstream produces
    # no diff and the scheduled workflow makes no commit.
    print("gamemaster timestamp: %s, fetched %s" % (gamemaster["timestamp"],
                                                    datetime.now(timezone.utc).isoformat(timespec="seconds")))


if __name__ == "__main__":
    main()
