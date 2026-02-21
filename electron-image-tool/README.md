# PixelPerfect - Image Preview & Export Tool

A lightweight, production-ready cross-platform desktop application built with **Electron + React + TypeScript** for previewing and exporting images.

## Features

- **Image Loading**: Open via file picker or drag-and-drop
- **Instant Preview**: View images with zoom in/out controls
- **Image Info**: Display dimensions, file size, format, and color mode
- **Export Options**:
  - Convert to PNG, JPEG, or WebP
  - Adjust JPEG/WebP quality (0-100 slider)
  - Resize with custom width/height
  - Maintain aspect ratio toggle
- **Native Save Dialog**: Save exported files anywhere on your system
- **Light & Dark Mode**: Toggle between themes
- **Performance**: Handles images up to 50MB using sharp (Node.js image processing)
- **Security**: contextIsolation, preload script, no nodeIntegration

## Architecture

```
electron-image-tool/
├── package.json                 # Dependencies & electron-builder config
├── tsconfig.main.json           # TypeScript config for main process
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process
│   │   └── imageProcessor.ts    # Sharp-based image processing
│   ├── preload/
│   │   └── preload.ts           # Secure IPC bridge
│   └── renderer/                # React frontend
│       ├── components/          # React components
│       └── styles/              # CSS styles
└── build/                       # App icons for packaging
```

### Security Model

| Layer | Setting |
|-------|---------|
| contextIsolation | `true` |
| nodeIntegration | `false` |
| Preload Script | Validates IPC channels |
| Window Creation | Denied (no popups) |
| Remote Code | None loaded |

## Prerequisites

- **Node.js** 18+ (recommended: 20 LTS)
- **npm** or **yarn**
- **Python 3** (for node-gyp / sharp native compilation)
- **Windows**: Visual Studio Build Tools
- **macOS**: Xcode Command Line Tools

## Setup & Run Locally

```bash
# 1. Clone and enter the project
cd electron-image-tool

# 2. Install dependencies
npm install

# 3. Start in development mode
npm run start

# Or run with hot-reload (main + renderer)
npm run dev
```

## Build Production Binaries

### Windows (.exe installer)

```bash
npm run dist:win
```

Output: `release/PixelPerfect-Setup-1.0.0.exe`

### macOS (.dmg)

```bash
npm run dist:mac
```

Output: `release/PixelPerfect-1.0.0-arm64.dmg` (Apple Silicon) or `PixelPerfect-1.0.0-x64.dmg` (Intel)

### Build Both Platforms

```bash
npm run dist:all
```

> **Note**: Cross-compilation has limitations. Build Windows on Windows, macOS on macOS for best results. Use CI/CD (GitHub Actions) for automated cross-platform builds.

## Scripts Reference

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev mode (main + renderer with hot reload) |
| `npm run start` | Build main process and start Electron |
| `npm run build` | Build both main and renderer for production |
| `npm run pack` | Package app without creating installer |
| `npm run dist:win` | Build Windows .exe installer |
| `npm run dist:mac` | Build macOS .dmg |
| `npm run dist:all` | Build for all platforms |

## IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `dialog:openFile` | Renderer → Main | Open native file picker |
| `dialog:saveFile` | Renderer → Main | Open native save dialog |
| `image:getInfo` | Renderer → Main | Get image metadata via sharp |
| `image:export` | Renderer → Main | Process & export image |
| `theme:get` | Renderer → Main | Get current OS theme |
| `theme:set` | Renderer → Main | Set app theme |

## Tech Stack

- **Electron** 28+ (Chromium-based desktop framework)
- **React** 18 (UI library)
- **TypeScript** 5.3 (Type safety)
- **sharp** 0.33 (High-performance image processing)
- **Tailwind CSS** 3.4 (Utility-first styling)
- **Lucide React** (Icon library)
- **electron-builder** 24 (Packaging & distribution)

## CI/CD (GitHub Actions Example)

Create `.github/workflows/build.yml`:

```yaml
name: Build Desktop App

on:
  push:
    tags: ['v*']

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run dist:win
      - uses: actions/upload-artifact@v4
        with:
          name: windows-build
          path: release/*.exe

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run dist:mac
      - uses: actions/upload-artifact@v4
        with:
          name: macos-build
          path: release/*.dmg
```

## Troubleshooting

### sharp installation fails
```bash
npm rebuild sharp
# or
npm install --platform=win32 --arch=x64 sharp  # Windows
npm install --platform=darwin --arch=arm64 sharp  # macOS Apple Silicon
```

### Electron not starting
```bash
# Clear cache
rm -rf node_modules/.cache
rm -rf dist
npm run build:main
electron .
```

## License

MIT
