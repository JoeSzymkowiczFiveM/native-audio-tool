const { app, BrowserWindow } = require('electron')
const path = require('path')

const CreateWindow = () => {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
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
