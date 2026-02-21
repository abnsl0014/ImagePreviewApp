# PixelPerfect - Image Preview & Export Tool PRD

## Original Problem Statement
Build a production-ready cross-platform desktop application using Electron + React + TypeScript that runs on Windows (.exe) and macOS (.dmg). A lightweight image preview and export tool.

## Architecture
- **Web Demo**: React frontend + FastAPI backend + Pillow (Python image processing)
- **Electron Project**: Complete source in `/app/electron-image-tool/` with Electron + React + TypeScript + sharp

### Web App Stack
- Frontend: React + Tailwind CSS + shadcn/ui + react-dropzone
- Backend: FastAPI + Pillow (Python)
- API: POST /api/image/upload, POST /api/image/export, GET /api/image/preview/{id}

### Electron Stack
- Main Process: Electron 28+ (TypeScript)
- Preload: Secure IPC bridge with channel validation
- Renderer: React 18 + TypeScript + Tailwind CSS
- Image Processing: sharp (Node.js)
- Packaging: electron-builder (NSIS for Win, DMG for macOS)

## User Personas
- Designers needing quick format conversion
- Developers processing images for web
- Content creators resizing/compressing images

## Core Requirements (Static)
1. Open image via file picker or drag-and-drop
2. Instant image preview with zoom
3. Display image metadata (dimensions, size, format, color mode)
4. Export to PNG, JPEG, WebP
5. JPEG/WebP quality slider (0-100)
6. Resize with aspect ratio lock
7. Native save dialog
8. Light & dark mode toggle
9. Handle images up to 50MB
10. Secure Electron setup (contextIsolation, preload, no nodeIntegration)

## What's Been Implemented (Feb 2026)
- [x] Full web demo (React + FastAPI + Pillow) - all features working
- [x] Complete Electron project source code with TypeScript
- [x] Main process (main.ts) with IPC handlers
- [x] Preload script (preload.ts) with channel validation
- [x] Image processor (imageProcessor.ts) using sharp
- [x] Renderer App (App.tsx) with full UI
- [x] electron-builder config for Win/Mac builds
- [x] README with setup, build, and CI/CD instructions
- [x] Dark/Light theme toggle
- [x] Image upload, preview, zoom controls
- [x] Export with format conversion, quality, resize
- [x] Aspect ratio lock

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (Important)
- Batch image upload and export (multiple images at once)
- Export progress with real percentages (not simulated)

### P2 (Nice to Have)
- Image cropping tool
- EXIF data display and editing
- Recent files history
- Keyboard shortcuts (Cmd/Ctrl+O, Cmd/Ctrl+S, etc.)
- Auto-update functionality via electron-updater

## Next Tasks
1. User downloads Electron project and builds locally
2. Add batch image processing
3. Add keyboard shortcuts
4. Set up CI/CD with GitHub Actions for automated builds
