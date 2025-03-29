# FileMaster

对各种素材进行管理，适用于macos，win......

![1881740211225_ pic_hd](https://github.com/user-attachments/assets/dda1ecdc-d615-454a-8f88-b9585ec44a87)

这是一个基于Electron开发的多媒体素材管理器应用，主要用于管理和组织各类素材文件。

**项目概述：**
- 名称：素材管理器 (Material Manager)
- 类型：桌面应用程序
- 开发框架：Electron

**主要功能：**
1. **多类型素材管理**：支持管理多种类型的素材，包括：
   - 视频文件
   - 图片/照片
   - 音频文件
   - 代码文件/项目
   - 文件夹
   - 图标
   - 笔记
   - PPT文件
   - AE项目
   - 3D模型

2. **文件操作功能**：
   - 导入文件/文件夹
   - 预览文件
   - 删除文件
   - 打开文件位置

3. **标签管理系统**：
   - 为不同类型的素材添加标签
   - 通过标签筛选素材
   - 管理（添加/编辑/删除）标签

4. **搜索功能**：通过文件名或标签搜索素材

5. **自定义存储位置**：允许用户设置素材的存储路径

**技术实现：**
- 前端：HTML, CSS, JavaScript
- 后端：Node.js (Electron)
- 文件系统操作：通过Node.js的fs模块实现
- 界面交互：通过Electron的IPC机制实现前后端通信

**应用界面：**
- 左侧边栏：分类导航（视频、图片、音频等）
- 主内容区：素材网格显示
- 顶部工具栏：导入、搜索和标签筛选功能
- 模态框：标签管理、文件预览等功能

这个应用的主要目的是帮助用户更方便地管理和组织各类素材文件，适合设计师、开发者或内容创作者使用，能够提高工作效率并更好地组织数字资源。


**注意1：我没有上传node_modules文件夹**
*通过 `npm/yarn install`命令进行安装相关依赖*

**注意2：我也没有上传.npmrc文件** 

*输入代码：* 
```
electron_mirror=https://npmmirror.com/mirrors/electron/
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
registry=https://registry.npmmirror.com/
```


