# Momo Tools — AI 开发说明文档

> 适用工具：Cursor、Claude Code、GitHub Copilot 等  
> 当前版本：Bundle 2.101 | 最后更新：2026-06-23

---

## 项目概述

**Momo Tools** 是一个 Adobe Illustrator CEP（Common Extensibility Platform）扩展面板。  
技术栈：HTML + CSS + JavaScript（面板 UI）+ ExtendScript JSX（调用 Illustrator API）。

---

## ⚠️ 重要：两个工作路径

| 路径 | 用途 |
|------|------|
| `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/` | **Live 路径（先改这里）**，Illustrator 直接读取，改完立即生效（需重启面板） |
| `extension/com.tomideas.illustratortools/` | **备份路径**，确认 live 版本没问题后同步过来 |

**工作流程：**
1. 修改 live 路径的文件
2. 在 Illustrator 中测试
3. 确认无误后同步到 `extension/` 备份
4. 同步命令：
```bash
rsync -av --exclude="*.png" --exclude=".DS_Store" \
  "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/" \
  "./extension/com.tomideas.illustratortools/"
```

---

## 版本号规则

每次修改必须同时更新以下三处，缺一不可：

| 文件 | 位置 | 格式 |
|------|------|------|
| `CSXS/manifest.xml` | `ExtensionBundleVersion` | `"2.xx"` |
| `js/panel.js` | `var PANEL_VERSION` | `"2.xx"` |
| `CHANGELOG.md` | 顶部新增条目 | `## [2.xx] — YYYY-MM-DD` |

Notes 面板有独立版本，修改 `note.html` 还需更新：

| 文件 | 位置 |
|------|------|
| `CSXS/manifest.xml` | `<Extension Id="...note" Version="1.x" />` |

---

## 文件结构

```
extension/com.tomideas.illustratortools/
│
├── CSXS/
│   └── manifest.xml          # CEP 配置：bundle 版本、支持的 AI 版本、面板尺寸
│
├── css/
│   └── style.css             # 主面板 UI 样式（深色 Adobe 风格，CSS 变量主题）
│
├── js/
│   ├── panel.js              # 主面板逻辑：按钮绑定、版本显示、主题切换
│   └── color_library.js      # 颜色库全部业务逻辑（~1000 行）
│
├── jsx/scripts/              # ExtendScript 脚本（调用 Illustrator DOM API）
│   ├── _shared.jsx           # 共用工具：loadPrefs/savePrefs、文件路径工具
│   ├── check_overset_text.jsx          # 文字溢出检查 v5.9.3
│   ├── check_trailing_text.jsx         # 尾端空白/空段检查 v1.0.1
│   ├── check_text_color.jsx            # 文字颜色检查
│   ├── illustrator_text_style_checker_v8.1.8_compact_cn.jsx  # 文字样式检查
│   ├── artboard_duplicate_v1.1.2.jsx   # 复制画板
│   ├── artboard_renamer_v1.2.1.jsx     # 画板更名
│   ├── artboard_relayout_v1.5.8.jsx    # 重新排列
│   ├── add_page_numbers_tomideas.jsx   # 批量页码
│   ├── grid_system_v1.0.0.jsx          # 网格系统
│   ├── generate_color_box.jsx          # 颜色标签生成
│   ├── debug_overset.jsx               # 旧版调试脚本（保留备用）
│   ├── research_overset_probe.jsx      # 溢出诊断（交互式，面板按钮触发）
│   └── research_trailing_text_probe.jsx # 尾端空白诊断（交互式，面板按钮触发）
│
├── images/                   # 面板图标（PNG）
├── index.html                # 主面板 HTML 结构（205 行）
└── note.html                 # Momo Notes 笔记面板（337 行）
```

---

## 核心架构

### CEP 通信桥接

```
JS（面板 UI）
  ↓  window.__adobe_cep__.evalScript(script, callback)
JSX（ExtendScript）
  ↓  Illustrator DOM API（app、doc、textFrames 等）
Adobe Illustrator
```

