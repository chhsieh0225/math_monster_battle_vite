const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const MAX_PLAYTEST_BYTES = 8 * 1024 * 1024;
// 每次開啟 App 一個檔案，遊玩中會覆寫更新。
const SESSION_STAMP = new Date().toISOString().replace(/[:.]/g, '-');

function readJsonFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

// 打包時寫入的專案路徑（例如 Dropbox 裡的 playtest/）；找不到就存在 App 自己的資料夾。
function playtestDir() {
  const target = readJsonFile(path.join(DIST, 'playtest-target.json'));
  if (target && typeof target.dir === 'string' && fs.existsSync(path.dirname(target.dir))) return target.dir;
  return path.join(app.getPath('userData'), 'playtest');
}

function isAppPage(event) {
  const url = event.senderFrame ? event.senderFrame.url : '';
  return url.startsWith('file://');
}

function writePlaytest(json) {
  if (typeof json !== 'string' || json.length === 0 || json.length > MAX_PLAYTEST_BYTES) return { ok: false };
  const dir = playtestDir();
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `playtest-${SESSION_STAMP}.json`);
  fs.writeFileSync(`${file}.tmp`, json);
  fs.renameSync(`${file}.tmp`, file);
  return { ok: true, file };
}

ipcMain.handle('playtest:save', (event, json) => {
  if (!isAppPage(event)) return { ok: false };
  try { return writePlaytest(json); } catch { return { ok: false }; }
});

ipcMain.on('playtest:save-sync', (event, json) => {
  try { event.returnValue = isAppPage(event) ? writePlaytest(json) : { ok: false }; } catch { event.returnValue = { ok: false }; }
});

ipcMain.on('app:release-info', (event) => {
  event.returnValue = readJsonFile(path.join(DIST, 'release-info.json'));
});

function createWindow() {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    resizable: true,
    title: 'Math Monster Brawl',
    icon: path.join(__dirname, '..', 'dist', 'icon-512.png'),
    webPreferences: {
      // 不需要 Node.js 存取，保持安全；只透過 preload 開放「存試玩紀錄」
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // 載入 vite build 產出的靜態檔案
  win.loadFile(path.join(DIST, 'index.html'));

  // 正式版不顯示選單列
  win.setMenuBarVisibility(false);
}

app.whenReady().then(createWindow);

// macOS：若視窗已關閉但 App 仍在（例如從 Dock 重新點擊），重新開一個視窗
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 這是單一視窗的遊戲：關掉視窗就結束 App（包含 macOS），不在背景繼續執行或播放音樂
app.on('window-all-closed', () => {
  app.quit();
});
