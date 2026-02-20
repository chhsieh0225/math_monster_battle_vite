const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    resizable: true,
    title: '數學怪獸大亂鬥',
    icon: path.join(__dirname, '..', 'dist', 'icon-512.png'),
    webPreferences: {
      // 不需要 Node.js 存取，保持安全
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 載入 vite build 產出的靜態檔案
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // 正式版不顯示選單列
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

// macOS：關閉所有視窗後點 dock icon 重新開啟
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Windows / Linux：全部視窗關閉就退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
