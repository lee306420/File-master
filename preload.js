const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  loadFiles: (directory) => ipcRenderer.invoke('load-files', directory),
  openFileDialog: (category) => ipcRenderer.invoke('open-file-dialog', category),
  selectStoragePath: () => ipcRenderer.invoke('select-storage-path'),
  getStoragePath: () => ipcRenderer.invoke('get-storage-path'),
  loadExistingFiles: () => ipcRenderer.invoke('load-existing-files'),
  saveTags: (category, tags) => ipcRenderer.invoke('save-tags', category, tags),
  getTags: (category) => ipcRenderer.invoke('get-tags', category),
  saveFileTags: (category, filePath, tags) => ipcRenderer.invoke('save-file-tags', category, filePath, tags),
  getFileTags: (category, filePath) => ipcRenderer.invoke('get-file-tags', category, filePath),
  openStorageLocation: () => ipcRenderer.invoke('open-storage-location'),
  readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
  readFullFileContent: (filePath) => ipcRenderer.invoke('read-full-file-content', filePath),
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  getDirname: (filePath) => ipcRenderer.invoke('get-dirname', filePath),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  openUserData: () => ipcRenderer.invoke('open-user-data'),
  getProjectStats: (projectPath) => ipcRenderer.invoke('get-project-stats', projectPath),
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),
}) 