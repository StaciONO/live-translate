const { app, BrowserWindow, Menu, systemPreferences } = require('electron');
const path = require('path');

let mainWindow = null;

// Fix: Enable speech recognition in Electron Chromium
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-features', 'WebSpeechAPI');
app.commandLine.appendSwitch('enable-web-speech-api');

async function requestMicPermission() {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone');
    console.log('Microphone permission status:', status);
    if (status !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone');
      console.log('Microphone permission granted:', granted);
      return granted;
    }
    return true;
  }
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0f0f1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false,
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Grant ALL media permissions automatically
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audiocapture', 'speech'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(true); // Allow all for local app
    }
  });

  // Also handle permission check (not just request)
  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission) => {
    return true;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'LiveTranslate',
      submenu: [
        { label: '關於 LiveTranslate', role: 'about' },
        { type: 'separator' },
        { label: '隱藏', role: 'hide' },
        { label: '隱藏其他', role: 'hideOthers' },
        { label: '全部顯示', role: 'unhide' },
        { type: 'separator' },
        {
          label: '結束',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuiting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '編輯',
      submenu: [
        { label: '復原', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪下', role: 'cut' },
        { label: '複製', role: 'copy' },
        { label: '貼上', role: 'paste' },
        { label: '全選', role: 'selectAll' }
      ]
    },
    {
      label: '視窗',
      submenu: [
        { label: '縮小', role: 'minimize' },
        { label: '放大/還原', role: 'zoom' },
        { type: 'separator' },
        { label: '全螢幕', role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: '重新載入',
          accelerator: 'CmdOrCtrl+R',
          click: () => { if (mainWindow) mainWindow.reload(); }
        },
        {
          label: '開發者工具',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => { if (mainWindow) mainWindow.webContents.toggleDevTools(); }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(async () => {
  // Request microphone permission first on macOS
  await requestMicPermission();

  createWindow();
  createMenu();

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuiting = true;
});
