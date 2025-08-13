// Electron detection and IPC setup
let isElectron = false;
let ipcRenderer = null;

// Elements for update notifications
const updateModal = document.getElementById('update-modal');
const updateMessage = document.getElementById('update-message');
const updateProgressBar = document.getElementById('update-progress');
const updateProgressText = document.getElementById('update-progress-text');
const updateFooter = document.getElementById('update-footer');

try {
  if (window.require) {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
    isElectron = true;
    console.log('Running in Electron environment');
  }
} catch (error) {
  console.log('Running in browser environment');
  isElectron = false;
}

// Set up Electron IPC listeners if in Electron environment
if (isElectron && ipcRenderer) {
  // Listen for focus timer updates from main process
  
  
  
  
  'focus-timer-update', (event, currentTime) => {
    focusSession.currentTime = currentTime;
    updateFocusTimer();
  });
  
  // Listen for menu shortcuts
  ipcRenderer.on('menu-new-project', () => {
    openProjectModal();
  });
  
  ipcRenderer.on('menu-focus-mode', () => {
    toggleFocusView();
  });
  
  ipcRenderer.on('menu-project-view', () => {
    currentView = 'project';
    updateDisplay();
    updateViewButtons();
  });
  
  ipcRenderer.on('menu-board-view', () => {
    currentView = 'board';
    updateDisplay();
    updateViewButtons();
  });
  
  // Auto-update events
  ipcRenderer.on('update-available', () => {
    if (updateModal) {
      updateMessage.textContent = 'A new update is available. Downloading...';
      if (updateProgressBar) updateProgressBar.style.width = '0%';
      if (updateProgressText) updateProgressText.textContent = '0%';
      if (updateFooter) updateFooter.style.display = 'none';
      updateModal.classList.add('active');
    }
  });

  ipcRenderer.on('download-progress', (event, progress) => {
    if (updateProgressBar) {
      const percent = Math.round(progress.percent);
      updateProgressBar.style.width = `${percent}%`;
      if (updateProgressText) updateProgressText.textContent = `${percent}%`;
    }
  });

  ipcRenderer.on('update-downloaded', () => {
    if (updateModal) {
      updateMessage.textContent = 'Update ready. Restart to install?';
      if (updateFooter) updateFooter.style.display = 'flex';
    }
  });

  ipcRenderer.on('update-error', (event, message) => {
    if (updateModal) {
      updateMessage.textContent = `Update error: ${message}`;
      if (updateFooter) updateFooter.style.display = 'none';
    } else {
      console.error('Update error:', message);
    }
}

// Native notification function
async function showNativeNotification(title, body, options = {}) {
  if (isElectron && ipcRenderer) {
    // Use Electron's native notifications
    return await ipcRenderer.invoke('show-notification', title, body, options);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    // Use browser notifications as fallback
    const notification = new Notification(title, { body, ...options });
    if (options.onClick) {
      notification.onclick = options.onClick;
    }
    return true;
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const notification = new Notification(title, { body, ...options });
      if (options.onClick) {
        notification.onclick = options.onClick;
      }
      return true;
    }
  }
  return false;
}

// Global State Management
let projects = {};
let archivedTasks = {};
let archivedProjects = {};
let currentView = 'project'; // 'project', 'board', 'focus', or 'archive'
let returnToFocusMode = false; // Track if we should auto-return to focus mode
let aspectCollapsedState = {}; // Track which aspects are collapsed: { aspectName: boolean }
let nextId = 1;

// Aspect and Dashboard Management
let availableAspects = ['General'];
let dashboardTitle = "Productivity Dashboard";
let dailyStats = {
  completedToday: 0,
  totalTimeToday: 0,
  streakDays: 0,
  lastActiveDate: null
};

let focusSession = {
  isActive: false,
  isPaused: false,
  startTime: null,
  currentTime: 0,
  pausedTime: 0,
  totalFocusTime: 0,
  sessionsToday: 0,
  lastSessionDate: null
};

let pomodoroSession = {
  isActive: false,
  currentPhase: 'work', // 'work', 'shortBreak', 'longBreak'
  timeRemaining: 0,
  currentRound: 0,
  linkedTaskId: null,
  linkedProjectId: null,
  settings: {
    workDuration: 25 * 60, // 25 minutes in seconds
    shortBreakDuration: 5 * 60, // 5 minutes
    longBreakDuration: 15 * 60, // 15 minutes
    roundsBeforeLongBreak: 4
  },
  completedRounds: 0,
  totalWorkTime: 0
};

let currentTheme = 'light'; // 'light' or 'dark'

// Day change detection system
let dayChangeDetector = {
  lastCheckedDate: null,
  checkInterval: null
};

let dailyPlanning = {
  lastPlanningDate: null,
  plannedTasks: [],
  hasDailyPlan: false
};

let analyticsData = {
  dailyProductivity: {}, // { 'YYYY-MM-DD': { timeLogged, tasksCompleted, focusSessions } }
  incubationActivity: {}, // { 'YYYY-MM-DD': numberOfTasksAddedToIncubation }
  lastUpdated: null
};

let productivityChart = null;

let goals = {};
let nextGoalId = 1;

// Undo/Redo System
let undoRedoSystem = {
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,
  isPerformingUndoRedo: false
};

// DOM Elements
const projectView = document.getElementById('project-view');
const boardView = document.getElementById('board-view');
const focusView = document.getElementById('focus-view');
const archiveView = document.getElementById('archive-view');
const projectsContainer = document.getElementById('projects-container');
const executionBoard = document.getElementById('execution-list');
const incubationBoard = document.getElementById('incubation-list');
const viewToggle = document.getElementById('view-toggle');
const focusToggle = document.getElementById('focus-toggle');
const archiveToggle = document.getElementById('archive-toggle');
const goalsToggle = document.getElementById('goals-toggle');
const themeToggle = document.getElementById('theme-toggle');
const statsToggle = document.getElementById('stats-toggle');
const addProjectBtn = document.getElementById('add-project-btn');
const modal = document.getElementById('modal');
const statsModal = document.getElementById('stats-modal');
const dailyPlannerModal = document.getElementById('daily-planner-modal');
const goalsModal = document.getElementById('goals-modal');
const goalFormModal = document.getElementById('goal-form-modal');
const projectForm = document.getElementById('project-form');
const closeModal = document.getElementById('close-modal');
const closeStats = document.getElementById('close-stats');
const cancelBtn = document.getElementById('cancel-btn');

// Initialize the application
function updateDashboardTitleDisplay() {
  const titleElement = document.getElementById('dashboard-title');
  if (titleElement) {
    titleElement.textContent = dashboardTitle;
  }
}

