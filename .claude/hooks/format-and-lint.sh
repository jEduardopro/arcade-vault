#!/usr/bin/env bash
# PostToolUse hook: format every file Claude Code writes or edits with Prettier,
# then auto-fix the JS/TS ones with ESLint.
#
# Wired up in .claude/settings.json for Write | Edit | NotebookEdit, so it is
# scoped to this project only. The hook is silent by design: it fixes what it
# can and never blocks the tool call, so any rule that ESLint cannot auto-fix
# stays visible through `npm run lint` instead.
#
# Input: the hook payload arrives as JSON on stdin.
set -uo pipefail

# Project root. CLAUDE_PROJECT_DIR is exported by Claude Code; fall back to the
# repo that contains this script so the hook also works when run by hand.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR" || exit 0

payload=$(cat)

# Write/Edit report `file_path`; NotebookEdit reports `notebook_path`.
file=$(printf '%s' "$payload" |
  jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' 2>/dev/null)

[ -n "$file" ] || exit 0

# Resolve to an absolute path and make sure we stay inside the project. Files
# outside it (a scratchpad, a global config) are none of this hook's business.
case "$file" in
  /*) abs="$file" ;;
  *) abs="$PROJECT_DIR/$file" ;;
esac
[ -f "$abs" ] || exit 0
case "$abs" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

# references/ holds the verbatim design sources (see CLAUDE.md). Prettier
# already skips them via .prettierignore; ESLint does not, so bail out here to
# keep `eslint --fix` from rewriting them too.
case "$abs" in
  "$PROJECT_DIR"/references/*) exit 0 ;;
esac

# Prettier honours .prettierignore and .gitignore on its own, and
# --ignore-unknown skips extensions it has no parser for.
npx --no-install prettier --write --ignore-unknown "$abs" >/dev/null 2>&1

# ESLint only understands the JS/TS family here.
case "$abs" in
  *.js | *.jsx | *.mjs | *.cjs | *.ts | *.tsx)
    npx --no-install eslint --fix "$abs" >/dev/null 2>&1
    ;;
esac

exit 0
