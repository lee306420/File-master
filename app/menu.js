const { Menu, app, dialog, shell } = require('electron')
const path = require('path')
const { importFromUrl } = require('./import')
const { getStoragePath } = require('./storage')

/**
 * 创建应用菜单
 * @param {BrowserWindow} mainWindow 主窗口实例
 */
function createMenu(mainWindow) {
  const isMac = process.platform === 'darwin'
  
  const menuTemplate = [
    // App菜单（macOS特有）
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于' + app.name },
        { type: 'separator' },
        {
          label: '偏好设置',
          accelerator: 'Cmd+,',
          click: () => {
            mainWindow.webContents.send('open-settings')
          }
        },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' + app.name },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' + app.name }
      ]
    }] : []),
    
    // 文件菜单
    {
      label: '文件',
      submenu: [
        {
          label: '导入文件',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            mainWindow.webContents.send('trigger-import-dialog')
          }
        },
        {
          label: '从URL导入',
          click: async () => {
            // 弹出一个对话框让用户输入URL
            const result = await dialog.showInputBox({
              title: '从URL导入',
              message: '请输入文件URL：',
              buttons: ['取消', '导入'],
              defaultId: 1,
              cancelId: 0
            })
            
            if (result.response === 1 && result.text) {
              try {
                const url = result.text.trim()
                const file = await importFromUrl(url)
                
                if (file) {
                  mainWindow.webContents.send('file-imported', [file])
                }
              } catch (error) {
                dialog.showErrorBox('导入失败', error.message)
              }
            }
          }
        },
        {
          label: '从剪贴板导入',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow.webContents.send('import-from-clipboard')
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' }
      ]
    },
    
    // 编辑菜单
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle', label: '粘贴并匹配样式' },
          { role: 'delete', label: '删除' },
          { role: 'selectAll', label: '全选' },
        ] : [
          { role: 'delete', label: '删除' },
          { type: 'separator' },
          { role: 'selectAll', label: '全选' }
        ])
      ]
    },
    
    // 视图菜单
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' }
      ]
    },
    
    // 分类菜单
    {
      label: '分类',
      submenu: [
        {
          label: '视频',
          click: () => {
            mainWindow.webContents.send('change-category', 'videos')
          }
        },
        {
          label: '图片',
          click: () => {
            mainWindow.webContents.send('change-category', 'images')
          }
        },
        {
          label: '音频',
          click: () => {
            mainWindow.webContents.send('change-category', 'audio')
          }
        },
        {
          label: '代码',
          click: () => {
            mainWindow.webContents.send('change-category', 'code')
          }
        },
        {
          label: '文件夹',
          click: () => {
            mainWindow.webContents.send('change-category', 'folders')
          }
        },
        {
          label: '图标',
          click: () => {
            mainWindow.webContents.send('change-category', 'icons')
          }
        },
        {
          label: '笔记',
          click: () => {
            mainWindow.webContents.send('change-category', 'notes')
          }
        }
      ]
    },
    
    // 窗口菜单
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front', label: '前置所有窗口' },
        ] : [
          { role: 'close', label: '关闭' }
        ])
      ]
    },
    
    // 帮助菜单
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '打开存储位置',
          click: async () => {
            const storagePath = getStoragePath()
            if (storagePath) {
              shell.openPath(storagePath)
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: '未设置存储路径',
                message: '请先设置素材存储位置',
                buttons: ['确定']
              })
            }
          }
        },
        {
          label: '检查更新',
          click: () => {
            mainWindow.webContents.send('check-for-updates')
          }
        },
        { type: 'separator' },
        {
          label: '使用说明',
          click: () => {
            shell.openExternal('https://github.com/yourusername/yourrepo/wiki')
          }
        },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于' + app.name,
              message: app.name,
              detail: `版本：${app.getVersion()}\n作者：Your Name\n\n简单易用的素材管理工具。`,
              buttons: ['确定']
            })
          }
        }
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)
}

/**
 * 创建上下文菜单
 * @returns {Menu} Electron上下文菜单
 */
function createContextMenu() {
  return Menu.buildFromTemplate([
    { role: 'cut', label: '剪切' },
    { role: 'copy', label: '复制' },
    { role: 'paste', label: '粘贴' },
    { type: 'separator' },
    { role: 'selectAll', label: '全选' }
  ])
}

/**
 * 为文件项创建上下文菜单
 * @param {BrowserWindow} mainWindow 主窗口实例
 * @param {object} fileInfo 文件信息对象
 * @returns {Menu} Electron上下文菜单
 */
function createFileContextMenu(mainWindow, fileInfo) {
  return Menu.buildFromTemplate([
    {
      label: '打开文件',
      click: () => {
        mainWindow.webContents.send('open-file', fileInfo.path)
      }
    },
    {
      label: '打开所在位置',
      click: () => {
        mainWindow.webContents.send('open-file-location', fileInfo.path)
      }
    },
    { type: 'separator' },
    {
      label: '添加标签',
      click: () => {
        mainWindow.webContents.send('add-tags', fileInfo)
      }
    },
    {
      label: '复制文件路径',
      click: () => {
        mainWindow.webContents.send('copy-file-path', fileInfo.path)
      }
    },
    { type: 'separator' },
    {
      label: '删除',
      click: () => {
        mainWindow.webContents.send('delete-file', fileInfo)
      }
    }
  ])
}

module.exports = {
  createMenu,
  createContextMenu,
  createFileContextMenu
} 