// Custom Prompt for Electron compatibility
function showCustomPrompt(message, callback, defaultValue = '') {
  // Create prompt modal elements
  const promptModal = document.createElement('div');
  promptModal.className = 'modal active';
  promptModal.id = 'custom-prompt-modal';
  
  promptModal.innerHTML = `
    <div class="modal-content">
      <h2>Input Required</h2>
      <p>${message}</p>
      <input type="text" id="custom-prompt-input" placeholder="Enter text..." value="${defaultValue}" />
      <div class="modal-actions">
        <button type="button" id="custom-prompt-cancel" class="cancel-btn">Cancel</button>
        <button type="button" id="custom-prompt-ok" class="primary-btn">OK</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(promptModal);
  
  const input = document.getElementById('custom-prompt-input');
  const okBtn = document.getElementById('custom-prompt-ok');
  const cancelBtn = document.getElementById('custom-prompt-cancel');
  
  // Focus on input and select all text if there's a default value
  setTimeout(() => {
    input.focus();
    if (defaultValue) {
      input.select();
    }
  }, 100);
  
  // Handle OK button
  okBtn.addEventListener('click', () => {
    const value = input.value.trim();
    document.body.removeChild(promptModal);
    callback(value);
  });
  
  // Handle Cancel button
  cancelBtn.addEventListener('click', () => {
    document.body.removeChild(promptModal);
    callback(null);
  });
  
  // Handle Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      document.body.removeChild(promptModal);
      callback(value);
    } else if (e.key === 'Escape') {
      document.body.removeChild(promptModal);
      callback(null);
    }
  });
  
  // Handle clicking outside modal
  promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) {
      document.body.removeChild(promptModal);
      callback(null);
    }
  });
}

// Help System
function showHelpModal() {
  const helpModal = document.getElementById('help-modal');
  helpModal.classList.add('active');
}

function closeHelpModal() {
  const helpModal = document.getElementById('help-modal');
  helpModal.classList.remove('active');
}

function init() {
  loadState();
  loadDailyStats();
  loadFocusStats();
  loadPomodoroStats();
  loadTheme();
  loadDailyPlanning();
  loadAnalyticsData();
  loadGoals();
  loadDayChangeDetector();
  setupEventListeners();
  updateDashboardTitleDisplay();
  updateProjectThemeOptions();
  updateDisplay();
  updateDailyStats();
  updateFloatingTimerVisibility();
  updateFloatingTimerControls();
  
  // Initialize undo/redo system
  initializeUndoRedo();
  
  // Initialize day change detection
  initializeDayChangeDetector();
  
  // Check if daily planning is needed
  checkDailyPlanning();
  
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  
}

// Event Listeners
function setupEventListeners() {
  viewToggle.addEventListener('click', toggleView);
  focusToggle.addEventListener('click', toggleFocusView);
  archiveToggle.addEventListener('click', toggleArchiveView);
  goalsToggle.addEventListener('click', showGoalsModal);
  themeToggle.addEventListener('click', toggleTheme);
  statsToggle.addEventListener('click', showStats);
  
  // Help button listeners
  const helpBtn = document.getElementById('help-btn');
  const closeHelp = document.getElementById('close-help');
  const closeHelpFooter = document.getElementById('close-help-footer');
  
  if (helpBtn) helpBtn.addEventListener('click', showHelpModal);
  if (closeHelp) closeHelp.addEventListener('click', closeHelpModal);
  if (closeHelpFooter) closeHelpFooter.addEventListener('click', closeHelpModal);
  
  // Heatmap navigation listeners
  const heatmapPrevBtn = document.getElementById('heatmap-prev-month');
  const heatmapNextBtn = document.getElementById('heatmap-next-month');
  
  if (heatmapPrevBtn) heatmapPrevBtn.addEventListener('click', () => navigateHeatmapMonth(-1));
  if (heatmapNextBtn) heatmapNextBtn.addEventListener('click', () => navigateHeatmapMonth(1));
  
  // Undo/Redo button listeners
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  if (undoBtn) undoBtn.addEventListener('click', performUndo);
  if (redoBtn) redoBtn.addEventListener('click', performRedo);
  addProjectBtn.addEventListener('click', () => openProjectModal());
  closeModal.addEventListener('click', closeProjectModal);
  closeStats.addEventListener('click', closeStatsModal);
  cancelBtn.addEventListener('click', closeProjectModal);
  projectForm.addEventListener('submit', handleProjectSubmit);

  // Update modal controls
  const updateInstallBtn = document.getElementById('update-install-btn');
  const updateCancelBtn = document.getElementById('update-cancel-btn');
  const closeUpdateModalBtn = document.getElementById('close-update-modal');
  if (updateInstallBtn) {
    updateInstallBtn.addEventListener('click', () => {
      if (isElectron && ipcRenderer) {
        ipcRenderer.invoke('install-update');
      }
    });
  }
  [updateCancelBtn, closeUpdateModalBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (updateModal) updateModal.classList.remove('active');
      });
    }
  });

  // Task Modal Event Listeners
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const closeTaskModalBtn = document.getElementById('close-task-modal');
  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  
  if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', closeTaskModal);
  if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);
  if (taskForm) taskForm.addEventListener('submit', handleTaskSubmit);
  
  // Close modals when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProjectModal();
  });
  
  if (taskModal) {
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) closeTaskModal();
    });
  }

  // Subtask Modal Event Listeners
  const subtaskModal = document.getElementById('subtask-modal');
  const subtaskForm = document.getElementById('subtask-form');
  const closeSubtaskModalBtn = document.getElementById('close-subtask-modal');
  const cancelSubtaskBtn = document.getElementById('cancel-subtask-btn');

  if (closeSubtaskModalBtn) closeSubtaskModalBtn.addEventListener('click', closeSubtaskModal);
  if (cancelSubtaskBtn) cancelSubtaskBtn.addEventListener('click', closeSubtaskModal);
  if (subtaskForm) subtaskForm.addEventListener('submit', handleSubtaskSubmit);

  if (subtaskModal) {
    subtaskModal.addEventListener('click', (e) => {
      if (e.target === subtaskModal) closeSubtaskModal();
    });
  }

  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) closeStatsModal();
  });

  // Event delegation for project buttons
  document.addEventListener('click', (e) => {
    // Handle project add task buttons
    const addTaskButton = e.target.closest('.add-task-project-btn');
    if (addTaskButton) {
      const onclick = addTaskButton.getAttribute('onclick');
      if (onclick && onclick.includes('addTaskToProject')) {
        e.preventDefault();
        e.stopPropagation();
        const projectId = onclick.match(/addTaskToProject\('([^']+)'\)/)?.[1];
        if (projectId) {
          addTaskToProject(projectId);
        }
      }
    }
  });
  
  // Focus mode controls
  document.getElementById('pause-focus')?.addEventListener('click', toggleFocusPause);
  
  // Floating timer controls
  document.getElementById('floating-pause-btn')?.addEventListener('click', toggleFocusPause);
  document.getElementById('floating-stop-btn')?.addEventListener('click', stopFocusSession);
  
  // Aspect management event listeners
  const manageAspectsBtn = document.getElementById('manage-aspects-btn');
  const aspectModal = document.getElementById('aspect-modal');
  const closeAspectModalBtn = document.getElementById('close-aspect-modal');
  const aspectForm = document.getElementById('aspect-form');
  const cancelAspectBtn = document.getElementById('cancel-aspect-btn');
  
  if (manageAspectsBtn) manageAspectsBtn.addEventListener('click', openAspectModal);
  if (closeAspectModalBtn) closeAspectModalBtn.addEventListener('click', closeAspectModal);
  if (aspectForm) aspectForm.addEventListener('submit', handleAspectSubmit);
  if (cancelAspectBtn) cancelAspectBtn.addEventListener('click', clearAspectForm);
  
  // Close aspect modal when clicking outside
  if (aspectModal) {
    aspectModal.addEventListener('click', (e) => {
      if (e.target === aspectModal) closeAspectModal();
    });
  }
  
  // Pomodoro controls
  document.getElementById('pause-pomodoro')?.addEventListener('click', pausePomodoroSession);
  document.getElementById('resume-pomodoro')?.addEventListener('click', resumePomodoroSession);
  document.getElementById('stop-pomodoro')?.addEventListener('click', stopPomodoroSession);
  
  // Daily planning controls
  document.getElementById('close-planner')?.addEventListener('click', closeDailyPlannerModal);
  document.getElementById('skip-planning')?.addEventListener('click', skipDailyPlanning);
  document.getElementById('start-day')?.addEventListener('click', startDay);
  document.getElementById('select-all-suggestions')?.addEventListener('click', selectAllSuggestions);
  document.getElementById('clear-all-suggestions')?.addEventListener('click', clearAllSuggestions);
  
  // Close planner modal when clicking outside
  dailyPlannerModal?.addEventListener('click', (e) => {
    if (e.target === dailyPlannerModal) closeDailyPlannerModal();
  });
  
  // Stats tabs
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => switchStatsTab(tab.dataset.tab));
  });
  
  // Chart period controls
  document.getElementById('chart-7days')?.addEventListener('click', () => updateChart(7));
  document.getElementById('chart-30days')?.addEventListener('click', () => updateChart(30));
  document.getElementById('chart-90days')?.addEventListener('click', () => updateChart(90));
  
  // Goals controls
  document.getElementById('close-goals')?.addEventListener('click', closeGoalsModal);
  document.getElementById('add-goal-btn')?.addEventListener('click', openGoalFormModal);
  document.getElementById('close-goal-form')?.addEventListener('click', closeGoalFormModal);
  document.getElementById('cancel-goal-btn')?.addEventListener('click', closeGoalFormModal);
  document.getElementById('goal-form')?.addEventListener('submit', handleGoalSubmit);
  
  // Close goals modals when clicking outside
  goalsModal?.addEventListener('click', (e) => {
    if (e.target === goalsModal) closeGoalsModal();
  });
  goalFormModal?.addEventListener('click', (e) => {
    if (e.target === goalFormModal) closeGoalFormModal();
  });
  
  // Page visibility API to pause focus mode when computer is closed/minimized
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

function handleVisibilityChange() {
  if (document.hidden && focusSession.isActive && !focusSession.isPaused) {
    // Pause focus session when window is hidden (computer closed/minimized)
    // Works regardless of current view - timer runs in background
    pauseFocusSession();
    console.log('Focus session paused due to window being hidden');
  } else if (!document.hidden && focusSession.isPaused && (currentView === 'focus' || returnToFocusMode)) {
    // Resume focus session when window becomes visible if we're in focus mode or should return to it
    resumeFocusSession();
    console.log('Focus session resumed due to window becoming visible');
  }
}

// View Management
function toggleView() {
  if (currentView === 'focus') {
    // Set flag to return to focus mode after task edits
    returnToFocusMode = true;
    // Don't stop focus session - let it continue in background
    currentView = 'project';
  } else {
    currentView = currentView === 'project' ? 'board' : 'project';
  }
  updateDisplay();
  updateViewButtons();
  updateFloatingTimerVisibility();
}

function toggleFocusView() {
  if (currentView === 'focus') {
    // Exiting focus mode - let timer continue in background
    returnToFocusMode = false;
    // Only stop session if user clicks focus button twice (explicit stop)
    // Otherwise, let it continue running in background
    currentView = 'project';
  } else {
    // Entering focus mode - clear auto-return flag but don't auto-start timer
    returnToFocusMode = false;
    currentView = 'focus';
    // Only start a new session if no session is currently active or paused
    if (!focusSession.isActive && !focusSession.isPaused) {
      startFocusSession();
    }
  }
  updateDisplay();
  updateViewButtons();
  updateFloatingTimerVisibility();
}

function toggleArchiveView() {
  if (currentView === 'focus') {
    // Set flag to return to focus mode after viewing archive
    returnToFocusMode = true;
    stopFocusSession();
  }
  currentView = currentView === 'archive' ? 'project' : 'archive';
  updateDisplay();
  updateViewButtons();
  updateFloatingTimerVisibility();
}

function updateViewButtons() {
  // Reset button states
  viewToggle.classList.remove('active');
  focusToggle.classList.remove('active');
  archiveToggle.classList.remove('active');
  
  if (currentView === 'project') {
    viewToggle.innerHTML = '<i class="fas fa-th-large"></i> Board View';
  } else if (currentView === 'board') {
    viewToggle.innerHTML = '<i class="fas fa-folder"></i> Project View';
  } else if (currentView === 'focus') {
    focusToggle.classList.add('active');
    viewToggle.innerHTML = '<i class="fas fa-th-large"></i> Board View';
  } else if (currentView === 'archive') {
    archiveToggle.classList.add('active');
    viewToggle.innerHTML = '<i class="fas fa-th-large"></i> Board View';
  }
  
  // Update focus button indicator
  updateFocusButtonIndicator();
}

function showStats() {
  updateStatistics();
  updateAnalyticsData();
  statsModal.classList.add('active');
  
  // Initialize chart if not already done
  setTimeout(() => {
    if (!productivityChart) {
      initializeProductivityChart();
    }
    updateChart(7); // Default to 7 days
    updateInsights();
  }, 100);
}

function closeStatsModal() {
  statsModal.classList.remove('active');
}

function updateDisplay() {
  // Hide all views
  projectView.classList.remove('active');
  boardView.classList.remove('active');
  focusView.classList.remove('active');
  archiveView.classList.remove('active');
  
  if (currentView === 'project') {
    projectView.classList.add('active');
    renderProjects();
  } else if (currentView === 'board') {
    boardView.classList.add('active');
    renderBoards();
  } else if (currentView === 'focus') {
    focusView.classList.add('active');
    renderFocusView();
  } else if (currentView === 'archive') {
    archiveView.classList.add('active');
    renderArchiveView();
  }
}

// Project Management
function openProjectModal(project = null) {
  const modalTitle = document.getElementById('modal-title');
  const projectName = document.getElementById('project-name');
  const projectDescription = document.getElementById('project-description');
  const projectPriority = document.getElementById('project-priority');
  const projectStatus = document.getElementById('project-status');
  const projectTheme = document.getElementById('project-theme');
  
  // Populate dropdowns
  populateParentProjectDropdown(project ? project.id : null);
  updateProjectThemeOptions();
  
  if (project) {
    modalTitle.textContent = 'Edit Project';
    projectName.value = project.name;
    projectDescription.value = project.description || '';
    projectPriority.value = project.priority;
    projectStatus.value = project.status;
    projectTheme.value = project.theme || 'General';
    document.getElementById('project-due-date').value = project.dueDate || '';
    document.getElementById('project-estimated-time').value = project.estimatedTime || '';
    document.getElementById('project-parent').value = project.parentId || '';
    projectForm.dataset.editId = project.id;
  } else {
    modalTitle.textContent = 'Add New Project';
    projectForm.reset();
    projectTheme.value = 'General'; // Default theme for new projects
    delete projectForm.dataset.editId;
  }
  
  modal.classList.add('active');
  projectName.focus();
}

function populateParentProjectDropdown(excludeId = null) {
  const parentSelect = document.getElementById('project-parent');
  parentSelect.innerHTML = '<option value="">None - Top Level Project</option>';
  
  // Get all projects that can be parents (not the current project or its descendants)
  Object.values(projects).forEach(project => {
    if (project.id !== excludeId && !isDescendantOf(excludeId, project.id)) {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = getProjectHierarchyDisplay(project.id);
      parentSelect.appendChild(option);
    }
  });
}

function isDescendantOf(ancestorId, projectId) {
  if (!ancestorId || !projectId) return false;
  
  const project = projects[projectId];
  if (!project) return false;
  
  // Check if this project is a child of the ancestor
  if (project.parentId === ancestorId) return true;
  
  // Recursively check parent chain
  if (project.parentId) {
    return isDescendantOf(ancestorId, project.parentId);
  }
  
  return false;
}

function getProjectHierarchyDisplay(projectId, depth = 0) {
  const project = projects[projectId];
  if (!project) return '';
  
  const indent = '  '.repeat(depth);
  return `${indent}${project.name}`;
}

function closeProjectModal() {
  modal.classList.remove('active');
  projectForm.reset();
  delete projectForm.dataset.editId;
  
  // Auto-return to focus mode if we were temporarily editing
  if (returnToFocusMode && currentView !== 'focus') {
    returnToFocusMode = false;
    currentView = 'focus';
    // Resume focus session instead of starting new one
    if (focusSession.isPaused) {
      resumeFocusSession();
    } else {
      startFocusSession();
    }
    updateDisplay();
    updateViewButtons();
  }
}

function handleProjectSubmit(e) {
  e.preventDefault();
  
  const projectData = {
    name: document.getElementById('project-name').value.trim(),
    description: document.getElementById('project-description').value.trim(),
    priority: document.getElementById('project-priority').value,
    status: document.getElementById('project-status').value,
    theme: document.getElementById('project-theme').value,
    dueDate: document.getElementById('project-due-date').value || null,
    estimatedTime: parseFloat(document.getElementById('project-estimated-time').value) || 0,
    actualTime: 0,
    parentId: document.getElementById('project-parent').value || null,
    childProjects: [],
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: Date.now() // Use timestamp for default order
  };
  
  if (!projectData.name) return;
  
  const editId = projectForm.dataset.editId;
  
  if (editId) {
    // Update existing project
    const oldProject = { ...projects[editId] };
    const oldParentId = oldProject.parentId;
    
    // Remove from old parent if changed
    if (oldParentId && oldParentId !== projectData.parentId) {
      const oldParent = projects[oldParentId];
      if (oldParent) {
        oldParent.childProjects = oldParent.childProjects.filter(id => id !== editId);
      }
    }
    
    // Add to new parent if specified
    if (projectData.parentId && projectData.parentId !== oldParentId) {
      const newParent = projects[projectData.parentId];
      if (newParent && !newParent.childProjects.includes(editId)) {
        newParent.childProjects.push(editId);
      }
    }
    
    // Preserve existing project data (especially tasks) while updating with new data
    const existingProject = projects[editId];
    projects[editId] = { 
      ...existingProject, 
      ...projectData, 
      updatedAt: new Date().toISOString(),
      // Ensure tasks are preserved from the existing project
      tasks: existingProject.tasks || []
    };
    saveStateToHistory(`Updated project: ${projectData.name}`, { type: 'update', projectId: editId, oldProject });
  } else {
    // Create new project
    const projectId = `project_${nextId++}`;
    projects[projectId] = { ...projectData, id: projectId };
    
    // Add to parent's children if specified
    if (projectData.parentId) {
      const parent = projects[projectData.parentId];
      if (parent) {
        parent.childProjects.push(projectId);
      }
    }
    
    saveStateToHistory(`Created project: ${projectData.name}`, { type: 'create', projectId });
  }
  
  saveState();
  updateDisplay();
  closeProjectModal();
}

// Task Modal Functions
function openTaskModal(projectId, taskId = null) {
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  
  // Store the project ID and task ID in the form data
  taskForm.dataset.projectId = projectId;
  if (taskId) {
    taskForm.dataset.taskId = taskId;
  } else {
    delete taskForm.dataset.taskId;
  }
  
  const project = projects[projectId];
  const modalTitle = document.getElementById('task-modal-title');
  
  if (taskId) {
    // Edit mode
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      modalTitle.textContent = `Edit Task`;
      document.getElementById('task-description').value = task.description;
      document.getElementById('task-due-date').value = task.dueDate || '';
      document.getElementById('task-priority').value = task.priority || 'medium';
      document.getElementById('task-estimated-time').value = task.estimatedTime || 0;
      
      // Change button text
      document.getElementById('save-task-btn').textContent = 'Update Task';
    }
  } else {
    // Add mode
    modalTitle.textContent = `Add Task to ${project.name}`;
    document.getElementById('save-task-btn').textContent = 'Save Task';
  }
  
  taskModal.classList.add('active');
  
  // Focus on first input
  setTimeout(() => {
    document.getElementById('task-description').focus();
  }, 100);
}

function closeTaskModal() {
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  
  taskModal.classList.remove('active');
  taskForm.reset();
  delete taskForm.dataset.projectId;
}

function handleTaskSubmit(e) {
  e.preventDefault();
  
  const taskForm = document.getElementById('task-form');
  const projectId = taskForm.dataset.projectId;
  const taskId = taskForm.dataset.taskId;
  
  if (!projectId || !projects[projectId]) return;
  
  const taskData = {
    description: document.getElementById('task-description').value.trim(),
    dueDate: document.getElementById('task-due-date').value || null,
    priority: document.getElementById('task-priority').value,
    estimatedTime: parseFloat(document.getElementById('task-estimated-time').value) || 0
  };
  
  if (!taskData.description) return;
  
  const project = projects[projectId];
  
  if (taskId) {
    // Edit mode - update existing task
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.description = taskData.description;
      task.dueDate = taskData.dueDate;
      task.priority = taskData.priority;
      task.estimatedTime = taskData.estimatedTime;
      project.updatedAt = new Date().toISOString();
    }
  } else {
    // Add mode - create new task
    const newTaskId = `task_${nextId++}`;
    const newTask = {
      id: newTaskId,
      description: taskData.description,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate: taskData.dueDate,
      priority: taskData.priority,
      estimatedTime: taskData.estimatedTime,
      actualTime: 0,
      subtasks: []
    };
    
    project.tasks.push(newTask);
  }
  
  saveState();
  updateDisplay();
  closeTaskModal();
}

function openSubtaskModal(projectId, taskId, subtaskId = null) {
  const subtaskModal = document.getElementById('subtask-modal');
  const subtaskForm = document.getElementById('subtask-form');

  subtaskForm.dataset.projectId = projectId;
  subtaskForm.dataset.taskId = taskId;
  if (subtaskId) {
    subtaskForm.dataset.subtaskId = subtaskId;
  } else {
    delete subtaskForm.dataset.subtaskId;
  }

  const project = projects[projectId];
  const task = project ? project.tasks.find(t => t.id === taskId) : null;
  const modalTitle = document.getElementById('subtask-modal-title');

  if (subtaskId && task) {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      modalTitle.textContent = 'Edit Subtask';
      document.getElementById('subtask-description').value = subtask.description;
      document.getElementById('save-subtask-btn').textContent = 'Update Subtask';
    }
  } else {
    modalTitle.textContent = 'Add Subtask';
    document.getElementById('subtask-description').value = '';
    document.getElementById('save-subtask-btn').textContent = 'Save Subtask';
  }

  subtaskModal.classList.add('active');

  setTimeout(() => {
    document.getElementById('subtask-description').focus();
  }, 100);
}

function closeSubtaskModal() {
  const subtaskModal = document.getElementById('subtask-modal');
  const subtaskForm = document.getElementById('subtask-form');

  subtaskModal.classList.remove('active');
  subtaskForm.reset();
  delete subtaskForm.dataset.projectId;
  delete subtaskForm.dataset.taskId;
  delete subtaskForm.dataset.subtaskId;
}

function handleSubtaskSubmit(e) {
  e.preventDefault();

  const subtaskForm = document.getElementById('subtask-form');
  const projectId = subtaskForm.dataset.projectId;
  const taskId = subtaskForm.dataset.taskId;
  const subtaskId = subtaskForm.dataset.subtaskId;

  if (!projectId || !taskId || !projects[projectId]) return;

  const description = document.getElementById('subtask-description').value.trim();
  if (!description) return;

  const project = projects[projectId];
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (subtaskId) {
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      subtask.description = description;
    }
  } else {
    const newSubtaskId = `subtask_${nextId++}`;
    task.subtasks.push({
      id: newSubtaskId,
      description,
      completed: false,
      estimatedTime: 0,
      actualTime: 0
    });
  }

  project.updatedAt = new Date().toISOString();
  saveState();
  updateDisplay();
  closeSubtaskModal();
}

function deleteProject(projectId) {
  const project = projects[projectId];
  if (!project) return;
  
  let confirmMessage = 'Are you sure you want to delete this project?';
  if (project.childProjects && project.childProjects.length > 0) {
    confirmMessage += ` This will also delete ${project.childProjects.length} sub-project(s).`;
  }
  confirmMessage += ' This action cannot be undone.';
  
  if (confirm(confirmMessage)) {
    const deletedProject = { ...projects[projectId] };
    
    // Delete child projects recursively
    if (project.childProjects && project.childProjects.length > 0) {
      project.childProjects.forEach(childId => {
        if (projects[childId]) {
          delete projects[childId];
        }
      });
    }
    
    // Remove from parent's child list
    if (project.parentId) {
      const parent = projects[project.parentId];
      if (parent) {
        parent.childProjects = parent.childProjects.filter(id => id !== projectId);
      }
    }
    
    delete projects[projectId];
    saveStateToHistory(`Deleted project: ${deletedProject.name}`, { type: 'delete', projectId, deletedProject });
    saveState();
    updateDisplay();
  }
}

function moveProject(projectId) {
  const project = projects[projectId];
  if (project) {
    const wasExecution = project.status === 'execution';
    project.status = project.status === 'execution' ? 'incubation' : 'execution';
    project.updatedAt = new Date().toISOString();
    
    // Track incubation activity when moving to incubation
    if (wasExecution && project.status === 'incubation') {
      trackIncubationActivity();
    }
    
    saveState();
    updateDisplay();
  }
}

// Task Management
function addTaskToProject(projectId) {
  if (!projects[projectId]) return;
  
  openTaskModal(projectId);
}

function toggleTask(projectId, taskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      const wasCompleted = task.completed;
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAt = new Date().toISOString();
        updateDailyStats();
        // Auto-archive completed tasks after a brief delay
        setTimeout(() => archiveCompletedTasks(projectId), 1000);
      } else {
        delete task.completedAt;
      }
      project.updatedAt = new Date().toISOString();
      saveStateToHistory(`${task.completed ? 'Completed' : 'Uncompleted'} task: ${task.description}`, { 
        type: 'toggleTask', projectId, taskId, wasCompleted 
      });
      saveState();
      updateDisplay();
    }
  }
}

function toggleSubtask(projectId, taskId, subtaskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        subtask.completed = !subtask.completed;
        project.updatedAt = new Date().toISOString();
        saveState();
        updateDisplay(); // This will refresh the progress indicators
      }
    }
  }
}

function editTask(projectId, taskId) {
  if (!projects[projectId]) return;
  
  openTaskModal(projectId, taskId);
}

function deleteTask(projectId, taskId) {
  const project = projects[projectId];
  if (project) {
    const deletedTask = project.tasks.find(t => t.id === taskId);
    if (deletedTask) {
      project.tasks = project.tasks.filter(t => t.id !== taskId);
      project.updatedAt = new Date().toISOString();
      saveStateToHistory(`Deleted task: ${deletedTask.description}`, { 
        type: 'deleteTask', projectId, taskId, deletedTask 
      });
      saveState();
      updateDisplay();
    }
  }
}

function addSubtask(projectId, taskId) {
  openSubtaskModal(projectId, taskId);
}

function editSubtask(projectId, taskId, subtaskId) {
  openSubtaskModal(projectId, taskId, subtaskId);
}

function deleteSubtask(projectId, taskId, subtaskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
      project.updatedAt = new Date().toISOString();
      saveState();
      updateDisplay();
    }
  }
}

// Board task management for adding tasks
function addBoardTask(board) {
  showCustomPrompt('Enter task description:', (description) => {
    if (!description) return;

    showCustomPrompt('Enter project name:', (projectName) => {
      if (!projectName) return;

      const status = board.toLowerCase();
      let project = Object.values(projects).find(
        p => p.name.toLowerCase() === projectName.trim().toLowerCase()
      );

      if (!project) {
        const projectId = `project_${nextId++}`;
        project = {
          id: projectId,
          name: projectName.trim(),
          description: '',
          priority: 'medium',
          status,
          tasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        projects[projectId] = project;
      } else {
        project.status = status;
      }

      const taskId = `task_${nextId++}`;
      const newTask = {
        id: taskId,
        description: description.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: null,
        estimatedTime: 0,
        actualTime: 0,
        subtasks: []
      };

      project.tasks.push(newTask);
      project.updatedAt = new Date().toISOString();
      saveState();
      updateDisplay();
    });
  });
}

// Archive Management Functions
function archiveCompletedTasks(projectId) {
  const project = projects[projectId];
  if (!project) return;
  
  const completedTasks = project.tasks.filter(task => task.completed);
  const incompleteTasks = project.tasks.filter(task => !task.completed);
  
  if (completedTasks.length > 0) {
    // Move completed tasks to archive
    if (!archivedTasks[projectId]) {
      archivedTasks[projectId] = [];
    }
    archivedTasks[projectId] = archivedTasks[projectId].concat(completedTasks);
    
    // Keep only incomplete tasks in the project
    project.tasks = incompleteTasks;
    project.updatedAt = new Date().toISOString();
    
    saveState();
    updateDisplay();
  }
}

function archiveProject(projectId) {
  const project = projects[projectId];
  if (!project) return;
  
  // Confirm all tasks are completed or archive them first
  const incompleteTasks = project.tasks.filter(task => !task.completed);
  if (incompleteTasks.length > 0) {
    if (!confirm('This project has incomplete tasks. Archive them as well?')) {
      return;
    }
    // Archive all tasks first
    if (!archivedTasks[projectId]) {
      archivedTasks[projectId] = [];
    }
    archivedTasks[projectId] = archivedTasks[projectId].concat(project.tasks);
  } else {
    // Archive completed tasks too
    if (project.tasks.length > 0) {
      if (!archivedTasks[projectId]) {
        archivedTasks[projectId] = [];
      }
      archivedTasks[projectId] = archivedTasks[projectId].concat(project.tasks);
    }
  }
  
  // Move project to archive
  project.archivedAt = new Date().toISOString();
  archivedProjects[projectId] = project;
  delete projects[projectId];
  
  saveState();
  updateDisplay();
}

function restoreTask(projectId, taskId) {
  if (!archivedTasks[projectId]) return;
  
  const taskIndex = archivedTasks[projectId].findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;
  
  const task = archivedTasks[projectId].splice(taskIndex, 1)[0];
  task.completed = false;
  delete task.completedAt;
  
  // Add back to project or create project if archived
  if (projects[projectId]) {
    projects[projectId].tasks.push(task);
    projects[projectId].updatedAt = new Date().toISOString();
  } else if (archivedProjects[projectId]) {
    // Restore the project too
    const project = archivedProjects[projectId];
    delete project.archivedAt;
    project.tasks = [task];
    project.updatedAt = new Date().toISOString();
    projects[projectId] = project;
    delete archivedProjects[projectId];
  }
  
  saveState();
  updateDisplay();
}

function restoreProject(projectId) {
  const project = archivedProjects[projectId];
  if (!project) return;
  
  delete project.archivedAt;
  project.updatedAt = new Date().toISOString();
  
  // Restore all archived tasks for this project
  if (archivedTasks[projectId]) {
    project.tasks = project.tasks.concat(archivedTasks[projectId]);
    archivedTasks[projectId] = [];
  }
  
  projects[projectId] = project;
  delete archivedProjects[projectId];
  
  saveState();
  updateDisplay();
}

function isProjectFullyCompleted(project) {
  if (project.tasks.length === 0) return false;
  return project.tasks.every(task => task.completed);
}

// Rendering Functions
function renderProjects() {
  projectsContainer.innerHTML = '';
  
  // Group projects by theme
  const projectsByTheme = {};
  const topLevelProjects = Object.values(projects).filter(project => !project.parentId);
  
  topLevelProjects.forEach(project => {
    const theme = project.theme || 'General';
    if (!projectsByTheme[theme]) {
      projectsByTheme[theme] = [];
    }
    projectsByTheme[theme].push(project);
  });
  
  // Render each theme group
  Object.keys(projectsByTheme).sort().forEach(theme => {
    // Sort projects within each theme by order
    const sortedProjects = projectsByTheme[theme].sort((a, b) => (a.order || 0) - (b.order || 0));
    renderAspectGroup(theme, sortedProjects);
  });
}

function renderAspectGroup(aspect, projects) {
  const isCollapsed = aspectCollapsedState[aspect] || false;
  
  const aspectContainer = document.createElement('div');
  aspectContainer.className = 'aspect-group';
  
  const aspectHeader = document.createElement('div');
  aspectHeader.className = 'aspect-header';
  aspectHeader.innerHTML = `
    <div class="aspect-title" onclick="toggleAspect('${aspect}')">
      <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}" id="aspect-${aspect}-icon"></i>
      <h3>${aspect}</h3>
      <span class="aspect-count">${projects.length} project${projects.length !== 1 ? 's' : ''}</span>
    </div>
  `;
  
  const aspectContent = document.createElement('div');
  aspectContent.className = 'aspect-content';
  aspectContent.id = `aspect-${aspect}-content`;
  aspectContent.style.display = isCollapsed ? 'none' : 'block';
  
  // Render projects in this aspect with drop zones for positioning
  projects.forEach((project, index) => {
    // Add drop zone before each project
    const dropZone = document.createElement('div');
    dropZone.className = 'project-drop-zone';
    dropZone.innerHTML = '<div class="drop-indicator"></div>';
    makeDropZone(dropZone, 'project-position', { 
      aspect: aspect, 
      insertBeforeProjectId: project.id,
      insertIndex: index 
    });
    aspectContent.appendChild(dropZone);
    
    renderProjectHierarchy(project, 0, aspectContent);
  });
  
  // Add drop zone at the end for appending
  const endDropZone = document.createElement('div');
  endDropZone.className = 'project-drop-zone project-drop-zone-end';
  endDropZone.innerHTML = '<div class="drop-indicator"></div>';
  makeDropZone(endDropZone, 'project-position', { 
    aspect: aspect, 
    insertIndex: projects.length 
  });
  aspectContent.appendChild(endDropZone);
  
  aspectContainer.appendChild(aspectHeader);
  aspectContainer.appendChild(aspectContent);
  projectsContainer.appendChild(aspectContainer);
  
  // Make aspect header a drop zone for projects (for moving between aspects)
  makeDropZone(aspectHeader, 'aspect', { aspect: aspect });
}

function toggleAspect(aspect) {
  const isCurrentlyCollapsed = aspectCollapsedState[aspect] || false;
  aspectCollapsedState[aspect] = !isCurrentlyCollapsed;
  
  const content = document.getElementById(`aspect-${aspect}-content`);
  const icon = document.getElementById(`aspect-${aspect}-icon`);
  
  if (aspectCollapsedState[aspect]) {
    content.style.display = 'none';
    icon.className = 'fas fa-chevron-right';
  } else {
    content.style.display = 'block';
    icon.className = 'fas fa-chevron-down';
  }
  
  saveState(); // Save the collapsed states
}

function renderProjectHierarchy(project, depth, container = projectsContainer) {
  const projectCard = createProjectCard(project, depth);
  container.appendChild(projectCard);
  
  // Render child projects
  if (project.childProjects && project.childProjects.length > 0) {
    project.childProjects.forEach(childId => {
      const childProject = projects[childId];
      if (childProject) {
        renderProjectHierarchy(childProject, depth + 1, container);
      }
    });
  }
}

function createProjectCard(project, depth = 0) {
  const card = document.createElement('div');
  card.className = `project-card drop-zone ${depth > 0 ? 'nested-project' : ''}`;
  card.style.marginLeft = `${depth * 20}px`;
  card.setAttribute('data-project-id', project.id);
  
  const completedTasks = project.tasks.filter(task => task.completed).length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const dueDateStatus = getDueDateStatus(project.dueDate);
  
  card.innerHTML = `
    <div class="project-header">
      <div class="drag-handle" title="Drag to move project">
        <i class="fas fa-grip-vertical"></i>
      </div>
      <div>
        <div class="project-title">
          ${depth > 0 ? '<i class="fas fa-level-up-alt nested-indicator"></i>' : ''}
          ${escapeHtml(project.name)}
          ${project.childProjects?.length > 0 ? `<span class="child-count">(${project.childProjects.length} sub-projects)</span>` : ''}
        </div>
        <div class="project-meta">
          <span class="priority-badge priority-${project.priority}">${project.priority}</span>
          <span class="status-badge status-${project.status}">${project.status}</span>
          <span>${completedTasks}/${totalTasks} tasks</span>
          ${project.dueDate ? `<span class="due-date ${dueDateStatus}"><i class="fas fa-calendar"></i> ${formatDate(project.dueDate)}</span>` : ''}
          ${project.parentId ? `<span class="parent-indicator"><i class="fas fa-link"></i> Sub-project</span>` : ''}
        </div>
      </div>
    </div>
    
    ${project.estimatedTime > 0 || project.actualTime > 0 ? `
      <div class="time-tracking">
        ${project.estimatedTime > 0 ? `<span class="time-estimate"><i class="fas fa-clock"></i> Est: ${project.estimatedTime}h</span>` : ''}
        ${project.actualTime > 0 ? `<span class="time-actual"><i class="fas fa-stopwatch"></i> Actual: ${project.actualTime.toFixed(1)}h</span>` : ''}
      </div>
    ` : ''}
    
    ${project.description ? `<div class="project-description">${escapeHtml(project.description)}</div>` : ''}
    
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progress}%"></div>
    </div>
    
    <div class="task-list drop-zone">
      ${project.tasks.map(task => createTaskHTML(project, task)).join('')}
    </div>
    
    <div class="project-actions">
      <button class="edit-btn" onclick="openProjectModal(projects['${project.id}'])">
        <i class="fas fa-edit"></i> Edit
      </button>
      <button class="move-btn" onclick="moveProject('${project.id}')">
        <i class="fas fa-exchange-alt"></i> Move to ${project.status === 'execution' ? 'Incubation' : 'Execution'}
      </button>
      <button class="add-task-project-btn" onclick="addTaskToProject('${project.id}')">
        <i class="fas fa-plus"></i> Add Task
      </button>
      ${totalTasks > 0 && completedTasks === totalTasks ? `
        <button class="archive-btn" onclick="archiveProject('${project.id}')" title="Archive completed project">
          <i class="fas fa-archive"></i> Archive
        </button>
      ` : ''}
      <button class="delete-btn" onclick="deleteProject('${project.id}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  // Set up drag and drop for the project card
  makeDropZone(card, 'project', { projectId: project.id });
  makeDraggable(card, 'project', { projectId: project.id, aspect: project.theme || 'General' });
  
  // Set up drag and drop for all task and subtask elements after DOM is created
  setTimeout(() => setupTaskDragDrop(card, project), 0);
  
  return card;
}

