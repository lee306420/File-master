const fs = require('fs')
const path = require('path')
const { BrowserWindow, dialog, net } = require('electron')
const { getStoragePath } = require('./storage')
const { 
  copyFolder,
  getFolderSize,
  deleteFile 
} = require('./file-handlers')
const { getTypeFolderName, checkIfCodeProject } = require('./utils')

/**
 * 检查网络连接状态
 * @returns {Promise<boolean>} 如果网络连接正常则返回true
 */
async function checkNetworkConnectivity() {
  return new Promise((resolve) => {
    const request = net.request('https://www.baidu.com')
    
    request.on('response', () => {
      resolve(true)
    })
    
    request.on('error', () => {
      resolve(false)
    })
    
    request.end()
  })
}

/**
 * 从URL导入文件
 * @param {string} url 文件URL
 * @returns {Promise<object|null>} 导入的文件信息
 */
async function importFromUrl(url) {
  try {
    // 检查网络连接
    const isConnected = await checkNetworkConnectivity()
    if (!isConnected) {
      throw new Error('无网络连接')
    }
    
    const storagePath = getStoragePath()
    if (!storagePath) {
      throw new Error('请先设置存储路径')
    }
    
    // 从URL获取文件名
    const fileName = path.basename(new URL(url).pathname)
    if (!fileName) {
      throw new Error('无效的URL')
    }
    
    // 确定文件类型
    const fileType = path.extname(fileName).toLowerCase()
    let typeFolder = getTypeFolderName(fileType)
    
    if (!typeFolder) {
      console.warn('未知文件类型:', fileType)
      return null
    }
    
    const targetDir = path.join(storagePath, typeFolder)
    // 确保目标目录存在
    await fs.promises.mkdir(targetDir, { recursive: true })
    
    const targetPath = path.join(targetDir, fileName)
    
    // 下载文件
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(targetPath)
      
      const request = net.request(url)
      
      request.on('response', (response) => {
        // 检查状态码
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败，状态码: ${response.statusCode}`))
          return
        }
        
        response.pipe(file)
        
        file.on('finish', async () => {
          file.close()
          
          try {
            const stats = await fs.promises.stat(targetPath)
            
            resolve({
              path: targetPath,
              name: fileName,
              size: stats.size,
              type: fileType,
              lastModified: stats.mtime
            })
          } catch (error) {
            reject(error)
          }
        })
      })
      
      request.on('error', (error) => {
        fs.unlink(targetPath, () => {}) // 删除不完整文件
        reject(error)
      })
      
      file.on('error', (error) => {
        fs.unlink(targetPath, () => {}) // 删除不完整文件
        reject(error)
      })
      
      // 发送请求
      request.end()
    })
  } catch (error) {
    console.error('从URL导入文件失败:', error)
    throw error
  }
}

/**
 * 从剪贴板导入文件
 * @param {BrowserWindow} win 窗口实例
 * @returns {Promise<object|null>} 导入的文件信息
 */
async function importFromClipboard(win) {
  try {
    const storagePath = getStoragePath()
    if (!storagePath) {
      throw new Error('请先设置存储路径')
    }
    
    // 读取剪贴板内容
    const clipboard = win.webContents.executeJavaScript(`
      (async () => {
        try {
          const items = await navigator.clipboard.read();
          const types = [];
          for (const item of items) {
            for (const type of item.types) {
              types.push(type);
            }
          }
          return types;
        } catch (e) {
          return [];
        }
      })()
    `)
    
    // 检查剪贴板内容类型
    const clipboardTypes = await clipboard
    
    if (clipboardTypes.includes('image/png') || clipboardTypes.includes('image/jpeg')) {
      // 处理图片
      const imageData = await win.webContents.executeJavaScript(`
        (async () => {
          try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
              if (item.types.includes('image/png')) {
                const blob = await item.getType('image/png');
                return await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({
                    data: reader.result,
                    type: 'image/png',
                    ext: '.png'
                  });
                  reader.readAsDataURL(blob);
                });
              } else if (item.types.includes('image/jpeg')) {
                const blob = await item.getType('image/jpeg');
                return await new Promise((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve({
                    data: reader.result,
                    type: 'image/jpeg',
                    ext: '.jpg'
                  });
                  reader.readAsDataURL(blob);
                });
              }
            }
            return null;
          } catch (e) {
            console.error(e);
            return null;
          }
        })()
      `)
      
      if (imageData) {
        // 生成文件名
        const date = new Date()
        const fileName = `clipboard_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}${imageData.ext}`
        
        // 保存图片
        const targetDir = path.join(storagePath, 'images')
        await fs.promises.mkdir(targetDir, { recursive: true })
        
        const targetPath = path.join(targetDir, fileName)
        
        // 将Base64数据转换为文件
        const base64Data = imageData.data.replace(/^data:image\/(png|jpeg);base64,/, '')
        await fs.promises.writeFile(targetPath, base64Data, 'base64')
        
        const stats = await fs.promises.stat(targetPath)
        
        return {
          path: targetPath,
          name: fileName,
          size: stats.size,
          type: imageData.ext,
          lastModified: stats.mtime
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('从剪贴板导入失败:', error)
    return null
  }
}

/**
 * 处理拖放文件导入
 * @param {string[]} filePaths 文件路径数组
 * @returns {Promise<object[]>} 导入的文件信息数组
 */
async function handleDroppedFiles(filePaths) {
  try {
    // 首先检查存储路径
    const storagePath = getStoragePath()
    
    if (!storagePath) {
      throw new Error('请先设置存储路径')
    }
    
    const files = await Promise.all(filePaths.map(async (filePath) => {
      try {
        const stats = await fs.promises.stat(filePath)
        const fileName = path.basename(filePath)
        
        // 处理代码项目文件夹
        if (stats.isDirectory()) {
          // 检查是否为代码项目
          const isProject = await checkIfCodeProject(filePath)
          
          const targetCategory = isProject ? 'code' : 'folders'
          const targetDir = path.join(storagePath, targetCategory, fileName)
          
          // 如果目标文件夹已存在，先删除它
          if (fs.existsSync(targetDir)) {
            await deleteFile(targetDir)
          }
          
          // 创建目标目录
          await fs.promises.mkdir(targetDir, { recursive: true })
          
          // 复制文件夹内容
          await copyFolder(filePath, targetDir)
          
          const size = await getFolderSize(targetDir)
          
          return {
            path: targetDir,
            name: fileName,
            size: size,
            type: isProject ? '.project' : 'folder',
            lastModified: stats.mtime,
            isProject: isProject
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
        console.error('处理拖放文件失败:', filePath, error)
        return null
      }
    }))
    
    // 过滤掉失败的文件
    return files.filter(file => file !== null)
  } catch (error) {
    console.error('处理拖放文件失败:', error)
    throw error
  }
}

module.exports = {
  importFromUrl,
  importFromClipboard,
  handleDroppedFiles
} 