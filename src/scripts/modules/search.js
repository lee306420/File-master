/**
 * 搜索文件
 * @param {Array} files 文件列表
 * @param {string} searchTerm 搜索词
 * @returns {Array} 搜索结果
 */
function searchFiles(files, searchTerm) {
    if (!searchTerm) return files
    
    searchTerm = searchTerm.toLowerCase()
    return files.filter(file => {
        const fileName = file.name.toLowerCase()
        const fileType = file.type.toLowerCase()
        
        // 搜索文件名
        if (fileName.includes(searchTerm)) return true
        
        // 搜索文件类型（去掉点号）
        if (fileType.slice(1).includes(searchTerm)) return true
        
        // 不再搜索标签
        // 如果需要恢复标签搜索，取消下面注释
        // const fileTags = file.tags || []
        // if (fileTags.some(tag => tag.toLowerCase().includes(searchTerm))) return true
        
        return false
    })
}

/**
 * 设置搜索输入的防抖处理
 * @param {HTMLElement} searchInput 搜索输入框
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 */
function setupSearchDebounce(searchInput, displayFiles, allFiles) {
    let searchTimeout
    let isSearching = false
    
    searchInput.addEventListener('input', () => {
        // 防止重复搜索导致内容闪烁
        if (isSearching) {
            clearTimeout(searchTimeout)
        }
        
        // 使用防抖，避免频繁搜索
        clearTimeout(searchTimeout)
        
        // 设置搜索状态指示器
        const searchIcon = searchInput.parentElement.querySelector('.search-icon')
        if (searchIcon) {
            searchIcon.classList.add('searching')
        }
        
        searchTimeout = setTimeout(async () => {
            isSearching = true
            try {
                // 直接调用显示函数，不要操作DOM
                await displayFiles(window.allFiles || allFiles)
            } catch (error) {
                console.error('搜索显示错误:', error)
                
                // 发生错误时仍然显示一些内容，避免界面空白
                const materialGrid = document.getElementById('material-grid')
                if (materialGrid && materialGrid.children.length === 0) {
                    materialGrid.innerHTML = `
                        <div class="error-message">
                            <p>搜索时发生错误</p>
                            <p>请尝试刷新页面或重新启动应用</p>
                        </div>
                    `
                }
            } finally {
                isSearching = false
                if (searchIcon) {
                    searchIcon.classList.remove('searching')
                }
            }
        }, 300)
    })
}

export {
    searchFiles,
    setupSearchDebounce
} 