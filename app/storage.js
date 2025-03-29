const { app } = require('electron')
const path = require('path')
const fs = require('fs')

/**
 * 获取配置文件路径
 * @returns {string} 配置文件路径
 */
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

/**
 * 获取存储路径
 * @returns {string|null} 存储路径或null（如果未设置）
 */
function getStoragePath() {
  const configPath = getConfigPath()
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      return config.storagePath
    }
  } catch (error) {
    console.error('读取配置文件失败：', error)
  }
  return null
}

/**
 * 保存存储路径
 * @param {string} storagePath 要保存的存储路径
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveStoragePath(storagePath) {
  try {
    const configPath = getConfigPath()
    const configDir = path.dirname(configPath)
    
    if (!fs.existsSync(configDir)) {
      await fs.promises.mkdir(configDir, { recursive: true })
    }

    const config = { storagePath }
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2))
    return true
  } catch (error) {
    console.error('保存存储路径失败：', error)
    return false
  }
}

/**
 * 获取应用配置目录路径
 * @returns {string|null} 应用配置目录路径或null（如果未设置）
 */
async function getAppConfigPath() {
  const storagePath = getStoragePath()
  if (!storagePath) return null
  
  const configPath = path.join(storagePath, 'config')
  if (!fs.existsSync(configPath)) {
    await fs.promises.mkdir(configPath, { recursive: true })
  }
  return configPath
}

/**
 * 获取用户数据路径
 * @returns {string} 用户数据路径
 */
function getUserDataPath() {
  return app.getPath('userData')
}

module.exports = {
  getConfigPath,
  getStoragePath,
  saveStoragePath,
  getAppConfigPath,
  getUserDataPath
} 