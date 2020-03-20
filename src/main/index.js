/* globals INCLUDE_RESOURCES_PATH */
import { app } from 'electron'
const { exec } = require('child_process')
const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs');
const DATAFILE_PATH = path.resolve(__dirname) + '/datafile'
console.log('__dirname: ', __dirname)
console.log('path.resolve(__dirname): ', path.resolve(__dirname))
let Datastore = require('nedb')
let db = new Datastore({ filename: DATAFILE_PATH, autoload: true })

let settings = {}

let simpleGit = require('simple-git/promise')('./')
db.findOne({name:'settings'}, (err, result) => {
  if (!result) return
  settings = result.data
  if(result.data){
    console.log('PATH:'+result.data.path)
    simpleGit = require('simple-git/promise')(result.data.path)
  }
})

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

/**
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
function execShellCommand(cmd) {
  const exec = require('child_process').exec;
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
        reject(stderr)
      }
      resolve(stdout);
    });
  });
}

ipcMain.on('write-settings', async (event, arg) => {
  const response = await db.update({ name: 'settings' }, { name: 'settings', data: { ...arg }}, { upsert: true }, function (err, numReplaced, upsert) {
    settings = arg
    simpleGit = require('simple-git/promise')(arg.path)
  })
})

ipcMain.on('read-options', async (event, arg) => {
  try {
    const output = await execShellCommand(`sfdx force:auth:list --json`)
    let options = {}
    console.log('auth list output: ', output)
    options.orgs = JSON.parse(output).result
    event.reply('read-options', options)
  } catch (err) {
    // TODO: Tell user to log-in or provide a way
    console.error('Error listing auth: ', err)
  }
})

ipcMain.on('read-settings', async (event, arg) => {
  const response = await db.findOne({name:'settings'}, (err, result) => {
    let data = (result) ? result.data : {}
    event.reply('read-settings', data)
  })
})

ipcMain.on('sync', async (event, arg) => {
  //exec(`cd ${settings.path}; sfdx force:auth:list --json`, (error, stdout, stderr) => {
  process.chdir(settings.path)
  exec(`sfdx force:source:retrieve -u ${settings.org} -m CustomObject`, (error, stdout, stderr) => {
    console.log(stdout)
    event.reply('sync', {})
  })
})

ipcMain.on('git-log', async (event, arg) => {
  const response = await simpleGit.log()
  event.reply('git-log', response)
})
ipcMain.on('git-branches', async (event, arg) => {
  const response = await simpleGit.branchLocal()
  console.log(response)
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
   let temp = await simpleGit.status()

   console.log('temp: ', temp)

   await Promise.all(temp.files.map(async (file) => {
      console.log('file: ' + file.path)
      let fileDiff = null

      if (file.index === '?') {
        // TODO: This does not work; need a way to get diff for non-tracked file
        //fileDiff = await simpleGit.raw(['diff', '--no-index', 'empty-file', file.path])
      } else {
        fileDiff = await simpleGit.raw(['diff', file.path])
      }
      // console.log(fileDiff)
      // console.log(diff);
      diff.push({...file, fileDiff})
    }))
    console.log(diff)

    // Get also diffs for untracked files...
    temp = await simpleGit.status()


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