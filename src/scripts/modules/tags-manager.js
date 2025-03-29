import { showConfirmDialog, getFileCategory } from './utils.js'

/**
 * 初始化标签
 * @param {Object} allTags 所有标签对象
 * @param {Object} selectedTags 已选标签对象
 * @returns {Promise<Object>} 初始化后的标签对象
 */
async function initTags(allTags = {}, selectedTags = {}) {
    const categories = ['folders', 'videos', 'photos', 'audio', 'code', 'icons', 'notes', 'ppt', 'ae', 'models']
    for (const category of categories) {
        allTags[category] = await window.electronAPI.getTags(category) || []
        selectedTags[category] = []
    }
    return { allTags, selectedTags }
}

/**
 * 更新标签筛选区域
 * @param {HTMLElement} tagsFilterContainer 标签筛选容器
 * @param {Object} allTags 所有标签
 * @param {Object} selectedTags 选中的标签
 * @param {string} currentCategory 当前分类
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 */
function updateTagsFilter(tagsFilterContainer, allTags, selectedTags, currentCategory, displayFiles, allFiles) {
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

/**
 * 更新标签管理列表
 * @param {HTMLElement} tagsList 标签列表容器
 * @param {Object} allTags 所有标签
 * @param {string} currentCategory 当前分类
 * @param {Function} updateTagsFilter 更新标签筛选的函数
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 */
async function updateTagsList(tagsList, allTags, currentCategory, updateTagsFilter, displayFiles, allFiles) {
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
                updateTagsList(tagsList, allTags, currentCategory, updateTagsFilter, displayFiles, allFiles)
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

                updateTagsList(tagsList, allTags, currentCategory, updateTagsFilter, displayFiles, allFiles)
                updateTagsFilter()
                displayFiles(allFiles)
            } catch (error) {
                console.error('删除标签失败：', error)
                alert('删除标签失败')
            }
        })
    })
}

/**
 * 添加新标签
 * @param {string} tagName 标签名称
 * @param {Object} allTags 所有标签
 * @param {string} currentCategory 当前分类
 * @param {Function} updateTagsList 更新标签列表的函数
 * @param {Function} updateTagsFilter 更新标签筛选的函数
 * @param {HTMLElement} tagsList 标签列表容器
 * @param {HTMLElement} tagsFilterContainer 标签筛选容器
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 */
async function addNewTag(tagName, allTags, currentCategory, updateTagsList, updateTagsFilter, tagsList, tagsFilterContainer, displayFiles, allFiles) {
    if (!currentCategory || currentCategory === 'all') {
        alert('请先选择一个分类')
        return
    }

    const newTag = tagName.trim()
    if (!newTag) {
        alert('标签名称不能为空')
        return
    }

    try {
        // 如果标签已存在，直接返回
        if (allTags[currentCategory].includes(newTag)) {
            return
        }

        allTags[currentCategory].push(newTag)
        await window.electronAPI.saveTags(currentCategory, allTags[currentCategory])
        updateTagsList(tagsList, allTags, currentCategory, updateTagsFilter, displayFiles, allFiles)
        updateTagsFilter(tagsFilterContainer, allTags, {}, currentCategory, displayFiles, allFiles)
        return true
    } catch (error) {
        console.error('添加标签失败：', error)
        alert('添加标签失败')
        return false
    }
}

/**
 * 标签筛选文件
 * @param {Array} files 文件列表
 * @param {Array} selectedTags 选中的标签列表
 * @returns {Promise<Array>} 筛选后的文件列表
 */
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

export {
    initTags,
    updateTagsFilter,
    updateTagsList,
    addNewTag,
    filterFilesByTags
} 