function createTaskHTML(project, task) {
  const plannedClass = task.plannedForToday ? 'planned-today' : '';
  
  // Calculate subtask progress
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const progressText = totalSubtasks > 0 ? `<span class="subtask-progress">(${completedSubtasks}/${totalSubtasks} subtasks)</span>` : '';
  
  return `
    <div class="task-item drop-zone ${task.completed ? 'completed' : ''} ${plannedClass}" 
         data-task-id="${task.id}" data-project-id="${project.id}">
      <div class="task-content">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
               onchange="toggleTask('${project.id}', '${task.id}')">
        <span class="task-text">${escapeHtml(task.description)} ${progressText}</span>
        <div class="task-actions">
          <button onclick="startPomodoroSession('${project.id}', '${task.id}')" title="Start Pomodoro (25 min)" class="pomodoro-btn">
            <i class="fas fa-tomato">🍅</i>
          </button>
          <button onclick="editTask('${project.id}', '${task.id}')" title="Edit task">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="addSubtask('${project.id}', '${task.id}')" title="Add subtask" class="add-subtask-btn">
            <i class="fas fa-plus"></i>
          </button>
          <button onclick="deleteTask('${project.id}', '${task.id}')" title="Delete task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      ${task.subtasks && task.subtasks.length > 0 ? `
        <div class="subtask-list">
          ${task.subtasks.map((subtask, index) => `
            <div class="subtask-item drop-zone ${subtask.completed ? 'completed' : ''}" 
                 data-subtask-id="${subtask.id}" data-task-id="${task.id}" data-project-id="${project.id}"
                 data-subtask-index="${index}" draggable="true">
              <div class="subtask-drag-handle" title="Drag to reorder">
                <i class="fas fa-grip-vertical"></i>
              </div>
              <input type="checkbox" class="task-checkbox" ${subtask.completed ? 'checked' : ''} 
                     onchange="toggleSubtask('${project.id}', '${task.id}', '${subtask.id}')">
              <span class="task-text">${escapeHtml(subtask.description)}</span>
              <div class="task-actions">
                <button onclick="editSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Edit subtask" class="edit-subtask-btn">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Delete subtask">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function setupTaskDragDrop(cardElement, project) {
  // Set up draggable tasks
  cardElement.querySelectorAll('.task-item').forEach(taskElement => {
    const taskId = taskElement.dataset.taskId;
    const projectId = taskElement.dataset.projectId;
    
    if (taskId && projectId) {
      makeDraggable(taskElement, 'task', { taskId, projectId });
      makeDropZone(taskElement, 'task-position', { taskId, projectId });
      makeDropZone(taskElement, 'task', { taskId, projectId });
      
      // Add double-click to edit functionality
      const taskText = taskElement.querySelector('.task-text');
      if (taskText) {
        taskText.addEventListener('dblclick', () => editTask(projectId, taskId));
        taskText.style.cursor = 'text';
      }
    }
  });
  
  // Set up draggable subtasks
  cardElement.querySelectorAll('.subtask-item').forEach(subtaskElement => {
    const subtaskId = subtaskElement.dataset.subtaskId;
    const taskId = subtaskElement.dataset.taskId;
    const projectId = subtaskElement.dataset.projectId;
    
    if (subtaskId && taskId && projectId) {
      makeDraggable(subtaskElement, 'subtask', { subtaskId, taskId, projectId });
      makeDropZone(subtaskElement, 'subtask-position', { subtaskId, taskId, projectId });
      
      // Add double-click to edit functionality
      const subtaskText = subtaskElement.querySelector('.task-text');
      if (subtaskText) {
        subtaskText.addEventListener('dblclick', () => editSubtask(projectId, taskId, subtaskId));
        subtaskText.style.cursor = 'text';
      }
    }
  });
}

function renderBoards() {
  executionBoard.innerHTML = '';
  incubationBoard.innerHTML = '';
  
  let execCount = 0;
  let incubCount = 0;
  
  Object.values(projects).forEach(project => {
    project.tasks.forEach(task => {
      const taskElement = createTaskElement(project, task);
      
      if (project.status === 'execution') {
        executionBoard.appendChild(taskElement);
        execCount++;
      } else {
        incubationBoard.appendChild(taskElement);
        incubCount++;
      }
    });
  });
  
  // Set up board drop zones
  makeDropZone(executionBoard, 'board', { status: 'execution' });
  makeDropZone(incubationBoard, 'board', { status: 'incubation' });
  
  // Set up task drag and drop for board view
  setTimeout(() => setupBoardDragDrop(), 0);
  
  // Update counters
  document.getElementById('exec-count').textContent = execCount;
  document.getElementById('incub-count').textContent = incubCount;
}

function createTaskElement(project, task) {
  // Calculate subtask progress for board view
  const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
  const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
  const progressText = totalSubtasks > 0 ? `<span class="subtask-progress">(${completedSubtasks}/${totalSubtasks} subtasks)</span>` : '';
  
  const li = document.createElement('li');
  li.className = `task-item drop-zone ${task.completed ? 'completed' : ''}`;
  li.setAttribute('data-task-id', task.id);
  li.setAttribute('data-project-id', project.id);
  
  const subtasksHtml = task.subtasks ? task.subtasks.map(subtask => `
    <div class="board-subtask-item ${subtask.completed ? 'completed' : ''}" 
         data-subtask-id="${subtask.id}" data-task-id="${task.id}" data-project-id="${project.id}">
      <input type="checkbox" class="task-checkbox" ${subtask.completed ? 'checked' : ''} 
             onchange="toggleSubtask('${project.id}', '${task.id}', '${subtask.id}')">
      <span class="subtask-text">${escapeHtml(subtask.description)}</span>
      <div class="subtask-actions">
        <button onclick="editSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Edit subtask" class="edit-subtask-btn">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Delete subtask">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('') : '';
  
  li.innerHTML = `
    <div class="board-task-main">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask('${project.id}', '${task.id}')">
      <span class="task-text">${escapeHtml(task.description)} ${progressText}</span>
      <span class="task-project">${escapeHtml(project.name)}</span>
      <div class="task-actions">
        <button onclick="editTask('${project.id}', '${task.id}')" title="Edit task">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="addSubtask('${project.id}', '${task.id}')" title="Add subtask" class="add-subtask-btn">
          <i class="fas fa-plus"></i>
        </button>
        <button onclick="moveProject('${project.id}')" title="Move project">
          <i class="fas fa-exchange-alt"></i>
        </button>
        <button onclick="deleteTask('${project.id}', '${task.id}')" title="Delete task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    ${task.subtasks && task.subtasks.length > 0 ? `<div class="board-subtask-list">${subtasksHtml}</div>` : ''}
  `;
  
  return li;
}

function setupBoardDragDrop() {
  // Set up draggable tasks in board view
  document.querySelectorAll('#execution-list .task-item, #incubation-list .task-item').forEach(taskElement => {
    const taskId = taskElement.dataset.taskId;
    const projectId = taskElement.dataset.projectId;
    
    if (taskId && projectId) {
      makeDraggable(taskElement, 'task', { taskId, projectId });
      makeDropZone(taskElement, 'task-position', { taskId, projectId });
      
      // Add double-click to edit functionality
      const taskText = taskElement.querySelector('.task-text');
      if (taskText) {
        taskText.addEventListener('dblclick', () => editTask(projectId, taskId));
        taskText.style.cursor = 'text';
      }
    }
  });
}

// State Management
function saveState() {
  localStorage.setItem('productivity_projects', JSON.stringify(projects));
  localStorage.setItem('productivity_archived_tasks', JSON.stringify(archivedTasks));
  localStorage.setItem('productivity_archived_projects', JSON.stringify(archivedProjects));
  localStorage.setItem('productivity_aspect_states', JSON.stringify(aspectCollapsedState));
  localStorage.setItem('productivity_available_aspects', JSON.stringify(availableAspects));
  localStorage.setItem('productivity_dashboard_title', dashboardTitle);
  localStorage.setItem('productivity_nextId', nextId.toString());
}

function loadState() {
  // Load projects from localStorage
  const savedProjects = localStorage.getItem('productivity_projects');
  const savedArchivedTasks = localStorage.getItem('productivity_archived_tasks');
  const savedArchivedProjects = localStorage.getItem('productivity_archived_projects');
  const savedNextId = localStorage.getItem('productivity_nextId');
  const savedAspectStates = localStorage.getItem('productivity_aspect_states');
  const savedAvailableAspects = localStorage.getItem('productivity_available_aspects');
  const savedDashboardTitle = localStorage.getItem('productivity_dashboard_title');
  
  if (savedProjects) {
    projects = JSON.parse(savedProjects);
    archivedTasks = savedArchivedTasks ? JSON.parse(savedArchivedTasks) : {};
    archivedProjects = savedArchivedProjects ? JSON.parse(savedArchivedProjects) : {};
    aspectCollapsedState = savedAspectStates ? JSON.parse(savedAspectStates) : {};
    availableAspects = savedAvailableAspects ? JSON.parse(savedAvailableAspects) : ['General'];
    dashboardTitle = savedDashboardTitle || "Productivity Dashboard";
    nextId = parseInt(savedNextId) || 1;
    migrateProjectsForNesting();
  } else {
    // Migrate from old tasks.json format
    migrateLegacyTasks();
  }
}

function migrateProjectsForNesting() {
  let needsSave = false;
  
  Object.values(projects).forEach(project => {
    if (!project.hasOwnProperty('childProjects')) {
      project.childProjects = [];
      needsSave = true;
    }
    if (!project.hasOwnProperty('parentId')) {
      project.parentId = null;
      needsSave = true;
    }
    if (!project.hasOwnProperty('theme')) {
      project.theme = 'General'; // Default theme for existing projects
      needsSave = true;
    }
    if (!project.hasOwnProperty('order')) {
      project.order = Date.parse(project.createdAt) || Date.now(); // Default order by creation time
      needsSave = true;
    }
  });
  
  if (needsSave) {
    saveState();
  }
}

function migrateLegacyTasks() {
  fetch('tasks.json')
    .then(r => r.json())
    .then(data => {
      // Convert old format to new project-based format
      const executionTasks = data.Execution || [];
      const incubationTasks = data.Incubation || [];
      
      // Group tasks by project
      const projectGroups = {};
      
      [...executionTasks, ...incubationTasks].forEach(task => {
        const projectName = task.project || 'General';
        const status = executionTasks.includes(task) ? 'execution' : 'incubation';
        
        if (!projectGroups[projectName]) {
          projectGroups[projectName] = {
            name: projectName,
            description: '',
            priority: 'medium',
            status: status,
            tasks: []
          };
        }
        
        projectGroups[projectName].tasks.push({
          id: `task_${nextId++}`,
          description: task.description,
          completed: task.done || false,
          createdAt: new Date().toISOString(),
          subtasks: []
        });
      });
      
      // Create projects
      Object.keys(projectGroups).forEach(projectName => {
        const projectId = `project_${nextId++}`;
        projects[projectId] = {
          ...projectGroups[projectName],
          id: projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });
      
      saveState();
      updateDisplay();
    })
    .catch(() => {
      // Create initial projects based on user's to-do list
      createInitialProjects();
    });
}

function createInitialProjects() {
  const initialProjects = [
    {
      name: 'Daily Tasks',
      description: 'Regular daily activities and maintenance tasks',
      priority: 'high',
      status: 'execution',
      tasks: [
        { description: 'Feedly', completed: false },
        { description: 'Research Flat Laws', completed: false },
        { description: 'Rebalance Portfolio', completed: false }
      ]
    },
    {
      name: 'First Year Report',
      description: 'Complete and improve first year research report',
      priority: 'high',
      status: 'execution',
      tasks: [
        { 
          description: 'Results Figures and Tables',
          completed: false,
          subtasks: [
            { description: 'Fix Figure 2', completed: false },
            { description: 'Continue with remaining figures', completed: false }
          ]
        },
        {
          description: 'Improve Presentation Dramatically',
          completed: false,
          subtasks: [
            { description: 'Tie it all together more, need to really work on this', completed: false },
            { description: 'Shorten all of the fluff', completed: false },
            { description: 'Less is more in every sentence', completed: false },
            { description: 'Rewrite all first sentences', completed: false },
            { description: 'One thought per sentence', completed: false }
          ]
        },
        { description: 'Comb through first-year report for consistency', completed: false }
      ]
    },
    {
      name: 'Shared Genetic Determinants',
      description: 'WebServer development for genetic analysis',
      priority: 'medium',
      status: 'execution',
      tasks: [
        {
          description: 'Make WebServer',
          completed: false,
          subtasks: [
            { description: 'Format the idea into a word doc with help from GPT-5', completed: false },
            { description: 'Make Claude Artefacts for each page', completed: false },
            { description: 'Use Claude Code to connect', completed: false }
          ]
        }
      ]
    },
    {
      name: 'Homo sAIpien',
      description: 'Follow remaining plan for Homo sAIpien project',
      priority: 'medium',
      status: 'execution',
      tasks: [
        { description: 'Follow the rest of the plan for homo sAIpien', completed: false }
      ]
    }
  ];
  
  // Add incubation projects
  const incubationProjects = [
    {
      name: 'First Year Report (Extended)',
      description: 'Additional improvements and refinements',
      priority: 'medium',
      status: 'incubation',
      tasks: [
        { description: 'Finish Content', completed: false },
        { description: 'Trim', completed: false },
        { description: 'ChatGPT all - rephrase it all to work to the idea that one way we can understand multiomics is through genomics', completed: false },
        { description: 'Rename all titles and first sentences', completed: false },
        { description: 'Remove american z\'s and Supplementals', completed: false },
        { description: 'Send to Adam and Scott', completed: false }
      ]
    },
    {
      name: 'Peter',
      description: 'Business and startup related tasks',
      priority: 'low',
      status: 'incubation',
      tasks: [
        { description: 'Go through new files', completed: false },
        {
          description: 'Investigate what monitoring tech we want on the device',
          completed: false,
          subtasks: [
            { description: 'Check sharepoint for a initial doc', completed: false }
          ]
        },
        { description: 'Look at NatWest Competition', completed: false },
        { description: 'Think about Advisory Board', completed: false },
        {
          description: 'Website',
          completed: false,
          subtasks: [
            { description: 'Update with company details', completed: false },
            { description: 'Host and upload the website', completed: false },
            { description: 'Set it live', completed: false }
          ]
        }
      ]
    },
    {
      name: 'Metabolome-wide MR',
      description: 'Research paper improvements',
      priority: 'low',
      status: 'incubation',
      tasks: [
        { description: 'Add results from that paper with assessed a bunch of diseases', completed: false },
        { description: 'Add proxied IVs to PwCoCo analysis in manuscript', completed: false }
      ]
    }
  ];
  
  // Create all projects
  [...initialProjects, ...incubationProjects].forEach(projectData => {
    const projectId = `project_${nextId++}`;
    projects[projectId] = {
      ...projectData,
      id: projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tasks: projectData.tasks.map(taskData => ({
        ...taskData,
        id: `task_${nextId++}`,
        createdAt: new Date().toISOString(),
        subtasks: taskData.subtasks ? taskData.subtasks.map(subtaskData => ({
          ...subtaskData,
          id: `subtask_${nextId++}`
        })) : []
      }))
    };
  });
  
  saveState();
  updateDisplay();
}

// Focus View Rendering
function renderFocusView() {
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = [];
  const dueTodayTasks = [];
  const executionBoardTasks = [];
  
  Object.values(projects).forEach(project => {
    project.tasks.forEach(task => {
      if (task.completed) return;
      
      // Check if task is overdue
      if (task.dueDate && task.dueDate < today) {
        overdueTasks.push({ ...task, projectName: project.name, projectId: project.id });
      }
      // Check if task is due today
      else if (task.dueDate === today) {
        dueTodayTasks.push({ ...task, projectName: project.name, projectId: project.id });
      }
      // Check if task is in execution board
      if (project.status === 'execution') {
        executionBoardTasks.push({ ...task, projectName: project.name, projectId: project.id });
      }
    });
  });
  
  document.getElementById('overdue-tasks').innerHTML = renderFocusTasks(overdueTasks, 'overdue');
  document.getElementById('due-today-tasks').innerHTML = renderFocusTasks(dueTodayTasks, 'due-today');
  document.getElementById('high-priority-tasks').innerHTML = renderFocusTasks(executionBoardTasks, 'execution-board');
  
  updateFocusStats();
  
  // Update timer displays
  if (focusSession.isActive || focusSession.isPaused) {
    updateFocusTimer();
  } else {
    document.getElementById('focus-timer').textContent = '00:00';
  }
  
  // Update pause button state
  updateFocusPauseButton();
  
  // Show/hide Pomodoro section based on active session
  const pomodoroSection = document.getElementById('pomodoro-section');
  if (pomodoroSection) {
    pomodoroSection.style.display = pomodoroSession.isActive ? 'block' : 'none';
  }
  
  if (pomodoroSession.isActive) {
    updatePomodoroDisplay();
  }
}

// Archive View Rendering
function renderArchiveView() {
  const archivedTasksList = document.getElementById('archived-tasks-list');
  const archivedProjectsList = document.getElementById('archived-projects-list');
  
  // Render archived tasks
  archivedTasksList.innerHTML = '';
  let totalArchivedTasks = 0;
  
  Object.entries(archivedTasks).forEach(([projectId, tasks]) => {
    if (tasks.length === 0) return;
    
    const projectName = projects[projectId]?.name || archivedProjects[projectId]?.name || 'Unknown Project';
    
    const projectSection = document.createElement('div');
    projectSection.className = 'archived-project-section';
    projectSection.innerHTML = `
      <h4 class="archived-project-title">
        <i class="fas fa-folder-open"></i> ${escapeHtml(projectName)}
        <span class="task-count">${tasks.length} tasks</span>
      </h4>
      <div class="archived-task-list">
        ${tasks.map(task => `
          <div class="archived-task-item">
            <div class="task-info">
              <span class="task-text">${escapeHtml(task.description)}</span>
              <span class="completion-date">
                <i class="fas fa-check"></i> ${formatDate(task.completedAt)}
              </span>
            </div>
            <div class="task-actions">
              <button onclick="restoreTask('${projectId}', '${task.id}')" class="restore-btn" title="Unfinish task">
                <i class="fas fa-undo"></i> Restore
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    archivedTasksList.appendChild(projectSection);
    totalArchivedTasks += tasks.length;
  });
  
  if (totalArchivedTasks === 0) {
    archivedTasksList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> No archived tasks yet</div>';
  }
  
  // Render archived projects
  archivedProjectsList.innerHTML = '';
  const archivedProjectsArray = Object.values(archivedProjects);
  
  if (archivedProjectsArray.length === 0) {
    archivedProjectsList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> No archived projects yet</div>';
  } else {
    archivedProjectsArray.forEach(project => {
      const archivedAt = project.archivedAt || project.updatedAt;
      const projectCard = document.createElement('div');
      projectCard.className = 'archived-project-card';
      projectCard.innerHTML = `
        <div class="project-header">
          <div class="project-title">${escapeHtml(project.name)}</div>
          <div class="project-meta">
            <span class="priority-badge priority-${project.priority}">${project.priority}</span>
            <span class="archived-date">
              <i class="fas fa-archive"></i> ${formatDate(archivedAt)}
            </span>
          </div>
        </div>
        ${project.description ? `<div class="project-description">${escapeHtml(project.description)}</div>` : ''}
        <div class="project-stats">
          <span><i class="fas fa-tasks"></i> ${project.tasks.length} tasks completed</span>
          ${project.actualTime > 0 ? `<span><i class="fas fa-clock"></i> ${project.actualTime.toFixed(1)}h logged</span>` : ''}
        </div>
        <div class="project-actions">
          <button onclick="restoreProject('${project.id}')" class="restore-btn">
            <i class="fas fa-undo"></i> Restore Project
          </button>
        </div>
      `;
      archivedProjectsList.appendChild(projectCard);
    });
  }
  
  // Update archive stats
  document.getElementById('archived-tasks-count').textContent = totalArchivedTasks;
  document.getElementById('archived-projects-count').textContent = archivedProjectsArray.length;
}

function renderFocusTasks(tasks, type) {
  if (tasks.length === 0) {
    return `<div class="empty-state"><i class="fas fa-check-circle"></i> All clear!</div>`;
  }
  
  return tasks.map(task => {
    // Calculate subtask progress for focus view
    const totalSubtasks = task.subtasks ? task.subtasks.length : 0;
    const completedSubtasks = task.subtasks ? task.subtasks.filter(st => st.completed).length : 0;
    const progressText = totalSubtasks > 0 ? ` (${completedSubtasks}/${totalSubtasks} subtasks)` : '';
    
    // Render subtasks for focus view
    const subtasksHtml = task.subtasks && task.subtasks.length > 0 ? `
      <div class="focus-subtasks">
        ${task.subtasks.map(subtask => `
          <div class="focus-subtask-item ${subtask.completed ? 'completed' : ''}">
            <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                   onchange="toggleSubtask('${task.projectId}', '${task.id}', '${subtask.id}')" class="task-checkbox">
            <span class="focus-subtask-text">${escapeHtml(subtask.description)}</span>
            <button onclick="editSubtask('${task.projectId}', '${task.id}', '${subtask.id}')" title="Edit subtask" class="focus-edit-subtask-btn">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        `).join('')}
      </div>
    ` : '';
    
    return `
      <div class="focus-task ${type}">
        <input type="checkbox" onchange="toggleTask('${task.projectId}', '${task.id}')" class="task-checkbox">
        <div class="focus-task-content">
          <div class="focus-task-title">${escapeHtml(task.description)}${progressText}</div>
          <div class="focus-task-meta">
            <span class="project-tag">${escapeHtml(task.projectName)}</span>
            ${task.dueDate ? `<span class="due-date"><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
            ${task.estimatedTime > 0 ? `<span class="time-estimate"><i class="fas fa-clock"></i> ${task.estimatedTime}h</span>` : ''}
          </div>
          ${subtasksHtml}
        </div>
        <div class="focus-task-actions">
          <button onclick="addSubtask('${task.projectId}', '${task.id}')" title="Add subtask" class="add-subtask-btn">
            <i class="fas fa-plus"></i>
          </button>
          <button onclick="startTimer('${task.projectId}', '${task.id}', this)" class="timer-btn" title="Start timer">
            <i class="fas fa-play"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Statistics Functions
function updateStatistics() {
  const totalProjects = Object.keys(projects).length + Object.keys(archivedProjects).length;
  let completedTasks = 0;
  let totalTasks = 0;
  
  // Count tasks in active projects
  Object.values(projects).forEach(project => {
    project.tasks.forEach(task => {
      totalTasks++;
      if (task.completed) completedTasks++;
    });
  });
  
  // Count archived tasks (all completed)
  Object.values(archivedTasks).forEach(taskArray => {
    totalTasks += taskArray.length;
    completedTasks += taskArray.length;
  });
  
  // Count tasks in archived projects (all completed)
  Object.values(archivedProjects).forEach(project => {
    totalTasks += project.tasks.length;
    completedTasks += project.tasks.length;
  });
  
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  document.getElementById('total-projects').textContent = totalProjects;
  document.getElementById('completed-tasks').textContent = `${completedTasks}/${totalTasks}`;
  document.getElementById('completion-rate').textContent = `${completionRate}%`;
  document.getElementById('streak-days').textContent = dailyStats.streakDays;
}

// Daily Statistics Management
function loadDailyStats() {
  const saved = localStorage.getItem('productivity_daily_stats');
  if (saved) {
    dailyStats = { ...dailyStats, ...JSON.parse(saved) };
  }
}

function saveDailyStats() {
  localStorage.setItem('productivity_daily_stats', JSON.stringify(dailyStats));
}

function updateDailyStats() {
  const today = getCurrentDateString();
  
  // Reset daily stats if it's a new day
  if (dailyStats.lastActiveDate !== today) {
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    if (dailyStats.lastActiveDate === yesterdayStr) {
      dailyStats.streakDays++;
    } else if (dailyStats.lastActiveDate && dailyStats.lastActiveDate < yesterdayStr) {
      dailyStats.streakDays = 1;
    }
    
    dailyStats.completedToday = 0;
    dailyStats.totalTimeToday = 0;
    dailyStats.lastActiveDate = today;
  }
  
  // Count today's completed tasks
  let completedToday = 0;
  Object.values(projects).forEach(project => {
    project.tasks.forEach(task => {
      if (task.completed && task.completedAt && task.completedAt.startsWith(today)) {
        completedToday++;
      }
    });
  });
  
  dailyStats.completedToday = completedToday;
  saveDailyStats();
}

// Day Change Detection Functions
function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

function initializeDayChangeDetector() {
  dayChangeDetector.lastCheckedDate = getCurrentDateString();
  
  // Check for day change every minute
  dayChangeDetector.checkInterval = setInterval(checkForDayChange, 60000);
  
  // Also check on page visibility change (when user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkForDayChange();
    }
  });
}

function checkForDayChange() {
  const currentDate = getCurrentDateString();
  
  if (dayChangeDetector.lastCheckedDate && dayChangeDetector.lastCheckedDate !== currentDate) {
    console.log('Day change detected:', dayChangeDetector.lastCheckedDate, '->', currentDate);
    handleDayChange(currentDate);
  }
  
  dayChangeDetector.lastCheckedDate = currentDate;
  saveDayChangeDetector();
}

function handleDayChange(newDate) {
  // Reset focus session data for new day
  if (focusSession.lastSessionDate !== newDate) {
    focusSession.sessionsToday = 0;
    focusSession.lastSessionDate = newDate;
    saveFocusStats();
  }
  
  // Reset daily stats for new day (this will handle streak calculation)
  updateDailyStats();
  
  // Reset daily planning for new day
  if (dailyPlanning.lastPlanningDate !== newDate) {
    dailyPlanning.hasDailyPlan = false;
    dailyPlanning.plannedTasks = [];
    dailyPlanning.lastPlanningDate = newDate;
    saveDailyPlanning();
  }
  
  // Update analytics data for new day
  updateAnalyticsData();
  
  // Update display to reflect new day
  updateDisplay();
  updateFocusStats();
  
  console.log('Day change handled successfully for date:', newDate);
}

// Test function for day change detection (for development/testing purposes)
function testDayChange() {
  console.log('Testing day change functionality...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  console.log('Current focus sessions today:', focusSession.sessionsToday);
  console.log('Current completed today:', dailyStats.completedToday);
  
  handleDayChange(tomorrowStr);
  
  console.log('After day change:');
  console.log('Focus sessions today should be 0:', focusSession.sessionsToday);
  console.log('Completed today should be 0:', dailyStats.completedToday);
  console.log('Test completed. You can call this function from browser console: testDayChange()');
}

// Make test function available globally
window.testDayChange = testDayChange;

function updateFocusStats() {
  document.getElementById('completed-today').textContent = dailyStats.completedToday;
  document.getElementById('time-today').textContent = `${dailyStats.totalTimeToday.toFixed(1)}h`;
  document.getElementById('focus-sessions-today').textContent = focusSession.sessionsToday;
  document.getElementById('total-focus-time').textContent = `${focusSession.totalFocusTime.toFixed(1)}h`;
}

// Time Tracking Functions
let activeTimer = null;
let timerStartTime = null;
let focusTimerInterval = null;
let pomodoroTimerInterval = null;

function startTimer(projectId, taskId, buttonElement) {
  if (activeTimer) {
    stopTimer();
  }
  
  activeTimer = { projectId, taskId };
  timerStartTime = Date.now();
  
  // Update UI to show active timer
  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('active');
  });
  
  if (buttonElement) {
    buttonElement.innerHTML = '<i class="fas fa-stop"></i>';
    buttonElement.classList.add('active');
  }
}

function stopTimer() {
  if (!activeTimer || !timerStartTime) return;
  
  const timeSpent = (Date.now() - timerStartTime) / (1000 * 60 * 60); // Convert to hours
  const project = projects[activeTimer.projectId];
  const task = project.tasks.find(t => t.id === activeTimer.taskId);
  
  if (task) {
    task.actualTime = (task.actualTime || 0) + timeSpent;
    project.actualTime = (project.actualTime || 0) + timeSpent;
    dailyStats.totalTimeToday += timeSpent;
    
    saveState();
    saveDailyStats();
    updateDisplay();
  }
  
  // Reset timer UI
  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-play"></i>';
    btn.classList.remove('active');
  });
  
  activeTimer = null;
  timerStartTime = null;
}

