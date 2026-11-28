#!/usr/bin/env bash
# Publishes the public files of the pushed info.sahaj.si HEAD to gh-pages (what info.sahaj.si serves), keeping CNAME
# and .nojekyll. Used by the GitHub Actions (hourly and on every push) and by hand.
# Usage: scripts/deploy-pages.sh "<message>"   (optional env DEPLOY_TRAILER: extra commit-message paragraph)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
MSG="${1:-update}"
cd "$REPO"
REFS=(+refs/heads/info.sahaj.si:refs/remotes/origin/info.sahaj.si +refs/heads/gh-pages:refs/remotes/origin/gh-pages)
# DEPLOY_DEPTH (set in CI) keeps a shallow checkout shallow.
fetch() { git fetch -q ${DEPLOY_DEPTH:+--depth=$DEPLOY_DEPTH} origin "${REFS[@]}"; }
fetch
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/info.sahaj.si)" ] || { echo "deploy: HEAD is not the pushed info.sahaj.si, skipping"; exit 0; }
SRC=$(git rev-parse --short HEAD)

attempt() {
  local W; W="$(mktemp -d)/ghp"
  git worktree add -q --detach "$W" origin/gh-pages
  (
    cd "$W"
    git ls-files | grep -v -x -e CNAME -e .nojekyll | xargs -r -d '\n' git rm -q --cached
    find . -mindepth 1 -maxdepth 1 ! -name .git ! -name CNAME ! -name .nojekyll -exec rm -rf {} +
  )
  local FILES
  FILES=$(git ls-tree -r --name-only HEAD -- .well-known 404.html assets blogs blog resume favicon.ico index.html robots.txt site.webmanifest sitemap.xml; git ls-tree --name-only HEAD data/ | grep '\.json$')
  # shellcheck disable=SC2086
  git archive HEAD $FILES | tar -x -m -C "$W"
  local rc=0
  (
    cd "$W"
    git add -A
    [ "$(cat CNAME)" = "info.sahaj.si" ] || { echo "deploy: CNAME changed, refusing"; exit 2; }
    if git diff --cached --quiet; then echo "deploy: gh-pages already matches $SRC"; exit 0; fi
    echo "deploy from $SRC: $(git diff --cached --name-status | awk '{print $1}' | sort | uniq -c | tr '\n' ' ')"
    git commit -q -m "deploy: $MSG" -m "Built from info.sahaj.si $SRC." ${DEPLOY_TRAILER:+-m "$DEPLOY_TRAILER"}
    git push -q origin HEAD:gh-pages
    git log --oneline -1
  ) || rc=$?
  git worktree remove --force "$W"
  return $rc
}

# Another deploy may land between fetch and push; then fetch again and retry once.
attempt || { echo "deploy: retrying"; fetch; attempt; }
