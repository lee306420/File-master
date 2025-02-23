// 在文件顶部添加 formatFileSize 函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// escapeHtml 函数保持不变
function escapeHtml(unsafe) {
    if (!unsafe) return ''
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

// 添加确认对话框函数
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

document.addEventListener('DOMContentLoaded', async () => {
    const importBtn = document.getElementById('import')
    const materialGrid = document.getElementById('material-grid')
    const storagePathBtn = document.getElementById('storage-path')
    const currentPathDiv = document.getElementById('current-path')
    const videosBtn = document.getElementById('videos')
    const photosBtn = document.getElementById('photos')
    const audioBtn = document.getElementById('audio')
    const tagsModal = document.getElementById('tags-modal')
    const manageTagsBtn = document.getElementById('manage-tags')
    const closeModalBtn = document.querySelector('.close')
    const addTagBtn = document.getElementById('add-tag-btn')
    const newTagInput = document.getElementById('new-tag-input')
    const tagsFilterContainer = document.getElementById('tags-filter')
    const openStorageBtn = document.getElementById('open-storage')
    const searchInput = document.getElementById('search')
    const codeBtn = document.getElementById('code')
    const foldersBtn = document.getElementById('folders')
    const iconsBtn = document.getElementById('icons')
    const notesBtn = document.getElementById('notes')
    const pptBtn = document.getElementById('ppt')
    const themesBtn = document.getElementById('themes')
    const aeBtn = document.getElementById('ae')
    const modelsBtn = document.getElementById('models')
    const openUserDataBtn = document.getElementById('open-user-data')
    
    // 存储所有文件和标签
    let allFiles = []
    let allTags = {}  // 使用对象存储每个分类的标签
    let selectedTags = {}  // 使用对象存储每个分类的选中标签
    let currentCategory = 'all'

    // 初始化时获取存储路径和加载现有文件
    async function initStoragePath() {
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
            allFiles = await window.electronAPI.loadExistingFiles()
            displayFiles(allFiles)
        } else {
            currentPathDiv.textContent = '未设置存储位置'
            importBtn.disabled = true
        }
    }

    // 清空素材网格
    function clearMaterialGrid() {
        materialGrid.innerHTML = ''
    }

    // 初始化标签管理
    async function initTags() {
        const categories = ['folders', 'videos', 'photos', 'audio', 'code', 'icons', 'notes', 'ppt', 'ae', 'models']
        for (const category of categories) {
            allTags[category] = await window.electronAPI.getTags(category) || []
            selectedTags[category] = []
        }
        updateTagsFilter()
    }

    // 更新标签筛选区域
    function updateTagsFilter() {
        // 如果没有选择分类或者是全部分类标签区域
        if (!currentCategory || currentCategory === 'all') {
            tagsFilterContainer.innerHTML = ''
            return
        }
        
        // 只显示当前分类的标签
        tagsFilterContainer.innerHTML = (allTags[currentCategory] || []).map(tag => `
            <span class="tag ${selectedTags[currentCategory].includes(tag) ? 'active' : ''}" data-tag="${tag}">
                ${tag}
            </span>
        `).join('')

        // 添加标签点击事件
        tagsFilterContainer.querySelectorAll('.tag').forEach(tagElement => {
            tagElement.addEventListener('click', () => {
                const mainContent = document.querySelector('.main-content')
                const scrollPosition = mainContent.scrollTop
                
                const tag = tagElement.dataset.tag
                if (selectedTags[currentCategory].includes(tag)) {
                    selectedTags[currentCategory] = selectedTags[currentCategory].filter(t => t !== tag)
                    tagElement.classList.remove('active')
                } else {
                    selectedTags[currentCategory].push(tag)
                    tagElement.classList.add('active')
                }
                
                displayFiles(allFiles).then(() => {
                    requestAnimationFrame(() => {
                        mainContent.scrollTop = scrollPosition
                    })
                })
            })
        })
    }

    // 更新标签管理列表
    async function updateTagsList() {
        const tagsList = document.getElementById('tags-list')
        const tags = allTags[currentCategory] || []
        
        tagsList.innerHTML = tags.map(tag => `
            <div class="tag-list-item">
                <div class="tag-content">
                    <span class="tag-name">${tag}</span>
                    <div class="tag-actions">
                        <button class="edit-tag-btn" data-tag="${tag}">✎</button>
                        <button class="delete-tag-btn" data-tag="${tag}">×</button>
                    </div>
                </div>
                <div class="tag-edit-form" style="display: none;">
                    <input type="text" class="edit-tag-input" value="${tag}">
                    <div class="edit-actions">
                        <button class="save-edit-btn">保存</button>
                        <button class="cancel-edit-btn">取消</button>
                    </div>
                </div>
            </div>
        `).join('')

        // 为每个标签添加编辑和删除功能
        tagsList.querySelectorAll('.tag-list-item').forEach(item => {
            const tagName = item.querySelector('.tag-name').textContent
            const editBtn = item.querySelector('.edit-tag-btn')
            const deleteBtn = item.querySelector('.delete-tag-btn')
            const tagContent = item.querySelector('.tag-content')
            const tagEditForm = item.querySelector('.tag-edit-form')
            const editInput = item.querySelector('.edit-tag-input')
            const saveEditBtn = item.querySelector('.save-edit-btn')
            const cancelEditBtn = item.querySelector('.cancel-edit-btn')

            // 编辑按钮点击事件
            editBtn.addEventListener('click', () => {
                tagContent.style.display = 'none'
                tagEditForm.style.display = 'flex'
                editInput.focus()
            })

            // 保存编辑
            saveEditBtn.addEventListener('click', async () => {
                const newTagName = editInput.value.trim()
                if (!newTagName) {
                    alert('标签名称不能为空')
                    return
                }

                if (newTagName === tagName) {
                    tagContent.style.display = 'flex'
                    tagEditForm.style.display = 'none'
                    return
                }

                if (allTags[currentCategory].includes(newTagName)) {
                    alert('标签已存在')
                    return
                }

                try {
                    // 更新标签数组
                    const index = allTags[currentCategory].indexOf(tagName)
                    allTags[currentCategory][index] = newTagName

                    // 更新所有使用该标签的文件
                    const files = allFiles.filter(file => getFileCategory(file.type) === currentCategory)
                    for (const file of files) {
                        const fileTags = await window.electronAPI.getFileTags(currentCategory, file.path) || []
                        if (fileTags.includes(tagName)) {
                            const newTags = fileTags.map(t => t === tagName ? newTagName : t)
                                    await window.electronAPI.saveFileTags(currentCategory, file.path, newTags)
                                }
                            }

                    // 保存更新后的标签列表
                    await window.electronAPI.saveTags(currentCategory, allTags[currentCategory])
                    updateTagsList()
                    updateTagsFilter()
                    displayFiles(allFiles)
                } catch (error) {
                    console.error('更新标签失败：', error)
                    alert('更新标签失败')
                }
            })

            // 取消编辑
            cancelEditBtn.addEventListener('click', () => {
                tagContent.style.display = 'flex'
                tagEditForm.style.display = 'none'
                editInput.value = tagName
            })

            // 删除标签
            deleteBtn.addEventListener('click', async () => {
                if (!await showConfirmDialog(`确定要删除标签"${tagName}"吗？`)) {
                    return
                }

                try {
                    // 标签列表中移除
                    allTags[currentCategory] = allTags[currentCategory].filter(t => t !== tagName)
                        await window.electronAPI.saveTags(currentCategory, allTags[currentCategory])
                        
                    // 从所有使用该标签的文件中移除
                    const files = allFiles.filter(file => getFileCategory(file.type) === currentCategory)
                    for (const file of files) {
                        const fileTags = await window.electronAPI.getFileTags(currentCategory, file.path) || []
                        if (fileTags.includes(tagName)) {
                            const newTags = fileTags.filter(t => t !== tagName)
                            await window.electronAPI.saveFileTags(currentCategory, file.path, newTags)
                        }
                    }

                        updateTagsList()
                    updateTagsFilter()
                        displayFiles(allFiles)
                    } catch (error) {
                        console.error('删除标签失败：', error)
                        alert('删除标签失败')
                }
            })
        })
    }

    // 在 displayFiles 函数中添加文件数量统计
    function updateCategoryCounts(files) {
        const counts = {
            folders: 0,
            videos: 0,
            photos: 0,
            audio: 0,
            code: 0,
            icons: 0,
            notes: 0,
            ppt: 0,
            ae: 0,
            models: 0
        }

        files.forEach(file => {
            const type = file.type.toLowerCase()
            // 添加对 .project 类型的特殊处理
            if (type === '.project' || ['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(type)) {
                counts.code++
            } else if (type === 'folder') {
                counts.folders++
            } else if (['.mp4', '.avi', '.mov'].includes(type)) {
                counts.videos++
            } else if (['.jpg', '.png', '.gif'].includes(type)) {
                counts.photos++
            } else if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(type)) {
                counts.audio++
            } else if (['.ico', '.icns', '.svg'].includes(type)) {
                counts.icons++
            } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(type)) {
                counts.notes++
            } else if (['.ppt', '.pptx'].includes(type)) {
                counts.ppt++
            } else if (['.aep', '.zip'].includes(type)) {
                counts.ae++
            } else if (['.fbx', '.obj', '.max', '.c4d', '.blend', '.3ds', '.dae', '.pth', '.glb'].includes(type)) {
                counts.models++
            }
        })

        // 更新 UI 中的计数
        document.querySelector('#folders .count').textContent = counts.folders
        document.querySelector('#videos .count').textContent = counts.videos
        document.querySelector('#photos .count').textContent = counts.photos
        document.querySelector('#audio .count').textContent = counts.audio
        document.querySelector('#code .count').textContent = counts.code
        document.querySelector('#icons .count').textContent = counts.icons
        document.querySelector('#notes .count').textContent = counts.notes
        document.querySelector('#ppt .count').textContent = counts.ppt
        document.querySelector('#ae .count').textContent = counts.ae
        document.querySelector('#models .count').textContent = counts.models

        // 添加调试日志
        console.log('文件统计:', {
            总文件数: files.length,
            分类统计: counts,
            代码文件: files.filter(f => f.type === '.project' || ['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(f.type.toLowerCase()))
        })
    }

    // 添加搜索功能
    function searchFiles(files, searchTerm) {
        if (!searchTerm) return files
        
        searchTerm = searchTerm.toLowerCase()
        return files.filter(file => {
            const fileName = file.name.toLowerCase()
            const fileType = file.type.toLowerCase()
            const fileTags = file.tags || []
            
            // 搜索文件名
            if (fileName.includes(searchTerm)) return true
            
            // 搜索文件类型（去掉点号）
            if (fileType.slice(1).includes(searchTerm)) return true
            
            // 搜索标签
            if (fileTags.some(tag => tag.toLowerCase().includes(searchTerm))) return true
            
            return false
        })
    }

    // 修改 displayFiles 函数
    async function displayFiles(files) {
        // 保存当前滚动位置
        const mainContent = document.querySelector('.main-content')
        const scrollPosition = mainContent.scrollTop

        clearMaterialGrid()
        
        // 更新分类计数
        updateCategoryCounts(files)
        
        // 过滤搜索结果
        const searchTerm = searchInput.value.toLowerCase()
        let filteredFiles = files
        
        if (currentCategory !== 'all') {
            filteredFiles = filterFilesByCategory(files, currentCategory)
        }
        
        if (searchTerm) {
            filteredFiles = filteredFiles.filter(file => 
                file.name.toLowerCase().includes(searchTerm)
            )
        }
        
        // 标签筛选
        if (currentCategory !== 'all' && selectedTags[currentCategory]?.length > 0) {
                filteredFiles = await filterFilesByTags(filteredFiles, selectedTags[currentCategory])
        }
        
        // 为每个文件加载对应类的标签
        for (const file of filteredFiles) {
            try {
                const fileCategory = getFileCategory(file.type)
                if (currentCategory === 'all' || fileCategory === currentCategory) {
                    file.tags = await window.electronAPI.getFileTags(fileCategory, file.path)
                } else {
                    file.tags = []
                }
            } catch (error) {
                console.error('加载文件标签失败：', error)
                file.tags = []
            }
        }
        
        // 创建文档片段
        const fragment = document.createDocumentFragment()
        
        // 添加文件卡片
        for (const file of filteredFiles) {
            const card = await createMaterialCard(file)
            fragment.appendChild(card)
        }

        materialGrid.appendChild(fragment)

        // 恢复滚动位置
        requestAnimationFrame(() => {
            mainContent.scrollTop = scrollPosition
        })
    }

    // 修改标签筛选函数
    async function filterFilesByTags(files, selectedTags) {
        if (!selectedTags || selectedTags.length === 0) return files

        const filteredFiles = []
        for (const file of files) {
            const fileCategory = getFileCategory(file.type)
            const fileTags = await window.electronAPI.getFileTags(fileCategory, file.path) || []
            if (selectedTags.every(tag => fileTags.includes(tag))) {
                filteredFiles.push(file)
            }
        }
        return filteredFiles
    }

    // 修改 createMaterialCard 函数，添加标签功能
    async function createMaterialCard(file) {
        const card = document.createElement('div')
        card.className = 'material-card'
        
        let preview = ''
        
        // 根据文件类型生成不同的预览
        if (file.type === 'folder') {
            preview = `
                <div class="folder-preview">
                    <div class="folder-icon">📁</div>
                        <div class="folder-name">${file.name}</div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
        } else if (['.jpg', '.png', '.gif'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="image-preview">
                    <img src="file://${file.path}" alt="${file.name}" style="width: 100%; height: 150px; object-fit: cover;">
                    <div class="image-overlay">
                        <div class="image-controls">
                            <span class="fullscreen-icon">⛶</span>
                        </div>
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        } else if (['.mp4', '.avi', '.mov'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="video-preview">
                    <video src="file://${file.path}" style="width: 100%; height: 150px; object-fit: cover;"></video>
                    <div class="video-overlay">
                        <div class="video-controls">
                            <span class="fullscreen-icon">⛶</span>
                        </div>
                        <span class="play-icon"></span>
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        } else if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="audio-preview">
                    <audio src="file://${file.path}"></audio>
                    <div class="audio-controls">
                        <i class="audio-play-icon">▶</i>
                        <div class="audio-info">
                            <div class="audio-format">${file.type.slice(1).toUpperCase()}</div>
                            <div class="audio-time">00:00</div>
                        </div>
                    </div>
                    <div class="audio-progress">
                        <div class="progress-bar"></div>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
        } else if (['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(file.type.toLowerCase()) || file.type === '.project') {
            let previewContent = ''
            
            if (file.type === '.project') {
                // 项目预览
                previewContent = await generateProjectPreview(file.path)
                preview = `
                    <div class="code-preview project-preview">
                        <div class="code-type">项目</div>
                        <div class="project-info">
                            <div class="project-icon">📁</div>
                            <div class="project-details">
                                <div class="project-name">${file.name}</div>
                                <div class="project-stats">${previewContent}</div>
                            </div>
                        </div>
                        <div class="code-overlay">
                            <button class="open-folder-btn" data-path="${file.path}">
                                <i class="folder-open-icon">📂</i>
                                打开位置
                            </button>
                        </div>
                    </div>`
            } else {
                // 保持现有的单文件预览逻辑
            try {
                const fileContent = await window.electronAPI.readFileContent(file.path)
                preview = `
                    <div class="code-preview">
                        <div class="code-type">${file.type.slice(1).toUpperCase()}</div>
                        <pre class="code-content">${fileContent ? escapeHtml(fileContent) + '...' : '无法读取文件内容'}</pre>
                        <div class="code-overlay">
                            <button class="open-folder-btn" data-path="${file.path}">
                                <i class="folder-open-icon">📂</i>
                                打开位置
                            </button>
                        </div>
                    </div>`
            } catch (error) {
                preview = `
                    <div class="code-preview">
                        <div class="code-type">${file.type.slice(1).toUpperCase()}</div>
                        <div class="code-content">无法读取文件内容</div>
                    </div>`
                }
            }
        } else if (['.ico', '.icns', '.svg'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="icon-preview">
                    <div class="icon-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="icon-content">
                        <img src="file://${file.path}" alt="${file.name}" style="width: auto; height: 100px; object-fit: contain;">
                    </div>
                    <div class="icon-overlay">
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(file.type.toLowerCase())) {
            let previewIcon = '📄'  // 默认文档图标
            if (file.type === '.pdf') {
                previewIcon = '📕'  // PDF 特殊图标
            }
            
            preview = `
                <div class="note-preview">
                    <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="note-content">
                        <div class="file-icon">${previewIcon}</div>
                        <div class="file-name">${file.name}</div>
                    </div>
                    <div class="note-overlay">
                        <div class="note-controls">
                            <span class="fullscreen-icon">⛶</span>
                        </div>
                        <button class="open-folder-btn" data-path="${file.path}">
                            <i class="folder-open-icon">📂</i>
                            打开位置
                        </button>
                    </div>
                </div>`
        } else if (['.ppt', '.pptx'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="note-preview">
                    <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="note-content">
                        <div class="file-icon">📊</div>
                        <div class="file-name">${file.name}</div>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
        } else if (['.theme'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="note-preview">
                    <div class="note-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="note-content">
                        <div class="file-icon">🎨</div>
                        <div class="file-name">${file.name}</div>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
        } else if (['.aep', '.zip'].includes(file.type.toLowerCase())) {
            // 根据文件类型选择不同的图标
            const fileIcon = file.type === '.zip' ? '📦' : '🎬'  // zip用包裹图标，aep用视频图标
            
            preview = `
                <div class="ae-preview">
                    <div class="ae-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="ae-content">
                        <div class="file-icon">${fileIcon}</div>
                        <div class="file-name">${file.name}</div>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
            card.classList.add('ae-card')
        } else if (['.fbx', '.obj', '.max', '.c4d', '.blend', '.3ds', '.dae', '.pth', '.glb'].includes(file.type.toLowerCase())) {
            preview = `
                <div class="model-preview">
                    <div class="model-type">${file.type.slice(1).toUpperCase()}</div>
                    <div class="model-content">
                        <div class="file-icon">🎮</div>
                        <div class="file-name">${file.name}</div>
                    </div>
                    <button class="open-folder-btn" data-path="${file.path}">
                        <i class="folder-open-icon">📂</i>
                        打开位置
                    </button>
                </div>`
            card.classList.add('model-card')
        }

        // 添加标签容器
        let tagsHtml = ''
        if (file.tags && file.tags.length > 0) {
            tagsHtml = `
                <div class="tags-container">
                    ${file.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>`
        }

        // 修改 card.innerHTML，将删除按钮添加到 preview div 中
        card.innerHTML = `
            <div class="preview">
                <button class="delete-btn" title="删除">×</button>
                ${preview}
            </div>
            <div class="info">
                <div class="filename">${file.name}</div>
                <div class="file-meta">
                    <span class="size">${formatFileSize(file.size)}</span>
                    <span class="date">${new Date(file.lastModified).toLocaleDateString()}</span>
                </div>
                ${tagsHtml}
            </div>`

        // 添加删除按钮的事件监听
        const deleteBtn = card.querySelector('.delete-btn')
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation() // 阻止事件冒泡
            
            // 显示确认对话框
            if (!await showConfirmDialog(`确定要删除 "${file.name}" 吗？`)) {
                return
            }
            
            try {
                const success = await window.electronAPI.deleteFile(file.path)
                if (success) {
                    // 从数组中移除该文件
                    allFiles = allFiles.filter(f => f.path !== file.path)
                    // 重新显示文件列表
                    displayFiles(allFiles)
                } else {
                    alert('删除文件失败')
                }
            } catch (error) {
                console.error('删除文件失败:', error)
                alert('删除文件失败')
            }
        })

        // 添加事件监听器
        const openBtn = card.querySelector('.open-folder-btn')
        if (openBtn) {
            openBtn.addEventListener('click', async (e) => {
                e.preventDefault()
                e.stopPropagation()
                const filePath = e.currentTarget.dataset.path
                try {
                    await window.electronAPI.openPath(filePath)
                } catch (error) {
                    console.error('打开文件位置失败：', error)
                }
            })
        }

        // 添加标签管理功能
        const fileCategory = getFileCategory(file.type)
        card.addEventListener('contextmenu', async (e) => {
            e.preventDefault()
            
            try {
                // 获取当前文件标签
                const currentTags = await window.electronAPI.getFileTags(fileCategory, file.path) || []
                
                // 获取该分类下的所有可用标签
                const availableTags = allTags[fileCategory] || []
                        
                // 创建标签选择对话框
                const tagDialog = document.createElement('div')
                tagDialog.className = 'tag-dialog'
                tagDialog.style.position = 'fixed'
                tagDialog.style.left = `${e.clientX}px`
                tagDialog.style.top = `${e.clientY}px`
                
                // 创建标签选择界面
                tagDialog.innerHTML = `
                    <div class="tag-dialog-content">
                        <h3>管理标签</h3>
                        <div class="available-tags">
                            ${availableTags.map(tag => `
                                <label class="tag-item">
                                    <input type="checkbox" value="${tag}" ${currentTags.includes(tag) ? 'checked' : ''}>
                                    <span>${tag}</span>
                                </label>
                            `).join('')}
                        </div>
                        <div class="tag-dialog-buttons">
                            <button class="cancel-btn">取消</button>
                            <button class="save-btn">保存</button>
                        </div>
                    </div>
                `
                
                document.body.appendChild(tagDialog)
                
                // 添加事件处理
                const handleSave = async () => {
                    const selectedTags = Array.from(tagDialog.querySelectorAll('input:checked')).map(input => input.value)
                    await window.electronAPI.saveFileTags(fileCategory, file.path, selectedTags)
                    file.tags = selectedTags // 更新文件对象的标签
                    displayFiles(allFiles) // 刷新显示
                    tagDialog.remove()
                }
                
                const handleCancel = () => {
                    tagDialog.remove()
                }
                
                const handleClickOutside = (event) => {
                    if (!tagDialog.contains(event.target)) {
                        tagDialog.remove()
                        document.removeEventListener('click', handleClickOutside)
                    }
                }
                
                // 绑定事件
                tagDialog.querySelector('.save-btn').addEventListener('click', handleSave)
                tagDialog.querySelector('.cancel-btn').addEventListener('click', handleCancel)
                
                // 延迟添加点外部关闭事件，避免立即触发
                setTimeout(() => {
                    document.addEventListener('click', handleClickOutside)
                }, 100)
                
            } catch (error) {
                console.error('标签管理失败：', error)
            }
        })

        // 添加双击事件处理
        if (['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(file.type.toLowerCase())) {
            card.addEventListener('dblclick', async () => {
                try {
                    const codeDetailModal = document.getElementById('code-detail-modal')
                    const codeFilename = document.getElementById('code-filename')
                    const codeContent = document.getElementById('code-content')
                    
                    // 设置文件名
                    codeFilename.textContent = file.name
                    
                    // 读取完整文件内容
                    const fullContent = await window.electronAPI.readFullFileContent(file.path)
                    codeContent.textContent = fullContent || '无法读取文件内容'
                    
                    // 显示模态框
                    codeDetailModal.style.display = 'block'
                } catch (error) {
                    console.error('读取文件内容失败：', error)
                }
            })
        }

        if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(file.type.toLowerCase())) {
            // 获取音频相关元素
            const audioElement = card.querySelector('audio')
            const playIcon = card.querySelector('.audio-play-icon')
            const progressBar = card.querySelector('.progress-bar')
            const audioProgress = card.querySelector('.audio-progress')
            const audioTime = card.querySelector('.audio-time')
            
            // 添加播放/暂停功能
            playIcon.addEventListener('click', () => {
                if (audioElement.paused) {
                    audioElement.play()
                    playIcon.textContent = '⏸' // 切换为暂停图标
                } else {
                    audioElement.pause()
                    playIcon.textContent = '▶' // 切换为播放图标
                }
            })
            
            // 更新进度条和时间显示
            audioElement.addEventListener('timeupdate', () => {
                const progress = (audioElement.currentTime / audioElement.duration) * 100
                progressBar.style.width = `${progress}%`
                
                // 更新时间显示
                const currentMinutes = Math.floor(audioElement.currentTime / 60)
                const currentSeconds = Math.floor(audioElement.currentTime % 60)
                const totalMinutes = Math.floor(audioElement.duration / 60) || 0
                const totalSeconds = Math.floor(audioElement.duration % 60) || 0
                
                audioTime.textContent = `${String(currentMinutes).padStart(2, '0')}:${String(currentSeconds).padStart(2, '0')} / ${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`
            })
            
            // 点击进度条跳转
            audioProgress.addEventListener('click', (e) => {
                const rect = audioProgress.getBoundingClientRect()
                const clickPosition = (e.clientX - rect.left) / rect.width
                audioElement.currentTime = clickPosition * audioElement.duration
            })
            
            // 音频加载完成后更新总时长
            audioElement.addEventListener('loadedmetadata', () => {
                const totalMinutes = Math.floor(audioElement.duration / 60)
                const totalSeconds = Math.floor(audioElement.duration % 60)
                audioTime.textContent = `00:00 / ${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`
            })
            
            // 播放结束时重置
            audioElement.addEventListener('ended', () => {
                playIcon.textContent = '▶'
                progressBar.style.width = '0%'
                audioElement.currentTime = 0
            })
        }

        return card
    }

    // 修改分类筛选函数
    function filterFilesByCategory(files, category) {
        return files.filter(file => {
            const type = file.type.toLowerCase()
            switch (category) {
                case 'folders':
                    return type === 'folder'
                case 'videos':
                    return ['.mp4', '.avi', '.mov'].includes(type)
                case 'photos':
                    return ['.jpg', '.png', '.gif'].includes(type)
                case 'audio':
                    return ['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(type)
                case 'code':
                    // 同时包含 .project 类型和普通代码文件
                    return type === '.project' || ['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(type)
                case 'icons':
                    return ['.ico', '.icns', '.svg'].includes(type)
                case 'notes':
                    return ['.txt', '.md', '.doc', '.docx', '.pdf'].includes(type)
                case 'ppt':
                    return ['.ppt', '.pptx'].includes(type)
                case 'ae':
                    return ['.aep', '.zip'].includes(type)
                case 'models':
                    return ['.fbx', '.obj', '.max', '.c4d', '.blend', '.3ds', '.dae', '.pth', '.glb'].includes(type)
                default:
                    return true
            }
        })
    }

    // 修改所有分类按钮的点击事件处理
    photosBtn.addEventListener('click', () => {
        currentCategory = 'photos'
        clearAllCategoryActive()
        photosBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    audioBtn.addEventListener('click', () => {
        currentCategory = 'audio'
        clearAllCategoryActive()
        audioBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    codeBtn.addEventListener('click', () => {
        currentCategory = 'code'
        clearAllCategoryActive()
        codeBtn.classList.add('active')
        updateTagsFilter()
        
        // 添加调试日志
        console.log('所有文件:', allFiles)
        const filteredFiles = filterFilesByCategory(allFiles, 'code')
        console.log('过滤后的代码文件:', filteredFiles)
        
        displayFiles(allFiles)
    })

    foldersBtn.addEventListener('click', () => {
        currentCategory = 'folders'
        clearAllCategoryActive()
        foldersBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    iconsBtn.addEventListener('click', () => {
        currentCategory = 'icons'
        clearAllCategoryActive()
        iconsBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    notesBtn.addEventListener('click', () => {
        currentCategory = 'notes'
        clearAllCategoryActive()
        notesBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    pptBtn.addEventListener('click', () => {
        currentCategory = 'ppt'
        clearAllCategoryActive()
        pptBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    aeBtn.addEventListener('click', () => {
        currentCategory = 'ae'
        clearAllCategoryActive()
        aeBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    modelsBtn.addEventListener('click', () => {
        currentCategory = 'models'
        clearAllCategoryActive()
        modelsBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    // 添加一个重置分类功能（可选）
    function resetCategory() {
        currentCategory = 'all'
        clearAllCategoryActive()
        updateTagsFilter()
        displayFiles(allFiles)
    }

    // 标签管理相关事件
    manageTagsBtn.addEventListener('click', () => {
        if (!currentCategory || currentCategory === 'all') {
            alert('请先选择一个分类')
            return
        }
        updateTagsList()
        tagsModal.style.display = 'block'
    })

    closeModalBtn.addEventListener('click', () => {
        tagsModal.style.display = 'none'
    })

    window.addEventListener('click', (e) => {
        if (e.target === tagsModal) {
            tagsModal.style.display = 'none'
        }
    })

    addTagBtn.addEventListener('click', async () => {
        if (!currentCategory || currentCategory === 'all') {
            alert('请先选择一个分类')
            return
        }

        const newTag = newTagInput.value.trim()
        if (!newTag) {
            alert('标签名称不能为空')
            return
        }

        try {
            // 如果标签已存在，直接清空输入框并返回
            if (allTags[currentCategory].includes(newTag)) {
                newTagInput.value = ''
                return
            }

            allTags[currentCategory].push(newTag)
            await window.electronAPI.saveTags(currentCategory, allTags[currentCategory])
            newTagInput.value = ''
            updateTagsList()
            updateTagsFilter()
        } catch (error) {
            console.error('添加标签失败：', error)
            alert('添加标签失败')
        }
    })

    newTagInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            if (!currentCategory || currentCategory === 'all') {
                alert('请先选择一个分类')
                return
            }

            const tagName = newTagInput.value.trim()
            if (!tagName) return

            try {
                // 如果标签已存在，直接清空输入框并返回
                if (allTags[currentCategory].includes(tagName)) {
                    newTagInput.value = ''
                    return
                }

                allTags[currentCategory].push(tagName)
                await window.electronAPI.saveTags(currentCategory, allTags[currentCategory])
                newTagInput.value = ''
                updateTagsList()
                updateTagsFilter()
            } catch (error) {
                console.error('添加标签失败：', error)
                alert('添加标签失败')
            }
        }
    })

    // 设置存储路径
    storagePathBtn.addEventListener('click', async () => {
        try {
            const path = await window.electronAPI.selectStoragePath()
            if (path) {
                currentPathDiv.textContent = `当前位置：${path}`
                importBtn.disabled = false
                // 重新加载文件
                allFiles = await window.electronAPI.loadExistingFiles()
                displayFiles(allFiles)
            }
        } catch (error) {
            console.error('设置存储路径出错：', error)
        }
    })

    // 导入文件
    importBtn.addEventListener('click', async () => {
        try {
            // 显示加载状态
            importBtn.disabled = true
            importBtn.textContent = '导入中...'
            
            // 导入当前分类
            const files = await window.electronAPI.openFileDialog(currentCategory)
            if (files && files.length > 0) {
                // 重新加载所有文件
                allFiles = await window.electronAPI.loadExistingFiles()
                displayFiles(allFiles)
            }
        } catch (error) {
            if (error.message === '请先设置存储路径') {
                alert('请先设置存储路径')
            } else {
                console.error('导入文件出错：', error)
                alert('导入文件失败：' + (error.message || '未知错误'))
            }
        } finally {
            // 恢复按钮状态
            importBtn.disabled = false
            importBtn.textContent = '导入文件'
        }
    })

    // 添加打开存储位置按钮事件
    openStorageBtn.addEventListener('click', async () => {
        try {
            const success = await window.electronAPI.openStorageLocation()
            if (!success) {
                alert('存储位置不存在或尚未设置')
            }
        } catch (error) {
            console.error('打开存储位置时出错：', error)
        }
    })

    // 添加搜索输入事件
    let searchTimeout
    searchInput.addEventListener('input', () => {
        // 使用防抖，避免频繁搜索
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
            displayFiles(allFiles)
        }, 300)
    })

    // 初始化
    async function init() {
        await initStoragePath()
        await initTags()
        currentCategory = 'all' // 确保初始状态为全
        clearAllCategoryActive() // 清除所有类的活动状态
    }

    // 启动用
    init()

    // 添加时间格式化函数
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = Math.floor(seconds % 60)
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
    }

    // 在 document.addEventListener('DOMContentLoaded' 内部添加一个函数
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
        }

        return filters
    }

    // 添加获取文件分类的辅助函数
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

    // 修改 clearAllCategoryActive 函数确保包含所有按钮
    function clearAllCategoryActive() {
        const categoryButtons = [
            videosBtn,    // 添加 videosBtn
            photosBtn, 
            audioBtn, 
            codeBtn, 
            foldersBtn, 
            iconsBtn, 
            notesBtn, 
            pptBtn,
            aeBtn,
            modelsBtn     // 添加模型按钮
        ]
        categoryButtons.forEach(btn => btn.classList.remove('active'))
    }

    // 在其他按钮事件处理器的置添加视频按钮的点击事件
    videosBtn.addEventListener('click', () => {
        currentCategory = 'videos'
        clearAllCategoryActive()
        videosBtn.classList.add('active')
        updateTagsFilter()
        displayFiles(allFiles)
    })

    // 添加打开用户数据目录按钮事件
    openUserDataBtn.addEventListener('click', async () => {
        try {
            const configPath = await window.electronAPI.getConfigPath()
            if (configPath) {
                await window.electronAPI.openPath(configPath)
            } else {
                alert('请先设置存储位置')
            }
        } catch (error) {
            console.error('打开配置目录时出错：', error)
        }
    })

    // 添加生成项目预览的函数
    async function generateProjectPreview(projectPath) {
        try {
            const stats = await window.electronAPI.getProjectStats(projectPath)
            return `
                <div class="stat-item">
                    <span class="stat-label">文件数:</span>
                    <span class="stat-value">${stats.fileCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">代码行数:</span>
                    <span class="stat-value">${stats.lineCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">主要语言:</span>
                    <span class="stat-value">${stats.mainLanguage}</span>
                </div>
            `
        } catch (error) {
            console.error('生成项目预览失败:', error)
            return '无法加载项目信息'
        }
    }

    // 添加关闭代码详情模态框的事件处理
    const codeDetailModal = document.getElementById('code-detail-modal')
    const closeCodeDetail = document.getElementById('close-code-detail')

    closeCodeDetail.addEventListener('click', () => {
        codeDetailModal.style.display = 'none'
    })

    window.addEventListener('click', (e) => {
        if (e.target === codeDetailModal) {
            codeDetailModal.style.display = 'none'
        }
    })

    // 在需要获取配置目录路径的地方
    const userDataPath = await window.electronAPI.getUserDataPath()
    console.log('配置目录路径:', userDataPath)
}) 