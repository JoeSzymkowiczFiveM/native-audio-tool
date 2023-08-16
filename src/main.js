const { app, BrowserWindow  } = require('electron')
const path = require('path')

const CreateWindow = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'img/sound.png'),
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        devTools: false,
    },
  })

  win.loadFile('./src/index.html')
}

// App Events
app.whenReady().then(() => {
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