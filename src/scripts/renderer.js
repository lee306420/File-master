import { 
    initStoragePath, 
    setStoragePath, 
    importFiles, 
    openStorageLocation,
    openUserDataLocation
} from './modules/file-handler.js';

import {
    initTags,
    updateTagsFilter,
    updateTagsList,
    addNewTag
} from './modules/tags-manager.js';

import {
    clearAllCategoryActive,
    switchCategory,
    resetCategory
} from './modules/categories.js';

import {
    setupSearchDebounce
} from './modules/search.js';

import {
    clearMaterialGrid,
    displayFiles,
    setupModalEvents,
    showTagsManager
} from './modules/ui.js';

import {
    formatFileSize,
    escapeHtml,
    showConfirmDialog,
    getFileCategory
} from './modules/utils.js';

// 主入口函数
document.addEventListener('DOMContentLoaded', async () => {
    // DOM 元素引用
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
    const codeDetailModal = document.getElementById('code-detail-modal')
    const closeCodeDetail = document.getElementById('close-code-detail')
        const tagsList = document.getElementById('tags-list')

    // 分类计数元素对象
    const countElements = {
        folders: document.querySelector('#folders .count'),
        videos: document.querySelector('#videos .count'),
        photos: document.querySelector('#photos .count'),
        audio: document.querySelector('#audio .count'),
        code: document.querySelector('#code .count'),
        icons: document.querySelector('#icons .count'),
        notes: document.querySelector('#notes .count'),
        ppt: document.querySelector('#ppt .count'),
        ae: document.querySelector('#ae .count'),
        models: document.querySelector('#models .count')
    };
    
    // 状态变量
    window.allFiles = []
    window.allTags = {}
    window.selectedTags = {}
    window.currentCategory = 'all'

    // 将displayFiles函数添加到window对象，以便在其他模块中使用
    window.displayFiles = async (files) => {
        return await displayFiles(
            files, 
            materialGrid, 
            countElements, 
            window.currentCategory, 
            window.selectedTags, 
            searchInput
        );
    };

    // 初始化函数
    async function init() {
        console.log('开始初始化应用...');
        window.allFiles = await initStoragePath(currentPathDiv, importBtn);
        console.log(`初始化加载了 ${window.allFiles.length} 个文件`);
        
        // 调试文件分类
        if (window.allFiles.length > 0) {
            console.log('文件分类测试:');
            window.allFiles.slice(0, 5).forEach(file => {
                console.log(`文件: ${file.name}, 类型: ${file.type}, 分类: ${getFileCategory(file.type)}`);
            });
        }
        
        const tags = await initTags(window.allTags, window.selectedTags);
        window.allTags = tags.allTags;
        window.selectedTags = tags.selectedTags;
        
        window.currentCategory = 'all';
        console.log(`初始分类设置为: ${window.currentCategory}`);
        
        clearAllCategoryActive(getCategoryButtons());
        console.log('清除了所有分类按钮的活动状态');
        
        const fileCount = await window.displayFiles(window.allFiles);
        console.log(`显示了 ${fileCount} 个文件`);
    }

    // 获取所有分类按钮
    function getCategoryButtons() {
        return [
            videosBtn,
            photosBtn,
            audioBtn,
            codeBtn,
            foldersBtn,
            iconsBtn,
            notesBtn,
            pptBtn,
            aeBtn,
            modelsBtn
        ];
    }

    // 标签过滤器更新包装函数
    function updateTagsFilterWrapper() {
        updateTagsFilter(
            tagsFilterContainer, 
            window.allTags, 
            window.selectedTags, 
            window.currentCategory, 
            window.displayFiles, 
            window.allFiles
        );
    }

    // 标签列表更新包装函数
    function updateTagsListWrapper() {
        updateTagsList(
            tagsList, 
            window.allTags, 
            window.currentCategory, 
            updateTagsFilterWrapper, 
            window.displayFiles, 
            window.allFiles
        );
    }

    // 设置事件监听器
    // 存储路径设置
    storagePathBtn.addEventListener('click', async () => {
        const files = await setStoragePath(currentPathDiv, importBtn, window.displayFiles);
        if (files) {
            window.allFiles = files;
        }
    });

    // 文件导入
    importBtn.addEventListener('click', async () => {
        const files = await importFiles(importBtn, window.currentCategory, window.displayFiles);
        if (files) {
            window.allFiles = files;
        }
    });

    // 打开存储位置
    openStorageBtn.addEventListener('click', openStorageLocation);

    // 打开用户数据目录
    openUserDataBtn.addEventListener('click', openUserDataLocation);

    // 添加搜索功能
    setupSearchDebounce(searchInput, window.displayFiles, window.allFiles);

    // 分类按钮事件
    videosBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('videos', videosBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    photosBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('photos', photosBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    audioBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('audio', audioBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    codeBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('code', codeBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    foldersBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('folders', foldersBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    iconsBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('icons', iconsBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    notesBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('notes', notesBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    pptBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('ppt', pptBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    aeBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('ae', aeBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    modelsBtn.addEventListener('click', () => {
        window.currentCategory = switchCategory('models', modelsBtn, getCategoryButtons(), updateTagsFilterWrapper, window.displayFiles, window.allFiles);
    });

    // 标签管理
    manageTagsBtn.addEventListener('click', () => {
        showTagsManager(tagsModal, window.currentCategory, updateTagsListWrapper);
    });

    // 添加新标签
    addTagBtn.addEventListener('click', async () => {
        if (await addNewTag(
            newTagInput.value,
            window.allTags,
            window.currentCategory,
            updateTagsListWrapper,
            updateTagsFilterWrapper,
            tagsList,
            tagsFilterContainer,
            window.displayFiles,
            window.allFiles
        )) {
            newTagInput.value = '';
        }
    });

    // 输入框回车添加标签
    newTagInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            if (await addNewTag(
                newTagInput.value,
                window.allTags,
                window.currentCategory,
                updateTagsListWrapper,
                updateTagsFilterWrapper,
                tagsList,
                tagsFilterContainer,
                window.displayFiles,
                window.allFiles
            )) {
                newTagInput.value = '';
            }
        }
    });

    // 标签模态框关闭
    setupModalEvents(tagsModal, closeModalBtn);

    // 代码详情模态框关闭
    setupModalEvents(codeDetailModal, closeCodeDetail);

    // 启动初始化
    init();
}); 