# Productivity Dashboard - Claude Context

## Overview
A comprehensive **native desktop application** (Electron-based) with project management, task tracking, focus sessions, Pomodoro timers, and analytics. Built with vanilla HTML, CSS, and JavaScript, packaged as a native macOS app.

**IMPORTANT**: This is a desktop Electron app, not a web application. The HTML/CSS/JS files are source code that gets packaged into a native macOS application for distribution.

## Architecture

### File Structure
- `main.js` - Electron main process (app entry point)
- `index.html` - Main application interface (packaged into app)
- `script.js` - Core application logic (~3200 lines, packaged into app)
- `style.css` - Complete styling and responsive design (packaged into app)
- `package.json` - Dependencies and build configuration for Electron
- `dist/` - Built Electron app packages (.dmg files for distribution)
- `.github/copilot-instructions.md` - Development patterns and conventions

### Key Data Structures
```javascript
// Main project structure
projects = {
  [id]: {
    id, name, description, theme, createdAt, updatedAt,
    tasks: [], parentId, childProjects: []
  }
}

// Theme collapse state tracking
themeCollapsedState = {
  [themeName]: boolean // true if theme is collapsed
}

// Focus session tracking
focusSession = {
  isActive: false, isPaused: false,
  startTime: null, currentTime: 0, pausedTime: 0,
  totalFocusTime: 0, sessionsToday: 0, lastSessionDate: null
}

// Pomodoro session tracking  
pomodoroSession = {
  isActive: false, taskId: null, projectId: null,
  currentPhase: 'work', // 'work', 'shortBreak', 'longBreak'
  currentTime: 0, completedCycles: 0
}
```

### Core Views System
The app has 4 primary views controlled by `currentView` variable:
- `'project'` - Default hierarchical project view
- `'board'` - Kanban-style board view  
- `'focus'` - Focus mode with timer and priority tasks
- `'archive'` - Archived projects and tasks

**Critical Pattern**: All state changes must call `saveState()` and `updateDisplay()`.

## Key Features & Implementation

### Focus Mode Timer System (Recently Enhanced)
**Location**: `script.js:1577-1690`

The focus timer supports proper pause/resume functionality:
- `startFocusSession()` - Starts new session or resumes from pause
- `pauseFocusSession()` - Pauses and preserves accumulated time  
- `resumeFocusSession()` - Continues from paused state
- `toggleFocusPause()` - Single handler for pause/resume button
- `updateFocusPauseButton()` - Updates button icon (pause ⏸️ / play ▶️)

**Key Properties**:
- `focusSession.isPaused` - Tracks pause state
- `focusSession.pausedTime` - Accumulates time when paused
- Button dynamically changes icon based on session state

### Focus Mode Enhancements (Added 2025-08-09)
**Location**: `script.js:282-320, 372-385, 566-589`

**New Features**:
1. **Execution Board Tasks in Focus Mode**: Focus mode now shows all execution board tasks instead of high priority tasks
2. **Temporary Exit with Auto-Return**: Can exit focus mode to edit tasks/projects and automatically returns
3. **Computer Sleep Detection**: Focus session pauses when computer is closed/minimized using Page Visibility API

**Implementation Details**:
- `returnToFocusMode` - Global flag to track when to auto-return to focus mode
- Modified view switching functions to set auto-return flag when exiting focus mode temporarily
- Auto-return triggers after task edits, project edits, or modal closures
- `handleVisibilityChange()` - Pauses focus session when browser tab becomes hidden

### Task Management
**Hierarchical Structure**: Projects can have parent/child relationships
**Task Properties**: `id, description, completed, createdAt, dueDate, priority, subtasks[]`
**Subtasks**: Nested task structure with independent completion tracking

### Timer Systems
1. **Focus Timer**: Free-running session timer with pause/resume
2. **Pomodoro Timer**: Structured work/break cycles (25min work, 5min break)
3. **Task Timers**: Individual task-level time tracking

### Data Persistence
- `localStorage` for all application state
- `saveState()` - Persists projects and tasks
- `saveFocusStats()` - Persists focus session data
- `saveDailyStats()` - Persists daily progress metrics

### Analytics & Stats
- Daily completion tracking
- Focus time logging  
- Streak counting
- Monthly/yearly aggregations
- Visual charts and progress indicators

## Development Patterns

### State Management
```javascript
// Always follow this pattern for state changes:
// 1. Modify data
// 2. Save state  
// 3. Update display
someData.property = newValue;
saveState();
updateDisplay();
```

### View Rendering
Each view has dedicated render functions:
- `renderProjects()` - Project hierarchical view
- `renderBoards()` - Kanban board view
- `renderFocusView()` - Focus mode with timers
- `renderArchiveView()` - Archived items

### Event Handling
- Extensive use of event delegation
- Modal-based UI for forms and details
- Real-time updates via `setInterval` for timers

## Common Tasks

### Adding New Features
1. Define data structure additions
2. Implement business logic functions
3. Add UI rendering updates to appropriate render function
4. Update `saveState()` if new persistent data
5. Test state persistence across page reloads

### Timer Management
- All timers use `setInterval` with 1-second updates
- Always clear intervals with `clearInterval` when stopping
- Update UI in real-time during timer execution
- Persist timer state for recovery after page refresh

