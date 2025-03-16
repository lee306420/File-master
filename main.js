const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const fs = require('fs')

app.commandLine.appendSwitch('ignore-gpu-blacklist')
app.commandLine.appendSwitch('disable-gpu-cache')
app.commandLine.appendSwitch('lang', 'zh-CN')
app.commandLine.appendSwitch('force-chinese-ime', 'true')

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('index.html')
}
app.whenReady().then(() => {
  createWindow()
  
  // 预加载文件列表
  ipcMain.handle('load-existing-files', async () => {
    const configPath = path.join(app.getPath('userData'), 'config.json')
    let storagePath = null
    
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            storagePath = config.storagePath
        }
    } catch (error) {
        console.error('读取配置文件失败：', error)
        return []
    }

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

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// 添加选择存储路径的处理器
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
      
      const configPath = path.join(app.getPath('userData'), 'config.json')
      console.log('配置文件路径:', configPath)
      
      // 确保配置目录存在
      const configDir = path.dirname(configPath)
      if (!fs.existsSync(configDir)) {
        await fs.promises.mkdir(configDir, { recursive: true })
      }

      const config = { storagePath }
      
      // 使用异步写入
      await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2))
      console.log('配置文件写入成功')
      
      setupFSWatcher(storagePath)
      return storagePath
    }
    return null
  } catch (error) {
    console.error('设置存储路径时发生错误:', error)
    throw error // 将错误传递给渲染进程
  }
})

// 获取当前存储
ipcMain.handle('get-storage-path', () => {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return config.storagePath
    }
  } catch (error) {
    console.error('读取配置文件失败：', error)
  }
  return null
})

// 修改文件导入处理器
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
        const configPath = path.join(app.getPath('userData'), 'config.json')
        let storagePath = null
        
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            storagePath = config.storagePath
        }

        if (!storagePath) {
            throw new Error('请先设置存储路径')
        }

        // 确保存储目录存在
        if (!fs.existsSync(storagePath)) {
            await fs.promises.mkdir(storagePath, { recursive: true })
        }

        const result = await dialog.showOpenDialog({
            properties: properties,
            filters: getFileFilters(category), // 使用之前定义的过滤器
            message: '选择要导入的文件', // Mac 特有的对话框提示
            buttonLabel: '导入' // 自定义按钮文本
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
                        
                        // 添加更详细的日志
                        console.log('导入文件夹:', {
                            path: targetDir,
                            name: fileName,
                            isDirectory: true,
                            hasProjectFiles: isProject,
                            contents: await fs.promises.readdir(targetDir)
                        })
                        
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
                        let typeFolder = getTypeFolderName(fileType) // 获取对应的类型文件夹名
                        
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
        throw error // 向上传递错误，让渲染进程处理
    }
    
    return []
})

// 添加辅助函数来获取文件类型对应的文件夹名
function getTypeFolderName(fileType) {
    const typeMap = {
        '.mp4': 'videos',
        '.avi': 'videos',
        '.mov': 'videos',
        '.jpg': 'images',
        '.png': 'images',
        '.gif': 'images',
        '.mp3': 'audio',
        '.wav': 'audio',
        '.m4a': 'audio',
        '.ogg': 'audio',
        '.flac': 'audio',
        '.js': 'code',
        '.py': 'code',
        '.java': 'code',
        '.cpp': 'code',
        '.html': 'code',
        '.css': 'code',
        '.ico': 'icons',
        '.icns': 'icons',
        '.svg': 'icons',
        '.txt': 'notes',
        '.md': 'notes',
        '.doc': 'notes',
        '.docx': 'notes',
        '.pdf': 'notes',
        '.ppt': 'ppt',
        '.pptx': 'ppt',
        '.aep': 'ae',
        '.zip': 'ae',
        '.fbx': 'models',
        '.obj': 'models',
        '.max': 'models',
        '.c4d': 'models',
        '.blend': 'models',
        '.3ds': 'models',
        '.dae': 'models',
        '.pth': 'models',
        '.glb': 'models',
        '.project': 'code'
    }
    return typeMap[fileType]
}

