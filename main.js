const { app } = require('electron')
const { createWindow } = require('./app/window')
const { setupIpcHandlers } = require('./app/ipc-handlers')

// 设置命令行参数
app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.commandLine.appendSwitch('disable-gpu-cache')
app.commandLine.appendSwitch('lang', 'zh-CN')
app.commandLine.appendSwitch('force-chinese-ime', 'true')

// 应用就绪后创建窗口
app.whenReady().then(() => {
  createWindow()
  setupIpcHandlers()
  
  app.on('activate', function () {
    if (require('electron').BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 所有窗口关闭时退出应用（macOS除外）
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
