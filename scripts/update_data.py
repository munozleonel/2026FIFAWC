#!/usr/bin/env python3
"""
FIFA World Cup 2026 — Live Data Updater
=======================================
Fetches live match results, group standings and player stats from
API-Football (rapidapi.com) and writes data/live_data.json.

Environment variables required (set as GitHub Secrets):
  API_FOOTBALL_KEY   — your RapidAPI key for api-football.com
  TOURNAMENT_ID      — API-Football tournament/league ID for WC 2026
                       (use 1 for FIFA World Cup; confirm once live)

Run locally:
  pip install requests
  API_FOOTBALL_KEY=xxx TOURNAMENT_ID=1 python scripts/update_data.py

GitHub Actions runs this automatically (see .github/workflows/update.yml).
"""

import json
import os
import sys
import logging
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
except ImportError:
    print("ERROR: 'requests' not installed. Run: pip install requests")
    sys.exit(1)

# ─── Config ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

API_KEY        = os.environ.get("API_FOOTBALL_KEY", "")
TOURNAMENT_ID  = os.environ.get("TOURNAMENT_ID", "1")   # FIFA World Cup
SEASON         = os.environ.get("SEASON", "2026")
DATA_FILE      = Path(__file__).parent.parent / "data" / "live_data.json"
BASE_URL       = "https://v3.football.api-sports.io"
HEADERS        = {
    "x-apisports-key":  API_KEY,
    "X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
}

# Name mapping: API name → our display name
# Extend as needed once the API responses are known.
TEAM_NAME_MAP = {
    "Korea Republic":          "South Korea",
    "Republic of Korea":       "South Korea",
    "Bosnia Herzegovina":      "Bosnia & Herz.",
    "Bosnia And Herzegovina":  "Bosnia & Herz.",
    "Ivory Coast":             "Ivory Coast",
    "Cote d'Ivoire":           "Ivory Coast",
    "Cape Verde":              "Cabo Verde",
    "Cabo Verde Islands":      "Cabo Verde",
    "DR Congo":                "DR Congo",
    "Congo DR":                "DR Congo",
    "Turkey":                  "Türkiye",
    "Curacao":                 "Curaçao",
    "New Zealand":             "New Zealand",
    "United States":           "USA",
}

