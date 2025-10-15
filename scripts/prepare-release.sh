#!/bin/bash

# Obsidian Plugin Release Preparation Script
# Usage: ./scripts/prepare-release.sh <version>
# Example: ./scripts/prepare-release.sh 1.1.0

set -e

if [ -z "$1" ]; then
    echo "Error: Version number required"
    echo "Usage: ./scripts/prepare-release.sh <version>"
    echo "Example: ./scripts/prepare-release.sh 1.1.0"
    exit 1
fi

VERSION=$1

# Validate version format (semantic versioning)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version format. Use semantic versioning (e.g., 1.1.0)"
    exit 1
fi

echo "🚀 Preparing release v$VERSION"
echo ""

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Commit or stash them before creating a release"
    exit 1
fi

# Update version in package.json
echo "📝 Updating package.json..."
npm version "$VERSION" --no-git-tag-version

# Run version-bump script to update manifest.json and versions.json
echo "📝 Updating manifest.json and versions.json..."
npm run version

# Build the plugin
echo "🔨 Building plugin..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Verify required files exist
echo "✅ Verifying release files..."
for file in main.js manifest.json styles.css; do
    if [ ! -f "$file" ]; then
        echo "Error: Required file $file not found"
        exit 1
    fi
    echo "   ✓ $file"
done

echo ""
echo "✅ Release preparation complete!"
echo ""
echo "📦 Release files ready:"
echo "   - main.js"
echo "   - manifest.json"
echo "   - styles.css"
echo ""
echo "Next steps:"
echo "1. Review the changes:"
echo "   git diff"
echo ""
echo "2. Commit the version changes:"
echo "   git add ."
echo "   git commit -m \"Release v$VERSION\""
echo ""
echo "3. Create and push the tag:"
echo "   git tag $VERSION"
echo "   git push origin main --tags"
echo ""
echo "4. GitHub Actions will automatically create a draft release"
echo "5. Edit the release notes and publish the release on GitHub"
