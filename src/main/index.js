/* globals INCLUDE_RESOURCES_PATH */
import { app, Notification } from 'electron'
const { exec } = require('child_process')
const { ipcMain } = require('electron')
const path = require('path')
const fs = require('fs');
const DATAFILE_PATH = path.resolve(__dirname) + '/datafile'
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

ipcMain.on('message', async (event, arg) => {
  event.reply('message', arg)
})

ipcMain.on('read-settings', async (event, arg) => {
  const response = await db.findOne({name:'settings'}, (err, result) => {
    let data = (result) ? result.data : {}
    event.reply('read-settings', data)
  })
})

ipcMain.on('save-settings', async (event, arg) => {
  const response = await db.update({ name: 'settings' }, { name: 'settings', data: { ...arg }}, { upsert: true }, function (err, numReplaced, upsert) {
    settings = arg
    simpleGit = require('simple-git/promise')(arg.path)
  })  
  event.reply('save-settings', { done: true })
  event.reply('message', { type: 'success', message: 'Settings saved.' })
})  

ipcMain.on('read-options', async (event, arg) => {
  try {
    const output = await execShellCommand(`${settings.sfdxCommand} force:auth:list --json`)
    let options = {}
    console.log('auth list output: ', output)
    options.orgs = JSON.parse(output).result
    
    // TODO: read metadata types from e.g.: ./.sfdx/orgs/{USERNAME}/metadataTypeInfos.json
    options.metadata = [
      { value: 'ApexClass', text: 'Apex Classes' },
      { value: 'CustomField', text: 'Custom Fields' },
      { value: 'CustomLabel', text: 'Custom Labels' },
      { value: 'CustomObject', text: 'Custom Objects' },
      { value: 'GlobalValueSet', text: 'Global Value Sets' },
      { value: 'Layout', text: 'Layouts' },
      { value: 'ListView', text: 'List Views' },
      { value: 'CustomObject:Account,CustomObject:Contact,CustomObject:Opportunity', text: 'Standard Objects' },
      { value: 'ApexComponent', text: 'Visualforce Components' },
      { value: 'ApexPage', text: 'Visualforce Pages' },
    ];  
    
    event.reply('read-options', options)
  } catch (err) {
    // TODO: Tell user to log-in or provide a way
    console.error('Error listing auth: ', err)
  }  
})  

ipcMain.on('prune-remote', async(event, arg) => {
  const response = await simpleGit.raw(['remote', 'prune', 'origin'])
  event.reply('prune-remote', { done: true })
  event.reply('message', { type: 'success', message: 'Successfully pruned remote branches.'})
})

ipcMain.on('prune-local', async(event, arg) => {
  const response = await simpleGit.branch(['--merged', 'master'])
  //console.log('prune-local:')
  //console.log(response)
  
  try {
    for (let branch in response.branches) {
      if (branch === 'master') continue
      if (response.branches.hasOwnProperty(branch)) {
        //console.log(response.branches[branch])
        const deleteResponse = await simpleGit.branch(['-D', branch])
        //console.log(deleteResponse)
      }
    }
  } catch (error) {
    console.log(error)
    event.reply('message', { type: 'error', message: 'Unable to prune all local branches. Check out "master", then try again. System response: ' + error})
  }
  
  // TODO: handle failure to delete or other warnings

  event.reply('prune-local', { done: true })
  event.reply('message', { type: 'success', message: 'Successfully pruned local branches.'})
})

ipcMain.on('open-org', async (event, arg) => {
  // Request a sync from Salesforce org; currently only "CustomObject" is pulled back...
  exec(`${settings.sfdxCommand} force:org:open -u ${settings.org}`, (error, stdout, stderr) => {
    console.log('Open Org Result: ', stdout)
  })
})

ipcMain.on('sync', async (event, arg) => {
  //exec(`cd ${settings.path}; sfdx force:auth:list --json`, (error, stdout, stderr) => {
  process.chdir(settings.path)

  // Request a sync from Salesforce org; currently only "CustomObject" is pulled back...
  exec(`${settings.sfdxCommand} force:source:retrieve -u ${settings.org} -m ${settings.metadata} --json`, (error, stdout, stderr) => {
    console.log('Sync Result: ', stdout)
    new Notification({
      title: 'Sync Complete!',
      body: 'The sync from Salesforce has completed. ' + settings.metadata.length + ' type(s) retrieved.'
    }).show()
    event.reply('sync', {})
    event.reply('message', { type: 'success', message: 'Sync complete! ' + settings.metadata.length + ' type(s) retrieved.' })
  })
})

