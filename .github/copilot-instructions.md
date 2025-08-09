# Campbell's Productivity Dashboard - AI Agent Instructions

## Architecture Overview

This is a sophisticated client-side productivity management system built with vanilla JavaScript, implementing a dual-view project management paradigm: **Execution ↔ Incubation workflow**.

### Core Design Philosophy
- **Project-centric hierarchy**: Projects → Tasks → Subtasks (3-level nesting)
- **Dual workflow states**: Execution (active work) vs Incubation (future ideas)
- **Local-first**: Uses localStorage for persistence, no backend required
- **View-based organization**: 4 distinct views for different productivity contexts

## Key Architectural Components

### State Management (`script.js` lines 1-50)
```javascript
let projects = {};           // Main project data store
let archivedProjects = {};   // Completed/archived projects
let currentView = 'project'; // 'project', 'board', 'focus', 'archive'
```

**Critical Pattern**: All state changes must call `saveState()` and `updateDisplay()` to maintain consistency.

### Project Hierarchy System
- **Nested Projects**: Projects can have `parentId` and `childProjects[]` arrays
- **Rendering Logic**: `renderProjectHierarchy()` recursively renders parent-child relationships with visual indentation
- **Data Migration**: `migrateProjectsForNesting()` automatically adds hierarchy fields to existing data

### View System Architecture
**4 Primary Views**: Project View (default), Board View (Kanban), Focus Mode, Archive View
- Toggle between views using `updateDisplay()` which shows/hides `.view-container` elements
- Each view has dedicated rendering functions: `renderProjects()`, `renderBoards()`, `renderFocusView()`, `renderArchiveView()`

## Critical Development Patterns

### Drag & Drop System (`script.js` lines 2740+)
**Complex multi-type dragging**: Tasks, subtasks, and projects all draggable with different drop targets
```javascript
// Pattern: Every draggable element needs these calls
makeDraggable(element, 'task', { taskId, projectId });
makeDropZone(element, 'task-position', { taskId, projectId });
```

**Key**: Drag state stored in global `dragState` object, reset on drop/cancel.

### ID Generation & Data Structure
- **Unique IDs**: `project_${nextId++}`, `task_${nextId++}`, `subtask_${nextId++}`
- **Required Fields**: All entities need `id`, `createdAt`, projects need `status` ('execution'|'incubation')
- **Task Structure**: Tasks can have `subtasks[]` array, subtasks cannot have children

### Modal Management Pattern
```javascript
// Standard pattern for all modals
function openProjectModal(project = null) {
  // Populate form fields...
  modal.classList.add('active');
}
```

## Essential Developer Workflows

### Adding New Features
1. **State Updates**: Modify global state objects, add to `saveState()`/`loadState()`
2. **UI Integration**: Add DOM elements to `index.html`, wire events in `setupEventListeners()`
3. **View Updates**: Update relevant render functions to display new data
4. **Data Migration**: Add migration logic in `loadState()` for backward compatibility

### Debugging Data Issues
- **Inspect localStorage**: `localStorage.getItem('productivity_projects')`
- **Force reload**: Delete localStorage keys to trigger fresh data load
- **Check migrations**: Look for `migrate*` functions that transform legacy data

### Testing Drag & Drop
- **Debug State**: Check `dragState` object during drag operations
- **Drop Zones**: Ensure `makeDropZone()` called after DOM updates
- **Timing**: Use `setTimeout(() => setupDragDrop(), 0)` after DOM manipulation

## Project-Specific Conventions

### Time Tracking Integration
- Projects have `estimatedTime` and `actualTime` fields (hours)
- Tasks inherit time tracking from Pomodoro sessions via `pomodoroSession.linkedTaskId`
- **Pattern**: Time updates must call `updateDailyStats()` for streak tracking

### Focus Mode & Analytics
- **Focus Sessions**: Tracked in `focusSession` global object with pause/resume capability
- **Daily Stats**: Persistent streak tracking in `dailyStats.streakDays`
- **Charts**: Uses Chart.js for analytics display in stats modal

### Theme System
- **CSS Custom Properties**: All theming via CSS variables in `:root` and `[data-theme="dark"]`
- **Persistence**: Theme choice saved to localStorage as `currentTheme`
- **Toggle**: `toggleTheme()` function switches classes and saves preference

### Data Export/Import Capabilities
- **JSON Structure**: Projects stored as nested object with hierarchical references
- **Legacy Migration**: `migrateLegacyTasks()` converts old flat task lists to project structure
- **Backup**: All data exportable via JSON for external backup

## Integration Points

### External Dependencies
- **Font Awesome 6.4.0**: For all icons (loaded via CDN)
- **Chart.js**: For analytics charts (loaded via CDN)
- **No build system**: Pure vanilla JS, CSS, HTML

### Browser APIs Used
- **localStorage**: Primary persistence layer
- **Drag & Drop API**: For task/project reorganization
- **Date API**: For due dates, time tracking, streaks

## Critical Files

- `script.js`: 3200+ lines, contains ALL application logic
- `index.html`: 400+ lines, defines all view structures and modals
- `style.css`: Professional glassmorphism design with dark mode support
- `tasks.json`: Seed data and data structure reference

**Note**: This is a single-page application with no routing - all functionality is view-based state management.
