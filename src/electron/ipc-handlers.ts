/**
 * IPC Handlers
 * Handles inter-process communication between main and renderer
 */

import { ipcMain, app } from 'electron';
import { SheetService } from '../services/sheet-service.js';
import { BrowserService } from '../services/browser-service.js';
import { VerifyCommand } from '../commands/verify.js';
import { DupDetectorCommand } from '../commands/dupdetector.js';
import { configService } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let verifyCommand: VerifyCommand | null = null;
let dupCommand: DupDetectorCommand | null = null;
let logListener: ((log: any) => void) | null = null;

/**
 * Get the path to bundled credentials file
 * Works in both development and production
 */
function getCredentialsPath(): string {
  // In development: dist/credentials/service-account.json
  // In production (packaged): resources/dist/credentials/service-account.json

  if (app.isPackaged) {
    // Production: resources are in app.asar
    return path.join(process.resourcesPath, 'dist', 'credentials', 'service-account.json');
  } else {
    // Development: relative to the compiled ipc-handlers.js
    return path.join(__dirname, '../../credentials/service-account.json');
  }
}

export function setupIpcHandlers() {
  // Ensure GOOGLE_SERVICE_ACCOUNT_PATH is set for the shared commands
  // This allows VerifyCommand and DupDetectorCommand to find the bundled credentials
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH = getCredentialsPath();
    console.log('Set GOOGLE_SERVICE_ACCOUNT_PATH to bundled credentials:', process.env.GOOGLE_SERVICE_ACCOUNT_PATH);
  }

  // Sheet operations
  ipcMain.handle('load-sheet', async (event, url: string) => {
    try {
      const credentialsPath = getCredentialsPath();

      const sheetService = new SheetService();
      await sheetService.initialize(credentialsPath);

      const preview = await sheetService.getPreview(url);

      return {
        success: true,
        metadata: {
          headers: preview.headers,
          totalRows: preview.totalRows,
          columnLetters: preview.columnLetters,
          row1: preview.row1,
          row2: preview.row2
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('check-sheet-permissions', async (event, url: string) => {
    try {
      const credentialsPath = getCredentialsPath();

      const sheetService = new SheetService();
      await sheetService.initialize(credentialsPath);
      await sheetService.getPreview(url);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Chrome operations
  ipcMain.handle('check-chrome-connection', async (event, port: number) => {
    try {
      const browserService = new BrowserService();
      const connected = await browserService.connect(port);
      await browserService.disconnect();
      return { success: connected };
    } catch (error) {
      return { success: false };
    }
  });

  ipcMain.handle('start-chrome-debug', async () => {
    try {
      // Detect platform and start Chrome with debug port
      const platform = process.platform;
      let chromePath = '';

      if (platform === 'darwin') {
        chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else if (platform === 'win32') {
        chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else {
        chromePath = 'google-chrome';
      }

      spawn(chromePath, ['--remote-debugging-port=9222', '--user-data-dir=/tmp/chrome-debug'], {
        detached: true,
        stdio: 'ignore'
      }).unref();

      // Wait a bit for Chrome to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  // Verify command
  ipcMain.handle('start-verification', async (event, options) => {
    try {
      verifyCommand = new VerifyCommand();

      // Clean up previous listener if any
      if (logListener) {
        logger.removeListener(logListener);
        logListener = null;
      }

      // Setup log listener
      logListener = (log) => {
        event.sender.send('log-update', log);
      };
      logger.addListener(logListener);

      // Execute in background and stream progress
      verifyCommand.execute(options)
        .then(() => {
          if (logListener) {
            logger.removeListener(logListener);
            logListener = null;
          }
        })
        .catch(error => {
          if (logListener) {
            logger.removeListener(logListener);
            logListener = null;
          }
          event.sender.send('progress-update', {
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          });
        });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('stop-verification', async () => {
    if (logListener) {
      logger.removeListener(logListener);
      logListener = null;
    }
    if (verifyCommand) {
      verifyCommand.stop();
      // Don't set to null immediately, let the execute promise resolve/reject naturally
      // But verifyCommand loop checks stopped flag so it will finish soon.
      // We can set it to null after a short delay or just let the loop exit handle it?
      // For safety, we can keep the reference until next start, or just clear it.
      // If we clear it here, the execute() promise might still be running but we lose reference.
      // Better to let it finish.
      
      // Give it a moment to stop
      await new Promise(resolve => setTimeout(resolve, 500));
      verifyCommand = null;
    }
    return { success: true };
  });

  // DupDetector command
  ipcMain.handle('start-dupdetection', async (event, options) => {
    try {
      dupCommand = new DupDetectorCommand();

      // Set up progress listener
      dupCommand.onProgress((progress) => {
        event.sender.send('progress-update', progress);
      });

      // Execute in background and stream progress
      dupCommand.execute(options).catch(error => {
        event.sender.send('progress-update', {
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  ipcMain.handle('stop-dupdetection', async () => {
    dupCommand = null;
    return { success: true };
  });

  // Config operations
  ipcMain.handle('load-config', async () => {
    try {
      return configService.load();
    } catch (error) {
      return null;
    }
  });

  ipcMain.handle('save-config', async (event, config) => {
    try {
      configService.save(config);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  });

  // Environment
  ipcMain.handle('get-service-account-email', async () => {
    try {
      const credentialsPath = getCredentialsPath();
      const content = await fs.readFile(credentialsPath, 'utf-8');
      const credentials = JSON.parse(content);
      return credentials.client_email || 'Unknown';
    } catch (error) {
      console.error('Error reading service account:', error);
      return 'Error reading credentials';
    }
  });
}
