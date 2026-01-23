/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
  // Sheet operations
  loadSheet: (url: string) => Promise<{ success: boolean; metadata?: any; error?: string }>;
  checkSheetPermissions: (url: string) => Promise<{ success: boolean; error?: string }>;

  // Chrome operations
  checkChromeConnection: (port: number) => Promise<{ success: boolean }>;
  startChromeDebug: () => Promise<{ success: boolean; error?: string }>;

  // Verify command
  startVerification: (options: any) => Promise<{ success: boolean; error?: string }>;
  stopVerification: () => Promise<{ success: boolean }>;

  // DupDetector command
  startDupDetection: (options: any) => Promise<{ success: boolean; error?: string }>;
  stopDupDetection: () => Promise<{ success: boolean }>;

  // Progress updates
  onProgressUpdate: (callback: (progress: any) => void) => void;
  removeProgressListener: () => void;

  // Config operations
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<{ success: boolean }>;

  // Environment
  getServiceAccountEmail: () => Promise<string>;

  // Menu events
  onMenuEvent: (event: string, callback: (data?: any) => void) => void;
  removeMenuListener: (event: string) => void;
}

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Sheet operations
  loadSheet: (url: string) => ipcRenderer.invoke('load-sheet', url),
  checkSheetPermissions: (url: string) => ipcRenderer.invoke('check-sheet-permissions', url),

  // Chrome operations
  checkChromeConnection: (port: number) => ipcRenderer.invoke('check-chrome-connection', port),
  startChromeDebug: () => ipcRenderer.invoke('start-chrome-debug'),

  // Verify command
  startVerification: (options: any) => ipcRenderer.invoke('start-verification', options),
  stopVerification: () => ipcRenderer.invoke('stop-verification'),

  // DupDetector command
  startDupDetection: (options: any) => ipcRenderer.invoke('start-dupdetection', options),
  stopDupDetection: () => ipcRenderer.invoke('stop-dupdetection'),

  // Progress updates
  onProgressUpdate: (callback: (progress: any) => void) => {
    const listener = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('progress-update', listener);
  },
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('progress-update');
  },

  // Log updates
  onLogUpdate: (callback: (log: any) => void) => {
    const listener = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('log-update', listener);
  },
  removeLogListener: () => {
    ipcRenderer.removeAllListeners('log-update');
  },

  // Config operations
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),

  // Environment
  getServiceAccountEmail: () => ipcRenderer.invoke('get-service-account-email'),

  // Menu events
  onMenuEvent: (event: string, callback: (data?: any) => void) => {
    const listener = (_event: IpcRendererEvent, data?: any) => callback(data);
    ipcRenderer.on(event, listener);
  },
  removeMenuListener: (event: string) => {
    ipcRenderer.removeAllListeners(event);
  }
} as ElectronAPI);
