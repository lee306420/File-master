/**
 * 格式化文件大小
 * @param {number} bytes 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 转义HTML字符
 * @param {string} unsafe 不安全的HTML字符串
 * @returns {string} 转义后的HTML字符串
 */
function escapeHtml(unsafe) {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

/**
 * 格式化时间（秒转为分:秒格式）
 * @param {number} seconds 秒数
 * @returns {string} 格式化后的时间字符串 (mm:ss)
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

/**
 * 显示确认对话框
 * @param {string} message 对话框消息
 * @returns {Promise<boolean>} 用户确认结果
 */
function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const confirmDialog = document.getElementById('confirm-dialog')
        const confirmMessage = confirmDialog.querySelector('.confirm-message')
        const cancelBtn = confirmDialog.querySelector('.cancel-btn')
        const confirmBtn = confirmDialog.querySelector('.confirm-btn')

        confirmMessage.textContent = message
        confirmDialog.style.display = 'block'

        const handleCancel = () => {
            confirmDialog.style.display = 'none'
            resolve(false)
            cleanup()
        }

        const handleConfirm = () => {
            confirmDialog.style.display = 'none'
            resolve(true)
            cleanup()
        }

        const handleOutsideClick = (e) => {
            if (e.target === confirmDialog) {
                handleCancel()
            }
        }

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                handleCancel()
            }
        }

        const cleanup = () => {
            cancelBtn.removeEventListener('click', handleCancel)
            confirmBtn.removeEventListener('click', handleConfirm)
            confirmDialog.removeEventListener('click', handleOutsideClick)
            window.removeEventListener('keydown', handleEscape)
        }

        cancelBtn.addEventListener('click', handleCancel)
        confirmBtn.addEventListener('click', handleConfirm)
        confirmDialog.addEventListener('click', handleOutsideClick)
        window.addEventListener('keydown', handleEscape)
    })
}

/**
 * 获取文件对话框过滤器
 * @param {string} category 文件类别
 * @returns {Array} 过滤器配置
 */
function getFileFilters(category) {
    const filters = [
        { name: '所有支持的文件', extensions: ['mp4', 'avi', 'mov', 'jpg', 'png', 'gif', 'mp3', 'wav', 'm4a', 'ogg', 'flac', 'js', 'py', 'java', 'cpp', 'html', 'css'] }
    ]

    switch(category) {
        case 'videos':
            filters.push({ name: '视频', extensions: ['mp4', 'avi', 'mov'] })
            break
        case 'photos':
            filters.push({ name: '图片', extensions: ['jpg', 'png', 'gif'] })
            break
        case 'audio':
            filters.push({ name: '音频', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] })
            break
        case 'code':
            filters.push({ name: '代码', extensions: ['js', 'py', 'java', 'cpp', 'html', 'css'] })
            break
        case 'icons':
            filters.push({ name: '图标', extensions: ['ico', 'icns', 'svg'] })
            break
        case 'notes':
            filters.push({ name: '笔记', extensions: ['txt', 'md', 'doc', 'docx', 'pdf'] })
            break
        case 'ppt':
            filters.push({ name: 'PPT', extensions: ['ppt', 'pptx'] })
            break
        case 'ae':
            filters.push({ name: 'AE项目', extensions: ['aep', 'zip'] })
            break
        case 'models':
            filters.push({ name: '3D模型', extensions: ['fbx', 'obj', 'max', 'c4d', 'blend', '3ds', 'dae', 'pth', 'glb'] })
            break
    }

    return filters
}

/**
 * 获取文件分类
 * @param {string} fileType 文件类型
 * @returns {string} 文件所属分类
 */
function getFileCategory(fileType) {
    if (fileType === 'folder') return 'folders'
    if (fileType === '.project') return 'code'
    
    const type = fileType.toLowerCase()
    if (['.mp4', '.avi', '.mov'].includes(type)) return 'videos'
    if (['.jpg', '.png', '.gif'].includes(type)) return 'photos'
    if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(type)) return 'audio'
    if (['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(type)) return 'code'
    if (['.ico', '.icns', '.svg'].includes(type)) return 'icons'
    if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(type)) return 'notes'
    if (['.ppt', '.pptx'].includes(type)) return 'ppt'
    if (['.aep', '.zip'].includes(type)) return 'ae'
    if (['.fbx', '.obj', '.max', '.c4d', '.blend', '.3ds', '.dae', '.pth', '.glb'].includes(type)) return 'models'
    
    return 'other'
}

export {
    formatFileSize,
    escapeHtml,
    formatTime,
    showConfirmDialog,
    getFileFilters,
    getFileCategory
} 