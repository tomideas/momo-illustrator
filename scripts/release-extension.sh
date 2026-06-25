#!/usr/bin/env bash
# Package extension/com.tomideas.illustratortools → zip → GitHub Release
# Usage: ./scripts/release-extension.sh [--zip-only]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="$REPO_ROOT/extension/com.tomideas.illustratortools"
MANIFEST="$EXT_DIR/CSXS/manifest.xml"
GH_REPO="${GH_REPO:-tomideas/momo-illustrator}"
ZIP_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --zip-only) ZIP_ONLY=true ;;
  esac
done

if [[ ! -f "$MANIFEST" ]]; then
  echo "error: manifest not found: $MANIFEST" >&2
  exit 1
fi

VERSION="$(sed -n 's/.*ExtensionBundleVersion="\([^"]*\)".*/\1/p' "$MANIFEST" | head -1)"
if [[ -z "$VERSION" ]]; then
  echo "error: cannot read ExtensionBundleVersion from manifest" >&2
  exit 1
fi

TAG="v${VERSION}"
ZIP_NAME="momo-tools-${VERSION}-cep.zip"
ZXP_NAME="momo-tools-${VERSION}.zxp"
ZIP="/tmp/${ZIP_NAME}"
ZXP="/tmp/${ZXP_NAME}"

echo "Version: $VERSION"
echo "Package: $ZIP"
echo "         $ZXP"

pack_extension() {
  local out="$1"
  rm -f "$out"
  (
    cd "$REPO_ROOT/extension"
    zip -r "$out" com.tomideas.illustratortools \
      -x "*.DS_Store" \
      -x "*/.DS_Store" \
      -x "*/._*" \
      -x "com.tomideas.illustratortools/.debug" \
      -x "com.tomideas.illustratortools/.debug/*" \
      -x "com.tomideas.illustratortools/PROJECT_INFO.md" \
      -x "com.tomideas.illustratortools/jsx/scripts/research_*.jsx" \
      -x "com.tomideas.illustratortools/jsx/scripts/debug_*.jsx" \
      -x "com.tomideas.illustratortools/jsx/scripts/diagnose_*.jsx"
  )
}

pack_extension "$ZIP"
pack_extension "$ZXP"

echo "Created: $ZIP ($(du -h "$ZIP" | awk '{print $1}')"
echo "Created: $ZXP ($(du -h "$ZXP" | awk '{print $1}')"

if $ZIP_ONLY; then
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI required (or use --zip-only)" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  export GH_TOKEN="$(security find-internet-password -s github.com -a designkidd -w 2>/dev/null || true)"
  if [[ -z "${GH_TOKEN:-}" ]]; then
    export GH_TOKEN="$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')"
  fi
fi

NOTES="$(mktemp)"
if [[ -f "$REPO_ROOT/CHANGELOG.md" ]]; then
  awk -v ver="$VERSION" '
    BEGIN { found=0 }
    /^\#\# \[/ {
      if (found) exit
      if ($0 ~ "\\[" ver "\\]") found=1
    }
    found { print }
  ' "$REPO_ROOT/CHANGELOG.md" > "$NOTES" || true
fi

if [[ ! -s "$NOTES" ]]; then
  cat > "$NOTES" <<EOF
## ${TAG}

Momo Tools CEP extension for Adobe Illustrator.

### 安装
1. **ZXP（推荐）**：下载 \`${ZXP_NAME}\`，用 ZXP/UXP Installer 拖入安装
2. **ZIP**：下载 \`${ZIP_NAME}\`，解压后将 \`com.tomideas.illustratortools\` 放入 CEP/extensions/
3. 开启 PlayerDebugMode 后重启 Illustrator
EOF
fi

cat >> "$NOTES" <<EOF

### 附件
- \`${ZXP_NAME}\` — ZXP Installer 拖入安装（方法一）
- \`${ZIP_NAME}\` — 解压后手动放入 CEP/extensions/（方法二）
EOF

if gh release view "$TAG" --repo "$GH_REPO" >/dev/null 2>&1; then
  echo "Release $TAG exists; uploading assets ..."
  gh release upload "$TAG" "$ZIP" "$ZXP" --repo "$GH_REPO" --clobber
else
  echo "Creating release $TAG ..."
  gh release create "$TAG" "$ZIP" "$ZXP" \
    --repo "$GH_REPO" \
    --title "Momo Tools ${TAG}" \
    --notes-file "$NOTES"
fi

rm -f "$NOTES"
echo "Done: https://github.com/${GH_REPO}/releases/tag/${TAG}"