// Focus Timer Interval Management
function startFocusTimerInterval() {
  if (focusTimerInterval) {
    clearInterval(focusTimerInterval);
  }
  
  if (isElectron && ipcRenderer) {
    // Use Electron's main process timer
    ipcRenderer.invoke('start-focus-timer', focusSession.startTime, focusSession.pausedTime);
  } else {
    // Browser timer
    focusTimerInterval = setInterval(() => {
      focusSession.currentTime = focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000);
      updateFocusTimer();
      saveFocusStats(); // Save state periodically
    }, 1000);
  }
}

// Focus Session Management
function startFocusSession() {
  if (focusSession.isActive) return;
  
  // Check for day change before starting session
  checkForDayChange();
  
  focusSession.isActive = true;
  focusSession.isPaused = false;
  focusSession.startTime = Date.now();
  
  // If not resuming from pause, reset the time
  if (focusSession.pausedTime === 0) {
    focusSession.currentTime = 0;
  }
  
  // Update daily stats (day change check above ensures this is current)
  const today = getCurrentDateString();
  if (focusSession.lastSessionDate !== today) {
    focusSession.sessionsToday = 0;
    focusSession.lastSessionDate = today;
  }
  
  // Only increment sessions if starting fresh (not resuming)
  if (focusSession.pausedTime === 0) {
    focusSession.sessionsToday++;
  }
  
  // Start the timer interval
  startFocusTimerInterval();
  
  saveFocusStats();
  updateFocusPauseButton();
  updateFloatingTimerControls();
  updateFloatingTimerVisibility();
  console.log('Focus session started');
}