ipcMain.on('git-log', async (event, arg) => {
  const response = await simpleGit.log()
  event.reply('git-log', response)
})

ipcMain.on('git-branches', async (event, arg) => {
  await simpleGit.fetch()
  const response = await simpleGit.branch()

  Object.values(response.branches).map((item) => {
    // Hightlight rows for remote-only branches, and currently checked out branch
    if (item.name.match(/^remotes/)) item['_rowVariant'] = 'dark'
    else if (item.current === true) item['_rowVariant'] = 'success'
  })

  // console.log(response)
  event.reply('git-branches', response)
})

ipcMain.on('git-detail', async (event, arg) => {
  try {
    if (arg.match(/^remotes/)) {
      arg = arg.replace(/^remotes\/.*?\//, '')
    }
    
    console.log(`Checking out branch [${arg}]...`); 
    
    const branch = await simpleGit.checkout(arg)  
  } catch (error) {
    console.error(error)
    event.reply('git-detail', {error: 'Unable to checkout: ' + error.message})
    return
  }
  
  let diff = [];
  //exec('ls -la', (error, stdout, stderr) => {console.log(stdout)})
  
  try {
    let temp = await simpleGit.status()
    
    // console.log('temp: ', temp)
    
    await Promise.all(temp.files.map(async (file) => {
      file.path = file.path.replace(/"/g, '')
      console.log('file: ' + file.path)
      let fileDiff = null
      
      if (file.index === '?') {
        // TODO: This does not work; need a way to get diff for non-tracked file
        //fileDiff = await simpleGit.raw(['diff', '--no-index', 'empty-file', file.path])
      } else {
        fileDiff = await simpleGit.raw(['diff', file.path])
        // // Strip file header from Unified Diff because we know what file it is
        if (fileDiff !== null)
          fileDiff = fileDiff.replace(/^diff.*?(@@)/s, '$1')
      }

      // console.log(fileDiff)
      // console.log(diff);
      diff.push({...file, fileDiff, show: false})
    }))
    console.log(diff)
    
    // Get also diffs for untracked files...
    temp = await simpleGit.status()
    
    event.reply('git-detail', diff)
  } catch (error) {
    console.error(error)
    event.reply('git-detail', {error: error.message})
  }
})

ipcMain.on('create-branch', async (event, arg) => {
  console.log('Create branch')
  console.log(arg)

  if (!arg.branch) {
    event.reply('message', { type: 'warning', message: 'Specify a name to create a new branch' })
    return
  }

  let response = await simpleGit.checkout(['-b', arg.branch])
  event.reply('message', { type: 'success', message: `Successfully created ${arg.branch}` })
  event.reply('create-branch', { done: true })
})

ipcMain.on('commit', async (event, arg) => {
  //console.log('commit!')
  const files = arg.selectedFiles
  
  //console.log('arg: ', arg)

  let commitResult = await simpleGit.add(files)

  //console.log('temp after add: ', JSON.stringify(commitResult))
  commitResult = await simpleGit.commit(arg.message)
  // NOTE: commitResult after successful commit: 
  // {"branch":"experiment","commit":"e1c8985","summary":{"changes":"1","insertions":"1","deletions":"1"},"author":null}
  // NOTE: commitResult after commit with no files:
  // {"branch":"","commit":"","summary":{"changes":0,"insertions":0,"deletions":0},"author":null}
  //console.log('commitResult after commit: ', JSON.stringify(commitResult))

  // TODO: Need fancier logic than this.
  if (commitResult.commit) {
    event.reply('message', { type: 'success', message:  `Successful commit ${commitResult.commit} (${commitResult.summary.changes} change(s)) on branch ${commitResult.branch}`})
  } else {
    event.reply('message', { type: 'error', message: 'Unable to commit to the selected branch at this time. Please check the git status in your console.'})
  }
  event.reply('commit', { done: true })
})

app.on('ready', () => {
  function loopLogic() {
    // window is ready to be broadcast too
    //window.default.browserWindow.webContents.send('tick_time')
  }
  // loopLogic()
  //setInterval(loopLogic, 3000)
})