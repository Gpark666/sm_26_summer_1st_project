const electron = require('electron')
const { app, BrowserWindow } = electron
const { registerSessionStore } = require('./session.cjs')
const path = require('node:path')

if (require('electron-squirrel-startup')) {
  app.quit()
} else {
  app.whenReady().then(async () => {
    const entry = path.join(__dirname, '../dist/index.html')
    registerSessionStore(electron, entry)
    const window = new BrowserWindow({
      width: 1440,
      height: 900,
      title: 'CCTV 접근성 AI',
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    window.webContents.on('will-navigate', event => event.preventDefault())
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    await window.loadFile(entry)
  })

  app.on('window-all-closed', () => app.quit())
}