async function stopFocusSession() {
  if (!focusSession.isActive && !focusSession.isPaused) return;
  
  let finalTime;
  
  if (isElectron && ipcRenderer) {
    // Use Electron's main process stop
    finalTime = await ipcRenderer.invoke('stop-focus-timer');
    console.log('Focus session stopped in Electron main process');
  } else {
    // Browser fallback
    if (focusSession.isActive) {
      finalTime = focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000);
    } else {
      finalTime = focusSession.pausedTime;
    }
    
    if (focusTimerInterval) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    console.log('Focus session stopped in browser');
  }
  
  const sessionDuration = finalTime / 3600; // Convert to hours
  
  focusSession.totalFocusTime += sessionDuration;
  dailyStats.totalTimeToday += sessionDuration;
  
  focusSession.isActive = false;
  focusSession.isPaused = false;
  focusSession.startTime = null;
  focusSession.currentTime = 0;
  focusSession.pausedTime = 0;
  
  saveFocusStats();
  saveDailyStats();
  updateFocusPauseButton();
  updateFloatingTimerControls();
  updateFloatingTimerVisibility();
  console.log(`Focus session ended. Duration: ${sessionDuration.toFixed(2)} hours`);
  
  // Show notification for focus session completion
  if (sessionDuration > 0.1) { // Only notify for sessions longer than 6 minutes
    showNativeNotification(
      'Focus Session Complete!',
      `Great work! You focused for ${Math.round(sessionDuration * 60)} minutes.`,
      { 
        silent: false,
        onClick: 'focus-completed'
      }
    );
  }
}

async function pauseFocusSession() {
  if (!focusSession.isActive) return;
  
  if (isElectron && ipcRenderer) {
    // Use Electron's main process pause
    const pausedTime = await ipcRenderer.invoke('pause-focus-timer');
    focusSession.pausedTime = pausedTime;
    focusSession.isActive = false;
    focusSession.isPaused = true;
    focusSession.startTime = null;
    console.log('Focus session paused in Electron main process');
  } else {
    // Browser fallback
    focusSession.pausedTime = focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000);
    focusSession.isActive = false;
    focusSession.isPaused = true;
    focusSession.startTime = null;
    
    if (focusTimerInterval) {
      clearInterval(focusTimerInterval);
      focusTimerInterval = null;
    }
    console.log('Focus session paused in browser');
  }
  
  saveFocusStats();
  updateFocusPauseButton();
  updateFloatingTimerControls();
  updateFloatingTimerVisibility();
}

async function resumeFocusSession() {
  if (focusSession.isActive || !focusSession.isPaused) return;
  
  // Check for day change before resuming session
  checkForDayChange();
  
  focusSession.isActive = true;
  focusSession.isPaused = false;
  focusSession.startTime = Date.now();
  
  // Start the timer interval
  startFocusTimerInterval();
  
  saveFocusStats();
  updateFocusPauseButton();
  updateFloatingTimerControls();
  updateFloatingTimerVisibility();
}

function toggleFocusPause() {
  if (focusSession.isActive) {
    pauseFocusSession();
  } else if (focusSession.isPaused) {
    resumeFocusSession();
  }
}

function updateFocusPauseButton() {
  const pauseBtn = document.getElementById('pause-focus');
  if (!pauseBtn) return;
  
  if (focusSession.isActive) {
    // Session is running - show pause button
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    pauseBtn.title = 'Pause focus session';
  } else if (focusSession.isPaused) {
    // Session is paused - show resume button
    pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    pauseBtn.title = 'Resume focus session';
  } else {
    // Session is stopped - show pause button (disabled state)
    pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    pauseBtn.title = 'Pause focus session';
  }
}

function updateFocusButtonIndicator() {
  // Add visual indicator to focus button when session is running in background
  if ((focusSession.isActive || focusSession.isPaused) && currentView !== 'focus') {
    focusToggle.innerHTML = '<i class="fas fa-brain"></i> Focus <span class="focus-indicator">●</span>';
    focusToggle.style.color = focusSession.isActive ? '#4CAF50' : '#FF9800';
  } else {
    focusToggle.innerHTML = '<i class="fas fa-brain"></i> Focus';
    focusToggle.style.color = '';
  }
}

function updateFocusTimer() {
  // Show timer if session is active or paused
  if (!focusSession.isActive && !focusSession.isPaused) return;
  
  // Use the current accumulated time
  const timeToDisplay = focusSession.isPaused ? focusSession.pausedTime : focusSession.currentTime;
  const minutes = Math.floor(timeToDisplay / 60);
  const seconds = timeToDisplay % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Update focus mode timer
  const timerElement = document.getElementById('focus-timer');
  if (timerElement) {
    timerElement.textContent = timeDisplay;
  }
  
  // Update floating timer
  const floatingTimerText = document.getElementById('floating-timer-text');
  if (floatingTimerText) {
    floatingTimerText.textContent = timeDisplay;
  }
  
  // Update time logged for today in real-time (only when active)
  if (focusSession.isActive) {
    const sessionHours = focusSession.currentTime / 3600;
    const totalTimeElement = document.getElementById('time-today');
    if (totalTimeElement) {
      totalTimeElement.textContent = `${(dailyStats.totalTimeToday + sessionHours).toFixed(1)}h`;
    }
  }
}

// Floating Timer Management
function showFloatingTimer() {
  const floatingTimer = document.getElementById('floating-timer');
  if (floatingTimer && currentView !== 'focus') {
    floatingTimer.classList.remove('hidden');
  }
}

function hideFloatingTimer() {
  const floatingTimer = document.getElementById('floating-timer');
  if (floatingTimer) {
    floatingTimer.classList.add('hidden');
  }
}

function updateFloatingTimerVisibility() {
  if ((focusSession.isActive || focusSession.isPaused) && currentView !== 'focus') {
    showFloatingTimer();
  } else {
    hideFloatingTimer();
  }
}

function updateFloatingTimerControls() {
  const floatingPauseBtn = document.getElementById('floating-pause-btn');
  if (floatingPauseBtn) {
    if (focusSession.isActive) {
      floatingPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      floatingPauseBtn.title = 'Pause';
    } else if (focusSession.isPaused) {
      floatingPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      floatingPauseBtn.title = 'Resume';
    }
  }
}

function saveFocusStats() {
  localStorage.setItem('productivity_focus_stats', JSON.stringify(focusSession));
}

function loadFocusStats() {
  const saved = localStorage.getItem('productivity_focus_stats');
  if (saved) {
    const savedSession = JSON.parse(saved);
    focusSession = { ...focusSession, ...savedSession };
    
    // If session was active when saved, restore it properly
    if (savedSession.isActive && savedSession.startTime) {
      // Calculate elapsed time since last save
      const now = Date.now();
      const elapsed = Math.floor((now - savedSession.startTime) / 1000);
      focusSession.currentTime = savedSession.pausedTime + elapsed;
      focusSession.startTime = now; // Reset start time to now for continued timing
      focusSession.isActive = true; // Ensure active state is restored
      
      // Restart the timer interval
      startFocusTimerInterval();
      // Update display immediately
      updateFocusTimer();
      // Update floating timer controls and visibility
      updateFloatingTimerControls();
      updateFloatingTimerVisibility();
    } else if (savedSession.isPaused) {
      // If paused, keep the paused state but don't start timer
      focusSession.isActive = false;
      // If there's paused time, keep the timer display
      if (focusSession.isPaused && focusSession.pausedTime > 0) {
        focusSession.currentTime = focusSession.pausedTime;
        updateFocusTimer();
      } else {
        focusSession.currentTime = 0;
      }
      // Update floating timer for paused sessions too
      updateFloatingTimerControls();
      updateFloatingTimerVisibility();
    }
  }
}

function loadDayChangeDetector() {
  const saved = localStorage.getItem('productivity_day_change_detector');
  if (saved) {
    const savedData = JSON.parse(saved);
    dayChangeDetector.lastCheckedDate = savedData.lastCheckedDate;
  }
}

function saveDayChangeDetector() {
  localStorage.setItem('productivity_day_change_detector', JSON.stringify({
    lastCheckedDate: dayChangeDetector.lastCheckedDate
  }));
}

// Pomodoro Timer Functions
function startPomodoroSession(projectId, taskId) {
  if (pomodoroSession.isActive) return;
  
  pomodoroSession.isActive = true;
  pomodoroSession.linkedProjectId = projectId;
  pomodoroSession.linkedTaskId = taskId;
  pomodoroSession.currentPhase = 'work';
  pomodoroSession.currentRound++;
  pomodoroSession.timeRemaining = pomodoroSession.settings.workDuration;
  
  // Stop focus session if active
  if (focusSession.isActive) {
    stopFocusSession();
  }
  
  // Start the countdown
  pomodoroTimerInterval = setInterval(() => {
    pomodoroSession.timeRemaining--;
    updatePomodoroDisplay();
    
    if (pomodoroSession.timeRemaining <= 0) {
      completePomodoroPhase();
    }
  }, 1000);
  
  savePomodoroStats();
  
  // Show Pomodoro section and switch to focus view
  const pomodoroSection = document.getElementById('pomodoro-section');
  if (pomodoroSection) {
    pomodoroSection.style.display = 'block';
  }
  
  // Switch to focus view to show timer
  if (currentView !== 'focus') {
    currentView = 'focus';
    updateDisplay();
    updateViewButtons();
  }
  
  console.log(`Pomodoro work session started for task ${taskId}`);
}

function completePomodoroPhase() {
  const wasWorkSession = pomodoroSession.currentPhase === 'work';
  
  if (wasWorkSession) {
    // Log time to the linked task
    logPomodoroTimeToTask();
    pomodoroSession.completedRounds++;
    pomodoroSession.totalWorkTime += pomodoroSession.settings.workDuration;
  }
  
  // Play notification sound (optional)
  playPomodoroNotification();
  
  // Determine next phase
  if (wasWorkSession) {
    const shouldTakeLongBreak = pomodoroSession.completedRounds % pomodoroSession.settings.roundsBeforeLongBreak === 0;
    pomodoroSession.currentPhase = shouldTakeLongBreak ? 'longBreak' : 'shortBreak';
    pomodoroSession.timeRemaining = shouldTakeLongBreak 
      ? pomodoroSession.settings.longBreakDuration 
      : pomodoroSession.settings.shortBreakDuration;
  } else {
    // Break finished, start next work session
    pomodoroSession.currentPhase = 'work';
    pomodoroSession.timeRemaining = pomodoroSession.settings.workDuration;
    pomodoroSession.currentRound++;
  }
  
  savePomodoroStats();
  updatePomodoroDisplay();
  
  // Auto-continue or prompt user
  if (pomodoroSession.currentPhase === 'work') {
    // Optional: auto-start next work session or prompt
    console.log('Break finished. Starting next work session...');
  } else {
    console.log(`Work session completed. Starting ${pomodoroSession.currentPhase}...`);
  }
}

