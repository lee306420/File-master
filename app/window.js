const { BrowserWindow, app } = require('electron')
const path = require('path')
const { createMenu, createContextMenu } = require('./menu')

let mainWindow = null

/**
 * 创建主窗口
 * @returns {BrowserWindow} 创建的窗口实例
 */
function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f5f5f5',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    }
  })

  // 加载应用主页面
  mainWindow.loadFile('index.html')

  // 打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 创建菜单
  createMenu(mainWindow)

  // 添加右键菜单
  mainWindow.webContents.on('context-menu', (_, params) => {
    createContextMenu().popup(mainWindow)
  })

  // 当内容加载完成后再显示窗口，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // 窗口关闭时清空引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  return mainWindow
}

/**
 * 获取主窗口实例
 * @returns {BrowserWindow|null} 主窗口实例或null
 */
function getMainWindow() {
  return mainWindow
}

module.exports = {
  createWindow,
  getMainWindow
} 