import { formatFileSize, getFileCategory } from './utils.js';
import { openFile, openFilePath, deleteFile } from './file-handler.js';
import { filterFilesByTags } from './tags-manager.js';
import { updateCategoryCounts, filterFilesByCategory } from './categories.js';
import { searchFiles } from './search.js';
import {
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
} from './media-preview.js';

/**
 * 清空素材网格
 * @param {HTMLElement} materialGrid 素材网格元素
 */
function clearMaterialGrid(materialGrid) {
    materialGrid.innerHTML = '';
}

/**
 * 为每个文件创建素材卡片
 * @param {Object} file 文件对象
 * @returns {Promise<HTMLElement>} 素材卡片元素
 */
async function createMaterialCard(file) {
    const card = document.createElement('div');
    card.className = 'material-card';
    
    let preview = '';
    
    // 根据文件类型生成不同的预览
    if (file.type === 'folder') {
        preview = generateFolderPreview(file);
    } else if (['.jpg', '.png', '.gif'].includes(file.type.toLowerCase())) {
        preview = generateImagePreview(file);
    } else if (['.mp4', '.avi', '.mov'].includes(file.type.toLowerCase())) {
        preview = generateVideoPreview(file);
    } else if (['.mp3', '.wav', '.m4a', '.ogg', '.flac'].includes(file.type.toLowerCase())) {
        preview = generateAudioPreview(file, card);
    } else if (['.js', '.py', '.java', '.cpp', '.html', '.css'].includes(file.type.toLowerCase()) || file.type === '.project') {
        preview = await generateCodePreview(file);
        // 为项目和代码文件添加不同的类
        if (file.type === '.project') {
            card.classList.add('project-card');
        } else {
            card.classList.add('code-card');
        }
    } else if (['.ico', '.icns', '.svg'].includes(file.type.toLowerCase())) {
        preview = generateIconPreview(file);
    } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(file.type.toLowerCase())) {
        preview = generateDocumentPreview(file);
    } else if (['.ppt', '.pptx'].includes(file.type.toLowerCase())) {
        preview = generatePptPreview(file);
    } else if (['.theme'].includes(file.type.toLowerCase())) {
        preview = generateThemePreview(file);
    } else if (['.aep', '.zip'].includes(file.type.toLowerCase())) {
        preview = generateAePreview(file);
    } else if (['.fbx', '.obj', '.max', '.c4d', '.blend', '.3ds', '.dae', '.pth', '.glb'].includes(file.type.toLowerCase())) {
        preview = generateModelPreview(file);
    }

    // 添加标签容器
    let tagsHtml = '';
    if (file.tags && file.tags.length > 0) {
        tagsHtml = `
            <div class="tags-container">
                ${file.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>`;
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
        </div>`;

    // 添加删除按钮的事件监听
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // 阻止事件冒泡
        
        const updatedFiles = await deleteFile(file, window.allFiles, window.displayFiles);
        if (updatedFiles) {
            window.allFiles = updatedFiles;
        }
    });

    // 添加打开文件位置按钮事件监听
    const openBtn = card.querySelector('.open-folder-btn');
    if (openBtn) {
        openBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await openFilePath(e.currentTarget.dataset.path);
        });
    }

    // 添加打开文件按钮事件监听
    const openFileBtn = card.querySelector('.open-file-btn');
    if (openFileBtn) {
        openFileBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await openFile(e.currentTarget.dataset.path);
        });
    }

    // 添加标签管理功能
    const fileCategory = getFileCategory(file.type);
    card.addEventListener('contextmenu', async (e) => {
        e.preventDefault();
        
        try {
            // 获取当前文件标签
            const currentTags = await window.electronAPI.getFileTags(fileCategory, file.path) || [];
            
            // 获取该分类下的所有可用标签
            const availableTags = window.allTags[fileCategory] || [];
                    
            // 创建标签选择对话框
            const tagDialog = document.createElement('div');
            tagDialog.className = 'tag-dialog';
            tagDialog.style.position = 'fixed';
            tagDialog.style.left = `${e.clientX}px`;
            tagDialog.style.top = `${e.clientY}px`;
            
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
            `;
            
            document.body.appendChild(tagDialog);
            
            // 添加事件处理
            const handleSave = async () => {
                const selectedTags = Array.from(tagDialog.querySelectorAll('input:checked')).map(input => input.value);
                await window.electronAPI.saveFileTags(fileCategory, file.path, selectedTags);
                file.tags = selectedTags; // 更新文件对象的标签
                window.displayFiles(window.allFiles); // 刷新显示
                tagDialog.remove();
            };
            
            const handleCancel = () => {
                tagDialog.remove();
            };
            
            const handleClickOutside = (event) => {
                if (!tagDialog.contains(event.target)) {
                    tagDialog.remove();
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            
            // 绑定事件
            tagDialog.querySelector('.save-btn').addEventListener('click', handleSave);
            tagDialog.querySelector('.cancel-btn').addEventListener('click', handleCancel);
            
            // 延迟添加点外部关闭事件，避免立即触发
            setTimeout(() => {
                document.addEventListener('click', handleClickOutside);
            }, 100);
            
        } catch (error) {
            console.error('标签管理失败：', error);
            alert('标签管理失败');
        }
    });

    return card;
}