function logPomodoroTimeToTask() {
  if (!pomodoroSession.linkedTaskId || !pomodoroSession.linkedProjectId) return;
  
  const project = projects[pomodoroSession.linkedProjectId];
  if (!project) return;
  
  const task = project.tasks.find(t => t.id === pomodoroSession.linkedTaskId);
  if (!task) return;
  
  const timeInHours = pomodoroSession.settings.workDuration / 3600; // Convert to hours
  
  task.actualTime = (task.actualTime || 0) + timeInHours;
  project.actualTime = (project.actualTime || 0) + timeInHours;
  dailyStats.totalTimeToday += timeInHours;
  
  project.updatedAt = new Date().toISOString();
  saveState();
  saveDailyStats();
  
  console.log(`Logged ${timeInHours.toFixed(2)} hours to task: ${task.description}`);
}

function stopPomodoroSession() {
  if (!pomodoroSession.isActive) return;
  
  // If stopping during work session, log partial time
  if (pomodoroSession.currentPhase === 'work') {
    const completedTime = pomodoroSession.settings.workDuration - pomodoroSession.timeRemaining;
    const timeInHours = completedTime / 3600;
    
    if (pomodoroSession.linkedTaskId && pomodoroSession.linkedProjectId) {
      const project = projects[pomodoroSession.linkedProjectId];
      if (project) {
        const task = project.tasks.find(t => t.id === pomodoroSession.linkedTaskId);
        if (task) {
          task.actualTime = (task.actualTime || 0) + timeInHours;
          project.actualTime = (project.actualTime || 0) + timeInHours;
          dailyStats.totalTimeToday += timeInHours;
          
          project.updatedAt = new Date().toISOString();
          saveState();
          saveDailyStats();
        }
      }
    }
  }
  
  pomodoroSession.isActive = false;
  pomodoroSession.linkedTaskId = null;
  pomodoroSession.linkedProjectId = null;
  
  if (pomodoroTimerInterval) {
    clearInterval(pomodoroTimerInterval);
    pomodoroTimerInterval = null;
  }
  
  savePomodoroStats();
  updatePomodoroDisplay();
  
  // Hide Pomodoro section
  const pomodoroSection = document.getElementById('pomodoro-section');
  if (pomodoroSection) {
    pomodoroSection.style.display = 'none';
  }
  
  console.log('Pomodoro session stopped');
}

function pausePomodoroSession() {
  if (!pomodoroSession.isActive) return;
  
  if (pomodoroTimerInterval) {
    clearInterval(pomodoroTimerInterval);
    pomodoroTimerInterval = null;
  }
  
  console.log('Pomodoro session paused');
}

function resumePomodoroSession() {
  if (!pomodoroSession.isActive || pomodoroTimerInterval) return;
  
  pomodoroTimerInterval = setInterval(() => {
    pomodoroSession.timeRemaining--;
    updatePomodoroDisplay();
    
    if (pomodoroSession.timeRemaining <= 0) {
      completePomodoroPhase();
    }
  }, 1000);
  
  console.log('Pomodoro session resumed');
}

function updatePomodoroDisplay() {
  const minutes = Math.floor(pomodoroSession.timeRemaining / 60);
  const seconds = pomodoroSession.timeRemaining % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const timerElement = document.getElementById('pomodoro-timer');
  const phaseElement = document.getElementById('pomodoro-phase');
  const roundElement = document.getElementById('pomodoro-round');
  
  if (timerElement) {
    timerElement.textContent = timeDisplay;
  }
  
  if (phaseElement) {
    const phaseText = {
      'work': '🍅 Work Time',
      'shortBreak': '☕ Short Break', 
      'longBreak': '🏃 Long Break'
    };
    phaseElement.textContent = phaseText[pomodoroSession.currentPhase] || 'Ready';
  }
  
  if (roundElement) {
    roundElement.textContent = `Round ${pomodoroSession.currentRound}`;
  }
}

function playPomodoroNotification() {
  // Create a simple beep notification
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext || window.mozAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.log('Audio notification not available');
  }
  
  // Show browser notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    const phase = pomodoroSession.currentPhase;
    const message = phase === 'work' 
      ? 'Work session completed! Time for a break.' 
      : 'Break time over! Ready for the next work session?';
    
    new Notification('Pomodoro Timer', {
      body: message,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text y="18" font-size="18">🍅</text></svg>'
    });
  }
}

function savePomodoroStats() {
  localStorage.setItem('productivity_pomodoro_stats', JSON.stringify(pomodoroSession));
}

function loadPomodoroStats() {
  const saved = localStorage.getItem('productivity_pomodoro_stats');
  if (saved) {
    pomodoroSession = { ...pomodoroSession, ...JSON.parse(saved) };
    // Don't restore active session on page load
    pomodoroSession.isActive = false;
  }
}

// Theme Management Functions
function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme();
  saveTheme();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  // Update theme toggle icon
  const themeIcon = themeToggle.querySelector('i');
  if (themeIcon) {
    themeIcon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
  }
  
  // Update theme toggle title
  themeToggle.title = currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
}

function saveTheme() {
  localStorage.setItem('productivity_theme', currentTheme);
}

function loadTheme() {
  const saved = localStorage.getItem('productivity_theme');
  if (saved && ['light', 'dark'].includes(saved)) {
    currentTheme = saved;
  }
  applyTheme();
}

// Daily Planning Assistant Functions
function checkDailyPlanning() {
  const today = new Date().toISOString().split('T')[0];
  
  // Only show on first visit of the day
  if (dailyPlanning.lastPlanningDate !== today && !dailyPlanning.hasDailyPlan) {
    setTimeout(() => {
      showDailyPlannerModal();
    }, 1000); // Show after 1 second delay
  }
}

function showDailyPlannerModal() {
  populateSuggestedTasks();
  dailyPlannerModal.classList.add('active');
}

function closeDailyPlannerModal() {
  dailyPlannerModal.classList.remove('active');
}

function populateSuggestedTasks() {
  const suggestedTasksList = document.getElementById('suggested-tasks-list');
  if (!suggestedTasksList) return;
  
  const suggestions = generateTaskSuggestions();
  
  suggestedTasksList.innerHTML = suggestions.map(suggestion => `
    <div class="task-suggestion" data-project-id="${suggestion.projectId}" data-task-id="${suggestion.taskId}">
      <div class="suggestion-content">
        <input type="checkbox" class="suggestion-checkbox" checked>
        <div class="suggestion-details">
          <div class="suggestion-task">${escapeHtml(suggestion.taskDescription)}</div>
          <div class="suggestion-project">${escapeHtml(suggestion.projectName)}</div>
          <div class="suggestion-reason">${suggestion.reason}</div>
        </div>
      </div>
      <div class="suggestion-meta">
        ${suggestion.priority ? `<span class="priority-badge priority-${suggestion.priority}">${suggestion.priority}</span>` : ''}
        ${suggestion.dueDate ? `<span class="due-badge">${formatDate(suggestion.dueDate)}</span>` : ''}
        ${suggestion.estimatedTime ? `<span class="time-badge">${suggestion.estimatedTime}h</span>` : ''}
      </div>
    </div>
  `).join('');
}

function generateTaskSuggestions() {
  const today = new Date().toISOString().split('T')[0];
  const suggestions = [];
  
  Object.values(projects).forEach(project => {
    if (project.tasks) {
      project.tasks.forEach(task => {
        if (task.completed) return;
        
        let score = 0;
        let reason = '';
        
        // High priority projects get higher score
        if (project.priority === 'high') {
          score += 30;
          reason = '🔥 High priority project';
        } else if (project.priority === 'medium') {
          score += 15;
        }
        
        // Tasks due today or overdue get very high score
        if (task.dueDate) {
          if (task.dueDate < today) {
            score += 50;
            reason = '⚠️ Overdue task';
          } else if (task.dueDate === today) {
            score += 40;
            reason = '📅 Due today';
          }
        }
        
        // Execution projects get priority over incubation
        if (project.status === 'execution') {
          score += 20;
          if (!reason) reason = '🚀 Active project';
        }
        
        // Short tasks get bonus (quick wins)
        if (task.estimatedTime && task.estimatedTime <= 1) {
          score += 15;
          if (!reason) reason = '⚡ Quick win (≤1h)';
        }
        
        // Tasks with no reason yet get default
        if (!reason) {
          reason = '💡 Suggested for today';
        }
        
        if (score > 10) { // Only suggest tasks with meaningful score
          suggestions.push({
            projectId: project.id,
            taskId: task.id,
            projectName: project.name,
            taskDescription: task.description,
            reason: reason,
            score: score,
            priority: project.priority,
            dueDate: task.dueDate,
            estimatedTime: task.estimatedTime
          });
        }
      });
    }
  });
  
  // Sort by score and return top 6
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function selectAllSuggestions() {
  const checkboxes = document.querySelectorAll('.suggestion-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
}

function clearAllSuggestions() {
  const checkboxes = document.querySelectorAll('.suggestion-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
}

function skipDailyPlanning() {
  const today = new Date().toISOString().split('T')[0];
  dailyPlanning.lastPlanningDate = today;
  dailyPlanning.hasDailyPlan = false;
  dailyPlanning.plannedTasks = [];
  
  saveDailyPlanning();
  closeDailyPlannerModal();
}

function startDay() {
  const today = new Date().toISOString().split('T')[0];
  const selectedTasks = [];
  
  // Get all selected tasks
  const taskSuggestions = document.querySelectorAll('.task-suggestion');
  taskSuggestions.forEach(suggestion => {
    const checkbox = suggestion.querySelector('.suggestion-checkbox');
    if (checkbox.checked) {
      selectedTasks.push({
        projectId: suggestion.dataset.projectId,
        taskId: suggestion.dataset.taskId,
        plannedDate: today
      });
    }
  });
  
  // Mark selected tasks as planned for today
  selectedTasks.forEach(({projectId, taskId}) => {
    const project = projects[projectId];
    if (project) {
      const task = project.tasks.find(t => t.id === taskId);
      if (task) {
        task.plannedForToday = true;
      }
    }
  });
  
  dailyPlanning.lastPlanningDate = today;
  dailyPlanning.hasDailyPlan = true;
  dailyPlanning.plannedTasks = selectedTasks;
  
  saveState();
  saveDailyPlanning();
  updateDisplay();
  closeDailyPlannerModal();
  
  console.log(`Day started with ${selectedTasks.length} planned tasks`);
}

function saveDailyPlanning() {
  localStorage.setItem('productivity_daily_planning', JSON.stringify(dailyPlanning));
}

function loadDailyPlanning() {
  const saved = localStorage.getItem('productivity_daily_planning');
  if (saved) {
    dailyPlanning = { ...dailyPlanning, ...JSON.parse(saved) };
  }
  
  // Reset daily plan at midnight
  const today = new Date().toISOString().split('T')[0];
  if (dailyPlanning.lastPlanningDate !== today) {
    // Clear plannedForToday flags from tasks
    Object.values(projects).forEach(project => {
      if (project.tasks) {
        project.tasks.forEach(task => {
          delete task.plannedForToday;
        });
      }
    });
    
    dailyPlanning.hasDailyPlan = false;
    dailyPlanning.plannedTasks = [];
  }
}

// Analytics Data Management
function updateAnalyticsData() {
  const today = new Date().toISOString().split('T')[0];
  
  if (!analyticsData.dailyProductivity[today]) {
    analyticsData.dailyProductivity[today] = {
      timeLogged: 0,
      tasksCompleted: 0,
      focusSessions: 0,
      pomodoroSessions: 0
    };
  }
  
  // Update today's data
  analyticsData.dailyProductivity[today].timeLogged = dailyStats.totalTimeToday;
  analyticsData.dailyProductivity[today].tasksCompleted = dailyStats.completedToday;
  analyticsData.dailyProductivity[today].focusSessions = focusSession.sessionsToday;
  analyticsData.dailyProductivity[today].pomodoroSessions = pomodoroSession.completedRounds;
  
  analyticsData.lastUpdated = new Date().toISOString();
  saveAnalyticsData();
}

function saveAnalyticsData() {
  localStorage.setItem('productivity_analytics', JSON.stringify(analyticsData));
}

function loadAnalyticsData() {
  const saved = localStorage.getItem('productivity_analytics');
  if (saved) {
    analyticsData = { ...analyticsData, ...JSON.parse(saved) };
  }
}

// Track incubation activity
function trackIncubationActivity() {
  const today = new Date().toISOString().split('T')[0];
  if (!analyticsData.incubationActivity[today]) {
    analyticsData.incubationActivity[today] = 0;
  }
  analyticsData.incubationActivity[today]++;
  saveAnalyticsData();
}

// Incubation Heatmap Functions
let currentHeatmapMonth = new Date();

function renderIncubationHeatmap() {
  const heatmapContainer = document.getElementById('incubation-heatmap');
  if (!heatmapContainer) return;

  renderSingleMonthHeatmap(currentHeatmapMonth);
  updateHeatmapNavigation();
}

function renderSingleMonthHeatmap(monthDate) {
  const heatmapContainer = document.getElementById('incubation-heatmap');
  const monthData = generateMonthData(monthDate);
  const monthHTML = generateSingleMonthHTML(monthData, monthDate);
  
  heatmapContainer.innerHTML = monthHTML;
}

function updateHeatmapNavigation() {
  const monthTitle = document.getElementById('heatmap-current-month');
  const prevBtn = document.getElementById('heatmap-prev-month');
  const nextBtn = document.getElementById('heatmap-next-month');
  
  if (!monthTitle) return;
  
  // Update month title
  monthTitle.textContent = currentHeatmapMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Update navigation buttons
  const now = new Date();
  const firstDataMonth = new Date(2024, 0); // Assuming app started in 2024
  
  if (prevBtn) {
    prevBtn.disabled = currentHeatmapMonth <= firstDataMonth;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentHeatmapMonth >= now;
  }
}

function navigateHeatmapMonth(direction) {
  const newMonth = new Date(currentHeatmapMonth);
  newMonth.setMonth(newMonth.getMonth() + direction);
  
  currentHeatmapMonth = newMonth;
  renderSingleMonthHeatmap(currentHeatmapMonth);
  updateHeatmapNavigation();
}

function generateSingleMonthHTML(data, monthDate) {
  let html = `<div class="single-month-heatmap">`;
  
  // Add day headers
  html += `<div class="month-day-headers">`;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
    html += `<div class="day-header">${day}</div>`;
  });
  html += `</div>`;
  
  // Add calendar grid
  html += `<div class="month-calendar">`;
  data.forEach((day, index) => {
    if (day) {
      const date = new Date(day.date);
      const title = `${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })}: ${day.count} ideas added`;
      html += `<div class="month-day" data-level="${day.level}" title="${title}">${day.day}</div>`;
    } else {
      html += `<div class="month-day empty"></div>`;
    }
  });
  html += `</div>`;
  html += `</div>`;
  
  return html;
}

function generateHeatmapData(startDate, endDate) {
  const data = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const activity = analyticsData.incubationActivity[dateStr] || 0;
    
    data.push({
      date: dateStr,
      count: activity,
      level: getActivityLevel(activity)
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

function getActivityLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

function generateMonthlyHeatmapHTML(referenceDate) {
  let html = '<div class="monthly-heatmap-container">';
  
  // Show last 6 months
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(referenceDate);
    monthDate.setMonth(monthDate.getMonth() - monthOffset);
    
    const monthData = generateMonthData(monthDate);
    html += generateMonthHTML(monthData, monthDate);
  }
  
  html += '</div>';
  return html;
}

function generateMonthData(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const data = [];
  const currentDate = new Date(firstDay);
  
  // Add empty cells for days before the first of the month
  const startDayOfWeek = firstDay.getDay();
  for (let i = 0; i < startDayOfWeek; i++) {
    data.push(null);
  }
  
  // Add all days of the month
  while (currentDate <= lastDay) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const activity = analyticsData.incubationActivity[dateStr] || 0;
    
    data.push({
      date: dateStr,
      day: currentDate.getDate(),
      count: activity,
      level: getActivityLevel(activity)
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return data;
}

function generateMonthHTML(data, monthDate) {
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  
  let html = `<div class="monthly-heatmap-month">`;
  html += `<div class="month-title">${monthName}</div>`;
  html += `<div class="month-grid">`;
  
  // Add day headers
  html += `<div class="month-day-headers">`;
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(day => {
    html += `<div class="day-header">${day}</div>`;
  });
  html += `</div>`;
  
  // Add calendar grid
  html += `<div class="month-calendar">`;
  data.forEach((day, index) => {
    if (day) {
      const date = new Date(day.date);
      const title = `${date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      })}: ${day.count} ideas added`;
      html += `<div class="month-day" data-level="${day.level}" title="${title}">${day.day}</div>`;
    } else {
      html += `<div class="month-day empty"></div>`;
    }
  });
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;
  
  return html;
}

// Chart and Analytics Functions
function switchStatsTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  
  // Update tab content
  document.querySelectorAll('.stats-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  // Initialize chart if switching to analytics
  if (tabName === 'analytics' && !productivityChart) {
    setTimeout(() => {
      initializeProductivityChart();
      updateChart(7);
    }, 100);
  }
  
  if (tabName === 'insights') {
    updateInsights();
  }
}

function initializeProductivityChart() {
  const ctx = document.getElementById('productivity-chart');
  if (!ctx) return;
  
  productivityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Time Logged (hours)',
          data: [],
          borderColor: 'rgb(102, 126, 234)',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          yAxisID: 'y',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Tasks Completed',
          data: [],
          borderColor: 'rgb(46, 204, 113)',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          yAxisID: 'y1',
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Productivity Over Time'
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Hours'
          },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Tasks'
          },
          beginAtZero: true,
          grid: {
            drawOnChartArea: false,
          },
        },
      }
    }
  });
}

