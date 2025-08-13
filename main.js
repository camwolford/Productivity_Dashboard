const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Keep user data in a stable location so information persists across updates
app.setPath('userData', path.join(app.getPath('appData'), 'productivity-dashboard'));

let mainWindow;
let focusTimer = null;
let pomodoroTimer = null;
let focusSession = {
  isActive: false,
  isPaused: false,
  startTime: null,
  currentTime: 0,
  pausedTime: 0
};

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset', // Mac-style title bar
    show: false, // Don't show until ready
    icon: path.join(__dirname, 'app_icon.jpg')
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (focusTimer) clearInterval(focusTimer);
    if (pomodoroTimer) clearInterval(pomodoroTimer);
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// Create application menu (Mac-style)
function createMenu() {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-project');
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Focus Mode',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            mainWindow.webContents.send('menu-focus-mode');
          }
        },
        {
          label: 'Project View',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu-project-view');
          }
        },
        {
          label: 'Board View',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu-board-view');
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Focus timer that runs in main process (never throttled!)
ipcMain.handle('start-focus-timer', (event, startTime, pausedTime) => {
  console.log('Starting focus timer in main process');
  
  focusSession.isActive = true;
  focusSession.isPaused = false;
  focusSession.startTime = startTime;
  focusSession.pausedTime = pausedTime;
  
  if (focusTimer) clearInterval(focusTimer);
  
  focusTimer = setInterval(() => {
    if (focusSession.isActive && !focusSession.isPaused) {
      focusSession.currentTime = focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000);
      
      // Send timer update to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('focus-timer-update', focusSession.currentTime);
      }
    }
  }, 1000);
  
  return true;
});

ipcMain.handle('pause-focus-timer', (event) => {
  console.log('Pausing focus timer in main process');
  
  if (focusSession.isActive) {
    focusSession.pausedTime = focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000);
    focusSession.isActive = false;
    focusSession.isPaused = true;
  }
  
  return focusSession.pausedTime;
});

ipcMain.handle('resume-focus-timer', (event, startTime) => {
  console.log('Resuming focus timer in main process');
  
  focusSession.isActive = true;
  focusSession.isPaused = false;
  focusSession.startTime = startTime;
  
  return true;
});

ipcMain.handle('stop-focus-timer', (event) => {
  console.log('Stopping focus timer in main process');
  
  if (focusTimer) {
    clearInterval(focusTimer);
    focusTimer = null;
  }
  
  const finalTime = focusSession.isActive ? 
    focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000) : 
    focusSession.pausedTime;
  
  focusSession = {
    isActive: false,
    isPaused: false,
    startTime: null,
    currentTime: 0,
    pausedTime: 0
  };
  
  return finalTime;
});

// Get focus session state
ipcMain.handle('get-focus-session', (event) => {
  return {
    ...focusSession,
    currentTime: focusSession.isActive ? 
      focusSession.pausedTime + Math.floor((Date.now() - focusSession.startTime) / 1000) : 
      focusSession.pausedTime
  };
});

// Native notifications
ipcMain.handle('show-notification', (event, title, body, options = {}) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      silent: options.silent || false,
      sound: options.sound || undefined
    });
    
    notification.show();
    
    if (options.onClick) {
      notification.on('click', () => {
        mainWindow.focus();
        mainWindow.webContents.send('notification-clicked', options.onClick);
      });
    }
    
    return true;
  }
  return false;
});

// Pomodoro timer in main process
ipcMain.handle('start-pomodoro-timer', (event, duration, taskId, projectId) => {
  console.log('Starting pomodoro timer in main process');
  
  if (pomodoroTimer) clearInterval(pomodoroTimer);
  
  let timeRemaining = duration;
  
  pomodoroTimer = setInterval(() => {
    timeRemaining--;
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pomodoro-timer-update', timeRemaining, taskId, projectId);
    }
    
    if (timeRemaining <= 0) {
      clearInterval(pomodoroTimer);
      pomodoroTimer = null;
      
      // Send completion notification
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('pomodoro-completed', taskId, projectId);
      }
    }
  }, 1000);
  
  return true;
});

ipcMain.handle('stop-pomodoro-timer', (event) => {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
  return true;
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
  return true;
});

// Auto-updater will be configured after getting the token

// Auto-updater events
autoUpdater.on('update-available', () => {
  if (mainWindow) {
    mainWindow.webContents.send('update-available');
  }
});

autoUpdater.on('download-progress', (progress) => {
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', progress);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info);
  }
});

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
  console.error('Auto-updater error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  if (mainWindow) {
    mainWindow.webContents.send('update-error', error ? error.message : 'unknown');
  }
});

// Add debug logging for auto-updater
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-not-available', () => {
  console.log('Update not available.');
});

// App event handlers
app.whenReady().then(async () => {
  createWindow();
  
  // Configure auto-updater to use this public repository
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'camwolford',
    repo: 'Productivity_Dashboard'
  });
  console.log('Auto-updater configured for public repository');
  
  // Force update check in development for testing
  if (process.env.NODE_ENV === 'development') {
    autoUpdater.forceDevUpdateConfig = true;
  }
  autoUpdater.checkForUpdatesAndNotify();
  createMenu();

  // Handle app activation (Mac)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on Mac)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (navigationEvent, url) => {
    navigationEvent.preventDefault();
  });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // In development, ignore certificate errors
  if (process.env.NODE_ENV === 'development') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});