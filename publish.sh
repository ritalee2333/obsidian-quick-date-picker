#!/bin/bash
# =============================================================================
# One-click publish script for obsidian-quick-date-picker
# =============================================================================
# Usage:
#   cd /Users/rita.lee/Code/obsidian-quick-date-picker
#   ./publish.sh [version]
#
# If version is not provided, reads from manifest.json
# =============================================================================

set -euo pipefail

RELEASE_REPO="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[publish]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[publish]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[publish]${NC} $1"; }
log_error() { echo -e "${RED}[publish]${NC} $1"; }
log_step()  { echo -e "${CYAN}[Step $1]${NC} $2"; }

cd "$RELEASE_REPO"

# =============================================================================
# Step 0: Determine version
# =============================================================================
MANIFEST_VERSION=$(jq -r '.version' manifest.json)
VERSION="${1:-$MANIFEST_VERSION}"

log_step "0" "Publishing version: $VERSION"

# Validate version format (x.y.z, no 'v' prefix)
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_error "Invalid version format: '$VERSION'"
    log_info "Must be semantic version like '1.1.2' (no 'v' prefix)"
    exit 1
fi

# Update manifest.json and package.json if version argument provided
if [ -n "${1:-}" ] && [ "$1" != "$MANIFEST_VERSION" ]; then
    log_info "Updating manifest.json and package.json to $VERSION"
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" manifest.json
    sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
fi

# =============================================================================
# Step 1: Pre-flight checks
# =============================================================================
log_step "1" "Pre-flight checks"

# Check git status
if [ -n "$(git status --porcelain)" ]; then
    log_warn "Uncommitted changes detected:"
    git status --short
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Check if tag already exists
if git rev-parse "$VERSION" >&/dev/null 2>&1; then
    log_error "Tag '$VERSION' already exists!"
    log_info "Existing tags:"
    git tag -l | sort -V | tail -5
    exit 1
fi

# Check if release already exists
if gh release view "$VERSION" >&/dev/null 2>&1; then
    log_error "GitHub Release '$VERSION' already exists!"
    exit 1
fi

# Check required files exist
for file in main.js manifest.json; do
    if [ ! -f "$file" ]; then
        log_error "Required file missing: $file"
        log_info "Run: npm run build"
        exit 1
    fi
done

log_ok "Pre-flight checks passed"

# =============================================================================
# Step 2: Build
# =============================================================================
log_step "2" "Building plugin"

if [ ! -d "node_modules" ]; then
    log_warn "node_modules not found, running npm install..."
    npm install
fi

npm run build
log_ok "Build complete"

# =============================================================================
# Step 3: Commit changes
# =============================================================================
log_step "3" "Committing changes"

if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "release: v$VERSION"
    log_ok "Committed: release: v$VERSION"
else
    log_info "No changes to commit"
fi

# =============================================================================
# Step 4: Create tag
# =============================================================================
log_step "4" "Creating tag"

git tag -a "$VERSION" -m "Release $VERSION"
log_ok "Tag created: $VERSION"

# =============================================================================
# Step 5: Push to GitHub
# =============================================================================
log_step "5" "Pushing to GitHub"

git push origin main
git push origin "$VERSION"
log_ok "Pushed to GitHub"

# =============================================================================
# Step 6: Create GitHub Release
# =============================================================================
log_step "6" "Creating GitHub Release"

# Generate release notes from git log since last tag
LAST_TAG=$(git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo "")
if [ -n "$LAST_TAG" ]; then
    NOTES=$(git log "$LAST_TAG..HEAD" --pretty=format:"- %s" | grep -v "^release:" || true)
else
    NOTES="Initial release"
fi

if [ -z "$NOTES" ]; then
    NOTES="Release $VERSION"
fi

gh release create "$VERSION" \
    --title "$VERSION" \
    --notes "$NOTES" \
    main.js manifest.json styles.css

log_ok "GitHub Release created: https://github.com/ritalee2333/obsidian-quick-date-picker/releases/tag/$VERSION"

# =============================================================================
# Done
# =============================================================================
echo ""
echo "=========================================="
echo "      🎉 Publish Complete!"
echo "=========================================="
echo ""
echo "Version: $VERSION"
echo "Release: https://github.com/ritalee2333/obsidian-quick-date-picker/releases/tag/$VERSION"
echo ""
echo "Next: Go to community.obsidian.md and publish your plugin!"
echo "=========================================="