function updateChart(days) {
  if (!productivityChart) return;
  
  // Update active period button
  document.querySelectorAll('.chart-period-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`chart-${days}days`).classList.add('active');
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days + 1);
  
  const labels = [];
  const timeData = [];
  const taskData = [];
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayData = analyticsData.dailyProductivity[dateStr];
    
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    timeData.push(dayData ? dayData.timeLogged : 0);
    taskData.push(dayData ? dayData.tasksCompleted : 0);
  }
  
  productivityChart.data.labels = labels;
  productivityChart.data.datasets[0].data = timeData;
  productivityChart.data.datasets[1].data = taskData;
  productivityChart.update();
}

function updateInsights() {
  const insights = calculateInsights();
  
  document.getElementById('most-productive-day').textContent = insights.mostProductiveDay;
  document.getElementById('avg-task-time').textContent = insights.avgTaskTime;
  document.getElementById('focus-efficiency').textContent = insights.focusEfficiency;
  document.getElementById('weekly-trend').textContent = insights.weeklyTrend;
  
  // Render incubation heatmap
  renderIncubationHeatmap();
}

function calculateInsights() {
  const last7Days = [];
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayData = analyticsData.dailyProductivity[dateStr];
    if (dayData) {
      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        ...dayData
      });
    }
  }
  
  if (last7Days.length === 0) {
    return {
      mostProductiveDay: 'No data yet',
      avgTaskTime: 'No data yet',
      focusEfficiency: 'No data yet',
      weeklyTrend: 'No data yet'
    };
  }
  
  // Most productive day (by tasks completed)
  const mostProductive = last7Days.reduce((max, day) => 
    day.tasksCompleted > max.tasksCompleted ? day : max, last7Days[0]);
  
  // Average task time
  const totalTime = last7Days.reduce((sum, day) => sum + day.timeLogged, 0);
  const totalTasks = last7Days.reduce((sum, day) => sum + day.tasksCompleted, 0);
  const avgTime = totalTasks > 0 ? (totalTime / totalTasks) : 0;
  
  // Focus efficiency (tasks per focus session)
  const totalFocusSessions = last7Days.reduce((sum, day) => sum + day.focusSessions, 0);
  const focusEfficiency = totalFocusSessions > 0 ? (totalTasks / totalFocusSessions) : 0;
  
  // Weekly trend
  const firstHalf = last7Days.slice(0, Math.floor(last7Days.length / 2));
  const secondHalf = last7Days.slice(Math.floor(last7Days.length / 2));
  
  const firstHalfAvg = firstHalf.reduce((sum, day) => sum + day.tasksCompleted, 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, day) => sum + day.tasksCompleted, 0) / secondHalf.length;
  
  const trendDirection = secondHalfAvg > firstHalfAvg ? '📈 Improving' : 
                        secondHalfAvg < firstHalfAvg ? '📉 Declining' : '➡️ Steady';
  
  return {
    mostProductiveDay: `${mostProductive.date} (${mostProductive.tasksCompleted} tasks)`,
    avgTaskTime: `${avgTime.toFixed(1)}h per task`,
    focusEfficiency: `${focusEfficiency.toFixed(1)} tasks/session`,
    weeklyTrend: trendDirection
  };
}

// Enhanced Weekly/Monthly Task Tracking
function getWeeklyTaskStats(startDate = null) {
  const end = startDate ? new Date(startDate) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 6); // 7 days including today
  
  let totalTasks = 0;
  let totalTime = 0;
  let totalFocusSessions = 0;
  const dailyBreakdown = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayData = analyticsData.dailyProductivity[dateStr];
    
    const dayStats = {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: dayData ? dayData.tasksCompleted : 0,
      time: dayData ? dayData.timeLogged : 0,
      focusSessions: dayData ? dayData.focusSessions : 0
    };
    
    totalTasks += dayStats.tasks;
    totalTime += dayStats.time;
    totalFocusSessions += dayStats.focusSessions;
    dailyBreakdown.push(dayStats);
  }
  
  return {
    period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    totalTasks,
    totalTime: Math.round(totalTime * 100) / 100,
    totalFocusSessions,
    averageTasksPerDay: (totalTasks / 7).toFixed(1),
    averageTimePerDay: (totalTime / 7).toFixed(1),
    dailyBreakdown
  };
}

function getMonthlyTaskStats(year = null, month = null) {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month !== null ? month : now.getMonth();
  
  const start = new Date(targetYear, targetMonth, 1);
  const end = new Date(targetYear, targetMonth + 1, 0); // Last day of month
  
  let totalTasks = 0;
  let totalTime = 0;
  let totalFocusSessions = 0;
  const weeklyBreakdown = [];
  let currentWeek = [];
  let weekStarted = false;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayData = analyticsData.dailyProductivity[dateStr];
    
    const dayStats = {
      date: dateStr,
      day: d.getDate(),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: dayData ? dayData.tasksCompleted : 0,
      time: dayData ? dayData.timeLogged : 0,
      focusSessions: dayData ? dayData.focusSessions : 0
    };
    
    totalTasks += dayStats.tasks;
    totalTime += dayStats.time;
    totalFocusSessions += dayStats.focusSessions;
    
    // Group by weeks (Sunday to Saturday)
    if (d.getDay() === 0 && !weekStarted) { // Sunday - start new week
      weekStarted = true;
    }
    
    if (weekStarted) {
      currentWeek.push(dayStats);
      
      if (d.getDay() === 6 || d.getTime() === end.getTime()) { // Saturday or last day
        const weekTasks = currentWeek.reduce((sum, day) => sum + day.tasks, 0);
        const weekTime = currentWeek.reduce((sum, day) => sum + day.time, 0);
        
        weeklyBreakdown.push({
          weekNumber: weeklyBreakdown.length + 1,
          dateRange: `${currentWeek[0].date} - ${currentWeek[currentWeek.length - 1].date}`,
          totalTasks: weekTasks,
          totalTime: Math.round(weekTime * 100) / 100,
          days: [...currentWeek]
        });
        currentWeek = [];
      }
    }
  }
  
  const daysInMonth = end.getDate();
  
  return {
    period: `${start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    totalTasks,
    totalTime: Math.round(totalTime * 100) / 100,
    totalFocusSessions,
    averageTasksPerDay: (totalTasks / daysInMonth).toFixed(1),
    averageTimePerDay: (totalTime / daysInMonth).toFixed(1),
    weeklyBreakdown,
    daysInMonth
  };
}

// Export functions for task tracking data
function exportWeeklyData(weeks = 4) {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7) - today.getDay()); // Go to Sunday of that week
    data.push(getWeeklyTaskStats(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000))); // End on Saturday
  }
  
  return data.reverse(); // Oldest first
}

function exportMonthlyData(months = 6) {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < months; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    data.push(getMonthlyTaskStats(targetDate.getFullYear(), targetDate.getMonth()));
  }
  
  return data.reverse(); // Oldest first
}

// Goal Tracker Functions
function showGoalsModal() {
  renderGoals();
  goalsModal.classList.add('active');
}

function closeGoalsModal() {
  goalsModal.classList.remove('active');
}

function openGoalFormModal(goal = null) {
  const modalTitle = document.getElementById('goal-modal-title');
  const goalForm = document.getElementById('goal-form');
  
  if (goal) {
    modalTitle.textContent = 'Edit Goal';
    document.getElementById('goal-title').value = goal.title;
    document.getElementById('goal-description').value = goal.description || '';
    document.getElementById('goal-due-date').value = goal.dueDate || '';
    goalForm.dataset.editId = goal.id;
  } else {
    modalTitle.textContent = 'Create New Goal';
    goalForm.reset();
    delete goalForm.dataset.editId;
  }
  
  populateTaskSelection();
  goalFormModal.classList.add('active');
}

function closeGoalFormModal() {
  goalFormModal.classList.remove('active');
  document.getElementById('goal-form').reset();
  delete document.getElementById('goal-form').dataset.editId;
}

function populateTaskSelection() {
  const taskSelection = document.getElementById('task-selection');
  if (!taskSelection) return;
  
  taskSelection.innerHTML = '';
  
  Object.values(projects).forEach(project => {
    if (project.tasks && project.tasks.length > 0) {
      const projectSection = document.createElement('div');
      projectSection.className = 'task-selection-project';
      projectSection.innerHTML = `
        <div class="project-header">
          <h5>${escapeHtml(project.name)}</h5>
        </div>
        <div class="task-checkboxes">
          ${project.tasks.map(task => `
            <label class="task-checkbox-label">
              <input type="checkbox" value="${task.id}" data-project-id="${project.id}">
              <span class="task-name">${escapeHtml(task.description)}</span>
            </label>
          `).join('')}
        </div>
      `;
      taskSelection.appendChild(projectSection);
    }
  });
}

function handleGoalSubmit(e) {
  e.preventDefault();
  
  const goalData = {
    title: document.getElementById('goal-title').value.trim(),
    description: document.getElementById('goal-description').value.trim(),
    dueDate: document.getElementById('goal-due-date').value || null,
    linkedTasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Get selected tasks
  const selectedTaskCheckboxes = document.querySelectorAll('#task-selection input[type="checkbox"]:checked');
  selectedTaskCheckboxes.forEach(checkbox => {
    goalData.linkedTasks.push({
      taskId: checkbox.value,
      projectId: checkbox.dataset.projectId
    });
  });
  
  if (!goalData.title) return;
  
  const editId = document.getElementById('goal-form').dataset.editId;
  
  if (editId) {
    // Update existing goal
    const oldGoal = { ...goals[editId] };
    goals[editId] = { ...goals[editId], ...goalData, updatedAt: new Date().toISOString() };
    saveStateToHistory(`Updated goal: ${goalData.title}`, { type: 'updateGoal', goalId: editId, oldGoal });
  } else {
    // Create new goal
    const goalId = `goal_${nextGoalId++}`;
    goals[goalId] = { ...goalData, id: goalId };
    saveStateToHistory(`Created goal: ${goalData.title}`, { type: 'createGoal', goalId });
  }
  
  saveGoals();
  renderGoals();
  closeGoalFormModal();
}

function deleteGoal(goalId) {
  if (confirm('Are you sure you want to delete this goal?')) {
    const deletedGoal = { ...goals[goalId] };
    delete goals[goalId];
    saveStateToHistory(`Deleted goal: ${deletedGoal.title}`, { type: 'deleteGoal', goalId, deletedGoal });
    saveGoals();
    renderGoals();
  }
}

function renderGoals() {
  const goalsContainer = document.getElementById('goals-container');
  if (!goalsContainer) return;
  
  const goalsArray = Object.values(goals);
  
  if (goalsArray.length === 0) {
    goalsContainer.innerHTML = `
      <div class="empty-goals">
        <div class="empty-goals-icon">🎯</div>
        <h3>No goals yet</h3>
        <p>Create your first goal to start tracking progress towards your bigger objectives.</p>
      </div>
    `;
    return;
  }
  
  goalsContainer.innerHTML = goalsArray.map(goal => {
    const progress = calculateGoalProgress(goal);
    const daysLeft = goal.dueDate ? calculateDaysLeft(goal.dueDate) : null;
    
    return `
      <div class="goal-card">
        <div class="goal-header">
          <div class="goal-title">${escapeHtml(goal.title)}</div>
          <div class="goal-actions">
            <button onclick="openGoalFormModal(goals['${goal.id}'])" title="Edit goal">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteGoal('${goal.id}')" title="Delete goal">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        
        ${goal.description ? `<div class="goal-description">${escapeHtml(goal.description)}</div>` : ''}
        
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <div class="progress-text">
            ${progress.completed}/${progress.total} tasks completed (${progress.percentage.toFixed(0)}%)
          </div>
        </div>
        
        <div class="goal-meta">
          ${goal.dueDate ? `
            <span class="goal-due-date ${getDueDateStatus(goal.dueDate)}">
              <i class="fas fa-calendar"></i> 
              ${daysLeft !== null ? 
                (daysLeft > 0 ? `${daysLeft} days left` : 
                 daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`) 
                : formatDate(goal.dueDate)}
            </span>
          ` : ''}
          <span class="linked-tasks">
            <i class="fas fa-link"></i> ${goal.linkedTasks.length} linked tasks
          </span>
        </div>
        
        ${goal.linkedTasks.length > 0 ? `
          <div class="linked-tasks-list">
            <h6>Linked Tasks:</h6>
            ${goal.linkedTasks.map(link => {
              const project = projects[link.projectId];
              const task = project ? project.tasks.find(t => t.id === link.taskId) : null;
              return task ? `
                <div class="linked-task ${task.completed ? 'completed' : ''}">
                  <i class="fas fa-${task.completed ? 'check-circle' : 'circle'}"></i>
                  <span class="task-text">${escapeHtml(task.description)}</span>
                  <span class="project-name">(${escapeHtml(project.name)})</span>
                </div>
              ` : '';
            }).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function calculateGoalProgress(goal) {
  if (!goal.linkedTasks || goal.linkedTasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }
  
  let completed = 0;
  let total = goal.linkedTasks.length;
  
  goal.linkedTasks.forEach(link => {
    const project = projects[link.projectId];
    const task = project ? project.tasks.find(t => t.id === link.taskId) : null;
    if (task && task.completed) {
      completed++;
    }
  });
  
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  return { completed, total, percentage };
}

function calculateDaysLeft(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function saveGoals() {
  localStorage.setItem('productivity_goals', JSON.stringify(goals));
  localStorage.setItem('productivity_next_goal_id', nextGoalId.toString());
}

function loadGoals() {
  const savedGoals = localStorage.getItem('productivity_goals');
  const savedNextGoalId = localStorage.getItem('productivity_next_goal_id');
  
  if (savedGoals) {
    goals = JSON.parse(savedGoals);
    nextGoalId = parseInt(savedNextGoalId) || 1;
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `${diffDays} days`;
}

function getDueDateStatus(dueDate) {
  if (!dueDate) return '';
  
  const today = new Date().toISOString().split('T')[0];
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'due-today';
  return 'upcoming';
}

// Drag and Drop State
let dragState = {
  draggedElement: null,
  draggedData: null,
  dragType: null, // 'task', 'subtask', or 'project'
  sourceProject: null,
  sourceTask: null,
  sourceAspect: null
};

// Drag and Drop Functions
function makeDraggable(element, type, data) {
  element.draggable = true;
  element.addEventListener('dragstart', (e) => handleDragStart(e, type, data));
  element.addEventListener('dragend', handleDragEnd);
}

function makeDropZone(element, type, targetData) {
  element.addEventListener('dragover', handleDragOver);
  element.addEventListener('dragenter', handleDragEnter);
  element.addEventListener('dragleave', handleDragLeave);
  element.addEventListener('drop', (e) => handleDrop(e, type, targetData));
}

function handleDragStart(e, type, data) {
  dragState.draggedElement = e.target;
  dragState.dragType = type;
  dragState.draggedData = data;
  
  if (type === 'task') {
    dragState.sourceProject = data.projectId;
  } else if (type === 'subtask') {
    dragState.sourceProject = data.projectId;
    dragState.sourceTask = data.taskId;
  } else if (type === 'project') {
    dragState.sourceAspect = data.aspect;
  }
  
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', '');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  clearDropIndicators();
  clearDragOverStyles();
  resetDragState();
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  if (canDrop(e.currentTarget)) {
    e.currentTarget.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('drag-over');
  }
}

function handleDrop(e, type, targetData) {
  e.preventDefault();
  e.stopPropagation(); // Prevent event bubbling
  e.currentTarget.classList.remove('drag-over');
  
  if (!canDrop(e.currentTarget) || !dragState.draggedData) return;
  
  const dropSuccess = performDrop(type, targetData);
  if (dropSuccess) {
    saveState();
    updateDisplay();
  }
}

function canDrop(dropTarget) {
  if (!dragState.draggedData) return false;
  
  // Prevent dropping on self or invalid targets
  if (dropTarget === dragState.draggedElement) return false;
  
  return true;
}

function performDrop(targetType, targetData) {
  const { dragType, draggedData } = dragState;
  console.log(`performDrop: dragType=${dragType}, targetType=${targetType}`, targetData);
  
  if (dragType === 'task' && targetType === 'project') {
    return moveTaskToProject(draggedData, targetData.projectId);
  } else if (dragType === 'task' && targetType === 'task-position') {
    return moveTaskToPosition(draggedData, targetData);
  } else if (dragType === 'task' && targetType === 'board') {
    return moveTaskToBoard(draggedData, targetData.status);
  } else if (dragType === 'subtask' && targetType === 'task') {
    return moveSubtaskToTask(draggedData, targetData);
  } else if (dragType === 'subtask' && targetType === 'subtask-position') {
    return moveSubtaskToPosition(draggedData, targetData);
  } else if (dragType === 'project' && targetType === 'aspect') {
    return moveProjectToAspect(draggedData, targetData.aspect);
  } else if (dragType === 'project' && targetType === 'project') {
    return moveProjectToPosition(draggedData, targetData);
  } else if (dragType === 'project' && targetType === 'project-position') {
    console.log('Calling moveProjectToSpecificPosition');
    return moveProjectToSpecificPosition(draggedData, targetData);
  }
  
  return false;
}

function moveTaskToProject(taskData, targetProjectId) {
  const sourceProject = projects[taskData.projectId];
  const targetProject = projects[targetProjectId];
  
  if (!sourceProject || !targetProject || taskData.projectId === targetProjectId) {
    return false;
  }
  
  // Find and remove task from source project
  const taskIndex = sourceProject.tasks.findIndex(t => t.id === taskData.taskId);
  if (taskIndex === -1) return false;
  
  const task = sourceProject.tasks.splice(taskIndex, 1)[0];
  
  // Add task to target project
  targetProject.tasks.push(task);
  
  // Update timestamps
  sourceProject.updatedAt = new Date().toISOString();
  targetProject.updatedAt = new Date().toISOString();
  
  return true;
}

function moveTaskToPosition(taskData, targetData) {
  const project = projects[targetData.projectId];
  if (!project) return false;
  
  const taskIndex = project.tasks.findIndex(t => t.id === taskData.taskId);
  if (taskIndex === -1) return false;
  
  const targetIndex = project.tasks.findIndex(t => t.id === targetData.taskId);
  if (targetIndex === -1) return false;
  
  // Reorder tasks within the same project
  if (taskIndex !== targetIndex) {
    const [task] = project.tasks.splice(taskIndex, 1);
    project.tasks.splice(targetIndex, 0, task);
    project.updatedAt = new Date().toISOString();
    return true;
  }
  
  return false;
}

function moveSubtaskToTask(subtaskData, targetData) {
  const sourceProject = projects[subtaskData.projectId];
  if (!sourceProject) return false;
  
  const sourceTask = sourceProject.tasks.find(t => t.id === subtaskData.taskId);
  const targetTask = sourceProject.tasks.find(t => t.id === targetData.taskId);
  
  if (!sourceTask || !targetTask) return false;
  
  // Find and remove subtask from source task
  const subtaskIndex = sourceTask.subtasks.findIndex(st => st.id === subtaskData.subtaskId);
  if (subtaskIndex === -1) return false;
  
  const subtask = sourceTask.subtasks.splice(subtaskIndex, 1)[0];
  
  // Add subtask to target task
  targetTask.subtasks.push(subtask);
  
  sourceProject.updatedAt = new Date().toISOString();
  return true;
}

function moveTaskToBoard(taskData, targetStatus) {
  const sourceProject = projects[taskData.projectId];
  if (!sourceProject) return false;
  
  // Change the project status to move the task to the target board
  if (sourceProject.status !== targetStatus) {
    sourceProject.status = targetStatus;
    sourceProject.updatedAt = new Date().toISOString();
    return true;
  }
  
  return false;
}

function moveSubtaskToPosition(subtaskData, targetData) {
  const project = projects[targetData.projectId];
  if (!project) return false;
  
  const task = project.tasks.find(t => t.id === targetData.taskId);
  if (!task) return false;
  
  const subtaskIndex = task.subtasks.findIndex(st => st.id === subtaskData.subtaskId);
  const targetIndex = task.subtasks.findIndex(st => st.id === targetData.subtaskId);
  
  if (subtaskIndex === -1 || targetIndex === -1) return false;
  
  // Reorder subtasks within the same task
  if (subtaskIndex !== targetIndex) {
    const [subtask] = task.subtasks.splice(subtaskIndex, 1);
    task.subtasks.splice(targetIndex, 0, subtask);
    project.updatedAt = new Date().toISOString();
    return true;
  }
  
  return false;
}

function clearDropIndicators() {
  document.querySelectorAll('.drop-indicator').forEach(indicator => {
    indicator.classList.remove('show');
  });
}

function clearDragOverStyles() {
  document.querySelectorAll('.drag-over').forEach(element => {
    element.classList.remove('drag-over');
  });
}

function resetDragState() {
  dragState = {
    draggedElement: null,
    draggedData: null,
    dragType: null,
    sourceProject: null,
    sourceTask: null
  };
}

// Undo/Redo System Functions
function saveStateToHistory(action, data) {
  if (undoRedoSystem.isPerformingUndoRedo) {
    return; // Don't save states during undo/redo operations
  }
  
  const state = {
    timestamp: Date.now(),
    action: action,
    data: data,
    projects: JSON.parse(JSON.stringify(projects)),
    goals: JSON.parse(JSON.stringify(goals)),
    archivedTasks: JSON.parse(JSON.stringify(archivedTasks)),
    archivedProjects: JSON.parse(JSON.stringify(archivedProjects))
  };
  
  // Remove any states after current index (when undoing then making new changes)
  undoRedoSystem.history = undoRedoSystem.history.slice(0, undoRedoSystem.currentIndex + 1);
  
  // Add new state
  undoRedoSystem.history.push(state);
  undoRedoSystem.currentIndex = undoRedoSystem.history.length - 1;
  
  // Limit history size
  if (undoRedoSystem.history.length > undoRedoSystem.maxHistorySize) {
    undoRedoSystem.history.shift();
    undoRedoSystem.currentIndex--;
  }
  
  updateUndoRedoButtons();
}

function performUndo() {
  if (!canUndo()) return;
  
  undoRedoSystem.isPerformingUndoRedo = true;
  undoRedoSystem.currentIndex--;
  
  if (undoRedoSystem.currentIndex >= 0) {
    const previousState = undoRedoSystem.history[undoRedoSystem.currentIndex];
    restoreState(previousState);
    showUndoNotification(`Undid: ${previousState.action}`);
  }
  
  undoRedoSystem.isPerformingUndoRedo = false;
  updateUndoRedoButtons();
}

function performRedo() {
  if (!canRedo()) return;
  
  undoRedoSystem.isPerformingUndoRedo = true;
  undoRedoSystem.currentIndex++;
  
  const nextState = undoRedoSystem.history[undoRedoSystem.currentIndex];
  restoreState(nextState);
  showUndoNotification(`Redid: ${nextState.action}`);
  
  undoRedoSystem.isPerformingUndoRedo = false;
  updateUndoRedoButtons();
}

function restoreState(state) {
  projects = JSON.parse(JSON.stringify(state.projects));
  goals = JSON.parse(JSON.stringify(state.goals));
  archivedTasks = JSON.parse(JSON.stringify(state.archivedTasks));
  archivedProjects = JSON.parse(JSON.stringify(state.archivedProjects));
  
  saveData();
  renderProjects();
  renderBoards();
  renderFocusView();
  renderArchiveView();
  renderGoals();
  updateStats();
}

function canUndo() {
  return undoRedoSystem.currentIndex >= 0;
}

function canRedo() {
  return undoRedoSystem.currentIndex < undoRedoSystem.history.length - 1;
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undo-btn');
  const redoBtn = document.getElementById('redo-btn');
  
  if (undoBtn) {
    undoBtn.disabled = !canUndo();
    undoBtn.title = canUndo() 
      ? `Undo: ${undoRedoSystem.history[undoRedoSystem.currentIndex]?.action || ''}`
      : 'Nothing to undo';
  }
  
  if (redoBtn) {
    redoBtn.disabled = !canRedo();
    redoBtn.title = canRedo() 
      ? `Redo: ${undoRedoSystem.history[undoRedoSystem.currentIndex + 1]?.action || ''}`
      : 'Nothing to redo';
  }
}

function showUndoNotification(message) {
  // Create temporary notification
  const notification = document.createElement('div');
  notification.className = 'undo-notification';
  notification.innerHTML = `<i class="fas fa-undo"></i> ${message}`;
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

function initializeUndoRedo() {
  // Save initial state
  saveStateToHistory('Initial state', { type: 'initialization' });
  
  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      performUndo();
    } else if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || 
               ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
      e.preventDefault();
      performRedo();
    }
  });
  
  updateUndoRedoButtons();
}

