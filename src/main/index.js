/* globals INCLUDE_RESOURCES_PATH */
import { app } from 'electron'
const { exec } = require('child_process')
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

// This is needed for Windows 10 to enable Notifications
app.setAppUserModelId(process.execPath)

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
ipcMain.on('git-detail', async (event, arg) => {
  // try {
  //   const branch = await simpleGit.checkout(arg)  
  //   console.log(branch); 
  // } catch (error) {
  //   console.error(error)
  // }
  let diff = [];
  exec('ls -la', (error, stdout, stderr) => {console.log(stdout)})
  try {
   let temp = await simpleGit.diffSummary()

   await Promise.all(temp.files.map(async (file) => {
    let fileDiff = await simpleGit.raw(['diff', file.file])
    // console.log(fileDiff)
    //console.log(diff);
    diff.push({...file, fileDiff})
   }))
   console.log(diff)
   event.reply('git-detail', diff)
  } catch (error) {
    console.error(error)
  }

})
app.on('ready', () => {
  function loopLogic() {
    // window is ready to be broadcast too
    //window.default.browserWindow.webContents.send('tick_time')
  }
  // loopLogic()
    //setInterval(loopLogic, 3000)
})