# Group assignment (needed to map API standings to our structure)
TEAM_GROUP = {
    "Mexico":"A","South Africa":"A","South Korea":"A","Czechia":"A",
    "Canada":"B","Bosnia & Herz.":"B","Qatar":"B","Switzerland":"B",
    "Brazil":"C","Morocco":"C","Scotland":"C","Haiti":"C",
    "USA":"D","Paraguay":"D","Australia":"D","Türkiye":"D",
    "Germany":"E","Ivory Coast":"E","Ecuador":"E","Curaçao":"E",
    "Netherlands":"F","Japan":"F","Sweden":"F","Tunisia":"F",
    "Belgium":"G","Egypt":"G","Iran":"G","New Zealand":"G",
    "Spain":"H","Saudi Arabia":"H","Uruguay":"H","Cabo Verde":"H",
    "France":"I","Senegal":"I","Norway":"I","Iraq":"I",
    "Argentina":"J","Algeria":"J","Austria":"J","Jordan":"J",
    "Portugal":"K","Colombia":"K","Uzbekistan":"K","DR Congo":"K",
    "England":"L","Croatia":"L","Ghana":"L","Panama":"L",
}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def api_get(endpoint: str, params: dict) -> dict | None:
    """Make a GET request to API-Football. Returns parsed JSON or None."""
    if not API_KEY:
        log.warning("API_FOOTBALL_KEY not set — using existing data unchanged.")
        return None
    url = f"{BASE_URL}/{endpoint}"
    try:
        r = requests.get(url, headers=HEADERS, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        if data.get("errors"):
            log.error("API errors: %s", data["errors"])
            return None
        return data
    except requests.RequestException as e:
        log.error("Request failed for %s: %s", endpoint, e)
        return None


def normalise_name(raw: str) -> str:
    """Map API team name to our display name."""
    return TEAM_NAME_MAP.get(raw, raw)


def load_existing() -> dict:
    """Load the current live_data.json, returning an empty skeleton if missing."""
    if DATA_FILE.exists():
        with open(DATA_FILE, encoding="utf-8") as f:
            return json.load(f)
    log.warning("data/live_data.json not found — starting from scratch.")
    return {"groups": {}, "fixtures": [], "player_stats": [], "squad_stats": {}}


def save(data: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log.info("Saved %s", DATA_FILE)


# ─── Fetch standings ──────────────────────────────────────────────────────────

def fetch_standings(existing: dict) -> dict:
    """
    Fetch group standings from API-Football and update existing['groups'].
    Each team entry: [name, gp, gf, ga, pts, gd_ignored_recalc, status]
    We store:         [name, gp, gf, ga, pts, gd, status]
    """
    log.info("Fetching standings for tournament %s season %s…", TOURNAMENT_ID, SEASON)
    data = api_get("standings", {"league": TOURNAMENT_ID, "season": SEASON})
    if not data:
        return existing

    standings_list = (
        data.get("response", [{}])[0]
            .get("league", {})
            .get("standings", [])
    )

    # standings_list is a list of groups; each group is a list of team objects
    groups: dict[str, list] = {}
    for group_entries in standings_list:
        for entry in group_entries:
            raw_name = entry.get("team", {}).get("name", "")
            name     = normalise_name(raw_name)
            grp      = TEAM_GROUP.get(name)
            if not grp:
                log.debug("Unknown team in standings: %s", raw_name)
                continue

            all_stats = entry.get("all", {})
            gp  = all_stats.get("played", 0)
            gf  = all_stats.get("goals", {}).get("for", 0)
            ga  = all_stats.get("goals", {}).get("against", 0)
            pts = entry.get("points", 0)
            gd  = gf - ga

            # Derive status from rank
            rank   = entry.get("rank", 99)
            status = "qualified" if rank <= 2 else "active"

            groups.setdefault(grp, []).append([name, gp, gf, ga, pts, gd, status])

    if groups:
        log.info("Updated standings for %d groups.", len(groups))
        existing["groups"] = groups
    else:
        log.warning("No standings data returned — keeping existing.")

    return existing


# ─── Fetch fixtures / results ─────────────────────────────────────────────────

def fetch_fixtures(existing: dict) -> dict:
    """
    Fetch all fixture results from API-Football and update scores in
    existing['fixtures'].

    Fixture format (our schema):
      [group, iso_utc, home, away, venue, city, homeOdds, drawOdds, awayOdds,
       homeScore, awayScore]
    Indices 9 and 10 are the live/final scores (null = not played yet).
    """
    log.info("Fetching fixtures for tournament %s season %s…", TOURNAMENT_ID, SEASON)
    data = api_get("fixtures", {"league": TOURNAMENT_ID, "season": SEASON})
    if not data:
        return existing

    # Build lookup: (home_norm, away_norm) → (homeScore, awayScore, status)
    results: dict[tuple, tuple] = {}
    for fix in data.get("response", []):
        teams    = fix.get("teams", {})
        goals    = fix.get("goals", {})
        status   = fix.get("fixture", {}).get("status", {}).get("short", "NS")
        home     = normalise_name(teams.get("home", {}).get("name", ""))
        away     = normalise_name(teams.get("away", {}).get("name", ""))
        h_goals  = goals.get("home")   # None if not played
        a_goals  = goals.get("away")
        finished = status in ("FT", "AET", "PEN")
        if finished and h_goals is not None and a_goals is not None:
            results[(home, away)] = (h_goals, a_goals)

    updated = 0
    new_fixtures = []
    for fix in existing.get("fixtures", []):
        row  = list(fix)
        home = row[2]
        away = row[3]
        key  = (home, away)
        if key in results:
            h_sc, a_sc = results[key]
            if len(row) < 11:
                row += [None, None]
            row[9]  = h_sc
            row[10] = a_sc
            updated += 1
        new_fixtures.append(row)

    log.info("Updated scores for %d fixtures.", updated)
    existing["fixtures"] = new_fixtures
    return existing


# ─── Fetch player stats ───────────────────────────────────────────────────────

def fetch_player_stats(existing: dict) -> dict:
    """
    Fetch top scorers and assisters from API-Football.
    Updates existing['player_stats'] with live tournament stats.
    Format: [name, team, position, gp, goals, assists, yellow, red, mins]
    """
    log.info("Fetching top scorers…")
    scorers_data = api_get(
        "players/topscorers",
        {"league": TOURNAMENT_ID, "season": SEASON}
    )

    log.info("Fetching top assisters…")
    assisters_data = api_get(
        "players/topassists",
        {"league": TOURNAMENT_ID, "season": SEASON}
    )

    # Build a merged dict keyed by player name
    merged: dict[str, list] = {}

    def process(response_data, stat_type):
        if not response_data:
            return
        for entry in response_data.get("response", []):
            player    = entry.get("player", {})
            stats_arr = entry.get("statistics", [{}])
            stats     = stats_arr[0] if stats_arr else {}

            name  = player.get("name", "Unknown")
            team  = normalise_name(
                stats.get("team", {}).get("name", "Unknown")
            )
            pos   = stats.get("games", {}).get("position", "MID") or "MID"
            gp    = stats.get("games", {}).get("appearences", 0) or 0
            goals = stats.get("goals", {}).get("total", 0) or 0
            ast   = stats.get("goals", {}).get("assists", 0) or 0
            yel   = stats.get("cards", {}).get("yellow", 0) or 0
            red   = stats.get("cards", {}).get("red", 0) or 0
            mins  = stats.get("games", {}).get("minutes", 0) or 0

            # Map API position to our abbreviation
            pos_map = {"Attacker": "FWD", "Midfielder": "MID",
                       "Defender": "DEF", "Goalkeeper": "GK"}
            pos = pos_map.get(pos, pos[:3].upper())

            if name not in merged:
                merged[name] = [name, team, pos, gp, goals, ast, yel, red, mins]
            else:
                # Merge: take max values
                existing_row = merged[name]
                existing_row[3] = max(existing_row[3], gp)
                existing_row[4] = max(existing_row[4], goals)
                existing_row[5] = max(existing_row[5], ast)
                existing_row[6] = max(existing_row[6], yel)
                existing_row[7] = max(existing_row[7], red)
                existing_row[8] = max(existing_row[8], mins)

    process(scorers_data, "goals")
    process(assisters_data, "assists")

    if merged:
        # Sort by goals desc, then assists desc
        player_list = sorted(
            merged.values(),
            key=lambda r: (-r[4], -r[5])
        )
        existing["player_stats"] = player_list
        log.info("Updated %d player stat entries.", len(player_list))

        # Update squad_stats for teams we have data for
        squad_map: dict[str, list] = {}
        for row in player_list:
            team = row[1]
            squad_map.setdefault(team, []).append(row)

        for team, players in squad_map.items():
            if team in existing.get("squad_stats", {}):
                # Update matching players by name
                existing_squad = existing["squad_stats"][team]
                player_lookup = {r[0]: r for r in players}
                for i, squad_row in enumerate(existing_squad):
                    pname = squad_row[0]
                    if pname in player_lookup:
                        live = player_lookup[pname]
                        # Update stats columns (keep name and position from squad)
                        existing_squad[i] = [
                            pname, squad_row[1],  # name, position
                            live[3], live[8],      # gp, mins
                            live[4], live[5],      # goals, assists
                            live[6], live[7],      # yellow, red
                        ]
    else:
        log.warning("No player stats returned — keeping existing.")

    return existing


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    log.info("═══════════════════════════════════════════")
    log.info(" FIFA WC 2026 Data Updater — starting")
    log.info("═══════════════════════════════════════════")

    data = load_existing()

    # Update meta
    data.setdefault("_meta", {})
    data["_meta"]["last_updated"]  = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    data["_meta"]["update_count"]  = data["_meta"].get("update_count", 0) + 1

    # Run each fetcher
    data = fetch_standings(data)
    data = fetch_fixtures(data)
    data = fetch_player_stats(data)

    save(data)

    log.info("═══════════════════════════════════════════")
    log.info(" Done. Update #%d at %s",
             data["_meta"]["update_count"],
             data["_meta"]["last_updated"])
    log.info("═══════════════════════════════════════════")


if __name__ == "__main__":
    main()