// Project Drag and Drop Functions
function moveProjectToAspect(projectData, targetAspect) {
  const project = projects[projectData.projectId];
  if (!project) return false;
  
  // Change project's theme/aspect and set order to end
  project.theme = targetAspect;
  project.order = Date.now(); // Move to end of the aspect
  project.updatedAt = new Date().toISOString();
  
  console.log(`Moved project "${project.name}" to aspect "${targetAspect}"`);
  return true;
}

function moveProjectToPosition(draggedData, targetData) {
  const draggedProject = projects[draggedData.projectId];
  const targetProject = projects[targetData.projectId];
  
  if (!draggedProject || !targetProject) return false;
  if (draggedProject.id === targetProject.id) return false;
  
  // Move dragged project to same aspect as target project and position it after target
  draggedProject.theme = targetProject.theme || 'General';
  draggedProject.order = targetProject.order + 1;
  draggedProject.updatedAt = new Date().toISOString();
  
  // Reorder other projects to make space
  reorderProjectsInAspect(draggedProject.theme, draggedProject.id);
  
  console.log(`Moved project "${draggedProject.name}" to same aspect as "${targetProject.name}"`);
  return true;
}

function moveProjectToSpecificPosition(draggedData, targetData) {
  const draggedProject = projects[draggedData.projectId];
  if (!draggedProject) return false;
  
  const { aspect, insertIndex, insertBeforeProjectId } = targetData;
  
  // Don't move if already in correct position
  if (draggedProject.theme === aspect) {
    const aspectProjects = Object.values(projects)
      .filter(p => p.theme === aspect && !p.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const currentIndex = aspectProjects.findIndex(p => p.id === draggedProject.id);
    if (currentIndex === insertIndex || currentIndex === insertIndex - 1) {
      return false; // Already in correct position
    }
  }
  
  // Move project to target aspect
  draggedProject.theme = aspect;
  draggedProject.updatedAt = new Date().toISOString();
  
  // Calculate new order based on position
  const aspectProjects = Object.values(projects)
    .filter(p => p.theme === aspect && !p.parentId && p.id !== draggedProject.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  let newOrder;
  if (insertIndex === 0) {
    // Insert at beginning
    newOrder = aspectProjects.length > 0 ? aspectProjects[0].order - 1000 : 1000;
  } else if (insertIndex >= aspectProjects.length) {
    // Insert at end
    newOrder = aspectProjects.length > 0 ? aspectProjects[aspectProjects.length - 1].order + 1000 : 1000;
  } else {
    // Insert between projects
    const beforeOrder = aspectProjects[insertIndex - 1].order || 0;
    const afterOrder = aspectProjects[insertIndex].order || 0;
    newOrder = (beforeOrder + afterOrder) / 2;
  }
  
  draggedProject.order = newOrder;
  
  console.log(`Moved project "${draggedProject.name}" to position ${insertIndex} in aspect "${aspect}"`);
  return true;
}

function reorderProjectsInAspect(aspect, excludeProjectId) {
  const aspectProjects = Object.values(projects)
    .filter(p => p.theme === aspect && !p.parentId && p.id !== excludeProjectId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  
  // Reassign clean order values
  aspectProjects.forEach((project, index) => {
    project.order = (index + 1) * 1000;
  });
}

// Aspect Management Functions
function openAspectModal() {
  const aspectModal = document.getElementById('aspect-modal');
  aspectModal.classList.add('active');
  renderAspectList();
  clearAspectForm();
}

function closeAspectModal() {
  const aspectModal = document.getElementById('aspect-modal');
  aspectModal.classList.remove('active');
  clearAspectForm();
}

function renderAspectList() {
  const aspectList = document.getElementById('aspect-list');
  aspectList.innerHTML = '';
  
  availableAspects.forEach(aspect => {
    const projectCount = Object.values(projects).filter(p => (p.theme || 'General') === aspect).length;
    const aspectItem = document.createElement('div');
    aspectItem.className = 'aspect-item';
    aspectItem.innerHTML = `
      <div class="aspect-info">
        <div class="aspect-color-indicator aspect-color-default"></div>
        <div>
          <div class="aspect-name">${escapeHtml(aspect)}</div>
          <div class="aspect-project-count">${projectCount} project${projectCount !== 1 ? 's' : ''}</div>
        </div>
      </div>
      <div class="aspect-actions">
        <button class="aspect-edit-btn" onclick="editAspect('${aspect}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="aspect-delete-btn" onclick="deleteAspect('${aspect}')" ${aspect === 'General' ? 'disabled title="Cannot delete default aspect"' : ''}>
          <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;
    aspectList.appendChild(aspectItem);
  });
}

function clearAspectForm() {
  document.getElementById('aspect-form').reset();
  document.getElementById('aspect-form-title').textContent = 'Add New Aspect';
  document.getElementById('save-aspect-btn').textContent = 'Save Aspect';
  delete document.getElementById('aspect-form').dataset.editAspect;
}

function editAspect(aspectName) {
  document.getElementById('aspect-name').value = aspectName;
  document.getElementById('aspect-form-title').textContent = 'Edit Aspect';
  document.getElementById('save-aspect-btn').textContent = 'Update Aspect';
  document.getElementById('aspect-form').dataset.editAspect = aspectName;
}

function deleteAspect(aspectName) {
  if (aspectName === 'General') {
    alert('Cannot delete the default "General" aspect.');
    return;
  }
  
  const projectsWithAspect = Object.values(projects).filter(p => p.theme === aspectName);
  
  if (projectsWithAspect.length > 0) {
    const confirmMessage = `This aspect contains ${projectsWithAspect.length} project(s). They will be moved to the "General" aspect. Continue?`;
    if (!confirm(confirmMessage)) return;
    
    // Move projects to General aspect
    projectsWithAspect.forEach(project => {
      project.theme = 'General';
    });
  }
  
  // Remove aspect from available aspects
  availableAspects = availableAspects.filter(a => a !== aspectName);
  
  // Remove from collapsed state
  delete aspectCollapsedState[aspectName];
  
  saveState();
  renderAspectList();
  updateProjectThemeOptions();
  updateDisplay();
  
  showNativeNotification('Aspect Deleted', `"${aspectName}" aspect has been deleted.`);
}

function handleAspectSubmit(e) {
  e.preventDefault();
  
  const aspectName = document.getElementById('aspect-name').value.trim();
  if (!aspectName) return;
  
  const editingAspect = document.getElementById('aspect-form').dataset.editAspect;
  
  if (editingAspect) {
    // Update existing aspect
    if (editingAspect === 'General' && aspectName !== 'General') {
      alert('Cannot rename the default "General" aspect.');
      return;
    }
    
    if (aspectName !== editingAspect && availableAspects.includes(aspectName)) {
      alert('An aspect with this name already exists.');
      return;
    }
    
    // Update aspect name in availableAspects
    const index = availableAspects.indexOf(editingAspect);
    if (index !== -1) {
      availableAspects[index] = aspectName;
    }
    
    // Update all projects with this aspect
    Object.values(projects).forEach(project => {
      if (project.theme === editingAspect) {
        project.theme = aspectName;
      }
    });
    
    // Update collapsed state
    if (aspectCollapsedState[editingAspect]) {
      aspectCollapsedState[aspectName] = aspectCollapsedState[editingAspect];
      delete aspectCollapsedState[editingAspect];
    }
    
    showNativeNotification('Aspect Updated', `Aspect renamed to "${aspectName}".`);
  } else {
    // Add new aspect
    if (availableAspects.includes(aspectName)) {
      alert('An aspect with this name already exists.');
      return;
    }
    
    availableAspects.push(aspectName);
    showNativeNotification('Aspect Added', `New aspect "${aspectName}" has been added.`);
  }
  
  saveState();
  renderAspectList();
  updateProjectThemeOptions();
  updateDisplay();
  clearAspectForm();
}

function updateProjectThemeOptions() {
  const projectThemeSelect = document.getElementById('project-theme');
  if (!projectThemeSelect) return;
  
  const currentValue = projectThemeSelect.value;
  projectThemeSelect.innerHTML = '';
  
  availableAspects.forEach(aspect => {
    const option = document.createElement('option');
    option.value = aspect;
    option.textContent = aspect;
    if (aspect === currentValue) option.selected = true;
    projectThemeSelect.appendChild(option);
  });
  
  // If current value no longer exists, select General
  if (!availableAspects.includes(currentValue)) {
    projectThemeSelect.value = 'General';
  }
}

// Dashboard Title Editing Functions
function editDashboardTitle() {
  const titleElement = document.getElementById('dashboard-title');
  const currentTitle = titleElement.textContent;
  
  // Create input element
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = 'dashboard-title-input';
  input.style.cssText = `
    background: var(--card-bg);
    border: 2px solid var(--accent-primary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: inherit;
    font-weight: inherit;
    color: inherit;
    font-family: inherit;
    width: auto;
    min-width: 300px;
  `;
  
  // Replace title with input
  titleElement.style.display = 'none';
  titleElement.parentNode.insertBefore(input, titleElement.nextSibling);
  input.focus();
  input.select();
  
  // Handle save
  function saveTitleEdit() {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== currentTitle) {
      dashboardTitle = newTitle;
      titleElement.textContent = newTitle;
      saveState();
      showNativeNotification('Title Updated', `Dashboard title changed to "${newTitle}".`);
    }
    
    titleElement.style.display = 'inline';
    input.remove();
  }
  
  // Handle cancel
  function cancelTitleEdit() {
    titleElement.style.display = 'inline';
    input.remove();
  }
  
  // Event listeners
  input.addEventListener('blur', saveTitleEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitleEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelTitleEdit();
    }
  });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
