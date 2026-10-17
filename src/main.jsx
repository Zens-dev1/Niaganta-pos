import { app, BrowserWindow, ipcMain } from 'electron';

// Di dalam file main.js, tambahkan handler IPC:
ipcMain.on('print-receipt', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  
  // Mencetak otomatis tanpa popup dialog Windows (Silent Print)
  win.webContents.print({
    silent: true,               // Cetak langsung tanpa dialog
    printBackground: true,       // Warna & garis struk ikut tercetak
    deviceName: ''               // Biarkan kosong untuk printer default, atau isi nama printer thermal kamu
  }, (success, failureReason) => {
    if (!success) {
      console.log('Gagal mencetak struk:', failureReason);
    }
  });
});