**panel.js 中的调用方式：**
```javascript
function runScript(filename) {
    var extPath = cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
    var scriptPath = extPath + "/jsx/scripts/" + filename;
    cs.evalScript('$.evalFile("' + scriptPath + '")', function(result) { ... });
}
```

> ⚠️ **安全规则 / Security rule**：`runScript` 的 `filename` 参数**必须是 hardcode 的字串常量**（来自 `bind()` 调用），**禁止**让使用者输入参与 `scriptPath` 的组装。`$.evalFile()` 的字串拼接若被注入 `"` 字元即可逃逸并执行任意 ExtendScript 程式码。

### 按钮绑定（panel.js）

```javascript
bind("btn-overset",       "check_overset_text.jsx");
bind("btn-trailing-text", "check_trailing_text.jsx");
bind("btn-text-checker",  "illustrator_text_style_checker_v8.1.8_compact_cn.jsx");
bind("btn-debug",         "research_overset_probe.jsx");
bind("btn-trailing-debug","research_trailing_text_probe.jsx");
// 其余按钮见 panel.js 第 87-97 行
```

### 颜色库存储（双层）

```
主存储：~/Library/Application Support/Adobe/MomoTools/color_library.json
备用：  localStorage["MomoTools_ColorLibrary"]
```

### Notes 存储

```
localStorage["MomoTools_NoteTabs"]    = JSON.stringify(tabNames[])
localStorage["MomoTools_NoteTab_0"]   = tab0 content (innerHTML)
localStorage["MomoTools_NoteTab_1"]   = tab1 content (innerHTML)
localStorage["MomoTools_NoteActive"]  = activeIdx
localStorage["MomoTools_NoteFontSize"] = fontSize
```

---

## 各脚本说明

### check_overset_text.jsx（v5.9.3）

检测文字框是否溢出（有红色 `+` 标志），用红框标注。

**三条检测规则（顺序执行，任一触发即判为溢出）：**

```javascript
// M4a：去掉所有空白后，contents 比 lines 多出 > 4 个字符
if (stripWS(tf.contents).length - sumStripWS(tf.lines) > TOLERANCE)
    return "vertical";

// M8：复制文字框→转点文字→比对 contents 是否缩短
if (probeOverflowByPointContents(tf))
    return "point";

// M12：(段落数-1) × 行高 > 框高 + 0.6×行高（尾端空段落溢出）
if ((tf.paragraphs.length - 1) * leading > frameH + 0.6 * leading)
    return "trailing";
```

**TOLERANCE = 4**（防止浮点误差误判）

**已知陷阱（不要轻易修改规则）：**
- `tf.characters` = 整个 story 字数（含串接框），**不能用**
- `tf.contents` = 本框字数，可以用 ✓
- Illustrator contents 永远尾随隐式 `\r`，计算时需减 1
- M4b/M4c（保留 `\r` 计字数差）会误判多段落表格框，**已移除**

详细研究记录见 `docs/OVERSET_DETECTION_RULES.md`。

---

### check_trailing_text.jsx（v1.0.1）

检测文字框末尾是否有多余空格/Enter，用橙色框标注。

**检测逻辑：**
```javascript
function detectTrailingIssue(tf) {
    var s = stripImplicitFinalParagraph(s);  // 先去掉隐式末段符
    if (/[\r\n\x03]+.../.test(s)) return "空段";  // 多余 Enter
    if (/[ \t　]+$/.test(s))       return "空白";  // 多余空格
}
```

---

### note.html（Momo Notes 面板）

独立 CEP 扩展（`com.tomideas.illustratortools.note`），通过 `requestOpenExtension` 打开。