### UI Updates
- Use `updateDisplay()` to refresh entire view
- Individual updates should still call `updateDisplay()` for consistency
- Modal management via `classList.add/remove('active')`

## Testing Focus Timer
To test the pause/resume functionality:
1. Navigate to Focus mode view
2. Timer should start automatically
3. Click pause button - timer pauses, button shows play icon
4. Click play button - timer resumes, button shows pause icon
5. Verify time accumulates correctly across pause/resume cycles

## Known Issues
- TypeScript warnings for `webkitAudioContext` and `mozAudioContext` (browser compatibility)
- `renderBoardView` function name mismatch (should be `renderBoards`)

## Recent Improvements (2025-08-09)
- **Enhanced Project Editing**: Projects now preserve tasks when edited (explicit task preservation added)
- **Focus Mode Integration**: Focus mode displays execution board tasks instead of high priority tasks
- **Seamless Task Management**: Can temporarily exit focus mode for editing and auto-return
- **Computer Sleep Handling**: Focus session automatically pauses when computer is closed or browser minimized
- **Theme-Based Project Grouping**: Projects are now organized by themes (PhD, Startup, Personal, etc.) with expand/collapse functionality

### Theme-Based Project Organization (Added 2025-08-09)
**Location**: `script.js:821-889, style.css:2097-2207`

**Features**:
- Projects grouped by selectable themes (General, PhD, Startup, Personal, Work, Health, Learning)
- Each theme group has a colorful header with expand/collapse functionality
- Collapse states are persisted in localStorage
- Responsive design with theme-specific gradient colors

**Implementation Details**:
- `renderProjects()` - Groups projects by theme and renders theme sections
- `renderThemeGroup()` - Creates expandable theme containers with project counts
- `toggleTheme()` - Handles expand/collapse with state persistence
- Theme field added to project form and data structure
- Migration function adds default 'General' theme to existing projects

## Performance Notes
- Large task lists may impact rendering performance
- LocalStorage has ~5MB limit - consider cleanup for very active users
- Timer intervals continue running even when view is not active (intentional)

## Maintaining This Document
**IMPORTANT**: This CLAUDE.md file should be updated after every significant modification to the codebase.

### When to Update
- After adding new features or functionality
- After fixing bugs (especially architectural changes)
- After modifying data structures or state management
- After changing core patterns or conventions
- After adding new views or major UI changes

### What to Update
- Add new functions/features to relevant sections
- Update data structure examples if schemas change
- Document new development patterns or breaking changes
- Add new known issues or remove fixed ones
- Update file structure if new files are added
- Modify testing instructions for new functionality

### Update Process
1. **Read current CLAUDE.md** to understand existing documentation
2. **Identify changes** made during your session
3. **Update relevant sections** with new information
4. **Add new sections** if introducing entirely new concepts
5. **Remove outdated information** that no longer applies
6. **Test instructions** should reflect current functionality

### Example Updates
```markdown
// After adding a new timer feature:
### New Feature: Custom Timer Intervals (Added YYYY-MM-DD)
**Location**: `script.js:XXXX-YYYY`
- Allows users to set custom focus session durations
- Persisted in `focusSession.customDuration` property
- UI located in focus mode settings panel
```

## Recent Improvements (2025-08-12)

### UI/UX Consistency Enhancements
**Location**: `script.js:275-308, 1382, 1396`, `style.css:284-308`, `index.html:90-104`

1. **Professional Button Styling for Subtasks**: 
   - Added `.add-subtask-btn` and `.edit-subtask-btn` CSS classes
   - Green theme for add actions, blue theme for edit actions
   - Consistent hover effects and visual polish
   - Applied to both task and subtask action buttons

2. **Streamlined Board View**:
   - Removed `#add-exec` and `#add-incub` buttons from board view HTML
   - Removed corresponding JavaScript event handlers
   - Board view now focuses purely on task management

3. **Enhanced Task Modal System**:
   - Updated `openTaskModal()` to support both add and edit modes
   - Modified `handleTaskSubmit()` to handle creation and updates
   - Replaced simple prompts with professional modal interfaces
   - Fixed unwanted focus mode redirects

4. **Improved Subtask Management**:
   - Enhanced `showCustomPrompt()` to support default values
   - Updated `addSubtask()` and `editSubtask()` to use improved prompts
   - Consistent error handling and user experience

5. **Subtask Display Fix**:
   - Removed outdated `.subtask-list` and `.subtask-item` styles
   - Ensures current subtask formatting renders correctly in app builds

### Key Technical Changes
- **CSS Classes**: Added professional styling classes for consistency
- **Modal System**: Unified all task operations under professional modal interface
- **Event Handling**: Streamlined button event delegation
- **Focus Mode**: Fixed redirect issues when adding/editing tasks

## Recent Improvements (2025-08-17)

### Auto-Update Token Handling
**Location**: `main.js:360-388`, `index.html:24-26`, `script.js:35-44`, `style.css:2623-2633`
- Auto-updater now falls back to public GitHub releases when no token is present
- Renderer displays a banner when updates are disabled, clarifying tokens are only needed for private builds

This living document approach ensures future Claude instances have accurate, up-to-date context about the codebase and can work more effectively without having to rediscover patterns and structures.