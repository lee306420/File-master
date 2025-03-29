import { getFileCategory } from './utils.js';

/**
 * 清除所有分类的活动状态
 * @param {HTMLElement[]} categoryButtons 分类按钮列表
 */
function clearAllCategoryActive(categoryButtons) {
    categoryButtons.forEach(btn => btn.classList.remove('active'))
}

/**
 * 切换到指定分类
 * @param {string} category 目标分类
 * @param {HTMLElement} categoryBtn 分类按钮
 * @param {HTMLElement[]} allCategoryButtons 所有分类按钮
 * @param {Function} updateTagsFilter 更新标签筛选的函数
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 * @returns {string} 当前分类
 */
function switchCategory(category, categoryBtn, allCategoryButtons, updateTagsFilter, displayFiles, allFiles) {
    // 1. 更新UI状态
    clearAllCategoryActive(allCategoryButtons)
    categoryBtn.classList.add('active')
    
    // 2. 更新分类状态
    console.log(`切换到分类: ${category}`);
    
    // 3. 更新标签筛选
    setTimeout(() => {
        // 使用setTimeout确保分类更新已完成
        updateTagsFilter()
        // 4. 重新显示文件
        displayFiles(allFiles)
    }, 0);
    
    // 5. 返回新分类
    return category
}

/**
 * 重置分类选择
 * @param {HTMLElement[]} allCategoryButtons 所有分类按钮
 * @param {Function} updateTagsFilter 更新标签筛选的函数
 * @param {Function} displayFiles 显示文件的函数
 * @param {Array} allFiles 所有文件
 * @returns {string} 当前分类
 */
function resetCategory(allCategoryButtons, updateTagsFilter, displayFiles, allFiles) {
    clearAllCategoryActive(allCategoryButtons)
    updateTagsFilter()
    displayFiles(allFiles)
    return 'all'
}

/**
 * 根据分类筛选文件
 * @param {Array} files 文件列表
 * @param {string} category 分类
 * @returns {Array} 筛选后的文件列表
 */
function filterFilesByCategory(files, category) {
    return files.filter(file => {
        return getFileCategory(file.type) === category;
    });
}

/**
 * 更新分类计数
 * @param {Array} files 文件列表
 * @param {Object} countElements 包含各分类计数元素的对象
 */
function updateCategoryCounts(files, countElements) {
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
        const category = getFileCategory(file.type);
        if (counts.hasOwnProperty(category)) {
            counts[category]++;
        }
    });

    // 更新 UI 中的计数
    if (countElements.folders) countElements.folders.textContent = counts.folders
    if (countElements.videos) countElements.videos.textContent = counts.videos
    if (countElements.photos) countElements.photos.textContent = counts.photos
    if (countElements.audio) countElements.audio.textContent = counts.audio
    if (countElements.code) countElements.code.textContent = counts.code
    if (countElements.icons) countElements.icons.textContent = counts.icons
    if (countElements.notes) countElements.notes.textContent = counts.notes
    if (countElements.ppt) countElements.ppt.textContent = counts.ppt
    if (countElements.ae) countElements.ae.textContent = counts.ae
    if (countElements.models) countElements.models.textContent = counts.models

    // 调试日志
    console.log('文件统计:', {
        总文件数: files.length,
        分类统计: counts
    });
}

export {
    clearAllCategoryActive,
    switchCategory,
    resetCategory,
    filterFilesByCategory,
    updateCategoryCounts
} 