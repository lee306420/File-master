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

/**
 * 设置搜索输入的防抖处理
 * @param {HTMLElement} searchInput 搜索输入框
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 */
function setupSearchDebounce(searchInput, displayFiles, allFiles) {
    let searchTimeout
    
    searchInput.addEventListener('input', () => {
        // 使用防抖，避免频繁搜索
        clearTimeout(searchTimeout)
        searchTimeout = setTimeout(() => {
            displayFiles(allFiles)
        }, 300)
    })
}

export {
    searchFiles,
    setupSearchDebounce
} 