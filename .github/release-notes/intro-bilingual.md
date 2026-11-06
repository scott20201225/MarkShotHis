### 产品定位

MarkShotHis 是一款完全独立的跨平台**截图、贴图与剪贴板历史**桌面工作台。它面向日常高效办公、研发记录、截图标注与多任务资料比对场景，常驻系统托盘静默运行，无需打开任何大型笔记或编辑器主窗口。所有截图标注、贴图钉图以及剪贴板历史记录均 100% 运行于本地，保障隐私安全与极速响应。

### 三大核心功能模块

- **一、截图（屏幕截取与专业标注）**：
  - **智能选区**：根据鼠标指针所在显示器自适应跨屏捕捉；
  - **丰富标注工具**：矩形、椭圆、直线/折线、箭头、自由涂鸦画笔、文本文字、高亮标记、荧光笔；
  - **步骤说明与标签**：步骤序号、序号说明、智能自适应标签（Tag）气泡（自适应浅色与深色皮肤，三角形尖角轮廓清晰）；
  - **隐私遮盖**：敏感信息马赛克与高斯模糊；
  - **独立水印系统**：水印颜色独立配置，支持纯自定义调色与透明度调节，白色水印自带柔和阴影，浅灰或纯白背景均清晰明了；
  - **快捷输出**：支持一键撤销、快捷复制到剪贴板、保存为本地 PNG 文件，或一键生成桌面置顶贴图。
- **二、贴图（悬浮置顶与二次编辑）**：
  - **一键钉图**：支持直接从截图或剪贴板历史中将图片、文本一键置顶钉在桌面上；
  - **自由操控**：无边框窗口自由拖拽移动、鼠标滚轮平滑缩放、随时切换置顶/取消置顶；
  - **二次编辑**：支持直接在置顶贴图上二次标注绘制画笔，支持一键复制贴图内容或重新导出保存。
- **三、剪贴板历史（本地记录与极速复用）**：
  - **自动静默记录**：后台安全监听文本与图片剪贴板（最高保留 500 条，同内容自动去重并置顶）；
  - **多维筛选与搜索**：支持按全量、纯文本、纯图片快速分类筛选，提供实时关键字即时搜索与内容全量预览；
  - **极速交互**：双击或 `Enter` 回车一键复制并关闭窗口，`Esc` 极速退出；
  - **安全管理**：支持单条精准删除与一键清空机制，安全防误触。

### 系统托盘与轻量常驻

- **纯托盘静默常驻**：关闭截图、贴图与历史窗口后仍在后台静默运行，可通过托盘菜单完全退出。
- **macOS Dock 严格隐藏**：窗口关闭退出时严格隐藏 Dock 图标，不干扰系统多任务栏与桌面工作区。
- **原生全局快捷键**：截图快捷键 `Control+Shift+1`，剪贴板历史快捷键 `Control+Shift+3`。
- **外观与国际化**：原生支持浅色（Light）与深色（Dark）主题无缝切换；完整支持 8 种语言界面（简体中文、繁体中文、English、日本語、한국어、Deutsch、Français、Español）。

### 与 MarkNotePro / MarkTextPro 的关系

MarkShotHis 从 MarkNotePro / MarkTextPro 核心模块中独立拆分而来，形成相互独立又紧密协同的矩阵工具：

- **MarkShotHis**：专注高频截图、贴图与剪贴板历史管理的轻量独立桌面托盘工具，秒级启动、零主窗口负担。
- **MarkNotePro**：结构化笔记与多模态知识工作台（Markdown / Draw.io / GeoGebra / MindMap / KDBX / PDF）。
- **MarkTextPro**：自由文件与项目多模态工作区管理器。

**数据互通设计**：共享同一本地剪贴板与历史图片目录（`~/.mark-suite/clipboard/`），在 MarkShotHis 中截取的图片与复制的文本，可无缝在 MarkNotePro 或 MarkTextPro 中即时复用。

### 🔒 数据安全与本地隐私

- **100% 纯本地运行**：所有截图文件、标注图形、剪贴板文本与历史图片仅保存在本地设备（`~/.mark-suite/clipboard/`），绝不上传任何第三方云端或外部服务器。
- **敏感凭据防泄漏提示**：剪贴板历史中可能包含临时的账号密码、Token 或敏感 API Key，建议在公用设备或多人共享电脑上定期清空历史记录。

---

### Overview

