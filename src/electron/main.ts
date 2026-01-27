/**
 * Electron Main Process
 * Entry point for the YouNetAM Spreadsheet Tool desktop application
 */

import { app, BrowserWindow, ipcMain, Menu, shell, dialog } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setupIpcHandlers, cleanupProcesses } from './ipc-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Set icon path (works in both dev and prod)
  let iconPath = '';
  if (app.isPackaged) {
    // In production, icons are in resources folder
    iconPath = path.join(process.resourcesPath, '..', '..', 'docs', 'YNG-logo-STool.png');
  } else {
    // In development, use relative path from source
    iconPath = path.join(__dirname, '../../../docs/YNG-logo-STool.png');
  }
  console.log('Icon path:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    },
    icon: iconPath,
    title: 'YNG STool'
  });

  // Load the app (from /dist/electron/electron/ go up 3 levels to /dist/renderer/)
  const rendererPath = path.join(__dirname, '../../renderer/index.html');
  console.log('Loading renderer from:', rendererPath);

  mainWindow.loadFile(rendererPath);

  // Error handling for renderer
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Renderer failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // Open DevTools if there's an error (for debugging)
  mainWindow.webContents.on('did-stop-loading', () => {
    console.log('Renderer loaded successfully');
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  let isQuitting = false;

  mainWindow.on('close', (e) => {
    if (isQuitting) {
      mainWindow = null;
      return;
    }

    e.preventDefault();

    dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['Cancel', 'Quit'],
      defaultId: 1,
      cancelId: 0,
      title: 'Confirm Exit',
      message: 'Are you sure you want to quit?',
      detail: 'All running processes will be terminated completely.'
    }).then(({ response }) => {
      if (response === 1) {
        isQuitting = true;
        // Kill any child processes here if you were tracking them directly
        cleanupProcesses();
        // Forcing aggressive exit:
        app.quit();
      }
    });
  });
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: any[] = [
    // App Menu (macOS only)
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Preferences',
          accelerator: 'Cmd+,',
          click: () => {
            mainWindow?.webContents.send('show-preferences');
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),

    // File Menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sheet',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('new-sheet');
          }
        },
        {
          label: 'Load Sheet',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('load-sheet-dialog');
          }
        },
        { type: 'separator' },
        {
          label: 'Export Results',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('export-results');
          }
        },
        { type: 'separator' },
        ...(isMac ? [] : [
          {
            label: 'Preferences',
            accelerator: 'Ctrl+,',
            click: () => {
              mainWindow?.webContents.send('show-preferences');
            }
          },
          { type: 'separator' }
        ]),
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit Menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },

    // View Menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Verify Seeding Tab',
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow?.webContents.send('switch-tab', 'verify');
          }
        },
        {
          label: 'Duplication Detection Tab',
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow?.webContents.send('switch-tab', 'dupdetection');
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

    // Window Menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },

    // Help Menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Help Guide',
          click: () => {
            mainWindow?.webContents.send('show-readme');
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Set app name (shows in dock and menu bar on macOS)
app.name = 'YNG STool';

// App lifecycle
app.on('ready', () => {
  // Set dock icon on macOS (for development mode)
  if (process.platform === 'darwin' && app.dock) {
    // In development: ../../docs relative to dist/electron/electron/
    // In production: icon is set via electron-builder config
    if (!app.isPackaged) {
      const iconPath = path.join(__dirname, '../../../docs/YNG-logo-STool.png');
      try {
        app.dock.setIcon(iconPath);
      } catch (error) {
        console.log('Could not set dock icon:', error);
      }
    }
  }

  createWindow();
  createApplicationMenu();
  setupIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});
