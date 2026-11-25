'use strict';

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const APP_ID = 'com.matrixdataegypt.oms';
const PORTALS = ['invoice', 'media', 'admin'];
const DEFAULT_CONFIG = {
  portals: {
    invoice: { url: '', healthUrl: '' },
    media: { url: '', healthUrl: '' },
    admin: { url: '', healthUrl: '' }
  }
};

let mainWindow = null;
let appConfig = DEFAULT_CONFIG;
let quitting = false;

function isAllowedPortalUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const parsed = new URL(value);
    if (app.isPackaged) return parsed.protocol === 'https:';
    return parsed.protocol === 'https:' ||
      (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
  } catch {
    return false;
  }
}

function normalizeConfig(raw) {
  const normalized = { portals: {} };
  for (const name of PORTALS) {
    const entry = raw?.portals?.[name] || {};
    const url = isAllowedPortalUrl(entry.url) ? new URL(entry.url).toString().replace(/\/$/, '') : '';
    const healthUrl = isAllowedPortalUrl(entry.healthUrl)
      ? new URL(entry.healthUrl).toString()
      : url;
    normalized.portals[name] = { url, healthUrl };
  }
  return normalized;
}

function getConfigPath() {
  return path.join(app.getPath('userData'), 'oms-desktop.config.json');
}

function loadConfig() {
  const userConfigPath = getConfigPath();
  let raw = DEFAULT_CONFIG;

  try {
    if (fs.existsSync(userConfigPath)) {
      raw = JSON.parse(fs.readFileSync(userConfigPath, 'utf8'));
    } else {
      const candidates = [
        path.join(process.resourcesPath || __dirname, 'config', 'oms-desktop.config.json'),
        path.join(__dirname, 'config', 'oms-desktop.config.json')
      ];
      const bundledPath = candidates.find((candidate) => fs.existsSync(candidate));
      if (bundledPath) raw = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
      fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
      fs.writeFileSync(userConfigPath, JSON.stringify(raw, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Unable to load OMS Desktop configuration:', error);
    raw = DEFAULT_CONFIG;
  }

  appConfig = normalizeConfig(raw);
}

function requestUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!isAllowedPortalUrl(url)) return resolve({ online: false, configured: false });
    let parsed;
    try { parsed = new URL(url); } catch { return resolve({ online: false, configured: false }); }
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(parsed, { timeout: timeoutMs, headers: { 'User-Agent': `OMS-Desktop/${app.getVersion()}` } }, (res) => {
      // Any HTTP response below 500 confirms that the host is reachable.
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
    const config = appConfig.portals[name];
    const result = await requestUrl(config.healthUrl || config.url);
    return [name, { ...result, url: config.url }];
  }));
  return Object.fromEntries(entries);
}

function assertTrustedIpc(event) {
  if (!mainWindow || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Untrusted IPC sender');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'OMS Business Suite - One Media Solution',
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
    // The shell itself must remain local. Portal navigation happens inside its iframes.
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
    return appConfig;
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

app.setAppUserModelId(APP_ID);
app.whenReady().then(() => {
  loadConfig();
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
