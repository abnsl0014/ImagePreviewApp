/**
 * Electron Renderer - App.tsx
 * This is the React entry point for the Electron renderer process.
 * Uses window.electronAPI (exposed via preload) for all native operations.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import './styles/index.css';

interface ImageInfo {
  width: number;
  height: number;
  format: string;
  fileSize: number;
  mode: string;
  filename: string;
  path: string;
}

interface ExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  width: string;
  height: string;
  maintainAspect: boolean;
}

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI;

function App() {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [zoom, setZoom] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState<ExportSettings>({
    format: 'png',
    quality: 85,
    width: '',
    height: '',
    maintainAspect: true,
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize theme
  useEffect(() => {
    document.documentElement.classList.add(theme);
    if (isElectron) {
      window.electronAPI.getTheme().then((t: string) => {
        setTheme(t === 'dark' ? 'dark' : 'light');
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (isElectron) {
      window.electronAPI.setTheme(newTheme);
    }
  }, [theme]);

  const loadImage = useCallback(async (base64: string, info: ImageInfo) => {
    setImageBase64(base64);
    setImageInfo(info);
    setPreviewUrl(`data:image/${info.format.toLowerCase()};base64,${base64}`);
    setZoom(1);
    setSettings(s => ({ ...s, width: '', height: '' }));
  }, []);

  const handleOpenFile = useCallback(async () => {
    if (isElectron) {
      const result = await window.electronAPI.openFile();
      if (result) {
        loadImage(result.buffer, result.info);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [loadImage]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (isElectron) {
        const info = await window.electronAPI.getImageInfo(base64, file.name);
        loadImage(base64, info);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [loadImage]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      if (isElectron) {
        const info = await window.electronAPI.getImageInfo(base64, file.name);
        loadImage(base64, info);
      }
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  const handleExport = useCallback(async () => {
    if (!imageBase64 || !imageInfo) return;
    setExporting(true);
    setProgress(20);

    try {
      const options = {
        format: settings.format,
        quality: settings.quality,
        width: settings.width ? parseInt(settings.width) : undefined,
        height: settings.height ? parseInt(settings.height) : undefined,
        maintainAspect: settings.maintainAspect,
      };

      setProgress(50);
      const exportedBase64 = await window.electronAPI.exportImage(imageBase64, options);
      setProgress(80);

      const ext = settings.format === 'jpeg' ? 'jpg' : settings.format;
      const stem = imageInfo.filename.replace(/\.[^.]+$/, '');
      const defaultName = `${stem}_exported.${ext}`;

      await window.electronAPI.saveFile(exportedBase64, defaultName);
      setProgress(100);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(0), 500);
    }
  }, [imageBase64, imageInfo, settings]);

  const handleClear = useCallback(() => {
    setImageInfo(null);
    setImageBase64(null);
    setPreviewUrl(null);
  }, []);

  const aspectRatio = imageInfo ? imageInfo.width / imageInfo.height : 1;

  const handleWidthChange = (val: string) => {
    setSettings(s => {
      const newS = { ...s, width: val };
      if (s.maintainAspect && val && !isNaN(Number(val))) {
        newS.height = String(Math.round(Number(val) / aspectRatio));
      }
      return newS;
    });
  };

  const handleHeightChange = (val: string) => {
    setSettings(s => {
      const newS = { ...s, height: val };
      if (s.maintainAspect && val && !isNaN(Number(val))) {
        newS.width = String(Math.round(Number(val) * aspectRatio));
      }
      return newS;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-zinc-950 text-white">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

      {/* Top Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur flex items-center justify-between px-6 drag-region">
        <div className="flex items-center gap-3 no-drag">
          <div className="h-7 w-7 rounded-md bg-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold font-heading">Px</span>
          </div>
          <h1 className="text-sm font-bold tracking-tight font-heading">PixelPerfect</h1>
          <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded font-mono">v1.0</span>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={handleOpenFile} className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Open File">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2Z"/></svg>
          </button>
          {imageInfo && (
            <button onClick={handleClear} className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Clear">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          )}
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button onClick={toggleTheme} className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Toggle Theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Area */}
        <main
          className="flex-1 flex items-center justify-center p-8 overflow-hidden relative"
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {!imageInfo ? (
            <div
              className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 text-center cursor-pointer w-full max-w-2xl mx-auto transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 hover:border-zinc-700'
              }`}
              onClick={handleOpenFile}
            >
              <div className={`rounded-full p-4 mb-6 ${dragActive ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-900 text-zinc-500'}`}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9M8 17l4-4 4 4"/>
                </svg>
              </div>
              <h2 className="text-lg font-semibold mb-2 font-heading">
                {dragActive ? 'Drop your image here' : 'Drop an image or click to browse'}
              </h2>
              <p className="text-sm text-zinc-500">Supports PNG, JPEG, WebP, GIF, BMP, TIFF. Up to 50MB.</p>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center gap-4 w-full h-full">
              <div className="relative flex-1 w-full overflow-hidden rounded-lg ring-1 ring-white/10 checkerboard flex items-center justify-center" style={{ minHeight: 300 }}>
                <img
                  src={previewUrl}
                  alt={imageInfo.filename}
                  className="max-w-full max-h-full object-contain select-none"
                  style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
                  draggable={false}
                />
              </div>
              <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-lg px-2 py-1">
                <button onClick={() => setZoom(z => Math.max(0.1, z - 0.25))} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6"/></svg>
                </button>
                <span className="font-mono text-xs text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(5, z + 0.25))} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M8 11h6M11 8v6"/></svg>
                </button>
                <div className="w-px h-4 bg-zinc-700 mx-1" />
                <button onClick={() => { setZoom(1); }} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 text-xs font-mono">1:1</button>
              </div>
            </div>
          ) : null}
        </main>

        {/* Sidebar */}
        {imageInfo && (
          <aside className="w-80 border-l border-zinc-800 bg-zinc-900/30 backdrop-blur overflow-y-auto p-6 space-y-6">
            {/* Image Info */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 font-heading">Image Info</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Dimensions</span>
                  <span className="font-mono text-xs">{imageInfo.width} x {imageInfo.height}</span>
                </div>
                <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Size</span>
                  <span className="font-mono text-xs">{formatFileSize(imageInfo.fileSize)}</span>
                </div>
                <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Format</span>
                  <span className="font-mono text-xs">{imageInfo.format}</span>
                </div>
                <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800/50">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Color</span>
                  <span className="font-mono text-xs">{imageInfo.mode}</span>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Export Settings */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 font-heading">Export Settings</h3>

              {/* Format */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500">Output Format</label>
                <select
                  value={settings.format}
                  onChange={(e) => setSettings(s => ({ ...s, format: e.target.value as ExportSettings['format'] }))}
                  className="w-full h-9 bg-zinc-950/50 border border-zinc-800 rounded-md px-3 text-sm focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500"
                >
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>

              {/* Quality */}
              {(settings.format === 'jpeg' || settings.format === 'webp') && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-zinc-500">Quality</label>
                    <span className="font-mono text-xs">{settings.quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={settings.quality}
                    onChange={(e) => setSettings(s => ({ ...s, quality: Number(e.target.value) }))}
                    className="w-full accent-blue-600"
                  />
                </div>
              )}

              {/* Resize */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-zinc-500">Resize</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.maintainAspect}
                      onChange={(e) => setSettings(s => ({ ...s, maintainAspect: e.target.checked }))}
                      className="accent-blue-600"
                    />
                    <span className="text-[10px] text-zinc-500">Lock Ratio</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder={String(imageInfo.width)}
                    value={settings.width}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="h-8 bg-zinc-950/50 border border-zinc-800 rounded-md px-2 text-xs font-mono focus:ring-1 focus:ring-blue-500/50"
                    min={1}
                  />
                  <input
                    type="number"
                    placeholder={String(imageInfo.height)}
                    value={settings.height}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="h-8 bg-zinc-950/50 border border-zinc-800 rounded-md px-2 text-xs font-mono focus:ring-1 focus:ring-blue-500/50"
                    min={1}
                  />
                </div>
                <p className="text-[10px] text-zinc-600">Original: {imageInfo.width} x {imageInfo.height}px</p>
              </div>

              {/* Progress */}
              {exporting && progress > 0 && (
                <div className="space-y-1">
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center">Exporting... {progress}%</p>
                </div>
              )}

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Export as {settings.format.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
