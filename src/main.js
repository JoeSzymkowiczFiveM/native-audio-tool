const { app, BrowserWindow, ipcMain   } = require('electron')
const path = require('path')

const CreateWindow = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'img/sound.png'),
    webPreferences: {
        //preload: path.join(__dirname, 'preload.js'),
        preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: true,
        sandbox: false,
        devTools: true,
    },
  })

  win.loadFile('./src/index.html')
}

if (require('electron-squirrel-startup')) app.quit();

// App Events
app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'pong')

    CreateWindow()

    // macOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})