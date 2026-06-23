# Momo Tools - Adobe Illustrator 扩展

- **仓库 / Repo**：https://github.com/tomideas/momo-illustrator  
- **使用指南 / User Guide (GitHub Pages)**：https://tomideas.github.io/momo-illustrator/

## 项目概述

**Momo Tools** 是一个为 Adobe Illustrator 开发的 CEP (Common Extensibility Platform) 扩展面板，提供实用的设计工具和颜色库管理功能。

- **版本**: 2.101
- **支持软件**: Adobe Illustrator (17.0 - 99.9)
- **技术栈**: HTML5 + CSS3 + JavaScript + ExtendScript (JSX)
- **架构**: CEP 6.0 + CEP Bridge

---

## 核心功能

### 1. 画板工具 (Artboard Tools)
- **复制画板** - 快速复制当前或选定画板
- **重新排列画板** - 按网格布局整理多个画板
- **画板更名** - 批量或单个重命名画板

### 2. 页码工具 (Page Numbers)
- **批量页码** - 为多个页面/画板自动添加编号

### 3. 颜色工具 (Color Tools)
- **颜色标签生成** - 生成带 CMYK 值的颜色标签
- **自定义颜色库** - 多组颜色管理系统（新增）

### 4. 自定义颜色库 (Color Library) ⭐
完整的颜色管理系统，支持：
- **多颜色组** - 为不同产品线创建独立颜色组
- **CMYK 编辑** - 精确的颜色值编辑
- **颜色应用** - 一键将库中颜色应用到选中对象
- **颜色提取** - 从 Illustrator 选中对象提取颜色到库
- **JSON 导入/导出** - 支持全库和按组导入导出，方便团队协作
- **无弹窗交互** - 所有操作流畅，无确认对话框

### 5. 文字工具 (Text Tools)
- **文字样式检查** - 检查文字一致性
- **颜色检查** - 验证文字与形状颜色合规
- **文字溢出检查** - 检测超出边界的文字
- **尾端空白 / 空段检查** - 检查区域文字尾端空格、换行和空段落

---

## 文件结构

```
com.tomideas.illustratortools/
├── CSXS/
│   └── manifest.xml          # CEP 扩展配置
├── css/
│   └── style.css             # UI 样式表
├── js/
│   ├── panel.js              # 主面板脚本 & 事件绑定
│   └── color_library.js      # 颜色库核心逻辑
├── jsx/
│   └── scripts/              # Illustrator ExtendScript 脚本
│       ├── artboard_*.jsx
│       ├── add_page_numbers_*.jsx
│       ├── generate_color_box.jsx
│       ├── check_text_*.jsx
│       └── debug_overset.jsx
├── images/
│   ├── IconLight.png         # 浅色主题图标
│   └── IconDark.png          # 深色主题图标
├── index.html                # 面板 UI 结构
└── README.md                 # 本文档
```

---

## 技术架构

### CEP Bridge 通信

```
JavaScript (CEP Panel)
     ↓ evalScript()
     ↓
ExtendScript (JSX)  → Adobe Illustrator API
     ↑
Callback Results
```

**关键函数**:
```javascript
function evalAI(script, cb) {
    window.__adobe_cep__.evalScript(script, function (r) {
        if (typeof cb === "function") cb(r);
    });
}
```

### 颜色库数据模型

```javascript
{
  "version": "1.0",
  "groups": [
    {
      "id": "g_xxxxx",
      "name": "momo",
      "colors": [
        {
          "id": "c_xxxxx",
          "name": "红色",
          "c": 0,      // Cyan (0-100)
          "m": 100,    // Magenta (0-100)
          "y": 100,    // Yellow (0-100)
          "k": 0       // Black (0-100)
        }
      ]
    }
  ]
}
```

### 存储机制 (双层持久化)

1. **文件系统** (Primary)
   - 路径: `{Folder.userData}/MomoTools/color_library.json`
   - 通过: CEP `cep.fs` API (UTF-8)
   - 优势: 跨设备同步、大容量

2. **localStorage** (Fallback)
   - Key: `MomoTools_ColorLibrary`
   - 优势: 快速、可靠、无权限问题
   - 用途: 文件系统失败时自动保存

---

## 核心模块说明

### index.html - UI 结构

