const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('omsDesktop', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  
  // Health checks
  checkServices: () => ipcRenderer.invoke('check-services'),
  
  // Launch / Restart local services
  startServices: () => ipcRenderer.invoke('start-services'),
  
  // Printing
  print: (options) => ipcRenderer.invoke('print-page', options),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Event listener for window state change
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, state) => callback(state));
  }
});