/**
 * 显示文件
 * @param {Array} files 文件列表
 * @param {HTMLElement} materialGrid 素材网格元素
 * @param {Object} countElements 包含各分类计数元素的对象
 * @param {string} currentCategory 当前分类
 * @param {Object} selectedTags 已选标签
 * @param {HTMLElement} searchInput 搜索输入框
 * @returns {Promise<number>} 显示的文件数量
 */
async function displayFiles(files, materialGrid, countElements, currentCategory, selectedTags, searchInput) {
    // 保存当前滚动位置
    const mainContent = document.querySelector('.main-content');
    const scrollPosition = mainContent.scrollTop;

    console.log(`--------------------显示文件开始--------------------`);
    console.log(`当前分类: ${currentCategory}, 总文件数: ${files.length}`);

    // 清空当前显示
    clearMaterialGrid(materialGrid);
    
    // 更新所有分类的计数
    updateCategoryCounts(files, countElements);
    
    // 创建文件副本以避免修改原数组
    let filteredFiles = [...files];
    
    if (currentCategory !== 'all') {
        console.log(`应用分类筛选: ${currentCategory}`);
        console.log(`筛选前示例文件: 
            ${filteredFiles.slice(0, 3).map(f => 
                `${f.name} (${f.type} => ${getFileCategory(f.type)})`
            ).join('\n            ')}`);
        
        // 应用分类筛选
        filteredFiles = filterFilesByCategory(filteredFiles, currentCategory);
        
        console.log(`分类筛选后文件数: ${filteredFiles.length}`);
        if (filteredFiles.length > 0) {
            console.log(`筛选后示例文件: 
                ${filteredFiles.slice(0, 3).map(f => 
                    `${f.name} (${f.type} => ${getFileCategory(f.type)})`
                ).join('\n                ')}`);
        }
    }
    
    // 应用搜索筛选
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filteredFiles = searchFiles(filteredFiles, searchTerm);
        console.log(`搜索筛选后文件数: ${filteredFiles.length}`);
    }
    
    // 应用标签筛选
    if (currentCategory !== 'all' && selectedTags[currentCategory]?.length > 0) {
        console.log(`应用标签筛选，标签: ${selectedTags[currentCategory].join(', ')}`);
        filteredFiles = await filterFilesByTags(filteredFiles, selectedTags[currentCategory]);
        console.log(`标签筛选后文件数: ${filteredFiles.length}`);
    }
    
    // 为每个文件加载对应类的标签
    for (const file of filteredFiles) {
        try {
            const fileCategory = getFileCategory(file.type);
            if (currentCategory === 'all' || fileCategory === currentCategory) {
                file.tags = await window.electronAPI.getFileTags(fileCategory, file.path);
            } else {
                file.tags = [];
            }
        } catch (error) {
            console.error('加载文件标签失败：', error);
            file.tags = [];
        }
    }
    
    // 创建文档片段
    const fragment = document.createDocumentFragment();
    
    console.log(`准备显示 ${filteredFiles.length} 个文件`);
    
    // 添加文件卡片
    for (const file of filteredFiles) {
        const card = await createMaterialCard(file);
        fragment.appendChild(card);
    }

    materialGrid.appendChild(fragment);

    // 恢复滚动位置
    requestAnimationFrame(() => {
        mainContent.scrollTop = scrollPosition;
    });

    console.log(`--------------------显示文件结束--------------------`);
    return filteredFiles.length;
}

/**
 * 设置模态框事件处理
 * @param {HTMLElement} modal 模态框元素
 * @param {HTMLElement} closeBtn 关闭按钮
 */
function setupModalEvents(modal, closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

/**
 * 显示标签管理界面
 * @param {HTMLElement} tagsModal 标签模态框
 * @param {string} currentCategory 当前分类
 * @param {Function} updateTagsList 更新标签列表的函数
 */
function showTagsManager(tagsModal, currentCategory, updateTagsList) {
    if (!currentCategory || currentCategory === 'all') {
        alert('请先选择一个分类');
        return;
    }
    updateTagsList();
    tagsModal.style.display = 'block';
}

export {
    clearMaterialGrid,
    createMaterialCard,
    displayFiles,
    setupModalEvents,
    showTagsManager
} 