/* globals INCLUDE_RESOURCES_PATH */
import { app } from 'electron'
// const { exec } = require('child_process')
const { ipcMain } = require('electron')
const simpleGit = require('simple-git/promise')('./')
/**
 * Set `__resources` path to resources files in renderer process
 */
global.__resources = undefined // eslint-disable-line no-underscore-dangle
// noinspection BadExpressionStatementJS
INCLUDE_RESOURCES_PATH // eslint-disable-line no-unused-expressions
if (__resources === undefined) { console.error('[Main-process]: Resources path is undefined') }

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') { app.quit() }
})

// Load here all startup windows
let window = require('./mainWindow')
// how we communicate back and forth between vue
ipcMain.on('git-log', async (event, arg) => {
  const response = await simpleGit.log()
  event.reply('git-log', response)
})
ipcMain.on('git-branches', async (event, arg) => {
  const response = await simpleGit.branch()
  event.reply('git-branches', response)
})
app.on('ready', () => {
  function loopLogic() {
    // window is ready to be broadcast too
    window.default.browserWindow.webContents.send('tick_time')
  }
  // loopLogic()
    setInterval(loopLogic, 3000)
})