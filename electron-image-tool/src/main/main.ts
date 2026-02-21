import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { processImage, getImageInfo, ImageExportOptions } from './imageProcessor';

// Determine if running in dev mode
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PixelPerfect',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/build/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Open file dialog
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      {
        name: 'Images',
        extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg'],
      },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;

  const filePath = result.filePaths[0];
  const fileBuffer = fs.readFileSync(filePath);
  const info = await getImageInfo(fileBuffer, filePath);

  return {
    path: filePath,
    buffer: fileBuffer.toString('base64'),
    info,
  };
});

// Get image info from buffer
ipcMain.handle('image:getInfo', async (_event, base64Data: string, filePath: string) => {
  const buffer = Buffer.from(base64Data, 'base64');
  return getImageInfo(buffer, filePath);
});

// Export image
ipcMain.handle('image:export', async (_event, base64Data: string, options: ImageExportOptions) => {
  const buffer = Buffer.from(base64Data, 'base64');
  const processedBuffer = await processImage(buffer, options);
  return processedBuffer.toString('base64');
});

// Save file dialog
ipcMain.handle('dialog:saveFile', async (_event, base64Data: string, defaultName: string) => {
  if (!mainWindow) return false;

  const ext = path.extname(defaultName).slice(1);
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });

  if (result.canceled || !result.filePath) return false;

  const buffer = Buffer.from(base64Data, 'base64');
  fs.writeFileSync(result.filePath, buffer);
  return true;
});

// Get theme
ipcMain.handle('theme:get', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// Set theme
ipcMain.handle('theme:set', (_event, theme: 'dark' | 'light' | 'system') => {
  nativeTheme.themeSource = theme;
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// ─── App Lifecycle ───────────────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