// 添加复制文件夹的辅助函数
async function copyFolder(src, dest) {
    await fs.promises.mkdir(dest, { recursive: true })
    const entries = await fs.promises.readdir(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
            await copyFolder(srcPath, destPath)
        } else {
            await fs.promises.copyFile(srcPath, destPath)
        }
    }
}

// 添加获取文件夹大小的辅助函数
async function getFolderSize(folderPath) {
    let size = 0
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name)
        if (entry.isDirectory()) {
            size += await getFolderSize(fullPath)
        } else {
            const stats = await fs.promises.stat(fullPath)
            size += stats.size
        }
    }

    return size
}

// 简化的缓存机制
let fileCache = new Map()
let lastCacheUpdate = 0

// 修改删除文件的处理器
ipcMain.handle('delete-file', async (event, filePath) => {
    try {
        // 确保路径存在且效
        if (!filePath || !fs.existsSync(filePath)) {
            console.error('文件不存在:', filePath)
            return false
        }

        const stats = fs.statSync(filePath)
        
        // 使用 promises API 并添加错误处理
        if (stats.isDirectory()) {
            await fs.promises.rm(filePath, { 
                recursive: true, 
                force: true,
                maxRetries: 3,  // 添加重试机制
                retryDelay: 100
            })
        } else {
            await fs.promises.unlink(filePath)
        }
        
        return true
    } catch (error) {
        console.error('删除文件失败：', error)
        // 返回 false 而不是抛出错误，这样前端可以更好地处理
        return false
    }
})

// 修改保存标签的处理器
ipcMain.handle('save-tags', async (event, category, tags) => {
    try {
        // 获取存储路径下的配置目录
        const configPath = path.join(app.getPath('userData'), 'config.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (!config.storagePath) {
            throw new Error('未设置存储路径')
        }

        const storageConfigPath = path.join(config.storagePath, 'config')
        const tagsPath = path.join(storageConfigPath, `${category}-tags.json`)
        
        // 确保配置目录存在
        await fs.promises.mkdir(storageConfigPath, { recursive: true })
        
        // 保存标签
        await fs.promises.writeFile(tagsPath, JSON.stringify(tags, null, 2))
        return true
    } catch (error) {
        console.error('保存标签失败：', error)
        return false
    }
})

// 修改获取标签的处理器
ipcMain.handle('get-tags', async (event, category) => {
    try {
        const configPath = path.join(app.getPath('userData'), 'config.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (!config.storagePath) {
            return []
        }

        const storageConfigPath = path.join(config.storagePath, 'config')
        const tagsPath = path.join(storageConfigPath, `${category}-tags.json`)
        
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

// 修改保存文件标签的处理器
ipcMain.handle('save-file-tags', async (event, category, filePath, tags) => {
    try {
        const configPath = path.join(app.getPath('userData'), 'config.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (!config.storagePath) {
            throw new Error('未设置存储路径')
        }

        const storageConfigPath = path.join(config.storagePath, 'config')
        const fileTagsPath = path.join(storageConfigPath, `${category}-file-tags.json`)
        
        // 将绝对路径转换为相对路径
        const relativePath = path.relative(config.storagePath, filePath)
        
        // 使用相对路径的哈希值作为键
        const fileKey = Buffer.from(relativePath).toString('base64')
        let fileTags = {}
        
        if (fs.existsSync(fileTagsPath)) {
            const data = await fs.promises.readFile(fileTagsPath, 'utf-8')
            fileTags = JSON.parse(data)
        }
        
        fileTags[fileKey] = {
            path: relativePath, // 存储相对路径
            tags: tags
        }
        
        await fs.promises.writeFile(fileTagsPath, JSON.stringify(fileTags, null, 2))
        return true
    } catch (error) {
        console.error('保存文件标签失败：', error)
        return false
    }
})

// 修改获取文件标签的处理器
ipcMain.handle('get-file-tags', async (event, category, filePath) => {
    try {
        const configPath = path.join(app.getPath('userData'), 'config.json')
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
        if (!config.storagePath) {
            return []
        }

        const storageConfigPath = path.join(config.storagePath, 'config')
        const fileTagsPath = path.join(storageConfigPath, `${category}-file-tags.json`)
        
        // 将绝对路径转换为相对路径
        const relativePath = path.relative(config.storagePath, filePath)
        
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

// 添加打开存储位置的处理器
ipcMain.handle('open-storage-location', async () => {
    const configPath = path.join(app.getPath('userData'), 'config.json')
    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
            if (config.storagePath && fs.existsSync(config.storagePath)) {
                await shell.openPath(config.storagePath)
                return true
            }
        }
    } catch (error) {
        console.error('打开存储位置失败：', error)
    }
    return false
})

// 修改读取文件内容的处理器
ipcMain.handle('read-file-content', async (event, filePath) => {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在：', filePath)
      return null
    }

    // 检查文件大小
    const stats = fs.statSync(filePath)
    if (stats.size > 1024 * 1024) { // 如果文件大于1MB
      console.warn('文件太大，只读取部分内容：', filePath)
      // 读取前1KB的内容
      const fd = await fs.promises.open(filePath, 'r')
      const buffer = Buffer.alloc(1024)
      await fd.read(buffer, 0, 1024, 0)
      await fd.close()
      return buffer.toString('utf-8')
    }

    // 读取整个文件
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return content.slice(0, 200) // 只返回前200个字符
  } catch (error) {
    console.error('读取文件失败：', error)
    return null
  }
})

// 添加读取完整文件内容的处理器
ipcMain.handle('read-full-file-content', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.error('文件不存在：', filePath)
      return null
    }

    const content = await fs.promises.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('读取文件失败：', error)
    return null
  }
})

