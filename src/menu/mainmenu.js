const {Menu, Notification} = require('electron')
const electron = require('electron')
const app = electron.app

import path from 'path'
const isDev = process.env.NODE_ENV === 'development'
const INDEX_PATH = path.join(__dirname, '..', 'renderer', 'index.html')
const DEV_SERVER_URL = process.env.DEV_SERVER_URL
const baseUrl = isDev ? DEV_SERVER_URL : INDEX_PATH

const template = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Settings',
        click (item, focusedWindow) {
          focusedWindow.send('navigate', {target: '/settings' })
        }
      },
      {
        role: 'quit'
      }
    ]
  },
  {
    label: 'Edit',
    submenu: [
      {
        role: 'undo'
      },
      {
        role: 'redo'
      },
      {
        type: 'separator'
      },
      {
        role: 'cut'
      },
      {
        role: 'copy'
      },
      {
        role: 'paste'
      },
      {
        role: 'pasteandmatchstyle'
      },
      {
        role: 'delete'
      },
      {
        role: 'selectall'
      }
    ]
  },
  {
    label: 'Debug',
    submenu: [
      {
        label: 'Notification Test',
        click (item, focusedWindow) {
          console.log('About to create a test notification...')
          console.log('Notification.isSupported() = ' + Notification.isSupported())
          new Notification({
            title: 'Test Notification!',
            body: 'This is the body of the test notification. Hopefully you can see it.'
          }).show()
          
          // This isn't working on Windows 10...
          // myNotification.onclick = () => {
          //   console.log('Notification clicked')
          // }
          //myNotification.show()
        }
      },
      {
        label: "Alert Test: Success",
        click (item, focusedWindow) {
          focusedWindow.send('message', { type: 'success', message: 'Testing success message'} )
        }
      },
      {
        label: "Alert Test: Warning",
        click (item, focusedWindow) {
          focusedWindow.send('message', { type: 'warning', message: 'Testing warning message'} )
        }
      },
      {
        label: "Alert Test: Error",
        click (item, focusedWindow) {
          focusedWindow.send('message', { type: 'error', message: 'Testing error message'} )
        }
      }
    ]
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.reload()
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
        click (item, focusedWindow) {
          if (focusedWindow) focusedWindow.webContents.toggleDevTools()
        }
      },
      {
        type: 'separator'
      },
      {
        role: 'resetzoom'
      },
      {
        role: 'zoomin'
      },
      {
        role: 'zoomout'
      },
      {
        type: 'separator'
      },
      {
        role: 'togglefullscreen'
      }
    ]
  },
  {
    role: 'window',
    submenu: [
      {
        role: 'minimize'
      },
      {
        role: 'close'
      }
    ]
  },
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click () { require('electron').shell.openExternal('http://electron.atom.io') }
      }
    ]
  }
]

if (process.platform === 'darwin') {
  const name = app.getName()
  template.unshift({
    label: name,
    submenu: [
      {
        role: 'about'
      },
      {
        type: 'separator'
      },
      {
        role: 'services',
        submenu: []
      },
      {
        type: 'separator'
      },
      {
        role: 'hide'
      },
      {
        role: 'hideothers'
      },
      {
        role: 'unhide'
      },
      {
        type: 'separator'
      },
      {
        role: 'quit'
      }
    ]
  })
  // Edit menu.
  template[1].submenu.push(
    {
      type: 'separator'
    },
    {
      label: 'Speech',
      submenu: [
        {
          role: 'startspeaking'
        },
        {
          role: 'stopspeaking'
        }
      ]
    }
  )
  // Window menu.
  template[3].submenu = [
    {
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      role: 'close'
    },
    {
      label: 'Minimize',
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize'
    },
    {
      label: 'Zoom',
      role: 'zoom'
    },
    {
      type: 'separator'
    },
    {
      label: 'Bring All to Front',
      role: 'front'
    }
  ]
}

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)