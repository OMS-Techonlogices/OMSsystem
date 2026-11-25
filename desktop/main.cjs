'use strict';

const { app, BrowserWindow, ipcMain, shell, protocol: electronProtocol, net } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { pathToFileURL } = require('url');

const APP_ID = 'com.matrixdataegypt.oms';
const PORTALS = ['invoice', 'media', 'admin'];

// ==========================================
// Custom Protocol Registration (before app ready)
// Must be called synchronously at module level
// ==========================================
electronProtocol.registerSchemesAsPrivileged([
  {
    scheme: 'oms-portal',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: false
    }
  }
]);

// ==========================================
// Config & Globals
// ==========================================
const BACKEND_URLS = {
  invoice: 'https://oms-invoice-api-two.vercel.app',
  media: 'https://oms-media-backend.vercel.app',
  admin: 'https://oms-admin-api.vercel.app'
};

let mainWindow = null;
let quitting = false;

// ==========================================
// Portal File Serving via Custom Protocol
// ==========================================
function getPortalsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'portals');
  }
  return path.join(__dirname, 'portals');
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

function registerPortalProtocol() {
  const portalsDir = getPortalsDir();

  electronProtocol.handle('oms-portal', (request) => {
    const url = new URL(request.url);
    const portal = url.hostname; // 'invoice', 'media', 'admin'
    let filePath = decodeURIComponent(url.pathname);

    // Default to index.html
    if (filePath === '/' || filePath === '' || !filePath) {
      filePath = '/index.html';
    }

    const fullPath = path.join(portalsDir, portal, filePath);

    // Security: prevent path traversal
    const resolvedPath = path.resolve(fullPath);
    const portalRoot = path.resolve(path.join(portalsDir, portal));
    if (!resolvedPath.startsWith(portalRoot)) {
      return new Response('Forbidden', { status: 403 });
    }

    // Serve the file, or fallback to index.html ONLY for non-asset SPA routes
    let servePath = fullPath;
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      const ext = path.extname(filePath);
      if (ext && ext !== '.html') {
        return new Response('Not Found', { status: 404 });
      }
      servePath = path.join(portalsDir, portal, 'index.html');
    }

    if (!fs.existsSync(servePath)) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const fileBuffer = fs.readFileSync(servePath);
      const mimeType = getMimeType(servePath);
      return new Response(fileBuffer, {
        status: 200,
        headers: { 'Content-Type': mimeType }
      });
    } catch (err) {
      return new Response('Internal Error', { status: 500 });
    }
  });
}

// ==========================================
// Backend Health Check
// ==========================================
function requestUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve({ online: false, configured: false });
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ online: false, configured: false }); }
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { timeout: timeoutMs, headers: { 'User-Agent': `OMS-Desktop/${app.getVersion()}` } }, (res) => {
      const online = res.statusCode < 500;
      res.resume();
      resolve({ online, configured: true, statusCode: res.statusCode });
    });
    req.on('timeout', () => { req.destroy(); resolve({ online: false, configured: true }); });
    req.on('error', () => resolve({ online: false, configured: true }));
  });
}

async function getServiceStatus() {
  const entries = await Promise.all(PORTALS.map(async (name) => {
    const backendUrl = BACKEND_URLS[name];
    const healthUrl = backendUrl ? `${backendUrl}/api/health` : '';
    const result = await requestUrl(healthUrl);
    return [name, { ...result, url: `oms-portal://${name}/` }];
  }));
  return Object.fromEntries(entries);
}

// ==========================================
// Security
// ==========================================
function assertTrustedIpc(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Untrusted IPC sender');
  }
}

// ==========================================
// Window Management
// ==========================================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OMS Business Suite - One Media Solution',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0B0F17',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: false,
      devTools: !app.isPackaged
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'), {
    query: { initialPortal: getInitialPortal() }
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window-state-changed', { isMaximized: true }));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window-state-changed', { isMaximized: false }));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalSafely(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (navigationUrl.startsWith('file://')) return;
    event.preventDefault();
    openExternalSafely(navigationUrl);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function getInitialPortal() {
  const arg = process.argv.find((item) => item.startsWith('--portal=') || item.startsWith('--system='));
  const value = arg?.split('=')[1]?.toLowerCase();
  return PORTALS.includes(value) ? value : 'welcome';
}

function openExternalSafely(value) {
  try {
    const url = new URL(value);
    if (['https:', 'http:', 'mailto:'].includes(url.protocol)) shell.openExternal(url.toString());
  } catch { /* Ignore malformed or unsupported URLs. */ }
}

// ==========================================
// IPC Handlers
// ==========================================
function registerIpc() {
  ipcMain.on('window-minimize', (event) => {
    if (event.sender === mainWindow?.webContents && mainWindow) mainWindow.minimize();
  });
  ipcMain.on('window-maximize', (event) => {
    if (event.sender !== mainWindow?.webContents || !mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', (event) => {
    if (event.sender === mainWindow?.webContents && mainWindow) mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', (event) => {
    assertTrustedIpc(event);
    return mainWindow.isMaximized();
  });
  ipcMain.handle('get-app-config', (event) => {
    assertTrustedIpc(event);
    // Return portal URLs using the custom protocol
    return {
      portals: {
        invoice: { url: 'oms-portal://invoice/', healthUrl: `${BACKEND_URLS.invoice}/api/health` },
        media: { url: 'oms-portal://media/', healthUrl: `${BACKEND_URLS.media}/api/health` },
        admin: { url: 'oms-portal://admin/', healthUrl: `${BACKEND_URLS.admin}/api/health` }
      }
    };
  });
  ipcMain.handle('check-services', async (event) => {
    assertTrustedIpc(event);
    return getServiceStatus();
  });
  ipcMain.handle('recheck-services', async (event) => {
    assertTrustedIpc(event);
    return getServiceStatus();
  });
  ipcMain.handle('print-page', (event) => {
    assertTrustedIpc(event);
    if (!mainWindow) return { success: false };
    mainWindow.webContents.print({ silent: false, printBackground: true });
    return { success: true };
  });
  ipcMain.handle('get-system-info', (event) => {
    assertTrustedIpc(event);
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      platform: process.platform,
      arch: process.arch
    };
  });
}

// ==========================================
// App Lifecycle
// ==========================================
app.setAppUserModelId(APP_ID);
app.whenReady().then(() => {
  registerPortalProtocol();
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !quitting) app.quit();
});
