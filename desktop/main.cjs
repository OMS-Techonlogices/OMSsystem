const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
const staticServers = [];
const backendProcesses = [];

// Determine root directory of OMS workspace
function getWorkspaceRoot() {
  const candidate1 = path.resolve(__dirname, '..');
  if (fs.existsSync(path.join(candidate1, 'Invoice', 'server'))) {
    return candidate1;
  }
  const candidate2 = path.resolve(process.execPath, '..', '..', '..');
  if (fs.existsSync(path.join(candidate2, 'Invoice', 'server'))) {
    return candidate2;
  }
  if (fs.existsSync('E:\\OMSsystem\\Invoice\\server')) {
    return 'E:\\OMSsystem';
  }
  return candidate1;
}

// Helper to kill a spawned process tree on Windows
function killProcess(pid) {
  try {
    spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], { windowsHide: true });
  } catch (_) {}
}

// Determine target portal from CLI flag: --portal=invoice | media | admin | welcome
function getInitialPortal() {
  const arg = process.argv.find((a) => a.startsWith('--portal=') || a.startsWith('--system='));
  if (arg) {
    return arg.split('=')[1].toLowerCase();
  }
  return 'welcome';
}

// Built-in SPA static server helper for ports 5173, 5174, 5175
function startStaticServer(port, staticDir) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(staticDir, reqPath);

    // Single-Page Application (SPA) fallback to index.html for client-side routing
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(staticDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
        });
        res.end(content);
      }
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is active (dev or external server running).`);
    } else {
      console.error(`Static server error on port ${port}:`, err);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`OMS Desktop serving ${staticDir} on http://127.0.0.1:${port}`);
  });

  staticServers.push(server);
}

function resolvePortalDist(portalName, relativeDir) {
  const localDist = path.join(__dirname, 'dist-portals', portalName);
  if (fs.existsSync(localDist)) return localDist;

  if (process.resourcesPath) {
    const resDist = path.join(process.resourcesPath, 'dist-portals', portalName);
    if (fs.existsSync(resDist)) return resDist;
  }

  const rootDir = getWorkspaceRoot();
  const monorepoDist = path.join(rootDir, ...relativeDir);
  if (fs.existsSync(monorepoDist)) return monorepoDist;

  return null;
}

// Initialize internal servers for the 3 portals
function initInternalServers() {
  const invoiceDist = resolvePortalDist('invoice', ['Invoice', 'client', 'dist']);
  if (invoiceDist) startStaticServer(5173, invoiceDist);

  const mediaDist = resolvePortalDist('media', ['media', 'frontend', 'dist']);
  if (mediaDist) startStaticServer(5174, mediaDist);

  const adminDist = resolvePortalDist('admin', ['admin', 'frontend', 'dist']);
  if (adminDist) startStaticServer(5175, adminDist);
}

// Automatically start all 3 backend servers & PostgreSQL
async function autoStartBackends() {
  const rootDir = getWorkspaceRoot();

  // 1. Ensure PostgreSQL is started
  try {
    spawn('cmd.exe', ['/c', 'net start postgresql-x64-18'], { windowsHide: true });
  } catch (_) {}

  // 2. Start Invoice Backend (Port 5001) if not running
  const invoiceCheck = await pingPort(5001, 800);
  if (!invoiceCheck.online) {
    const invoiceDir = path.join(rootDir, 'Invoice', 'server');
    if (fs.existsSync(invoiceDir)) {
      console.log('Auto-starting Invoice Backend API (5001)...');
      const p = spawn('cmd.exe', ['/c', 'npm run dev'], {
        cwd: invoiceDir,
        env: { ...process.env, PORT: '5001' },
        windowsHide: true,
      });
      backendProcesses.push(p);
    }
  }

  // 3. Start Media Backend (Port 5002) if not running
  const mediaCheck = await pingPort(5002, 800);
  if (!mediaCheck.online) {
    const mediaDir = path.join(rootDir, 'media', 'backend');
    if (fs.existsSync(mediaDir)) {
      console.log('Auto-starting Media Backend API (5002)...');
      const p = spawn('cmd.exe', ['/c', 'npm run dev'], {
        cwd: mediaDir,
        env: { ...process.env, PORT: '5002' },
        windowsHide: true,
      });
      backendProcesses.push(p);
    }
  }

  // 4. Start Admin Backend (Port 5003) if not running
  const adminCheck = await pingPort(5003, 800);
  if (!adminCheck.online) {
    const adminDir = path.join(rootDir, 'admin', 'backend');
    if (fs.existsSync(adminDir)) {
      console.log('Auto-starting Admin Backend API (5003)...');
      const p = spawn('cmd.exe', ['/c', 'npm run dev'], {
        cwd: adminDir,
        env: { ...process.env, PORT: '5003' },
        windowsHide: true,
      });
      backendProcesses.push(p);
    }
  }
}

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
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'), {
    query: { initialPortal: getInitialPortal() },
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: true });
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-state-changed', { isMaximized: false });
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  initInternalServers();
  await autoStartBackends();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  backendProcesses.forEach((child) => {
    if (child && child.pid) {
      killProcess(child.pid);
    }
  });
});

app.on('window-all-closed', () => {
  staticServers.forEach((s) => {
    try { s.close(); } catch (_) {}
  });

  backendProcesses.forEach((child) => {
    if (child && child.pid) {
      killProcess(child.pid);
    }
  });

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window controls IPC
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// Helper to check if an HTTP port is listening
function pingPort(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(
      {
        hostname: '127.0.0.1',
        port,
        path: '/',
        timeout: timeoutMs,
      },
      (res) => {
        resolve({ port, online: true, statusCode: res.statusCode });
      }
    );
    req.on('error', () => {
      resolve({ port, online: false });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ port, online: false });
    });
  });
}

// Check health of all OMS services
ipcMain.handle('check-services', async () => {
  const ports = {
    invoiceFrontend: 5173,
    mediaFrontend: 5174,
    adminFrontend: 5175,
    invoiceBackend: 5001,
    mediaBackend: 5002,
    adminBackend: 5003,
  };

  const checks = await Promise.all([
    pingPort(ports.invoiceFrontend),
    pingPort(ports.mediaFrontend),
    pingPort(ports.adminFrontend),
    pingPort(ports.invoiceBackend),
    pingPort(ports.mediaBackend),
    pingPort(ports.adminBackend),
  ]);

  return {
    invoice: {
      frontend: checks[0].online,
      backend: checks[3].online,
    },
    media: {
      frontend: checks[1].online,
      backend: checks[4].online,
    },
    admin: {
      frontend: checks[2].online,
      backend: checks[5].online,
    },
  };
});

// Start services batch script
ipcMain.handle('start-services', async () => {
  await autoStartBackends();
  return { success: true };
});

// Print page handler
ipcMain.handle('print-page', async (_event, options = {}) => {
  if (!mainWindow) return { success: false };
  try {
    mainWindow.webContents.print({
      silent: false,
      printBackground: true,
      ...options,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// System info
ipcMain.handle('get-system-info', () => {
  return {
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  };
});