**面板尺寸**:
- 默认: 200×320px
- 最小: 120×120px
- 最大: 600×900px

**主要元素**:
- `.group` - 功能分组容器
- `#cl-group-select` - 颜色组下拉选择器
- `#cl-btn-more` - 更多操作按钮（三点菜单）
- `#cl-more-menu` - 浮动菜单
- `#cl-swatches` - 颜色样本网格
- `#cl-editor` - 内联颜色编辑器

### style.css - 样式主题

**配色方案** (深色 Adobe 风格):
- 背景: `#505050`
- 文字: `#d8d8d8`
- 强调: `#1473e6`
- 危险: `#d97070`

**关键类**:
- `.cl-group-select` - 下拉框
- `.cl-swatch` - 30×30px 颜色块
- `.cl-menu-item` - 菜单项
- `.cl-editor` - 内联编辑器
- `.cl-menu-disabled` - 禁用状态

**透明度调整**:
- 按钮边线: 30% 不透明度
- 菜单边线: 40% 不透明度
- 输入框边线: 30% 不透明度

### panel.js - 主控制器

**职责**:
- 加载颜色库脚本
- 绑定按钮点击事件
- 执行 ExtendScript 文件
- 显示版本号

**版本号**: v2.101

### color_library.js - 核心业务逻辑

#### 状态管理
```javascript
var library    = { version: "1.0", groups: [] };  // 库数据
var curGroup   = 0;                                // 当前组索引
var libPath    = null;                             // 文件路径
var editingIdx = -2;   // -2=关闭, -1=新增, ≥0=编辑
```

#### 主要函数

**初始化**:
- `initPath(cb)` - 获取文件路径 (异步)
- `loadLibrary()` - 从文件/localStorage 加载
- `init()` - 初始化面板

**颜色管理**:
- `openEditor(colorIdx)` - 打开颜色编辑器
- `saveEditorColor()` - 保存编辑的颜色
- `deleteColor(idx)` - 删除颜色 (无确认)
- `applyColor(colorIdx)` - 应用颜色到 Illustrator 选中对象
- `captureFromAI()` - 从 Illustrator 提取颜色

**颜色转换**:
- `cmykToRgb(c, m, y, k)` - CMYK → RGB 转换
- `brightness(rgb)` - 计算亮度值 (用于标签文字颜色)

**组管理**:
- `addGroup()` - 新建颜色组 (自动命名)
- `renameGroup()` - 重命名 (内联编辑)
- `deleteGroup()` - 删除组 (无确认)

**导入导出**:
- `importJSONAll()` - 导入完整库
- `exportJSONAll()` - 导出完整库
- `importGroupJSON()` - 导入单个颜色组
- `exportGroupJSON()` - 导出单个颜色组

**UI 渲染**:
- `renderGroupSelect()` - 更新组下拉框
- `renderSwatches()` - 更新颜色块网格
- `renderAll()` - 刷新整个 UI
- `buildSwatch(col, idx)` - 构建单个颜色块 DOM

#### 颜色提取逻辑

**支持的颜色类型**:
1. **CMYK Color** - 直接获取 CMYK 值
2. **RGB Color** - 转换为 CMYK:
   ```
   k = 1 - max(r/255, g/255, b/255)
   c = (1 - r/255 - k) / (1 - k) × 100
   m = (1 - g/255 - k) / (1 - k) × 100
   y = (1 - b/255 - k) / (1 - k) × 100
   ```
3. **Spot Color** - 提取 Spot 的基础 CMYK 颜色

#### 菜单项绑定

```
更多 (•••) 菜单:
├─ ＋ 新建颜色组
├─ ✎ 重命名颜色组 (需要组)
├─ ✕ 删除颜色组 (需要组) [危险]
├─ ─────
├─ ↓ 导入 JSON（全部）
├─ ↑ 导出 JSON（全部） (需要组)
├─ ↓ 按组导入
└─ ↑ 按组导出 (需要组)
```

---

## 用户交互流程

### 添加颜色流程

```
点击 "+ 添加颜色" 
  ↓
打开内联颜色编辑器
  ↓
编辑 CMYK 值 (实时预览)
  ↓
编辑颜色名称
  ↓
按 Enter 或点击 "确认"
  ↓
保存到当前颜色组 + 保存到文件 + localStorage
```

