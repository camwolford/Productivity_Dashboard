// Global State Management
let projects = {};
let currentView = 'project'; // 'project', 'board', or 'focus'
let nextId = 1;
let dailyStats = {
  completedToday: 0,
  totalTimeToday: 0,
  streakDays: 0,
  lastActiveDate: null
};

// DOM Elements
const projectView = document.getElementById('project-view');
const boardView = document.getElementById('board-view');
const focusView = document.getElementById('focus-view');
const projectsContainer = document.getElementById('projects-container');
const executionBoard = document.getElementById('execution-list');
const incubationBoard = document.getElementById('incubation-list');
const viewToggle = document.getElementById('view-toggle');
const focusToggle = document.getElementById('focus-toggle');
const statsToggle = document.getElementById('stats-toggle');
const addProjectBtn = document.getElementById('add-project-btn');
const modal = document.getElementById('modal');
const statsModal = document.getElementById('stats-modal');
const projectForm = document.getElementById('project-form');
const closeModal = document.getElementById('close-modal');
const closeStats = document.getElementById('close-stats');
const cancelBtn = document.getElementById('cancel-btn');

// Initialize the application
function init() {
  loadState();
  loadDailyStats();
  setupEventListeners();
  updateDisplay();
  updateDailyStats();
}

// Event Listeners
function setupEventListeners() {
  viewToggle.addEventListener('click', toggleView);
  focusToggle.addEventListener('click', toggleFocusView);
  statsToggle.addEventListener('click', showStats);
  addProjectBtn.addEventListener('click', () => openProjectModal());
  closeModal.addEventListener('click', closeProjectModal);
  closeStats.addEventListener('click', closeStatsModal);
  cancelBtn.addEventListener('click', closeProjectModal);
  projectForm.addEventListener('submit', handleProjectSubmit);
  
  // Close modals when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeProjectModal();
  });
  
  statsModal.addEventListener('click', (e) => {
    if (e.target === statsModal) closeStatsModal();
  });

  // Legacy board buttons
  document.getElementById('add-exec')?.addEventListener('click', () => addLegacyTask('Execution'));
  document.getElementById('add-incub')?.addEventListener('click', () => addLegacyTask('Incubation'));
}

// View Management
function toggleView() {
  if (currentView === 'focus') currentView = 'project';
  currentView = currentView === 'project' ? 'board' : 'project';
  updateDisplay();
  updateViewButtons();
}

function toggleFocusView() {
  currentView = currentView === 'focus' ? 'project' : 'focus';
  updateDisplay();
  updateViewButtons();
}

function updateViewButtons() {
  // Reset button states
  viewToggle.classList.remove('active');
  focusToggle.classList.remove('active');
  
  if (currentView === 'project') {
    viewToggle.innerHTML = '<i class="fas fa-th-large"></i> Board View';
  } else if (currentView === 'board') {
    viewToggle.innerHTML = '<i class="fas fa-folder"></i> Project View';
  } else if (currentView === 'focus') {
    focusToggle.classList.add('active');
    viewToggle.innerHTML = '<i class="fas fa-th-large"></i> Board View';
  }
}

function showStats() {
  updateStatistics();
  statsModal.classList.add('active');
}

function closeStatsModal() {
  statsModal.classList.remove('active');
}

function updateDisplay() {
  // Hide all views
  projectView.classList.remove('active');
  boardView.classList.remove('active');
  focusView.classList.remove('active');
  
  if (currentView === 'project') {
    projectView.classList.add('active');
    renderProjects();
  } else if (currentView === 'board') {
    boardView.classList.add('active');
    renderBoards();
  } else if (currentView === 'focus') {
    focusView.classList.add('active');
    renderFocusView();
  }
}

// Project Management
function openProjectModal(project = null) {
  const modalTitle = document.getElementById('modal-title');
  const projectName = document.getElementById('project-name');
  const projectDescription = document.getElementById('project-description');
  const projectPriority = document.getElementById('project-priority');
  const projectStatus = document.getElementById('project-status');
  
  if (project) {
    modalTitle.textContent = 'Edit Project';
    projectName.value = project.name;
    projectDescription.value = project.description || '';
    projectPriority.value = project.priority;
    projectStatus.value = project.status;
    document.getElementById('project-due-date').value = project.dueDate || '';
    document.getElementById('project-estimated-time').value = project.estimatedTime || '';
    projectForm.dataset.editId = project.id;
  } else {
    modalTitle.textContent = 'Add New Project';
    projectForm.reset();
    delete projectForm.dataset.editId;
  }
  
  modal.classList.add('active');
  projectName.focus();
}

function closeProjectModal() {
  modal.classList.remove('active');
  projectForm.reset();
  delete projectForm.dataset.editId;
}

function handleProjectSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(projectForm);
  const projectData = {
    name: document.getElementById('project-name').value.trim(),
    description: document.getElementById('project-description').value.trim(),
    priority: document.getElementById('project-priority').value,
    status: document.getElementById('project-status').value,
    dueDate: document.getElementById('project-due-date').value || null,
    estimatedTime: parseFloat(document.getElementById('project-estimated-time').value) || 0,
    actualTime: 0,
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  if (!projectData.name) return;
  
  const editId = projectForm.dataset.editId;
  
  if (editId) {
    // Update existing project
    projects[editId] = { ...projects[editId], ...projectData, updatedAt: new Date().toISOString() };
  } else {
    // Create new project
    const projectId = `project_${nextId++}`;
    projects[projectId] = { ...projectData, id: projectId };
  }
  
  saveState();
  updateDisplay();
  closeProjectModal();
}

function deleteProject(projectId) {
  if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    delete projects[projectId];
    saveState();
    updateDisplay();
  }
}

function moveProject(projectId) {
  const project = projects[projectId];
  if (project) {
    project.status = project.status === 'execution' ? 'incubation' : 'execution';
    project.updatedAt = new Date().toISOString();
    saveState();
    updateDisplay();
  }
}

// Task Management
function addTaskToProject(projectId) {
  const description = prompt('Enter task description:');
  if (!description) return;
  
  const project = projects[projectId];
  if (project) {
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
  }
}

function toggleTask(projectId, taskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAt = new Date().toISOString();
        updateDailyStats();
      } else {
        delete task.completedAt;
      }
      project.updatedAt = new Date().toISOString();
      saveState();
      updateDisplay();
    }
  }
}

function editTask(projectId, taskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      const newDescription = prompt('Edit task description:', task.description);
      if (newDescription && newDescription.trim() !== task.description) {
        task.description = newDescription.trim();
        project.updatedAt = new Date().toISOString();
        saveState();
        updateDisplay();
      }
    }
  }
}

function deleteTask(projectId, taskId) {
  const project = projects[projectId];
  if (project) {
    project.tasks = project.tasks.filter(t => t.id !== taskId);
    project.updatedAt = new Date().toISOString();
    saveState();
    updateDisplay();
  }
}

function addSubtask(projectId, taskId) {
  const description = prompt('Enter subtask description:');
  if (!description) return;
  
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      const subtaskId = `subtask_${nextId++}`;
      task.subtasks.push({
        id: subtaskId,
        description: description.trim(),
        completed: false,
        estimatedTime: 0,
        actualTime: 0
      });
      project.updatedAt = new Date().toISOString();
      saveState();
      updateDisplay();
    }
  }
}

