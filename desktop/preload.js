// preload — contextBridge for safe future APIs
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('nabdDesktop', {
  platform: process.platform,
  version: process.versions.electron
});