### 应用颜色流程

```
在 Illustrator 中选中对象
  ↓
在颜色库中单击颜色块
  ↓
颜色应用到 Illustrator 选中对象的填充色
```

### 导入颜色组流程

```
点击菜单 "按组导入"
  ↓
选择 JSON 文件
  ↓
自动重命名 (如果组名重复)
  ↓
添加到库 + 自动保存
```

---

## ExtendScript 颜色应用

### CMYK 颜色设置

```javascript
var ck = new CMYKColor();
ck.cyan = 0;      // 0-100
ck.magenta = 100;
ck.yellow = 100;
ck.black = 0;

selection[0].fillColor = ck;  // 应用到对象
```

### 递归应用到组

```javascript
function applyToAll(items, color) {
  for (var i = 0; i < items.length; i++) {
    try {
      if (items[i].typename === "GroupItem") {
        applyToAll(items[i].pageItems, color);  // 递归进组
      } else {
        items[i].fillColor = color;
      }
    } catch (e) {}
  }
}
```

---

## 错误处理策略

### 无弹窗设计
- ✗ 移除: `alert()`, `confirm()`, `window.prompt()`
- ✓ 替代: 静默失败或视觉反馈

### 常见错误处理

| 错误情况 | 处理方式 |
|---------|---------|
| 没有打开文档 | 静默，无颜色应用 |
| 没有选中对象 | 静默，无颜色应用 |
| 颜色提取失败 | 静默，不显示编辑器 |
| 文件保存失败 | 自动使用 localStorage 备用 |
| JSON 解析失败 | 静默，不导入 |
| 没有颜色组 | 灰显相关菜单项 |

---

## CSS 样式细节

### 按钮状态

```css
button {
  background: #505050;
  border: 1px solid rgba(94, 94, 94, 0.3);  /* 30% 透明 */
}

button:hover {
  background: #5a5a5a;
  color: #fff;
}

button:active {
  background: #1473e6;  /* 蓝色激活 */
  border-color: #0d5fc0;
  color: #fff;
}
```

### 颜色块悬停效果

```css
.cl-swatch {
  border: 1px solid rgba(0,0,0,0.2);
  transition: border-color 0.1s;
}

.cl-swatch:hover {
  border-color: rgba(255,255,255,0.55);
}

.cl-swatch:hover .cl-sw-label {
  opacity: 1;  /* 显示标签 */
}

.cl-sw-label {
  opacity: 0;  /* 默认隐藏 */
  transition: opacity 0.2s;
}
```

### 菜单浮动定位

```javascript
var r = button.getBoundingClientRect();
menu.style.top = (r.bottom + 3) + "px";
menu.style.right = (window.innerWidth - r.right) + "px";
menu.classList.toggle("cl-menu-open");  // display: block/none
```

---

## 默认初始化

- **首次启动**: 自动创建名为 "momo" 的默认颜色组
- **自动保存**: 每次颜色编辑后自动保存
- **持久化**: 使用双层存储 (文件系统 + localStorage)

---

## 性能考虑

- **CSS 优化**: 使用 `flex` 布局，避免重排
- **事件委托**: 使用事件冒泡处理多个颜色块
- **异步操作**: 路径初始化异步执行，不阻塞 UI
- **JSON 序列化**: 支持美化格式 (2 空格缩进)

---

## 扩展建议

### 可能的增强功能
1. 颜色历史记录
2. 颜色搜索/过滤
3. 颜色标记为 Spot Color
4. 批量编辑颜色
5. 颜色预设主题
6. 云同步支持
7. 快捷键绑定
8. 拖放排序

### 代码维护
- 遵循严格模式 (`"use strict"`)
- 使用 IIFE 封装全局作用域
- 所有函数添加文档注释
- 保持模块分离 (panel.js + color_library.js)

---

## 文件清单

### HTML / CSS / JS
| 文件 | 用途 | 行数 |
|-----|------|------|
| index.html | UI 结构 | 171 |
| css/style.css | UI 样式 | 351 |
| js/panel.js | 事件绑定 | 47 |
| js/color_library.js | 颜色库核心 | ~650 |

### 配置
| 文件 | 用途 |
|-----|------|
| CSXS/manifest.xml | CEP 配置 |

