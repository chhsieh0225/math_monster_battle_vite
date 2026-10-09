// 讓遊戲（網頁端）可以把試玩紀錄存成 JSON，不開放任何其他 Node 功能。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mmbDesktop', {
  savePlaytest: (json) => ipcRenderer.invoke('playtest:save', json),
  // 關閉視窗前同步儲存，避免 App 結束時來不及寫入。
  savePlaytestSync: (json) => ipcRenderer.sendSync('playtest:save-sync', json),
  releaseInfo: () => ipcRenderer.sendSync('app:release-info'),
});
