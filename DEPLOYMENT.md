# Deployment Guide

## Overview
Releases and auto-updates are handled directly from this public repository.
The application uses GitHub Releases as the update server.

## Release Workflow
1. **Increment version** in `package.json`.
2. **Build artifacts**:
   ```bash
   npm run build:mac
   ```
3. **Create a Git tag** and push it:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
4. **Draft a GitHub Release** for the tag and upload:
   - `dist/Productivity Dashboard-X.Y.Z.dmg`
   - `dist/Productivity Dashboard-X.Y.Z-arm64.dmg`
   - `dist/latest-mac.yml`

## Auto-Updates
Once the release is published, existing installations will download and
install the update automatically—no access token required.

## Testing
After publishing a release:
1. Launch the app.
2. Verify it detects and installs the new version.
