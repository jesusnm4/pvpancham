#!/usr/bin/env bash
# Turns the data refresh's warnings into one GitHub issue, so they reach someone by email:
#   - warnings and no open issue: open one
#   - warnings that differ from the open issue's: update it and comment (one email per change)
#   - same warnings as the open issue: do nothing (no daily emails for a known problem)
#   - no warnings: close the open issue
# Usage (in the workflow, with GH_TOKEN set): scripts/report_warnings.sh <warnings file> <run URL>
set -euo pipefail

file="$1"
run_url="$2"
title="Data refresh needs attention"

number=$(gh issue list --state open --search "in:title \"$title\"" --json number,title \
  --jq "map(select(.title == \"$title\"))[0].number // empty")

warnings=""
if [ -s "$file" ]; then
  warnings=$(sed 's/^/- /' "$file")
fi

if [ -z "$warnings" ]; then
  if [ -n "$number" ]; then
    gh issue close "$number" --comment "Resolved: [this run]($run_url) had no warnings."
  fi
  exit 0
fi

body="The scheduled data refresh ([latest run]($run_url)) reported:

<!-- warnings -->
$warnings
<!-- /warnings -->

A GO Battle League league missing from \`GBL_LEAGUES\` needs one line in \`scripts/update_data.py\`
(see CLAUDE.md). This issue closes itself after a refresh with no warnings."

if [ -z "$number" ]; then
  gh issue create --title "$title" --body "$body"
  exit 0
fi

previous=$(gh issue view "$number" --json body --jq .body | sed -n '/<!-- warnings -->/,/<!-- \/warnings -->/p' | sed '1d;$d')
if [ "$previous" != "$warnings" ]; then
  gh issue edit "$number" --body "$body"
  gh issue comment "$number" --body "The warnings changed in [this run]($run_url); see the updated description."
fi
