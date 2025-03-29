const { ipcMain, dialog, app } = require('electron')
const fs = require('fs')
const path = require('path')

const { 
  getStoragePath, 
  saveStoragePath, 
  getAppConfigPath,
  getUserDataPath 
} = require('./storage')

const {
  openPath,
  openFile,
  openStorageLocation,
  openUserDataDir,
  readFileContent,
  readFullFileContent,
  deleteFile,
  copyFolder,
  getFolderSize
} = require('./file-handlers')

const {
  getTypeFolderName,
  getFileFilters,
  checkIfCodeProject,
  isCodeFile,
  getLanguageFromExt
} = require('./utils')

/**
 * 设置所有IPC处理程序
 */
function setupIpcHandlers() {
  // 加载现有文件列表
  setupLoadExistingFiles()
  
  // 存储路径相关
  setupStoragePathHandlers()
  
  // 文件操作相关
  setupFileOperationHandlers()
  
  // 标签相关
  setupTagsHandlers()
  
  // 项目分析相关
  setupProjectHandlers()
}

/**
 * 设置加载现有文件的处理程序
 */
function setupLoadExistingFiles() {
  ipcMain.handle('load-existing-files', async () => {
    const storagePath = getStoragePath()
    
    if (!storagePath) {
      return []
    }

    const allFiles = []
    const folders = ['videos', 'images', 'audio', 'code', 'folders', 'icons', 'notes', 'ppt', 'ae', 'models']

    await Promise.all(folders.map(async (folder) => {
      const folderPath = path.join(storagePath, folder)
      
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
        return
      }

      try {
        const files = fs.readdirSync(folderPath)
        const filePromises = files.map(async (file) => {
          try {
            const filePath = path.join(folderPath, file)
            const stats = fs.statSync(filePath)
            
            // 添加对 .icns 文件的特殊处理
            if (path.extname(file).toLowerCase() === '.icns') {
              // 尝试查找同名的 png 文件
              const pngName = file.replace('.icns', '.png')
              const pngPath = path.join(folderPath, pngName)
              
              return {
                path: filePath,
                name: file,
                size: stats.size,
                type: '.icns',
                lastModified: stats.mtime,
                previewPath: fs.existsSync(pngPath) ? pngPath : null // 如果存在png则使用，否则为null
              }
            } else if (folder === 'code' && stats.isDirectory()) {
              const isProject = await checkIfCodeProject(filePath)
              return {
                path: filePath,
                name: file,
                size: stats.size,
                type: isProject ? '.project' : 'folder',
                lastModified: stats.mtime,
                isProject: isProject
              }
            } else if (folder === 'folders' && stats.isDirectory()) {
              return {
                path: filePath,
                name: file,
                size: stats.size,
                type: 'folder',
                lastModified: stats.mtime
              }
            } else {
              return {
                path: filePath,
                name: file,
                size: stats.size,
                type: path.extname(file).toLowerCase(),
                lastModified: stats.mtime
              }
            }
          } catch (error) {
            console.error('处理文件失败:', file, error)
            return null
          }
        })

        const folderFiles = (await Promise.all(filePromises)).filter(file => file !== null)
        allFiles.push(...folderFiles)
      } catch (error) {
        console.error('读取文件夹失败:', folder, error)
      }
    }))

    return allFiles
  })
}

/**
 * 设置存储路径相关处理程序
 */
function setupStoragePathHandlers() {
  // 选择存储路径
  ipcMain.handle('select-storage-path', async () => {
    try {
      console.log('开始选择存储路径')
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: '选择素材存储位置'
      })

      console.log('对话框结果:', result)

      if (!result.canceled) {
        const storagePath = result.filePaths[0]
        console.log('选择的存储路径:', storagePath)
        
        await saveStoragePath(storagePath)
        console.log('配置文件写入成功')
        
        return storagePath
      }
      return null
    } catch (error) {
      console.error('设置存储路径时发生错误:', error)
      throw error
    }
  })

  // 获取存储路径
  ipcMain.handle('get-storage-path', () => {
    return getStoragePath()
  })

  // 获取配置路径
  ipcMain.handle('get-config-path', async () => {
    return await getAppConfigPath()
  })

  // 获取用户数据路径
  ipcMain.handle('get-user-data-path', () => {
    return getUserDataPath()
  })

  // 打开存储位置
  ipcMain.handle('open-storage-location', async () => {
    return await openStorageLocation()
  })

  // 打开用户数据目录
  ipcMain.handle('open-user-data', async () => {
    const userDataPath = getUserDataPath()
    return await openUserDataDir(userDataPath)
  })
}

