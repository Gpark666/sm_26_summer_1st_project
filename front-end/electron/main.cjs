const { app, BrowserWindow } = require('electron')
const path = require('node:path')

if (require('electron-squirrel-startup')) {
  app.quit()
} else {
  app.whenReady().then(async () => {
    const window = new BrowserWindow({
      width: 1440,
      height: 900,
      title: 'CCTV 접근성 AI',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    })

    await window.loadFile(path.join(__dirname, '../dist/index.html'))
  })

  app.on('window-all-closed', () => app.quit())
}