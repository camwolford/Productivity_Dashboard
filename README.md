# Productivity Dashboard - Native Desktop App

## 🎯 A Comprehensive Productivity Management System

Native macOS desktop application for researchers and professionals who need to balance execution-focused work with incubation of future ideas. Built with Electron for perfect focus timer reliability.

## ✨ Key Features

### **🎯 Advanced Focus System**
- **Background Timers**: Focus sessions continue running when you switch views or apps
- **Floating Timer Widget**: Always-visible timer in top-right corner when outside focus mode  
- **Computer Sleep Detection**: Auto-pauses when computer sleeps, resumes when you're back
- **Never Throttled**: Timers run in Electron's main process for perfect accuracy

### **📊 Project Management**
- **Theme-Based Organization**: Group projects by PhD, Startup, Personal, Work, Health, Learning
- **Hierarchical Structure**: Projects can have sub-projects and nested tasks
- **Multiple Views**: Project view, Kanban board view, Focus mode, Archive
- **Execution vs Incubation**: Separate boards for active work vs future ideas

### **📈 Analytics & Insights**  
- **Monthly Heatmaps**: Visual activity tracking with month-by-month calendar view
- **Daily Stats**: Completed tasks, time logged, focus sessions, streaks
- **Incubation Tracking**: Monitor idea development over time
- **Goal Setting**: Set and track personal productivity goals

### **🍎 Native Desktop Experience**
- **Native Notifications**: System alerts for focus session completions
- **Menu Bar Integration**: Native keyboard shortcuts (⌘+F, ⌘+N, etc.)
- **Offline First**: Works completely without internet
- **Professional Feel**: True desktop app, not a web wrapper

### **Keyboard Shortcuts**
- `⌘+N` - New Project
- `⌘+F` - Toggle Focus Mode
- `⌘+1` - Switch to Project View
- `⌘+2` - Switch to Board View

## 🚀 Getting Started

### **Installation**
1. Download the appropriate DMG file:
   - Intel Macs: `Productivity Dashboard-1.0.0.dmg`
   - Apple Silicon Macs: `Productivity Dashboard-1.0.0-arm64.dmg`
2. Double-click the DMG file
3. Drag the app to your Applications folder
4. Launch from Applications or Spotlight

### **Development Setup**
```bash
# Install dependencies
npm install

# Run in development mode (with dev tools)
npm run dev

# Run in production mode
npm start

# Build new DMG files
npm run build-mac
```

### **First Time Setup**
1. Create your first project using the **New Project** button
2. Choose a theme (PhD, Startup, Personal, etc.) for organization  
3. Add tasks to your project
4. Switch to **Focus Mode** to start a focus session
5. Try switching to **Board View** - notice the floating timer continues!

## 🔧 Project Structure

```
Productivity_Dashboard/
├── main.js              # Electron main process
├── index.html           # App interface  
├── script.js            # App logic (~3200 lines)
├── style.css            # Complete styling
├── package.json         # Dependencies & build config
├── app_icon.png         # App icon source
├── assets/icon.icns     # macOS app icon
├── .gitignore           # Git ignore rules
├── CLAUDE.md            # Development documentation
└── README.md            # This file
```

## 📊 Data Storage

- **Local Storage**: All data stored locally in browser storage
- **No Server**: Completely offline, no data leaves your computer  
- **Backup**: Data persists across app restarts and updates
- **Export**: Analytics can be viewed and saved as needed

## 🔄 Development Notes

### **Node Modules**
The `node_modules/` folder contains development dependencies but is excluded from git. To set up development:
```bash
npm install  # Recreates node_modules from package-lock.json
```

### **Building**
- `npm run build-mac` creates universal DMG files for both Intel and Apple Silicon Macs
- Built apps are code-signed (though unsigned in development)
- DMG files are ready for distribution

## 🎉 Mission Accomplished

This productivity dashboard now operates as a **true native desktop application** with:
- ✅ Perfect focus timer reliability (never stops running)
- ✅ Floating timer widget for seamless multitasking  
- ✅ Beautiful month-by-month analytics heatmaps
- ✅ Professional native desktop experience
- ✅ Zero internet dependency

**Focus sessions now continue perfectly while you work in other apps!** 🚀