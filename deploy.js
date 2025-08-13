#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PUBLIC_REPO = 'https://github.com/camwolford/productivity-dashboard-public.git';
const TEMP_DIR = './temp-public-repo';
const VERSION_FILE = './package.json';

// Files to sync to public repo (exclude sensitive files)
const FILES_TO_SYNC = [
  'main.js',
  'index.html',
  'script.js', 
  'style.css',
  'package.json',
  'package-lock.json',
  'app_icon.jpg'
];

// Directories to sync
const DIRS_TO_SYNC = [
  'assets'
];

console.log('🚀 Starting deployment to public repository...');

try {
  // Clean up any existing temp directory
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }

  // Create temp directory and initialize
  console.log('📥 Setting up deployment directory...');
  execSync(`mkdir -p ${TEMP_DIR}`);
  process.chdir(TEMP_DIR);
  execSync('git init');
  execSync(`git remote add origin ${PUBLIC_REPO}`);
  process.chdir('..');

  // Copy files
  console.log('📋 Copying files to public repo...');
  FILES_TO_SYNC.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, path.join(TEMP_DIR, file));
      console.log(`✅ Copied ${file}`);
    }
  });

  // Copy directories
  DIRS_TO_SYNC.forEach(dir => {
    if (fs.existsSync(dir)) {
      execSync(`cp -r ${dir} ${TEMP_DIR}/`);
      console.log(`✅ Copied ${dir}/`);
    }
  });

  // Create/update .github/workflows directory
  const workflowDir = path.join(TEMP_DIR, '.github', 'workflows');
  if (!fs.existsSync(workflowDir)) {
    fs.mkdirSync(workflowDir, { recursive: true });
  }

  // Create GitHub Actions workflow
  const workflowContent = `name: Build and Release

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: macos-latest
    permissions:
      contents: write

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build for macOS
      run: npm run build:mac
      env:
        GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}

    - name: Get version
      id: version
      run: echo "version=v\$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

    - name: Create Release
      if: github.ref == 'refs/heads/main'
      uses: softprops/action-gh-release@v2
      with:
        tag_name: \${{ steps.version.outputs.version }}
        name: Productivity Dashboard \${{ steps.version.outputs.version }}
        files: |
          dist/*.dmg
        generate_release_notes: true
        token: \${{ secrets.GITHUB_TOKEN }}
`;

  fs.writeFileSync(path.join(workflowDir, 'release.yml'), workflowContent);
  console.log('✅ Created GitHub Actions workflow');

  // Copy public .gitignore
  if (fs.existsSync('.gitignore.public')) {
    fs.copyFileSync('.gitignore.public', path.join(TEMP_DIR, '.gitignore'));
    console.log('✅ Copied .gitignore for public repo');
  }

  // Create README for public repo
  const readmeLines = [
    '# Productivity Dashboard',
    '',
    'A comprehensive native desktop application for project management, task tracking, and focus sessions.',
    '',
    '## Download',
    '',
    'Download the latest version from the [Releases](https://github.com/camwolford/productivity-dashboard-public/releases) page.',
    '',
    '## Features',
    '',
    '- **Project Management**: Hierarchical project organization with themes',
    '- **Task Tracking**: Comprehensive task management with subtasks and priorities',
    '- **Focus Sessions**: Built-in timer with pause/resume functionality',
    '- **Pomodoro Timer**: Structured work/break cycles',
    '- **Analytics**: Track your productivity over time',
    '- **Native Desktop App**: Built with Electron for macOS',
    '',
    '## Installation',
    '',
    '1. Download the latest .dmg file from releases',
    '2. Open the .dmg file',
    '3. Drag the app to your Applications folder',
    '4. Launch Productivity Dashboard',
    '',
    '## Auto-Updates',
    '',
    'The app will automatically check for and install updates from this repository.',
    '',
    '---',
    '',
    '*This is the public distribution repository. Source code is maintained privately.*'
  ];
  
  fs.writeFileSync(path.join(TEMP_DIR, 'README.md'), readmeLines.join('\n'));
  console.log('✅ Created README.md');

  // Get current version and commit changes
  const packageJson = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  const version = packageJson.version;

  // Commit and push changes
  process.chdir(TEMP_DIR);
  
  try {
    // Fetch remote changes and handle merge
    try {
      execSync('git fetch origin main');
      console.log('📥 Fetched remote changes');
      // Check if we need to merge
      try {
        execSync('git merge origin/main');
      } catch (mergeError) {
        // If merge fails due to unrelated histories, force push instead
        console.log('⚠️ Remote has different history, will force push');
      }
    } catch (fetchError) {
      // If remote doesn't exist yet or other fetch issues, continue
      console.log('🔍 Remote repository might be empty or this is first deployment');
    }

    execSync('git add .');
    execSync(`git commit -m "Deploy version ${version}"`);
    execSync('git branch -M main');
    
    // Try normal push first, then force push if needed
    try {
      execSync('git push -u origin main');
    } catch (pushError) {
      console.log('⚠️ Normal push failed, force pushing...');
      execSync('git push -u origin main --force');
    }
    console.log(`🎉 Successfully deployed version ${version} to public repository!`);
  } catch (error) {
    if (error.message.includes('nothing to commit')) {
      console.log('📝 No changes to deploy');
    } else {
      throw error;
    }
  }

  // Clean up
  process.chdir('..');
  execSync(`rm -rf ${TEMP_DIR}`);

  console.log('✨ Deployment complete!');
  console.log(`🔗 Public repo: https://github.com/camwolford/productivity-dashboard-public`);
  console.log(`📦 Releases: https://github.com/camwolford/productivity-dashboard-public/releases`);

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  // Clean up on error
  if (fs.existsSync(TEMP_DIR)) {
    execSync(`rm -rf ${TEMP_DIR}`);
  }
  
  process.exit(1);
}