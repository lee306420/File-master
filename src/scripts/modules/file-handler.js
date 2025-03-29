import { showConfirmDialog } from './utils.js'

/**
 * 初始化存储路径
 * @param {HTMLElement} currentPathDiv 当前路径显示元素
 * @param {HTMLElement} importBtn 导入按钮
 * @returns {Promise<Array>} 现有文件列表
 */
async function initStoragePath(currentPathDiv, importBtn) {
    const storagePath = await window.electronAPI.getStoragePath()
    if (storagePath) {
        currentPathDiv.textContent = `当前位置：${storagePath}`
        importBtn.disabled = false
        
        // 获取配置目录路径
        const configPath = await window.electronAPI.getConfigPath()
        if (configPath) {
            console.log('配置目录路径:', configPath)
        }
        
        // 加载现有文件
        return await window.electronAPI.loadExistingFiles()
    } else {
        currentPathDiv.textContent = '未设置存储位置'
        importBtn.disabled = true
        return []
    }
}

/**
 * 设置存储路径
 * @param {HTMLElement} currentPathDiv 当前路径显示元素
 * @param {HTMLElement} importBtn 导入按钮
 * @param {Function} displayFiles 显示文件的函数
 * @returns {Promise<Array>} 更新后的文件列表
 */
async function setStoragePath(currentPathDiv, importBtn, displayFiles) {
    try {
        console.log('正在设置存储路径...')
        const path = await window.electronAPI.selectStoragePath()
        console.log('获取到的存储路径:', path)
        
        if (path) {
            currentPathDiv.textContent = `当前位置：${path}`
            importBtn.disabled = false
            console.log('正在重新加载文件...')
            // 重新加载文件
            const allFiles = await window.electronAPI.loadExistingFiles()
            displayFiles(allFiles)
            console.log('文件重新加载完成')
            return allFiles
        }
        return null
    } catch (error) {
        console.error('设置存储路径出错：', error)
        alert(`设置存储路径失败: ${error.message}`)
        return null
    }
}

/**
 * 导入文件
 * @param {HTMLElement} importBtn 导入按钮
 * @param {string} currentCategory 当前分类
 * @param {Function} displayFiles 显示文件的函数
 * @returns {Promise<Array>} 更新后的文件列表
 */
async function importFiles(importBtn, currentCategory, displayFiles) {
    try {
        // 显示加载状态
        importBtn.disabled = true
        importBtn.textContent = '导入中...'
        
        // 导入当前分类
        const files = await window.electronAPI.openFileDialog(currentCategory)
        if (files && files.length > 0) {
            // 重新加载所有文件
            const allFiles = await window.electronAPI.loadExistingFiles()
            displayFiles(allFiles)
            return allFiles
        }
        return null
    } catch (error) {
        if (error.message === '请先设置存储路径') {
            alert('请先设置存储路径')
        } else {
            console.error('导入文件出错：', error)
            alert('导入文件失败：' + (error.message || '未知错误'))
        }
        return null
    } finally {
        // 恢复按钮状态
        importBtn.disabled = false
        importBtn.textContent = '导入文件'
    }
}

/**
 * 删除文件
 * @param {Object} file 文件对象
 * @param {Array} allFiles 所有文件列表
 * @param {Function} displayFiles 显示文件的函数
 * @returns {Promise<Array>} 更新后的文件列表
 */
async function deleteFile(file, allFiles, displayFiles) {
    // 显示确认对话框
    if (!await showConfirmDialog(`确定要删除 "${file.name}" 吗？`)) {
        return allFiles
    }
    
    try {
        const success = await window.electronAPI.deleteFile(file.path)
        if (success) {
            // 从数组中移除该文件
            const updatedFiles = allFiles.filter(f => f.path !== file.path)
            // 重新显示文件列表
            displayFiles(updatedFiles)
            return updatedFiles
        } else {
            alert('删除文件失败')
            return allFiles
        }
    } catch (error) {
        console.error('删除文件失败:', error)
        alert('删除文件失败')
        return allFiles
    }
}

/**
 * 打开文件
 * @param {string} filePath 文件路径
 */
async function openFile(filePath) {
    try {
        await window.electronAPI.openFile(filePath)
    } catch (error) {
        console.error('打开文件失败:', error)
        alert('打开文件失败')
    }
}

/**
 * 打开文件所在位置
 * @param {string} filePath 文件路径
 */
async function openFilePath(filePath) {
    try {
        await window.electronAPI.openPath(filePath)
    } catch (error) {
        console.error('打开文件位置失败：', error)
        alert('打开文件位置失败')
    }
}

/**
 * 打开存储位置
 */
async function openStorageLocation() {
    try {
        const success = await window.electronAPI.openStorageLocation()
        if (!success) {
            alert('存储位置不存在或尚未设置')
        }
    } catch (error) {
        console.error('打开存储位置时出错：', error)
        alert('打开存储位置失败')
    }
}

/**
 * 打开用户数据目录
 */
async function openUserDataLocation() {
    try {
        const configPath = await window.electronAPI.getConfigPath()
        if (configPath) {
            await window.electronAPI.openPath(configPath)
        } else {
            alert('请先设置存储位置')
        }
    } catch (error) {
        console.error('打开配置目录时出错：', error)
        alert('打开配置目录失败')
    }
}

/**
 * 生成项目预览
 * @param {string} projectPath 项目路径
 * @returns {Promise<string>} 项目预览HTML
 */
async function generateProjectPreview(projectPath) {
    try {
        const stats = await window.electronAPI.getProjectStats(projectPath)
        return `
            <div class="stat-row">
                <span class="stat-label">文件总数:</span>
                <span class="stat-value">${stats.fileCount}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">代码行数:</span>
                <span class="stat-value">${stats.lineCount.toLocaleString()}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">主要语言:</span>
                <span class="stat-value stat-language">${stats.mainLanguage}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">更新时间:</span>
                <span class="stat-value">${new Date().toLocaleDateString()}</span>
            </div>
        `
    } catch (error) {
        console.error('生成项目预览失败:', error)
        return '<div class="stat-error">无法加载项目信息</div>'
    }
}

export {
    initStoragePath,
    setStoragePath,
    importFiles,
    deleteFile,
    openFile,
    openFilePath,
    openStorageLocation,
    openUserDataLocation,
    generateProjectPreview
} 