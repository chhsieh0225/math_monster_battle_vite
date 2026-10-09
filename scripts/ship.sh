#!/usr/bin/env bash
set -euo pipefail

# ── 1. 要求 commit message ──────────────────────────────────
MSG="${1:-}"
if [ -z "$MSG" ]; then
  echo "⚠️  用法: npm run ship -- \"你的 commit message\""
  echo "   範例: npm run ship -- \"feat: 新增每日挑戰 modifierTags 顯示\""
  exit 1
fi

# Stage only the intended source changes before shipping. Packaging comes first,
# so a failed quality gate/build must not publish a broken revision.
if git diff --cached --quiet; then
  echo "Stage the intended changes with git add before running ship."
  exit 1
fi
if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "Unstaged changes exist. Stage only the intended release before shipping."
  exit 1
fi
npm run package:release

# ── 3. Git commit + push ────────────────────────────────────
echo "📦 Committing & pushing..."
git commit -m "$MSG"
git push

echo "✅ Ship complete!"
