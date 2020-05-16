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
const longTimer = 10
const shortTimer = 5

let simpleGit = require('simple-git/promise')('./')
db.findOne({name:'settings'}, (err, result) => {
  if (!result) return
  settings = result.data
  if(result.data){
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
  event.reply('message', { type: 'success', message: 'Settings saved.', timer: shortTimer })
})  

ipcMain.on('read-options', async (event, arg) => {
  let options = {}
  
  if (settings.sfdxCommand) {
    try {
      const output = await execShellCommand(`${settings.sfdxCommand} force:auth:list --json`)
      //console.log('auth list output: ', output)
      options.orgs = JSON.parse(output).result
    } catch (err) {
      // TODO: Tell user to log-in or provide a way
      console.error('Error listing auth: ', err)
    }
  } else {
    event.reply('message', { type: 'warning', message: 'Unable to get Org list from sfdx command. Please configure SFDX.', timer: longTimer })
  }
    
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
})  

ipcMain.on('prune-remote', async(event, arg) => {
  const response = await simpleGit.raw(['remote', 'prune', 'origin'])
  event.reply('prune-remote', { done: true })
  event.reply('message', { type: 'success', message: 'Successfully pruned remote branches.', timer: shortTimer})
})

ipcMain.on('prune-local', async(event, arg) => {
  try {
    const response = await simpleGit.branch(['--merged', 'master'])

    for (let branch in response.branches) {
      if (branch === 'master') continue
      if (response.branches.hasOwnProperty(branch)) {
        //console.log(response.branches[branch])
        const deleteResponse = await simpleGit.branch(['-D', branch])
        //console.log(deleteResponse)
      }
    }

    event.reply('message', { type: 'success', message: 'Successfully pruned local branches.', timer: shortTimer})
  } catch (error) {
    console.log(error)
    event.reply('message', { type: 'error', message: 'Unable to prune all local branches. Check out "master", then try again. System response: ' + error})
  }
  
  event.reply('prune-local', { done: true })
})

ipcMain.on('discard-local', async(event, arg) => {
  try {
    const response = await simpleGit.checkout(['.'])
    console.log('discard local changes: ', response)
    event.reply('message', { type: 'success', message: 'Successfully removed all local changes.', timer: shortTimer })
  } catch (error) {
    event.reply('message', { type: 'error', message: 'Unable to discard local changes. System response: ' + error })
  }

  event.reply('discard-local', { done: true })
})

ipcMain.on('discard-all-changes', async (event, arg) => {
  try {
    const response = await simpleGit.clean('f', { '-d': null })
    console.log('discard all changes: ', response)
    event.reply('message', { type: 'success', message: 'Successfully removed ALL changes including untracked files.', timer: longTimer })
  } catch (error) {
    event.reply('message', { type: 'error', message: 'Unable to discard all changes. System response: ' + error })
  }

  event.reply('discard-all-changes', { done: true })
})

ipcMain.on('open-org', async (event, arg) => {
  // Request a sync from Salesforce org; currently only "CustomObject" is pulled back...
  exec(`${settings.sfdxCommand} force:org:open -u ${settings.org}`, (error, stdout, stderr) => {
    console.log('Open Org Result: ', stdout)
  })
})

ipcMain.on('sync', async (event, arg) => {
  //exec(`cd ${settings.path}; sfdx force:auth:list --json`, (error, stdout, stderr) => {
  if (!settings.path) {
    event.reply('message', { type: 'warning', message: 'You must configure the path of the project, in Settings', timer: longTimer })
    event.reply('sync', {})
    return
  }

  process.chdir(settings.path)

  // Request a sync from Salesforce org; currently only "CustomObject" is pulled back...
  exec(`${settings.sfdxCommand} force:source:retrieve -u ${settings.org} -m ${settings.metadata} --json`, (error, syncResult, stderr) => {
    syncResult = JSON.parse(syncResult)
    console.log('Sync Result: ', syncResult)
    new Notification({
      title: 'Sync Complete!',
      body: 'The sync from Salesforce has completed. ' + settings.metadata.length + ' type(s) retrieved. ' + syncResult.result.inboundFiles.length + ' file(s) retrieved.'
    }).show()
    event.reply('sync', {})
    event.reply('message', { type: 'success', message: 'Sync complete! ' + settings.metadata.length + ' type(s) retrieved. ' + syncResult.result.inboundFiles.length + ' file(s) retrieved.', timer: longTimer })
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
    event.reply('git-detail', { error: true } )
    event.reply('message', {type: 'error', message: 'Unable to checkout: ' + error.message})
    return
  }
  
  let diff = [];
  
  try {
    let status = await simpleGit.status()
    
    console.log('statusResult: ', status)
    
    await Promise.all(status.files.map(async (file) => {
      file.path = file.path.replace(/"/g, '')
      //console.log('file: ' + file.path)
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
    //statusResult = await simpleGit.status()
    
    event.reply('git-detail', { diff, status })
  } catch (error) {
    console.error(error)
    event.reply('git-detail', {error: error.message})
  }
})

ipcMain.on('create-branch', async (event, arg) => {
  console.log('Create branch')
  console.log(arg)

  if (!arg.branch) {
    event.reply('message', { type: 'warning', message: 'Specify a name to create a new branch', timer: shortTimer })
    return
  }

  let response = await simpleGit.checkout(['-b', arg.branch])
  event.reply('message', { type: 'success', message: `Successfully created ${arg.branch}`, timer: shortTimer })
  event.reply('create-branch', { done: true })
})

ipcMain.on('git-pull', async (event, arg) => {
  let result = {}
  
  try {
    const pushResult = await simpleGit.pull('origin', arg.branchName)
    event.reply('message', { type: 'success', message: 'Successfully pulled from origin/' + arg.branchName, timer: longTimer })
  } catch (error) {
    result.error = true
    event.reply('message', { type: 'error', message: 'Unable to pull: ' + error })
  }
  
  event.reply('git-pull', result)
})

ipcMain.on('git-push', async (event, arg) => {
  let result = {}

  try {
    const pushResult = await simpleGit.push('origin', arg.branchName, { '--set-upstream': null })
    event.reply('message', { type: 'success', message: 'Successfully pushed to origin/' + arg.branchName, timer: longTimer })
  } catch (error) {
    result.error = true
    event.reply('message', { type: 'error', message: 'Unable to push: ' + error })
  }

  event.reply('git-push', result)
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
    event.reply('message', { type: 'success', message:  `Successful commit ${commitResult.commit} (${commitResult.summary.changes} change(s)) on branch ${commitResult.branch}`, timer: longTimer})
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