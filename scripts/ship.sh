#!/usr/bin/env bash
set -euo pipefail

# ── 1. 要求 commit message ──────────────────────────────────
MSG="${1:-}"
if [ -z "$MSG" ]; then
  echo "⚠️  用法: npm run ship -- \"你的 commit message\""
  echo "   範例: npm run ship -- \"feat: 新增每日挑戰 modifierTags 顯示\""
  exit 1
fi

# ── 2. 品質檢查 ─────────────────────────────────────────────
echo "🔍 Running lint + typecheck + tests..."
npm run lint
npm run typecheck
npm test

# ── 3. Git commit + push ────────────────────────────────────
echo "📦 Committing & pushing..."
git add -A
git commit -m "$MSG"
git push

# ── 4. Release builds ──────────────────────────────────────
echo "🚀 Building release targets..."
npm run release:all

echo "✅ Ship complete!"
