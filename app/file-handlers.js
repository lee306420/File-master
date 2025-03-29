const fs = require('fs')
const path = require('path')
const { shell } = require('electron')
const { getStoragePath } = require('./storage')

/**
 * 打开文件所在位置
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openPath(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
      return true
    }
  } catch (error) {
    console.error('打开文件位置失败：', error)
  }
  return false
}

/**
 * 打开文件
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      await shell.openPath(filePath)
      return true
    }
  } catch (error) {
    console.error('打开文件失败：', error)
  }
  return false
}

/**
 * 打开存储位置
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openStorageLocation() {
  const storagePath = getStoragePath()
  if (storagePath && fs.existsSync(storagePath)) {
    await shell.openPath(storagePath)
    return true
  }
  return false
}

/**
 * 打开用户数据目录
 * @param {string} userDataPath 用户数据路径
 * @returns {Promise<boolean>} 是否成功打开
 */
async function openUserDataDir(userDataPath) {
  try {
    await shell.openPath(userDataPath)
    return true
  } catch (error) {
    console.error('打开用户数据目录失败：', error)
    return false
  }
}

/**
 * 读取文件内容（仅预览）
 * @param {string} filePath 文件路径
 * @returns {Promise<string|null>} 文件内容或null
 */
async function readFileContent(filePath) {
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
}

/**
 * 读取完整文件内容
 * @param {string} filePath 文件路径
 * @returns {Promise<string|null>} 文件内容或null
 */
async function readFullFileContent(filePath) {
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
}

/**
 * 删除文件
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>} 是否成功删除
 */
async function deleteFile(filePath) {
  try {
    // 确保路径存在且有效
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
    return false
  }
}

/**
 * 复制文件夹
 * @param {string} src 源文件夹路径
 * @param {string} dest 目标文件夹路径
 */
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

/**
 * 获取文件夹大小
 * @param {string} folderPath 文件夹路径
 * @returns {Promise<number>} 文件夹大小（字节）
 */
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

module.exports = {
  openPath,
  openFile,
  openStorageLocation,
  openUserDataDir,
  readFileContent,
  readFullFileContent,
  deleteFile,
  copyFolder,
  getFolderSize
} 