MarkShotHis is a lightweight, local-first cross-platform desktop utility dedicated to **Screenshot, Pin-to-Top, and Clipboard History**. Running silently in the system tray, it operates completely standalone without the need to launch heavy note-taking or editor applications. 100% offline, privacy-first, and ultra-responsive.

### Three Core Capabilities

- **1. Screenshot (Screen Capture & Professional Annotations)**:
  - **Intelligent Selection**: Automatically captures across multiple displays based on mouse cursor position;
  - **Comprehensive Annotation Toolkit**: Rectangle, Ellipse, Line, Arrow, Freehand Pen, Text, Highlighter;
  - **Step Notes & Tags**: Step numbering, explanation notes, and smart Tag bubbles (auto-adapting to light/dark themes with clear triangle pointers);
  - **Privacy Masking**: Pixelated mosaic and Gaussian blur for sensitive data protection;
  - **Independent Watermark**: Independent color picker and opacity control, soft shadow for clear readability on white or light backgrounds;
  - **Quick Export**: Undo, copy to clipboard, save as PNG, or generate a desktop pin-to-top floating window with one click.
- **2. Pin-to-Top (Floating Windows & Re-editing)**:
  - **One-Click Pin**: Pin screenshots or clipboard items (images & text) directly to the desktop;
  - **Smooth Controls**: Borderless dragging, mouse-wheel zooming, toggle always-on-top;
  - **Secondary Editing**: Re-annotate directly on pinned images, copy original images, or export anytime.
- **3. Clipboard History (Local Cache & Fast Reuse)**:
  - **Silent Local Cache**: Automatically records text and image clipboard entries (up to 500 items with smart deduplication);
  - **Multi-Category Filter & Search**: Filter by All / Text / Images, real-time keyword search, and rich previews;
  - **Swift Interaction**: Double-click or `Enter` to copy and auto-dismiss, `Esc` to quit immediately;
  - **Secure Management**: Single-entry deletion and one-click clear all to prevent accidental data accumulation.

### System Tray & Lightweight Resident

- **Tray Resident**: Silently runs in the system tray without any intrusive main window. Exit cleanly via tray menu.
- **macOS Dock Strict Hide**: Dock icon is strictly kept hidden upon closing capture, pin, or history windows.
- **Global Shortcuts**: Screenshot `Control+Shift+1`, Clipboard History `Control+Shift+3`.
- **Themes & Localization**: Built-in Light and Dark themes; localized in 8 languages (zh-CN, zh-TW, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES).

### Relationship with MarkNotePro & MarkTextPro

MarkShotHis was decoupled from MarkNotePro / MarkTextPro to form a specialized, high-performance utility:
- **MarkShotHis**: Lightweight standalone tray utility dedicated to screenshot, pin-to-top, and clipboard history.
- **MarkNotePro**: Structured local note-taking & multimodal knowledge workbench.
- **MarkTextPro**: Free file & project multimodal workspace manager.

**Seamless Data Sharing**: Shares the local directory (`~/.mark-suite/clipboard/`) across all three applications.

### 🔒 Data Security & Privacy

- **100% Offline & Local**: All captured images, annotations, and clipboard records reside entirely on your local machine (`~/.mark-suite/clipboard/`) and are never uploaded to any remote servers.
- **Credential Protection**: Clipboard history may temporarily hold sensitive tokens or passwords. Please clear history regularly on shared workstations.

---

## 🔗 相关地址与下载 / Official Links & Downloads

- **MarkShotHis**（独立截图、贴图与剪贴板历史工作台 / Standalone Screenshot & Clipboard Workbench）:
  - GitHub 官方 Releases 下载 / Official Download: https://github.com/scott20201225/MarkShotHis/releases/latest
  - GitHub 仓库 / Official Repo: https://github.com/scott20201225/MarkShotHis
- **MarkNotePro**（结构化本地笔记与多模态知识工作台 / Structured Local Notes Workbench）:
  - GitHub 官方 Releases 下载 / Official Download: https://github.com/scott20201225/marknote-pro/releases/latest
  - GitHub 仓库 / Official Repo: https://github.com/scott20201225/marknote-pro
- **MarkTextPro**（自由文件与项目多模态工作区 / Free File & Project Workspace）:
  - GitHub 官方 Releases 下载 / Official Download: https://github.com/scott20201225/marktext-pro/releases/latest
  - GitHub 仓库 / Official Repo: https://github.com/scott20201225/marktext-pro