function editSubtask(projectId, taskId, subtaskId) {
  const project = projects[projectId];
  if (project) {
    const task = project.tasks.find(t => t.id === taskId);
    if (task) {
      const subtask = task.subtasks.find(st => st.id === subtaskId);
      if (subtask) {
        const newDescription = prompt('Edit subtask description:', subtask.description);
        if (newDescription && newDescription.trim() !== subtask.description) {
          subtask.description = newDescription.trim();
          project.updatedAt = new Date().toISOString();
          saveState();
          updateDisplay();
        }
      }
    }
  }
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

// Legacy task management for board view
function addLegacyTask(board) {
  const description = prompt('Enter task description:');
  if (!description) return;
  
  const projectId = `legacy_${nextId++}`;
  const taskId = `task_${nextId++}`;
  
  projects[projectId] = {
    id: projectId,
    name: description.trim(),
    description: '',
    priority: 'medium',
    status: board.toLowerCase(),
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  saveState();
  updateDisplay();
}

// Rendering Functions
function renderProjects() {
  projectsContainer.innerHTML = '';
  
  Object.values(projects).forEach(project => {
    const projectCard = createProjectCard(project);
    projectsContainer.appendChild(projectCard);
  });
}

function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'project-card drop-zone';
  
  const completedTasks = project.tasks.filter(task => task.completed).length;
  const totalTasks = project.tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const dueDateStatus = getDueDateStatus(project.dueDate);
  
  card.innerHTML = `
    <div class="project-header">
      <div>
        <div class="project-title">${escapeHtml(project.name)}</div>
        <div class="project-meta">
          <span class="priority-badge priority-${project.priority}">${project.priority}</span>
          <span class="status-badge status-${project.status}">${project.status}</span>
          <span>${completedTasks}/${totalTasks} tasks</span>
          ${project.dueDate ? `<span class="due-date ${dueDateStatus}"><i class="fas fa-calendar"></i> ${formatDate(project.dueDate)}</span>` : ''}
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
      <button class="secondary-btn" onclick="addTaskToProject('${project.id}')">
        <i class="fas fa-plus"></i> Add Task
      </button>
      <button class="delete-btn" onclick="deleteProject('${project.id}')">
        <i class="fas fa-trash"></i> Delete
      </button>
    </div>
  `;
  
  // Set up drag and drop for the project card
  makeDropZone(card, 'project', { projectId: project.id });
  
  // Set up drag and drop for all task and subtask elements after DOM is created
  setTimeout(() => setupTaskDragDrop(card, project), 0);
  
  return card;
}

function createTaskHTML(project, task) {
  return `
    <div class="task-item drop-zone ${task.completed ? 'completed' : ''}" 
         data-task-id="${task.id}" data-project-id="${project.id}">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask('${project.id}', '${task.id}')">
      <span class="task-text">${escapeHtml(task.description)}</span>
      <div class="task-actions">
        <button onclick="editTask('${project.id}', '${task.id}')" title="Edit task">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="addSubtask('${project.id}', '${task.id}')" title="Add subtask">
          <i class="fas fa-plus"></i>
        </button>
        <button onclick="deleteTask('${project.id}', '${task.id}')" title="Delete task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    ${task.subtasks ? task.subtasks.map(subtask => `
      <div class="subtask-item drop-zone ${subtask.completed ? 'completed' : ''}" 
           data-subtask-id="${subtask.id}" data-task-id="${task.id}" data-project-id="${project.id}">
        <input type="checkbox" class="task-checkbox" ${subtask.completed ? 'checked' : ''}>
        <span class="task-text">└ ${escapeHtml(subtask.description)}</span>
        <div class="task-actions">
          <button onclick="editSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Edit subtask">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteSubtask('${project.id}', '${task.id}', '${subtask.id}')" title="Delete subtask">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('') : ''}
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
  const li = document.createElement('li');
  li.className = `task-item drop-zone ${task.completed ? 'completed' : ''}`;
  li.setAttribute('data-task-id', task.id);
  li.setAttribute('data-project-id', project.id);
  
  li.innerHTML = `
    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
           onchange="toggleTask('${project.id}', '${task.id}')">
    <span class="task-text">${escapeHtml(task.description)}</span>
    <span class="task-project">${escapeHtml(project.name)}</span>
    <div class="task-actions">
      <button onclick="editTask('${project.id}', '${task.id}')" title="Edit task">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="moveProject('${project.id}')" title="Move project">
        <i class="fas fa-exchange-alt"></i>
      </button>
      <button onclick="deleteTask('${project.id}', '${task.id}')" title="Delete task">
        <i class="fas fa-trash"></i>
      </button>
    </div>
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
  localStorage.setItem('productivity_nextId', nextId.toString());
}

function loadState() {
  // Load projects from localStorage
  const savedProjects = localStorage.getItem('productivity_projects');
  const savedNextId = localStorage.getItem('productivity_nextId');
  
  if (savedProjects) {
    projects = JSON.parse(savedProjects);
    nextId = parseInt(savedNextId) || 1;
  } else {
    // Migrate from old tasks.json format
    migrateLegacyTasks();
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
      tasks: projectData.tasks.map(task => ({
        ...task,
        id: `task_${nextId++}`,
        createdAt: new Date().toISOString(),
        subtasks: task.subtasks ? task.subtasks.map(subtask => ({
          ...subtask,
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
  const highPriorityTasks = [];
  
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
      // Check if task is high priority and in execution
      if (project.priority === 'high' && project.status === 'execution') {
        highPriorityTasks.push({ ...task, projectName: project.name, projectId: project.id });
      }
    });
  });
  
  document.getElementById('overdue-tasks').innerHTML = renderFocusTasks(overdueTasks, 'overdue');
  document.getElementById('due-today-tasks').innerHTML = renderFocusTasks(dueTodayTasks, 'due-today');
  document.getElementById('high-priority-tasks').innerHTML = renderFocusTasks(highPriorityTasks.slice(0, 5), 'high-priority');
  
  updateFocusStats();
}

function renderFocusTasks(tasks, type) {
  if (tasks.length === 0) {
    return `<div class="empty-state"><i class="fas fa-check-circle"></i> All clear!</div>`;
  }
  
  return tasks.map(task => `
    <div class="focus-task ${type}">
      <input type="checkbox" onchange="toggleTask('${task.projectId}', '${task.id}')" class="task-checkbox">
      <div class="focus-task-content">
        <div class="focus-task-title">${escapeHtml(task.description)}</div>
        <div class="focus-task-meta">
          <span class="project-tag">${escapeHtml(task.projectName)}</span>
          ${task.dueDate ? `<span class="due-date"><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
          ${task.estimatedTime > 0 ? `<span class="time-estimate"><i class="fas fa-clock"></i> ${task.estimatedTime}h</span>` : ''}
        </div>
      </div>
      <div class="focus-task-actions">
        <button onclick="startTimer('${task.projectId}', '${task.id}', this)" class="timer-btn" title="Start timer">
          <i class="fas fa-play"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// Statistics Functions
function updateStatistics() {
  const totalProjects = Object.keys(projects).length;
  let completedTasks = 0;
  let totalTasks = 0;
  
  Object.values(projects).forEach(project => {
    project.tasks.forEach(task => {
      totalTasks++;
      if (task.completed) completedTasks++;
    });
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
  const today = new Date().toISOString().split('T')[0];
  
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

function updateFocusStats() {
  document.getElementById('completed-today').textContent = dailyStats.completedToday;
  document.getElementById('time-today').textContent = `${dailyStats.totalTimeToday.toFixed(1)}h`;
}

// Time Tracking Functions
let activeTimer = null;
let timerStartTime = null;

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
  dragType: null, // 'task' or 'subtask'
  sourceProject: null,
  sourceTask: null
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
