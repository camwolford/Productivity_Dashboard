# Deployment Guide

## Overview
This project uses a dual-repository setup:
- **Private repo** (`Productivity_Dashboard`): Development, source code, sensitive configs
- **Public repo** (`productivity-dashboard-public`): Distribution only, releases, public downloads

## Workflow

### 1. Development (Private Repo)
Work on features and fixes in this private repository as normal:
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

### 2. Deploy to Public Repo
When ready to release, run the deployment script:
```bash
npm run deploy
```

This script:
- Clones the public repository
- Syncs specified files (excludes sensitive files)
- Creates GitHub Actions workflow
- Sets up README and .gitignore for public repo
- Commits and pushes changes

### 3. Automatic Build & Release
GitHub Actions in the public repo automatically:
- Builds the Electron app for macOS
- Creates a new release with the .dmg file
- Users get automatic updates from the public repo

### 4. Auto-Updates
The app is configured to check the public repo for updates:
- No GitHub token required (public repo)
- Users automatically get notified of new versions
- Seamless update process

## Files Synced to Public Repo
- `main.js`
- `index.html`
- `script.js`
- `style.css`
- `package.json`
- `package-lock.json`
- `assets/` directory

## Files Excluded from Public Repo
- Private development files
- Sensitive configurations
- This `DEPLOYMENT.md` file
- Original `.gitignore`

## Prerequisites
1. Create the public repository: `productivity-dashboard-public`
2. Set up SSH access to both repositories
3. Ensure you have push access to the public repo

## Testing
After deployment:
1. Check the public repo has the latest files
2. Verify GitHub Actions builds successfully
3. Test the app downloads and installs the update
4. Confirm auto-updater works correctly

## Troubleshooting
- If deployment fails, check SSH access to public repo
- Ensure public repo exists and you have push permissions
- GitHub Actions may need a few minutes to complete the build