const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cameraSession', {
  read: () => ipcRenderer.invoke('camera-session:read'),
  write: token => ipcRenderer.invoke('camera-session:write', token),
  clear: () => ipcRenderer.invoke('camera-session:clear'),
})
