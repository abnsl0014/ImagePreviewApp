import { contextBridge, ipcRenderer } from 'electron';

/**
 * Preload script - Exposes safe IPC methods to the renderer process
 * Uses contextBridge for security (contextIsolation: true)
 */

// Allowed IPC channels for security validation
const VALID_INVOKE_CHANNELS = [
  'dialog:openFile',
  'dialog:saveFile',
  'image:getInfo',
  'image:export',
  'theme:get',
  'theme:set',
] as const;

type ValidChannel = typeof VALID_INVOKE_CHANNELS[number];

function isValidChannel(channel: string): channel is ValidChannel {
  return (VALID_INVOKE_CHANNELS as readonly string[]).includes(channel);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (base64Data: string, defaultName: string) =>
    ipcRenderer.invoke('dialog:saveFile', base64Data, defaultName),

  // Image processing
  getImageInfo: (base64Data: string, filePath: string) =>
    ipcRenderer.invoke('image:getInfo', base64Data, filePath),
  exportImage: (base64Data: string, options: Record<string, unknown>) =>
    ipcRenderer.invoke('image:export', base64Data, options),

  // Theme
  getTheme: () => ipcRenderer.invoke('theme:get'),
  setTheme: (theme: string) => ipcRenderer.invoke('theme:set', theme),

  // Generic invoke with channel validation
  invoke: (channel: string, ...args: unknown[]) => {
    if (isValidChannel(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
});

// Type declarations for renderer
export interface ElectronAPI {
  openFile: () => Promise<{
    path: string;
    buffer: string;
    info: {
      width: number;
      height: number;
      format: string;
      fileSize: number;
      mode: string;
      filename: string;
      path: string;
    };
  } | null>;
  saveFile: (base64Data: string, defaultName: string) => Promise<boolean>;
  getImageInfo: (base64Data: string, filePath: string) => Promise<{
    width: number;
    height: number;
    format: string;
    fileSize: number;
    mode: string;
    filename: string;
    path: string;
  }>;
  exportImage: (base64Data: string, options: Record<string, unknown>) => Promise<string>;
  getTheme: () => Promise<string>;
  setTheme: (theme: string) => Promise<string>;
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
