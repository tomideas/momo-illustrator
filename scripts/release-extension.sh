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
ZIP="/tmp/${ZIP_NAME}"

echo "Version: $VERSION"
echo "Package: $ZIP"

rm -f "$ZIP"
(
  cd "$REPO_ROOT/extension"
  zip -r "$ZIP" com.tomideas.illustratortools \
    -x "*.DS_Store" \
    -x "*/.DS_Store" \
    -x "*/._*" \
    -x "com.tomideas.illustratortools/.debug" \
    -x "com.tomideas.illustratortools/.debug/*"
)

echo "Created: $ZIP ($(du -h "$ZIP" | awk '{print $1}')"

if $ZIP_ONLY; then
  exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI required (or use --zip-only)" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  export GH_TOKEN="$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')"
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
1. 下载 \`${ZIP_NAME}\` 并解压，得到 \`com.tomideas.illustratortools\` 文件夹
2. 复制到 CEP 扩展目录（见 README）
3. 开启 PlayerDebugMode 后重启 Illustrator
EOF
fi

cat >> "$NOTES" <<EOF

### 附件
- \`${ZIP_NAME}\` — 解压后将 \`com.tomideas.illustratortools\` 放入 CEP/extensions/
EOF

if gh release view "$TAG" --repo "$GH_REPO" >/dev/null 2>&1; then
  echo "Release $TAG exists; uploading asset ..."
  gh release upload "$TAG" "$ZIP" --repo "$GH_REPO" --clobber
else
  echo "Creating release $TAG ..."
  gh release create "$TAG" "$ZIP" \
    --repo "$GH_REPO" \
    --title "Momo Tools ${TAG}" \
    --notes-file "$NOTES"
fi

rm -f "$NOTES"
echo "Done: https://github.com/${GH_REPO}/releases/tag/${TAG}"