// 添加打开指定路径的处理器
ipcMain.handle('open-path', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            // 使用 showItemInFolder 替代 openPath
            // 这会打开文件夹并选中指定文件
            shell.showItemInFolder(filePath)
            return true
        }
    } catch (error) {
        console.error('打开文件位置失败：', error)
    }
    return false
})

// 添加获取文件目录路径的处理器
ipcMain.handle('get-dirname', async (event, filePath) => {
    return path.dirname(filePath)
})

// 添加打开用户数据目录的处理器
ipcMain.handle('open-user-data', async () => {
    try {
        const userDataPath = app.getPath('userData')
        await shell.openPath(userDataPath)
        return true
    } catch (error) {
        console.error('打开用户数据目录失败：', error)
        return false
    }
})

// 在 main.js 中添加这个函数
function getFileFilters(category) {
    // 默认过滤器，添加 icns
    const defaultFilter = {
        name: '所有支持的文件',
        extensions: [
            'mp4', 'avi', 'mov',
            'jpg', 'png', 'gif',
            'mp3', 'wav', 'm4a', 'ogg', 'flac',
            'js', 'py', 'java', 'cpp', 'html', 'css',
            'ico', 'icns', 'svg',
            'txt', 'md', 'doc', 'docx', 'pdf',
            'ppt', 'pptx',
            'aep',
            'fbx', 'obj', 'max', 'c4d', 'blend', '3ds', 'dae', 'pth', 'glb'
        ]
    }

    // 根据分类返回特定的过滤器
    switch (category) {
        case 'videos':
            return [{ name: '视频文件', extensions: ['mp4', 'avi', 'mov'] }]
        case 'photos':
            return [{ name: '图片文件', extensions: ['jpg', 'png', 'gif'] }]
        case 'audio':
            return [{ name: '音频文件', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] }]
        case 'code':
            return [{ name: '代码文件', extensions: ['js', 'py', 'java', 'cpp', 'html', 'css'] }]
        case 'icons':
            return [{ name: '图标文件', extensions: ['ico', 'icns', 'svg'] }]
        case 'notes':
            return [{ name: '笔记文件', extensions: ['txt', 'md', 'doc', 'docx', 'pdf'] }]
        case 'ppt':
            return [{ name: 'PPT文件', extensions: ['ppt', 'pptx'] }]
        case 'ae':
            return [{ name: 'AE工程文件', extensions: ['aep', 'zip'] }]
        case 'models':
            return [{ name: '3D模型文件', extensions: ['fbx', 'obj', 'max', 'c4d', 'blend', '3ds', 'dae', 'pth', 'glb'] }]
        case 'folders':
            return [] // 文件夹不需要过滤器
        default:
            return [defaultFilter]
    }
}