/**
 * 设置文件操作相关处理程序
 */
function setupFileOperationHandlers() {
  // 打开文件对话框
  ipcMain.handle('open-file-dialog', async (event, category) => {
    // 设置对话框属性，允许选择文件夹
    const properties = ['openFile', 'multiSelections']
    if (category === 'folders') {
      properties.splice(0, 2, 'openDirectory')
    }

    if (category === 'code') {
      // 添加文件夹选项
      properties.push('openDirectory')
    }

    try {
      // 首先检查存储路径
      const storagePath = getStoragePath()
      
      if (!storagePath) {
        throw new Error('请先设置存储路径')
      }

      // 确保存储目录存在
      if (!fs.existsSync(storagePath)) {
        await fs.promises.mkdir(storagePath, { recursive: true })
      }

      const result = await dialog.showOpenDialog({
        properties: properties,
        filters: getFileFilters(category),
        message: '选择要导入的文件',
        buttonLabel: '导入'
      })

      if (!result.canceled && result.filePaths.length > 0) {
        const files = await Promise.all(result.filePaths.map(async (filePath) => {
          try {
            const stats = await fs.promises.stat(filePath)
            const fileName = path.basename(filePath)
            
            // 处理代码项目文件夹
            if (stats.isDirectory() && category === 'code') {
              const targetDir = path.join(storagePath, 'code', fileName)
              
              // 如果目标文件夹已存在，先删除它
              if (fs.existsSync(targetDir)) {
                await fs.promises.rm(targetDir, { recursive: true, force: true })
              }
              
              // 创建目标目录并复制内容
              await fs.promises.mkdir(targetDir, { recursive: true })
              await copyFolder(filePath, targetDir)

              // 检查是否为代码项目
              const isProject = await checkIfCodeProject(targetDir)
              
              return {
                path: targetDir,
                name: fileName,
                size: await getFolderSize(targetDir),
                type: isProject ? '.project' : 'folder',
                lastModified: stats.mtime,
                isProject: isProject
              }
            }
            
            // 处理文件夹
            if (stats.isDirectory()) {
              const targetDir = path.join(storagePath, 'folders', fileName)
              
              // 如果目标文件夹已存在，先删除它
              if (fs.existsSync(targetDir)) {
                await fs.promises.rm(targetDir, { recursive: true, force: true })
              }
              
              // 创建目标目录
              await fs.promises.mkdir(targetDir, { recursive: true })
              
              // 复制文件夹内容
              await copyFolder(filePath, targetDir)
              
              return {
                path: targetDir,
                name: fileName,
                size: await getFolderSize(targetDir),
                type: 'folder',
                lastModified: stats.mtime
              }
            } else {
              // 处理普通文件
              const fileType = path.extname(filePath).toLowerCase()
              let typeFolder = getTypeFolderName(fileType)
              
              if (!typeFolder) {
                console.warn('未知文件类型:', fileType)
                return null
              }

              const targetDir = path.join(storagePath, typeFolder)
              
              // 确保目标目录存在
              await fs.promises.mkdir(targetDir, { recursive: true })
              
              const targetPath = path.join(targetDir, fileName)
              
              // 复制文件
              await fs.promises.copyFile(filePath, targetPath)
              
              return {
                path: targetPath,
                name: fileName,
                size: stats.size,
                type: fileType,
                lastModified: stats.mtime
              }
            }
          } catch (error) {
            console.error('处理文件失败:', filePath, error)
            return null
          }
        }))

        // 过滤掉失败的文件
        return files.filter(file => file !== null)
      }
    } catch (error) {
      console.error('导入文件失败:', error)
      throw error
    }
    
    return []
  })

  // 删除文件
  ipcMain.handle('delete-file', async (event, filePath) => {
    return await deleteFile(filePath)
  })

  // 打开文件
  ipcMain.handle('open-file', async (event, filePath) => {
    return await openFile(filePath)
  })

  // 打开文件位置
  ipcMain.handle('open-path', async (event, filePath) => {
    return await openPath(filePath)
  })

  // 获取目录路径
  ipcMain.handle('get-dirname', async (event, filePath) => {
    return path.dirname(filePath)
  })

  // 读取文件内容（预览）
  ipcMain.handle('read-file-content', async (event, filePath) => {
    return await readFileContent(filePath)
  })

  // 读取完整文件内容
  ipcMain.handle('read-full-file-content', async (event, filePath) => {
    return await readFullFileContent(filePath)
  })
}

