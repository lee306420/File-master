const fs = require('fs')
const path = require('path')

/**
 * 获取文件类型对应的文件夹名
 * @param {string} fileType 文件类型（扩展名）
 * @returns {string|undefined} 对应的文件夹名
 */
function getTypeFolderName(fileType) {
  const typeMap = {
    '.mp4': 'videos',
    '.avi': 'videos',
    '.mov': 'videos',
    '.jpg': 'images',
    '.png': 'images',
    '.gif': 'images',
    '.mp3': 'audio',
    '.wav': 'audio',
    '.m4a': 'audio',
    '.ogg': 'audio',
    '.flac': 'audio',
    '.js': 'code',
    '.py': 'code',
    '.java': 'code',
    '.cpp': 'code',
    '.html': 'code',
    '.css': 'code',
    '.ico': 'icons',
    '.icns': 'icons',
    '.svg': 'icons',
    '.txt': 'notes',
    '.md': 'notes',
    '.doc': 'notes',
    '.docx': 'notes',
    '.pdf': 'notes',
    '.ppt': 'ppt',
    '.pptx': 'ppt',
    '.aep': 'ae',
    '.zip': 'ae',
    '.fbx': 'models',
    '.obj': 'models',
    '.max': 'models',
    '.c4d': 'models',
    '.blend': 'models',
    '.3ds': 'models',
    '.dae': 'models',
    '.pth': 'models',
    '.glb': 'models',
    '.project': 'code'
  }
  return typeMap[fileType]
}

/**
 * 获取文件对话框过滤器
 * @param {string} category 文件类别
 * @returns {Array} 过滤器配置
 */
function getFileFilters(category) {
  // 默认过滤器
  const defaultFilter = {
    name: '所有支持的文件',
    extensions: [
      'mp4', 'avi', 'mov',
      'jpg', 'png', 'gif',
      'mp3', 'wav', 'm4a', 'ogg', 'flac',
      'js', 'py', 'java', 'cpp', 'html', 'css',
      'ico', 'icns', 'svg',
      'txt', 'md', 'doc', 'docx', 'pdf',
      'ppt', 'pptx',
      'aep',
      'fbx', 'obj', 'max', 'c4d', 'blend', '3ds', 'dae', 'pth', 'glb'
    ]
  }

  // 根据分类返回特定的过滤器
  switch (category) {
    case 'videos':
      return [{ name: '视频文件', extensions: ['mp4', 'avi', 'mov'] }]
    case 'photos':
      return [{ name: '图片文件', extensions: ['jpg', 'png', 'gif'] }]
    case 'audio':
      return [{ name: '音频文件', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] }]
    case 'code':
      return [{ name: '代码文件', extensions: ['js', 'py', 'java', 'cpp', 'html', 'css'] }]
    case 'icons':
      return [{ name: '图标文件', extensions: ['ico', 'icns', 'svg'] }]
    case 'notes':
      return [{ name: '笔记文件', extensions: ['txt', 'md', 'doc', 'docx', 'pdf'] }]
    case 'ppt':
      return [{ name: 'PPT文件', extensions: ['ppt', 'pptx'] }]
    case 'ae':
      return [{ name: 'AE工程文件', extensions: ['aep', 'zip'] }]
    case 'models':
      return [{ name: '3D模型文件', extensions: ['fbx', 'obj', 'max', 'c4d', 'blend', '3ds', 'dae', 'pth', 'glb'] }]
    case 'folders':
      return [] // 文件夹不需要过滤器
    default:
      return [defaultFilter]
  }
}

/**
 * 检查目录是否为代码项目
 * @param {string} dirPath 目录路径
 * @returns {Promise<boolean>} 是否为代码项目
 */
async function checkIfCodeProject(dirPath) {
  try {
    // 检查常见的项目标志文件
    const projectFiles = [
      'package.json',
      'composer.json',
      'requirements.txt',
      'pom.xml',
      'build.gradle',
      'CMakeLists.txt',
      '.git',
      '.svn',
      'Cargo.toml',
      'go.mod',
      'index.html',  // web项目相关文件
      'webpack.config.js',
      'vite.config.js',
      'tsconfig.json',
      '.gitignore'
    ]

    // 检查文件
    for (const file of projectFiles) {
      if (fs.existsSync(path.join(dirPath, file))) {
        console.log('找到项目标志文件:', file)
        return true
      }
    }

    // 检查常见的项目目录结构
    const projectDirs = [
      'src',
      'test',
      'docs',
      'build',
      'dist',
      'node_modules',
      'public',
      'assets',
      'styles',
      'scripts',
      'components',
      'pages',
      'static'
    ]

    // 检查目录
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && projectDirs.includes(entry.name)) {
        console.log('找到项目目录:', entry.name)
        return true
      }
    }

    // 检查是否包含多个代码文件
    let codeFileCount = 0
    const codeExts = ['.js', '.html', '.css', '.py', '.java', '.cpp', '.jsx', '.ts', '.tsx']
    
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (codeExts.includes(ext)) {
          codeFileCount++
          if (codeFileCount >= 2) { // 如果有2个或以上的代码文件，也认为是项目
            console.log('找到多个代码文件')
            return true
          }
        }
      }
    }

    console.log('未检测到项目特征')
    return false
  } catch (error) {
    console.error('检查项目失败:', error)
    return false
  }
}

/**
 * 检查是否为代码文件
 * @param {string} ext 文件扩展名
 * @returns {boolean} 是否为代码文件
 */
function isCodeFile(ext) {
  const codeExts = [
    '.js', '.ts', '.jsx', '.tsx',
    '.py', '.java', '.cpp', '.c',
    '.h', '.hpp', '.cs', '.php',
    '.rb', '.go', '.rs', '.swift',
    '.kt', '.scala', '.html', '.css',
    '.scss', '.less', '.vue', '.jsx'
  ]
  return codeExts.includes(ext)
}

/**
 * 根据扩展名获取语言名称
 * @param {string} ext 文件扩展名
 * @returns {string} 语言名称
 */
function getLanguageFromExt(ext) {
  const langMap = {
    '.js': 'JavaScript',
    '.ts': 'TypeScript',
    '.jsx': 'React',
    '.tsx': 'React/TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.cpp': 'C++',
    '.c': 'C',
    '.cs': 'C#',
    '.php': 'PHP',
    '.rb': 'Ruby',
    '.go': 'Go',
    '.rs': 'Rust',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.less': 'Less',
    '.vue': 'Vue'
  }
  return langMap[ext] || 'Other'
}

module.exports = {
  getTypeFolderName,
  getFileFilters,
  checkIfCodeProject,
  isCodeFile,
  getLanguageFromExt
} 