**关键实现：**
- 存储：`saveContent` 用 `content.innerHTML`（保留 `<div>`/`<br>`/表格 HTML），`loadContent` 用 `content.innerHTML =` 还原
- 纯文字检测：若内容无 `<` 字元（旧纯文字资料），`loadContent` 转用 `textContent =`
- 换行保留：`#content` CSS `white-space: pre-wrap` 保留 `\n` 字面换行；浏览器产生 `<div>`/`<br>` 也正常显示
- **⚠️ `\r\n` 标准化**：贴上和 `loadContent` 都须 `replace(/\r\n?/g, "\n")`。Chromium 41 的 contenteditable 中 `\r`（carriage return）会把游标拉回行首导致后续文字覆盖前面行
- Markdown 表格：粘贴时检测 `| --- |` 语法，调用 `renderMarkdownTables()` 转为 HTML `<table>`
- 复制为纯文本：拦截 `copy` 事件，强制 `text/plain`
- **⚠️ 首次打开**：`requestOpenExtension` 须连调两次。CEP 首次调用只初始化面板（加载 HTML/JS），第二次才把面板带到前台。见 `panel.js:124`

---

### _shared.jsx

所有 JSX 脚本都 `$.evalFile` 这个文件，提供：
- `loadPrefs(filename, defaults)` — 从 JSON 文件加载偏好设置
- `savePrefs(filename, data)` — 保存偏好设置到 JSON
- 设置文件路径：`~/Library/Application Support/Adobe/MomoTools/`

---

## UI 样式规范

**颜色变量（CSS Variables，由 panel.js applyTheme 动态写入）：**

| 变量 | 用途 | 深色主题默认值 |
|------|------|--------------|
| `--bg` | 面板背景 | 跟随 AI 主题 |
| `--bg-secondary` | 次级背景 | bg 偏暗 9 |
| `--bg-hover` | 悬停背景 | bg 偏亮 5 |
| `--bg-active` | 激活色 | `#1473e6` |
| `--fg` | 主文字色 | `#e0e0e0` |
| `--fg-dim` | 次要文字 | `#999999` |
| `--border` | 边框（淡） | `rgba(160,160,160,0.15)` |
| `--border-strong` | 边框（明显） | `rgba(140,140,140,0.25)` |

---

## 常见修改场景

### 新增面板按钮

1. `index.html`：在对应 `<div class="group">` 中加 `<button id="btn-xxx">` 
2. `panel.js`：加一行 `bind("btn-xxx", "your_script.jsx");`
3. 新建 `jsx/scripts/your_script.jsx`
4. 更新 bundle 版本 + CHANGELOG

### 修改溢出检测规则

1. 先看 `docs/OVERSET_DETECTION_RULES.md` 了解历史
2. 修改 `jsx/scripts/check_overset_text.jsx` 中的 `isOverset()` 函数
3. **必须用 `research_overset_probe.jsx` 验证**（面板「溢出诊断」按钮）
4. 不要轻易加入使用 `tf.characters` 或保留 `\r` 的计算

### 修改颜色库 UI

颜色库逻辑全在 `js/color_library.js`，UI 结构在 `index.html` 的 `#cl-*` 元素。

### 修改 Notes 面板

直接编辑 `note.html`（HTML + CSS + JS 全在一个文件）。  
修改后必须升 `<Extension Id="...note" Version="1.x" />` 版本，否则 CEP 会用缓存。

---

## 调试技巧

### 打开 CEP 调试工具

在 `CSXS/manifest.xml` 同目录的 `.debug` 文件定义调试端口：
```xml
<Extension Id="com.tomideas.illustratortools">
  <HostList><Host Name="ILST" Port="8088"/></HostList>
</Extension>
```
Chrome 访问 `http://localhost:8088` 打开 DevTools。

### JSX 错误调试

ExtendScript 错误会通过 `evalScript` callback 返回 `"EvalScript error: ..."` 字符串，panel.js 会弹出 alert。

### 设置不生效

CEP 有强缓存，改文件后必须**完全退出 Illustrator（Quit）**再重启，不能只关面板。

---

## 文档索引

| 文件 | 内容 |
|------|------|
| `README.md` | 项目概述、安装、功能介绍 |
| `CHANGELOG.md` | 完整版本历史 |
| `extension/.../docs/help.html` | 在线使用说明（HTML，Visual 浏览）|
| `docs/EXTENDSCRIPT_PITFALLS.md` | ExtendScript 常见坑与约定（开发必读）|
| `docs/OVERSET_DETECTION_RULES.md` | 溢出检测算法研究记录（开发参考）|
| `CLAUDE.md` | 本文件（AI 工具开发说明）|