/**
 * 设置标签相关处理程序
 */
function setupTagsHandlers() {
  // 保存标签
  ipcMain.handle('save-tags', async (event, category, tags) => {
    try {
      const configPath = await getAppConfigPath()
      if (!configPath) {
        throw new Error('未设置存储路径')
      }

      const tagsPath = path.join(configPath, `${category}-tags.json`)
      await fs.promises.writeFile(tagsPath, JSON.stringify(tags, null, 2))
      return true
    } catch (error) {
      console.error('保存标签失败：', error)
      return false
    }
  })

  // 获取标签
  ipcMain.handle('get-tags', async (event, category) => {
    try {
      const configPath = await getAppConfigPath()
      if (!configPath) {
        return []
      }

      const tagsPath = path.join(configPath, `${category}-tags.json`)
      
      if (fs.existsSync(tagsPath)) {
        const data = await fs.promises.readFile(tagsPath, 'utf-8')
        return JSON.parse(data)
      }
      return []
    } catch (error) {
      console.error('获取标签失败：', error)
      return []
    }
  })

  // 保存文件标签
  ipcMain.handle('save-file-tags', async (event, category, filePath, tags) => {
    try {
      const configPath = await getAppConfigPath()
      if (!configPath) {
        throw new Error('未设置存储路径')
      }

      const fileTagsPath = path.join(configPath, `${category}-file-tags.json`)
      
      // 将绝对路径转换为相对路径
      const storagePath = getStoragePath()
      const relativePath = path.relative(storagePath, filePath)
      
      // 使用相对路径的哈希值作为键
      const fileKey = Buffer.from(relativePath).toString('base64')
      let fileTags = {}
      
      if (fs.existsSync(fileTagsPath)) {
        const data = await fs.promises.readFile(fileTagsPath, 'utf-8')
        fileTags = JSON.parse(data)
      }
      
      fileTags[fileKey] = {
        path: relativePath,
        tags: tags
      }
      
      await fs.promises.writeFile(fileTagsPath, JSON.stringify(fileTags, null, 2))
      return true
    } catch (error) {
      console.error('保存文件标签失败：', error)
      return false
    }
  })

  // 获取文件标签
  ipcMain.handle('get-file-tags', async (event, category, filePath) => {
    try {
      const configPath = await getAppConfigPath()
      if (!configPath) {
        return []
      }

      const fileTagsPath = path.join(configPath, `${category}-file-tags.json`)
      
      // 将绝对路径转换为相对路径
      const storagePath = getStoragePath()
      const relativePath = path.relative(storagePath, filePath)
      
      if (fs.existsSync(fileTagsPath)) {
        const data = await fs.promises.readFile(fileTagsPath, 'utf-8')
        const fileTags = JSON.parse(data)
        const fileKey = Buffer.from(relativePath).toString('base64')
        return fileTags[fileKey]?.tags || []
      }
      return []
    } catch (error) {
      console.error('获取文件标签失败：', error)
      return []
    }
  })
}

/**
 * 设置项目分析相关处理程序
 */
function setupProjectHandlers() {
  // 获取项目统计信息
  ipcMain.handle('get-project-stats', async (event, projectPath) => {
    try {
      const stats = {
        fileCount: 0,
        lineCount: 0,
        languages: {},
        mainLanguage: 'Unknown'
      }

      // 递归遍历项目目录
      async function processDirectory(dirPath) {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name)
          
          if (entry.isDirectory()) {
            // 跳过常见的非代码目录
            if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              continue
            }
            await processDirectory(fullPath)
          } else {
            // 处理文件
            const ext = path.extname(entry.name).toLowerCase()
            if (isCodeFile(ext)) {
              stats.fileCount++
              const content = await fs.promises.readFile(fullPath, 'utf-8')
              const lines = content.split('\n').length
              stats.lineCount += lines
              
              // 统计语言
              const lang = getLanguageFromExt(ext)
              stats.languages[lang] = (stats.languages[lang] || 0) + lines
            }
          }
        }
      }

      await processDirectory(projectPath)

      // 确定主要语言
      let maxLines = 0
      for (const [lang, lines] of Object.entries(stats.languages)) {
        if (lines > maxLines) {
          maxLines = lines
          stats.mainLanguage = lang
        }
      }

      return stats
    } catch (error) {
      console.error('获取项目统计失败:', error)
      return {
        fileCount: 0,
        lineCount: 0,
        mainLanguage: 'Unknown'
      }
    }
  })
}

module.exports = {
  setupIpcHandlers
} 