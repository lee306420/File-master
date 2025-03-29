import { escapeHtml, formatTime } from './utils.js'
import { generateProjectPreview } from './file-handler.js'

/**
 * 生成图片预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateImagePreview(file) {
    return `
        <div class="image-preview">
            <img src="file://${file.path}" alt="${file.name}" style="width: 100%; height: 150px; object-fit: cover;">
            <div class="image-overlay">
                <div class="image-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成视频预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateVideoPreview(file) {
    return `
        <div class="video-preview">
            <video src="file://${file.path}" style="width: 100%; height: 150px; object-fit: cover;"></video>
            <div class="video-overlay">
                <div class="video-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成音频预览
 * @param {Object} file 文件对象
 * @param {HTMLElement} card 卡片元素
 * @returns {string} HTML 预览代码
 */
function generateAudioPreview(file, card) {
    const preview = `
        <div class="audio-preview">
            <div class="audio-controls">
                <i class="audio-play-icon">▶️</i>
                <div class="audio-info">
                    <div class="audio-format">${file.type.substring(1).toUpperCase()}</div>
                    <div class="audio-time">00:00</div>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
            <div class="audio-progress">
                <div class="progress-bar" style="width: 0%"></div>
            </div>
            <audio style="display: none;">
                <source src="file://${file.path}" type="audio/${file.type.substring(1)}">
            </audio>
        </div>`

    // 在卡片添加到 DOM 后再设置音频相关的事件监听
    setTimeout(() => {
        const audioPreview = card.querySelector('.audio-preview')
        if (!audioPreview) return

        const audio = audioPreview.querySelector('audio')
        const playIcon = audioPreview.querySelector('.audio-play-icon')
        const progressBar = audioPreview.querySelector('.progress-bar')
        const timeDisplay = audioPreview.querySelector('.audio-time')
        const progressContainer = audioPreview.querySelector('.audio-progress')

        // 播放/暂停切换
        playIcon.addEventListener('click', () => {
            if (audio.paused) {
                audio.play()
                playIcon.textContent = '⏸️'
            } else {
                audio.pause()
                playIcon.textContent = '▶️'
            }
        })

        // 更新进度条和时间显示
        audio.addEventListener('timeupdate', () => {
            const progress = (audio.currentTime / audio.duration) * 100
            progressBar.style.width = `${progress}%`
            timeDisplay.textContent = formatTime(audio.currentTime)
        })

        // 音频加载完成后显示总时长
        audio.addEventListener('loadedmetadata', () => {
            timeDisplay.textContent = formatTime(audio.duration)
        })

        // 点击进度条跳转
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect()
            const pos = (e.clientX - rect.left) / rect.width
            audio.currentTime = pos * audio.duration
        })

        // 音频播放结束时重置图标
        audio.addEventListener('ended', () => {
            playIcon.textContent = '▶️'
            progressBar.style.width = '0%'
            timeDisplay.textContent = formatTime(audio.duration)
        })
    }, 0)

    return preview
}

/**
 * 生成代码预览
 * @param {Object} file 文件对象
 * @returns {Promise<string>} HTML 预览代码
 */
async function generateCodePreview(file) {
    if (file.type === '.project') {
        // 项目预览 - 使用完全不同的结构和样式
        const previewContent = await generateProjectPreview(file.path)
        return `
            <div class="project-preview">
                <div class="project-header">
                    <div class="project-icon">📁</div>
                    <div class="project-title">项目: ${file.name}</div>
                </div>
                <div class="project-info">
                    <div class="project-details">
                        ${previewContent}
                    </div>
                </div>
                <div class="project-overlay">
                    <div class="project-controls">
                        <button class="open-file-btn" data-path="${file.path}">
                            <i class="open-file-icon">📄</i>
                            打开项目
                        </button>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>
            </div>`
    } else {
        // 单文件代码预览
        try {
            const fileContent = await window.electronAPI.readFileContent(file.path)
            return `
                <div class="code-preview">
                    <div class="code-type">${file.type.slice(1).toUpperCase()}</div>
                    <pre class="code-content">${fileContent ? escapeHtml(fileContent) + '...' : '无法读取文件内容'}</pre>
                    <div class="code-overlay">
                        <button class="open-file-btn" data-path="${file.path}">
                            <i class="open-file-icon">📄</i>
                            打开
                        </button>
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        } catch (error) {
            return `
                <div class="code-preview">
                    <div class="code-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="code-content">无法读取文件内容</div>
                    <div class="code-overlay">
                        <button class="open-file-btn" data-path="${file.path}">
                            <i class="open-file-icon">📄</i>
                            打开
                        </button>
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        }
    }
}

/**
 * 生成图标预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateIconPreview(file) {
    let imgSrc = `file://${file.path}`
    
    // 如果是 icns 文件且有预览图路径，使用预览图
    if (file.type === '.icns' && file.previewPath) {
        imgSrc = `file://${file.previewPath}`
    }
    
    return `
        <div class="note-preview icon-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="icon-content">
                    <img src="${imgSrc}" alt="${file.name}" style="width: auto; height: 100px; object-fit: contain;">
                </div>
            </div>
            <div class="note-overlay">
                <div class="note-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成文档预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateDocumentPreview(file) {
    let previewIcon = '📄'  // 默认文档图标
    if (file.type === '.pdf') {
        previewIcon = '📕'  // PDF 特殊图标
    }
    
    return `
        <div class="note-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="file-icon">${previewIcon}</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <div class="note-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成PPT预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generatePptPreview(file) {
    return `
        <div class="note-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="file-icon">📊</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <div class="note-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成主题预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateThemePreview(file) {
    return `
        <div class="note-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="file-icon">🎨</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成AE项目预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateAePreview(file) {
    // 根据文件类型选择不同的图标
    const fileIcon = file.type === '.zip' ? '📦' : '🎬'  // zip用包裹图标，aep用视频图标
    
    return `
        <div class="note-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <div class="note-controls">
                    <button class="open-file-btn" data-path="${file.path}">
                        <i class="open-file-icon">📄</i>
                        打开
                    </button>
                </div>
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成3D模型预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateModelPreview(file) {
    return `
        <div class="note-preview model-preview">
            <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
            <div class="note-content">
                <div class="file-icon">🎮</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

/**
 * 生成文件夹预览
 * @param {Object} file 文件对象
 * @returns {string} HTML 预览代码
 */
function generateFolderPreview(file) {
    return `
        <div class="note-preview folder-preview">
            <div class="note-type">文件夹</div>
            <div class="note-content">
                <div class="folder-icon">📁</div>
                <div class="file-name">${file.name}</div>
            </div>
            <div class="note-overlay">
                <button class="open-folder-btn" data-path="${file.path}">
                    <i class="folder-open-icon">📂</i>
                    打开位置
                </button>
            </div>
        </div>`
}

export {
    generateImagePreview,
    generateVideoPreview,
    generateAudioPreview,
    generateCodePreview,
    generateIconPreview,
    generateDocumentPreview,
    generatePptPreview,
    generateThemePreview,
    generateAePreview,
    generateModelPreview,
    generateFolderPreview
} 