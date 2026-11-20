const fs = require('node:fs/promises')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function registerSessionStore({ app, ipcMain, safeStorage }, entry) {
  const file = path.join(app.getPath('userData'), 'camera-session.bin')
  const trusted = pathToFileURL(entry).href
  let pending = Promise.resolve()

  function handle(channel, action) {
    ipcMain.handle(channel, (event, ...args) => {
      const frame = event.senderFrame
      if (!frame || frame !== event.sender.mainFrame || frame.url.split(/[?#]/)[0] !== trusted)
        throw new Error('허용되지 않은 화면입니다.')
      const result = pending.then(() => action(...args))
      pending = result.catch(() => {})
      return result
    })
  }
  handle('camera-session:read', async () => {
    let encrypted
    try { encrypted = await fs.readFile(file) }
    catch (err) { if (err.code === 'ENOENT') return null; throw err }
    if (!safeStorage.isEncryptionAvailable()) throw new Error('보안 저장소를 사용할 수 없습니다.')
    try { return safeStorage.decryptString(encrypted) }
    catch { return null }
  })
  handle('camera-session:write', async token => {
    if (typeof token !== 'string' || !token || token.length > 16384 || !safeStorage.isEncryptionAvailable())
      throw new Error('보안 저장소에 인증 정보를 저장할 수 없습니다.')
    await fs.writeFile(file + '.tmp', safeStorage.encryptString(token), { mode: 0o600 })
    await fs.rename(file + '.tmp', file)
  })
  handle('camera-session:clear', () => fs.rm(file, { force: true }))
}

module.exports = { registerSessionStore }
