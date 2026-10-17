const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Niaganta Pos',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
}

// Handler Cetak Struk Langsung (Silent Print)
ipcMain.on('print-receipt', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  win.webContents.print({
    silent: true,               // Cetak otomatis tanpa memunculkan dialog Windows
    printBackground: true,       // Background dan garis pembatas struk ikut tercetak
    deviceName: ''               // Kosongkan untuk printer default, atau isi nama printer thermal kamu
  }, (success, failureReason) => {
    if (!success) {
      console.log('Gagal mencetak struk thermal:', failureReason);
    }
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});