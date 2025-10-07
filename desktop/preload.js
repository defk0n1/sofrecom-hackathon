const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Backend health check
  checkBackendHealth: () => ipcRenderer.invoke('check-backend-health'),
  
  // Platform info
  platform: process.platform,
  
  // Electron flag
  isElectron: true
});

// Expose Node.js process info (read-only)
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  versions: process.versions
});