### 图标
| 文件 | 用途 |
|-----|------|
| images/IconLight.png | 浅色主题 |
| images/IconDark.png | 深色主题 |

---

## 快速开始

### 安装

#### 1. 获取扩展文件夹

**推荐：从 Releases 下载安装包**

1. 打开 [Releases](https://github.com/tomideas/momo-illustrator/releases)  
2. 下载最新版 **`momo-tools-x.xx-cep.zip`**（例如 `momo-tools-2.101-cep.zip`）  
3. 解压后得到 **`com.tomideas.illustratortools`** 文件夹（文件夹名须保持此名称）

**或从源码安装**

克隆仓库后，复制 **`extension/com.tomideas.illustratortools`** 文件夹：

- 仓库：https://github.com/tomideas/momo-illustrator

#### 2. 复制到 CEP 扩展目录

| 系统 | 目标路径 |
|------|----------|
| **macOS** | `~/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/` |
| **Windows** | `%APPDATA%\Adobe\CEP\extensions\com.tomideas.illustratortools\` |

完整路径示例：

```text
macOS:
  /Users/你的用户名/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/

Windows:
  C:\Users\你的用户名\AppData\Roaming\Adobe\CEP\extensions\com.tomideas.illustratortools\
```

若 `CEP/extensions` 文件夹不存在，请先手动创建 `extensions` 再粘贴。

**macOS 快捷打开目录**（终端）：

```bash
open ~/Library/Application\ Support/Adobe/CEP/extensions/
```

**Windows 快捷打开目录**：资源管理器地址栏输入 `%APPDATA%\Adobe\CEP\extensions` 后回车。

#### 3. 启用未签名扩展（首次安装必做）

Momo Tools 为开发版 CEP 扩展，需开启 **PlayerDebugMode**，否则菜单里可能看不到面板。

**macOS**（终端执行，Illustrator 需完全退出后执行）：

```bash
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

**Windows**（以管理员或当前用户运行「命令提示符」）：

```cmd
reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_STRING /d 1 /f
reg add HKCU\Software\Adobe\CSXS.12 /v PlayerDebugMode /t REG_STRING /d 1 /f
```

> Illustrator 2024 及更新版本通常对应 **CSXS.12**；较旧版本用 **CSXS.11**。两条都设可兼容不同版本。

#### 4. 启动面板

1. **完全退出** Adobe Illustrator 后重新打开（不要只关面板）  
2. 菜单打开扩展：  
   - **macOS**：`窗口` → `扩展功能` → `Momo Tools`（部分版本为 `窗口` → `扩展`）  
   - **Windows**：`Window` → `Extensions` → `Momo Tools`  
3. 笔记面板：`Momo Notes`（同上菜单，或主面板「笔记」按钮）

面板底部显示版本号（当前 **v2.101**）。更详细的图文说明见：[使用指南](https://tomideas.github.io/momo-illustrator/#install)

#### 5. 卸载

删除对应 CEP 目录下的 `com.tomideas.illustratortools` 文件夹，重启 Illustrator 即可。

### 使用
1. 点击 "+ 添加颜色" 添加颜色
2. 从 Illustrator 选中对象，点击颜色应用
3. 点击 "•••" 菜单导出颜色库备份

### 备份和共享
- 点击 "↑ 导出 JSON（全部）" 导出整个库
- 点击 "↑ 按组导出" 导出单个颜色组给团队
- 接收到的 JSON 用 "↓ 导入" 恢复

---

## 许可与信息

- **开发者**: Momo (tomideas)
- **版本**: 2.101
- **最后更新**: 2026-06-23
- **兼容性**: Illustrator 17.0 - 99.9

---

## 故障排查

### 颜色重启后消失

**原因**: 文件系统保存失败

**解决**:
1. 确保对 `~/Library/Application Support/Adobe/` 有写权限
2. 系统会自动使用 localStorage 备用存储
3. 数据应该在 localStorage 中（使用开发者工具查看）

### 菜单项灰显

**正常行为**: 以下情况会灰显菜单项:
- 没有颜色组 → 重命名、删除、导出都灰显
- 只有导入可用 (新建首个组)

### 颜色应用无效

**检查**:
1. Illustrator 中是否有活跃文档?
2. 是否选中了对象?
3. 被选对象是否可以填充?

---

**完整文档生成日期**: 2026-05-23