// 添加检查是否为代码项目的函数
async function checkIfCodeProject(dirPath) {
    try {
        // 检查常见的项目标志文件
        const projectFiles = [
            'package.json',
            'composer.json',
            'requirements.txt',
            'pom.xml',
            'build.gradle',
            'CMakeLists.txt',
            '.git',
            '.svn',
            'Cargo.toml',
            'go.mod',
            'index.html',  // 添加更多 web 项目相关文件
            'webpack.config.js',
            'vite.config.js',
            'tsconfig.json',
            '.gitignore'
        ]

        // 检查文件
        for (const file of projectFiles) {
            if (fs.existsSync(path.join(dirPath, file))) {
                console.log('找到项目标志文件:', file)
                return true
            }
        }

        // 检查是否包含常见的项目目录结构
        const projectDirs = [
            'src',
            'test',
            'docs',
            'build',
            'dist',
            'node_modules',
            'public',
            'assets',
            'styles',
            'scripts',
            'components',
            'pages',
            'static'
        ]

        // 检查目录
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
        for (const entry of entries) {
            if (entry.isDirectory() && projectDirs.includes(entry.name)) {
                console.log('找到项目目录:', entry.name)
                return true
            }
        }

        // 检查是否包含多个代码文件
        let codeFileCount = 0
        const codeExts = ['.js', '.html', '.css', '.py', '.java', '.cpp', '.jsx', '.ts', '.tsx']
        
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                const ext = path.extname(entry.name).toLowerCase()
                if (codeExts.includes(ext)) {
                    codeFileCount++
                    if (codeFileCount >= 2) { // 如果有2个或以上的代码文件，也认为是项目
                        console.log('找到多个代码文件')
                        return true
                    }
                }
            }
        }

        console.log('未检测到项目特征')
        return false
    } catch (error) {
        console.error('检查项目失败:', error)
        return false
    }
}

// 添加项目统计处理器
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

// 辅助函数：检查是否为代码文件
function isCodeFile(ext) {
    const codeExts = [
        '.js', '.ts', '.jsx', '.tsx',
        '.py', '.java', '.cpp', '.c',
        '.h', '.hpp', '.cs', '.php',
        '.rb', '.go', '.rs', '.swift',
        '.kt', '.scala', '.html', '.css',
        '.scss', '.less', '.vue', '.jsx'
    ]
    return codeExts.includes(ext)
}

// 辅助函数：根据扩展名获取语言名称
function getLanguageFromExt(ext) {
    const langMap = {
        '.js': 'JavaScript',
        '.ts': 'TypeScript',
        '.jsx': 'React',
        '.tsx': 'React/TypeScript',
        '.py': 'Python',
        '.java': 'Java',
        '.cpp': 'C++',
        '.c': 'C',
        '.cs': 'C#',
        '.php': 'PHP',
        '.rb': 'Ruby',
        '.go': 'Go',
        '.rs': 'Rust',
        '.swift': 'Swift',
        '.kt': 'Kotlin',
        '.scala': 'Scala',
        '.html': 'HTML',
        '.css': 'CSS',
        '.scss': 'SCSS',
        '.less': 'Less',
        '.vue': 'Vue'
    }
    return langMap[ext] || 'Other'
}

// 添加获取配置路径的处理器
ipcMain.handle('get-config-path', async () => {
  const configPath = path.join(app.getPath('userData'), 'config.json')
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.storagePath) {
        // 返回存储路径下的 config 目录
        const storageConfigPath = path.join(config.storagePath, 'config')
        // 确保目录存在
        if (!fs.existsSync(storageConfigPath)) {
          await fs.promises.mkdir(storageConfigPath, { recursive: true })
        }
        return storageConfigPath
      }
    }
  } catch (error) {
    console.error('获取配置路径失败:', error)
  }
  return null
})

// 在其他 ipcMain.handle 处理器附近添加
ipcMain.handle('open-file', async (event, filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            // 使用系统默认程序打开文件
            shell.openPath(filePath)
            return true
        }
    } catch (error) {
        console.error('打开文件失败：', error)
    }
    return false
})
