## [2.101] — 2026-06-21

### 改善 / Improvements
- **网格系统 v1.2.0 移除行数 sync 复选框 / Grid System remove row sync checkbox**：行数改用独立的「间距」复选框（与列数、等分网格统一），不再使用 sync 复选框。

## [2.100] — 2026-06-21

### 新增 / New Features
- **网格系统 v1.1.0 保留上次网格 / Grid System keep previous grids**：「应用」时新增「保留上次网格」复选框，勾选后不清除上次网格线，支持叠加多种网格。
- **网格系统 v1.1.0 间距开关 / Grid System gutter toggle**：瑞士网格的列数和行数、等分网格各新增一个间距复选框，取消勾选则对应间距强制为 0。三个复选框样式统一。

## [2.89] — 2026-06-19

### 新增 / New Features
- **位置诊断 v1.0.0 / Position diagnostic**：面板底部连点 3 次展开开发工具，新增「📍 位置诊断」按钮。一键检查 10 个 `xxx_pos.json` 的存在性 + 文件内容 + `loadPos` 返回值。
- **延续盘点编号 / Continue inventory numbering**：样式检查「延续」模式自动接续上次盘点编号（`text_style_inventory.json`），跨批次同一样式永远同一 ID。

### 修復 / Fixes
- **位置记忆完全失效 / Position memory never worked**：ExtendScript 没有 `JSON` 对象，所有 `JSON.parse` 静默失败（被 try/catch 吃掉）。新增 `_parseJson()` 全局 polyfill（优先 `JSON.parse`，否则 `eval` 后备），适用于 `loadPrefs` / `loadPos` / `loadStyleInventory`。
- **双屏负坐标被拒绝 / Negative coords rejected**：`if (pos.x >= 0)` 守卫把副屏负数坐标当非法，全部居中。移除全部 10 个脚本的该判断，改为 `try { dlg.location } catch { dlg.center }`。
- **`dlg.show()` 被误删 / dlg.show() accidentally removed**：批量 regex 替换时，`dlg.show()` 与 `else dlg.center()` 同行的 3 个脚本被误删 show 调用 → 全部对话框打不开。已恢复并补验证脚本。
- **样式检查载入崩溃 / Text checker load crash**：缺少 `$.evalFile(... _shared.jsx)` 引入 → `loadPrefs is not defined`。
- **延续模式库存空文件 / Continue mode inventory empty**：`savePrefs` 对含中文长键名生成无效 JSON（0 字节）。改为直接 `File.write` + key 转义。`loadStyleInventory` 新增 0 字节保护。

### 改善 / Improvements
- **样式检查 v8.2.0 四大简化 / Text style checker simplification**:
  - **画板选择双模式 / Dual artboard selection**：1. 范围面板新增多选画板列表 + 「全部」按钮，与「画板范围」输入框双向同步。
  - **标记规则精简 / Attention rules simplified**：下拉从 5 项精简为 2 项（仅盘点 / 标记 ≤ N 次）。
  - **输出简化 / Output simplified**：4 个 checkbox 简化为「生成说明」+ 全新／延续 radio。编号 + 需注意固定为开，同一图层「文字样式标注」输出。
  - **移除高级面板 / Advanced panel removed**：删除「⚙ 高级」及「最多处理文本框」，以画板选择替代大文件卡顿。
- **诊断按钮深红 / Diag buttons dark red**：溢出/尾端/位置三个诊断按钮统一深红（`#e06060`），不再用橙色。
- **新建设计文档 / New design docs**：`docs/EXTENDSCRIPT_PITFALLS.md` 记录 ExtendScript 常见坑与约定（JSON 缺失、ES3 限制、loadPrefs 陷阱、双屏坐标等）。

## [2.88] — 2026-06-19

### 改善 / Improvements
- **画板更名 v1.2.0 重构 / Renamer redesign**: 「后缀」从侧边列改为独立命名模式（第 4 个 radio），位于「逐行」之后。四种模式：模板 / 替换 / 逐行 / 后缀。后缀模式仅在各原名末尾追加固定文字。

## [2.87] — 2026-06-19

### 新增 / New Features
- **网格系统 v1.0.0 / Grid System**：从「@Reference/网格系统 V0.3」完整移植，按钮置于「批量页码」上方。3 种网格：瑞士网格（列/行/间距）、等分网格（分割数/对角线）、黄金比例（斐波那契项数/双轴/对角线）。单位 px/mm/pt 自动转换。内边距 4 边独立可同步。实时预览图层 `_网格预览`，可「转为参考线」一键转换。源出处：火山字型 canfei。

## [2.86] — 2026-06-19

### 改善 / Improvements
- **画板更名 v1.1.1 调整 / Renamer suffix relocation**: 「追加后缀」从「替换」模式移到命名区右侧独立列，三种命名模式（模板/替换/逐行）均适用。空值不追加。

## [2.85] — 2026-06-19

### 改善 / Improvements
- **画板更名 v1.1.0 增强 / Renamer enhanced**: 「替换」模式新增「追加后缀」输入框，配合「查找/替换为」使用（如 `FR_01` 查 FR_ 替 CN_ 加 _v2 → `CN_01_v2`）。标题统一简体中文。

## [2.84] — 2026-06-19

### 改善 / Improvements
- **复制画板 v1.1.1 精简 / Duplicate simplified**: 移除「追加后缀」字段（不常用），移除 `preferredSize` 让对话框按内容自适应，减小对框底部空白。`getNameOptionsFromUI` 修复未勾选时仍套用默认 FR_→xx_ 替换的 bug。

## [2.83] — 2026-06-19

### 改善 / Improvements
- **复制画板 v1.1.0 界面重构 / Duplicate UI redesign**：标题统一简体中文；第 2 段改名为「名称编辑」，新增 checkbox 控制重命名（默认不启用）；命名示例从第 3 段移至第 2 段；第 3 段改名为「位置与间距」，间距/位移分两子面板，标签更直观（左右间距/上下间距/左右位移/向下位移）；文案全面优化。
- **Notes 架构回归 / Notes back to main bundle**：Momo Notes 从独立 bundle (`com.tomideas.momonotes`) 移回主 bundle (`com.tomideas.illustratortools.note`)，共用单个 CEP 实例，消除跨 bundle 白屏与弹窗 (ccx_fnft_dialog_name) 问题。Notes AutoVisible 改为 true，CEP 原生管理加载。

### 修復 / Fixes
- **Notes 重启白屏 / Notes white screen on restart**：AutoVisible=true 让 CEP 自行管理面板生命周期，绕开 AutoVisible=false + workspace restore 的 CEP bug。
- **ccx_fnft_dialog_name 弹窗 / popup dialog**：因移除独立 bundle 后不再触发跨 bundle CEP 初始化错误。

### 版本提升 / Version bumps
- Bundle 2.65 → 2.83（跳过 2.66-2.82 = 此周期的试验版本）
- Notes Extension: 独立 bundle 已禁用，回归主 bundle v1.6

## [2.65] — 2026-05-28

### 修復 / Fixes
- **Notes 貼上後部分行消失 / Notes lines missing after paste**：貼上處理加入 `\r\n` → `\n` 標準化。Chromium 41 的 contenteditable 中，`\r`（carriage return）會把游標拉回行首，導致後續文字覆蓋前面行。`loadContent` 同步標準化，防止已污染資料再次出現。
- **首次點擊無法打開 Notes / Notes not opening on first click**：主面板「笔记」按鈕點擊時連調兩次 `requestOpenExtension`。CEP 首次調用只初始化面板不顯示，第二次才帶到前台。
- **Notes paste handler + loadContent**: normalize `\r\n` → `\n` to prevent carriage return from overwriting previous lines in Chromium 41 contenteditable.
- **Notes first-click fix**: call `requestOpenExtension` twice in the note button handler; CEP first call initializes, second call shows the panel.

### 版本提升 / Version bumps
- Notes Extension 1.3 → 1.4

# Changelog - Momo Tools

## [2.64] — 2026-05-27

### 改善 / Improvements
- **Notes 編輯模式直接顯示 markdown 表格 / Inline markdown table rendering**：移除預覽模式切換。改為「貼上時自動偵測 markdown 表格 → 渲染成 HTML `<table>` 插入」，編輯模式直接看到表格、儲存格可點擊修改。
- **複製永遠 plain text / Copy always plain text**：`copy` 事件強制 `text/plain`，貼到 Illustrator 不會帶 HTML 樣式。
- **儲存格式改用 innerHTML / Storage uses innerHTML**：保留表格結構；舊純文字資料相容（偵測無 `<` 時用 textContent 載入）。
- **Inline markdown tables**: removed preview toggle. Paste handler detects markdown table syntax and converts to HTML `<table>` inline, immediately visible in edit mode.
- **Copy forces plain text**: `copy` event sets only `text/plain` so pasting to Illustrator drops HTML formatting.

### 版本提升 / Version bumps
- Notes Extension 1.2 → 1.3（CEP cache invalidation）

## [2.63] — 2026-05-27

### 新增 / New Features
- **Notes 預覽模式 + Markdown 表格 / Notes preview mode + Markdown tables**：footer 加「👁 預覽」按鈕。預覽模式把 markdown 表格 (`| col | col |\n|---|---|\n| a | b |`) 渲染成 HTML `<table>`，並支援切 tab 即時刷新。
- **複製為純文字 / Copy as plain text**：預覽模式攔截 `copy` 事件，強制 `text/plain` clipboard 資料 → 貼到 Illustrator 不會帶 HTML 表格樣式。
- **Notes preview mode + Markdown tables**: toggle button in footer renders markdown table syntax as HTML `<table>`. Preview-mode copy event forces `text/plain` so pasting to Illustrator yields plain text.

### 改善 / Improvements
- Notes extension version 1.1 → 1.2（強制 CEP 重載新 HTML）。

## [2.62] — 2026-05-27

### 修復 / Fixes
- **Notes 面板空白無法輸入 / Notes panel blank**：升 Notes Extension 版本 (1.0 → 1.1) 強制 CEP 重載快取的 HTML/JS。
- **saveContent 加防呆 / saveContent guarded**：偵測 `innerText` 是否可用，否則退回 `textContent`；同時把 `\r\n` 統一成 `\n` 避免雙倍空行。
- **Notes panel blank**: bumped Note extension version (1.0 → 1.1) to invalidate CEP HTML cache.
- **saveContent fallback**: detect `innerText` availability, fall back to `textContent`; normalize `\r\n` → `\n`.

## [2.61] — 2026-05-27

### 修復 / Fixes
- **Notes 切換 tab 後換行消失 / Notes newlines lost after tab switch**：`saveContent` 用 `textContent`，無法捕捉 contenteditable 內 `<div>`/`<br>` 結構代表的換行；改用 `innerText`（會渲染成 `\n`），配合既有 `white-space: pre-wrap` CSS 正確還原。
- **Notes newlines lost on tab switch**: `saveContent` used `textContent` which flattens `<div>`/`<br>` block structure without inserting newlines. Switched to `innerText` to preserve `\n` characters.

## [2.60] — 2026-05-27

### 改善 / Improvements
- **「尾端空白诊断」改為互動式 / Interactive trailing-text diagnosis**：對照溢出诊断統一介面。逐框自動選取＋縮放，顯示腳本判斷（空段 / 空白 / 正常）＋ 尾端可視化（`↵`=Enter, `·`=空格, `□`=全角空格, `→`=Tab）＋ Unicode codes。使用者按「應該標 / 不應該 / 跳過 / 停止」，最後輸出 FP/FN 比對報告。
- **Interactive trailing-text diagnosis**: matches overset diagnosis UX. Shows visualized tail (`↵` enter, `·` space, `□` ideographic space, `→` tab) and Unicode codes, prompts Y/N, outputs FP/FN report.

## [2.59] — 2026-05-27

### 修復 / Fixes
- **文字溢出檢查 v5.9.3 / Overset check v5.9.3**：M12 公式扣除隱式末段符。
  - 原公式 `paragraphs × leading` 沒考慮 Illustrator 為每個 Area Text 自動附加的隱式 `\r`，導致**單行正常框被誤判**（互動診斷 17 框中 12 框 FP 全是這原因）。
  - 新公式 `(paragraphs - 1) × leading > frameH + 0.6×leading`，只在實際有額外空段時觸發。
- **Overset check v5.9.3**: M12 formula now subtracts 1 to exclude Illustrator's implicit paragraph terminator, fixing single-line frame false positives.

## [2.58] — 2026-05-27

### 改善 / Improvements
- **「溢出诊断」改為互動式 / Interactive overset diagnosis**：逐框自動選取＋縮放，顯示腳本判斷後問使用者「有沒有紅+」，最後比對輸出 FP/FN 報告。可隨時跳過或停止。
- **Interactive diagnosis**: per-frame select + zoom + ask Y/N, then compare script verdict vs user answer to surface FP/FN cases.

## [2.57] — 2026-05-27

### 修復 / Fixes
- **文字溢出檢查 v5.9.2 / Overset check v5.9.2**：M12 回退至 v5.9.0 的高度公式 (`paragraphs × leading > frameH`)。v5.9.1 改用 `paragraphs > lines` 比對在多段落正常框造成大量誤判，已撤回。
- **Overset check v5.9.2**: M12 reverted to height-based formula (v5.9.0). v5.9.1's `paragraphs > lines` rule caused too many false positives on normal multi-paragraph frames.

### 清理 / Cleanup
- 移除測試專用腳本 `batch_overset_probe.jsx`、`label_frames_for_verify.jsx`、`verify_red_plus.jsx`（僅在開發階段使用，已完成驗證）。

## [2.56] — 2026-05-27

### 改善 / Improvements
- **「溢出诊断」探針重寫 / Overset diagnosis probe rewrite**：跟隨 check_overset v5.9.1，移除過時的 M1/M2/M7/M9/M10/M11 量測，只保留 M4a + M8 + M12。每框輸出清楚的觸發原因（vertical / point / trailing）和總結統計。
- **面板版本號同步 / Panel version sync**：footer 顯示更新為當前 bundle 版本。
- **Diagnosis probe rewritten** to match v5.9.1 (M4a + M8 + M12 only); panel footer version synced.

## [2.55] — 2026-05-27

### 修復 / Fixes
- **文字溢出檢查 v5.9.1 / Overset check v5.9.1**：補強尾端 `\r` / `\r\r` / 空格溢出偵測。
  - M12 改為「段落數 vs 行數」直接比對 (`paragraphs.length > lines.length`)，取代原本依賴 `leading × paragraphs` 的高度公式。
  - 原規則在自動行距或未明確設定 leading 時失靈，導致 trailing whitespace/Enter 溢出漏判。
- **Overset check v5.9.1**: catch trailing `\r` / `\r\r` / whitespace overset.
  - M12 simplified to `paragraphs.length > lines.length` (was leading-based height formula, unstable with auto-leading).

## [2.54] — 2026-05-27

### 修復 / Fixes
- **文字溢出檢查 v5.9.0 / Overset check v5.9.0**：依 17 框人工標注矩陣定稿。
  - 移除 M4b/M4c（保留 `\r` 會把段落分隔符算成隱藏字 → 表格/列表必假陽性，例如 25 行表格 M4c=25）。
  - 新增 M12「段落高度比對」（`paragraphs × leading > frameH`）→ 抓尾端 `\r\r` 純空段溢出，這類案例 M4a/M8 都偵測不到。
  - 最終規則：**M4a（裁實字）+ M8（轉點文字）+ M12（空段超框）**。
- **Overset check v5.9.0**: finalized via 17-frame manually-labeled matrix.
  - Removed M4b/M4c (preserving `\r` counts paragraph separators as hidden → false positives on tables/lists).
  - Added M12 paragraph-height comparison to catch trailing `\r\r` overset that M4a/M8 miss.

### 開發工具 / Dev Tools
- 新增 `batch_overset_probe.jsx`：批次跑測試集，輸出 FP/FN 矩陣與 CSV，定量驗證偵測規則。
- 新增 `verify_red_plus.jsx`：逐框人工標注助手（自動選取＋對話框）。
- 新增 `~/Desktop/overset_test_corpus/`：測試集模板與 README。

## [2.53] — 2026-05-26

### 新增 / New Features
- **Momo Notes 增强 / Enhanced Notes**：分页默认命名改为「笔记 1」「笔记 2」；支持双击 tab 名称内联重命名；支持拖曳 tab 重新排序，内容自动跟随。
- **Notes tabs enhanced**: default names changed to "笔记 1", "笔记 2"; double-click tab name to rename inline; drag-and-drop tab reordering with content remapping.

### 修復 / Fixes
- **笔記 tab 关闭内容丢失 / Notes closeTab content lost**：修复关闭 tab 后 localStorage key 未移位导致后续 tab 内容为空。
- **笔記首 tab 文字消失 / Notes first tab text invisible**：`.tab-name` 移除 `overflow: hidden`，修复旧版 Chromium flex 布局中 span 宽度塌陷。
- **画板重排元素没动 / Relayout content not moving**：`moveArtboardAndContents` 不再依赖 `selectObjectsOnActiveArtboard`，改用全遍历 `collectItemsOnArtboard`。
- **prefs 保存失敗 / savePrefs silent failure**：`_shared.jsx` 中 `savePrefs` 增加文件打开检查与桌面错误日志。

### 改善 / Improvements
- **画板重排简化 / Relayout simplified**：移除模式切换与循环/固定选项，其余行自动按最后数字固定。
- **颜色库入颜色組 / Color library merged into Color group**：颜色库并入「颜色」分组。

## [2.52] — 2026-05-26

### 改善 / Improvement
- **按键底色统一 / Button background matches panel**：按钮及表单元素背景由 `--bg-secondary` 改为 `--bg`，与面板底色一致。
- **面板图标重构 / Panel icon refresh**：所有功能按钮 SVG icon 重新设计，增强功能辨识度：画板更名改为「文档+铅笔」、颜色标签改为「四宫格色卡」、颜色检查改为「放大镜+色点」、文字样式检查改为「A字+对勾」、文字溢出改为「文本框+溢出标记」、尾端空白改为「文本框+删除线」、批量页码改为「叠页+数字」、笔记改为「笔记本+笔」。移除「颜色库」分组标题，色票区域直接显示。

## [2.51] — 2026-05-26

### 修復 / Fix
- **主题跟随修复 / Theme following fix**：`rgbToHex()` 未处理 CEP `UIColor` 的 `.color` 嵌套结构，导致 `panelBackgroundColor` 始终解析为 `#000000`，面板无法跟随 Illustrator 四种 UI 主题切换。现同时兼容两种格式。

## [2.50] — 2026-05-26

### 改善 / Improvements
- **面板分组重构 / Panel layout restructure**：「颜色检查」从「文字」组移至「颜色」组，与「颜色标签生成」并列；新增「工具」组，将「批量页码」与「笔记」统一收纳。面板顺序调整为：画板 → 颜色 → 颜色库 → 文字 → 工具。
- **Panel layout restructure**: moved "Color Check" from the "Text" group to the "Color" group alongside "Color Label Generator"; added a new "Tools" group containing "Batch Page Numbers" and "Notes". Panel order: Artboard → Color → Color Library → Text → Tools.

## [2.49] — 2026-05-26

### 新增 / New Features
- **颜色检查 v1.6.0 / Color Check v1.6.0**：检查范围再增「描边」checkbox，可扫描 PathItem 的 strokeColor。描边颜色与填色独立统计，报告中以「（描边）」后缀区分。标注时描边数字置于对象右上角，红框使用橙色以便与填色区分。
- **Color Check v1.6.0**: added "Stroke" checkbox to scan PathItem strokeColor. Stroke colors are counted independently from fills, marked with "(Stroke)" suffix in reports. Annotations placed at top-right with orange borders to distinguish from fill annotations.

## [2.48] — 2026-05-26

### 改善
- **面板顏色跟隨 Illustrator UI / Panel follows Illustrator UI theme**：透過 `getHostEnvironment().appSkinInfo.panelBackgroundColor` 讀取主機面板底色，自動適配四種主題（Dark / Medium Dark / Medium Light / Light）。Momo Tools 與 Momo Notes 兩個 Panel 的背景、按鈕、文字、邊框等全部改用 CSS custom properties，監聽 `ThemeColorChanged` 在用戶切換主題時即時更新。

## [2.47] — 2026-05-26

### 新增 / New Features
- **颜色检查 v1.5.0 / Color Check v1.5.0**：「文字颜色检查」改名为「颜色检查」，检查范围新增「文字」与「形状」两个可勾选类型，可同时扫描 TextFrame 字符填色与 PathItem 形状填色，并在同一报告中汇总颜色使用情况。
- **Color Check v1.5.0**: renamed "Text Color Check" to "Color Check"; added two checkboxes for "Text" and "Shapes" in the scope panel, allowing simultaneous scanning of TextFrame character fills and PathItem shape fills with unified reporting.

### 改善 / Improvements
- **标注图层改名 / Layer rename**：标注图层名称从「文字颜色编号」简化为「颜色编号」，与新的功能范围保持一致。
- **Layer rename**: annotation layer renamed from "Text Color Numbering" to "Color Numbering" to match the broader scope.

## [2.34] — 2026-05-25

### 新增 / New Features
- **尾端空白诊断探针**：开发区新增只读诊断按钮，输出 Area Text 尾端原始字符码、lines/paragraphs 数据和候选规则结果，用于一次性定稿，避免反复猜测。
- **Trailing text diagnostic probe**: adds a read-only dev probe that reports raw tail character codes, lines/paragraphs data, and candidate rule results.

## [2.33] — 2026-05-25

### 修復 / Fixes
- **尾端空白 / 空段检查 v1.0.1**：忽略 Illustrator 区域文字正常自带的末尾段落结束符，避免所有区域文字被误判为空段。
- **Trailing whitespace / empty paragraph check v1.0.1**: ignores Illustrator Area Text's implicit final paragraph marker to avoid flagging every Area Text frame.

## [2.32] — 2026-05-25

### 新增 / New Features
- **尾端空白 / 空段检查 v1.0.0**：新增独立文字清理检查，扫描区域文字尾端空白和空段落，并用橙色标注。
- **Trailing whitespace / empty paragraph check v1.0.0**: adds a separate cleanup check for Area Text trailing whitespace and empty paragraphs with orange annotations.

## [2.24] — 2026-05-25

### 改善 / Improvements
- 連點 footer 3 次顯示開發區：溢出诊断、重置（預設隱藏）

## [2.23] — 2026-05-25

### 移除 / Removed
- 面板開發按鈕：溢出诊断、重置所有設定（對應 jsx 仍保留在專案中）

## [2.19] — 2026-05-25

### 修復 / Fixes
- **文字溢出檢查 v5.0.0**：點文字對照探針，修復同排右欄（換行後 hidden≈0）漏判
- **Text overflow v5.0.0**: point-text probe catches same-row right cells missed by line-count heuristics

## [2.18] — 2026-05-25

### 修復 / Fixes
- **文字溢出檢查 v4.5.0**：修正 v4.4.0 將全部文字框誤判為溢出的問題
- **Text overflow check v4.5.0**: fixes v4.4.0 false positives flagging every text frame as overflow

## [2.17] — 2026-05-25

### 修復 / Fixes
- **文字溢出檢查 v4.4.0**：優先使用 Illustrator 原生 `overflows` 與末字 insertionPoint，修復水平溢出漏判
- **Text overflow check v4.4.0**: uses native `overflows` and end insertionPoint first to catch horizontal overflow missed by character-count heuristics

## [2.15] — 2026-05-25

### 新增 / New Features
- 組別排序：在更多選單中新增「按名稱排序組別」，一鍵將所有顏色庫組別按名稱排列。
- Group sorting: Added "Sort Groups by Name" in the more menu to sort all color library groups alphabetically with one click.

## [2.14] — 2026-05-25

### 新增 / New Features
- 色塊拖曳排序：長按色塊即可拖動到目標位置重新排列，方便整理顏色順序。
- Drag-and-drop swatch reordering: long-press a color swatch and drag it to a target position to rearrange the color order.

## [2.13] — 2026-05-25

### 改善 / Improvements
- HEX 和 CMYK 欄位現在完全獨立運作。手動輸入 HEX 時不再自動轉換覆蓋 CMYK 欄位，使用者可自由分別設定兩者。修改 CMYK 時仍會透過 Illustrator ICC 描述檔反向換算出對應 HEX 以更新預覽色塊。
- 提取按鈕改用吸管圖示，增加按鈕維持加號圖示，更易辨識。
- 從選中提取顏色時，名稱欄預設填入 CMYK 數值（如 C79 M26 Y42 K0）。
- HEX and CMYK fields are now fully independent. Typing a HEX value no longer auto-converts and overwrites CMYK; users can freely set each independently. Editing CMYK still reverse-calculates HEX via Illustrator's ICC profile to update the preview swatch.
- Extract button now uses an eyedropper icon; Add button keeps the plus icon for easier identification.
- When extracting a color from selection, the name field defaults to CMYK values (e.g. C79 M26 Y42 K0).

## [2.12] — 2026-05-25

### 修復 / Fixes
- 修復了應用顏色時「有些字體或形狀無法變色」的問題。這是因為 Illustrator 的 `複合路徑 (CompoundPathItem)` 經常會靜默忽略直接賦予的顏色。現在改為精準抓取並賦色到複合路徑底層的首個實體路徑上，確保所有字母與挖空圖形都能完美套用。
- Fixed an issue where applying colors failed on certain letters or shapes. This occurred because Illustrator's `CompoundPathItem` often silently ignores direct color assignments. The logic now precisely targets and colors the first underlying physical path within the compound path, ensuring all letters and hollow shapes are colored perfectly.

## [2.11] — 2026-05-25

### 改善 / Improvements
- 手動在面板輸入 HEX 時，現在會透過 Illustrator 內建的 `convertSampleColor` 將 RGB 轉換為 CMYK，確保輸入的 HEX 也能完美吻合文件設定的色彩描述檔（例如 U.S. Web Coated (SWOP) v2）。
- Hand-typed HEX values now use Illustrator's native `convertSampleColor` to convert RGB to CMYK, ensuring perfectly accurate matching with the document's ICC profiles.

## [2.10] — 2026-05-25

### 修復 / Fixes
- 修復了編輯器和色塊列表中 CMYK 轉換為 HEX 時的顯示不一致問題。現在 UI 全面強制使用從 AI 提取（ICC 精準）保存的 hex 屬性，不再被原生數學計算覆蓋。
- Fixed inconsistency between CMYK and HEX in the color editor and swatches list. The UI now completely forces the use of the ICC-accurate `hex` property extracted from AI, preventing it from being overwritten by native math calculations.

## [2.1] — 2026-05-23

### 改善
- **hex 輸入不需要 #**：輸入框只接受純 hex 值（如 FF3366），# 號由左側標籤顯示

## [2.9] — 2026-05-25

### 改善 / Improvements
- **色彩轉換精確度**: CMYK 轉換至 HEX 現在使用 `app.convertSampleColor` 以確保遵循 Illustrator 的 ICC 色彩描述檔 (ICC Color Profile)，解決 CMYK 值與預覽 HEX 碼不一致的問題

## [2.8] — 2026-05-25

### 改善 / Improvements
- **applyColor 診斷增強**: 回傳跳過數量和不支援的物件類型，方便排查
- **captureFromAI 群組支援**: 選中群組時從子物件提取顏色
- **applyColor 精確遞迴**: 明確列舉 PathItem/MeshItem，跳過無填色的 RasterItem/PlacedItem 等

## [2.7] — 2026-05-23

### 修復
- **應用顏色不完整**：新增 CompoundPathItem（複合路徑）支援，修復部分物件無法套色的問題

## [2.6] — 2026-05-23

### 修復
- **應用顏色失敗**：applyColor 加外層 try-catch + 錯誤 toast，TextFrame 處理更安全

## [2.5] — 2026-05-23

### 修復
- **hex 精度 v2**：修復 convertColor 常數名稱（RGBMODEL→RGB），並加 fallback：若 API 不可用則用簡易公式

## [2.4] — 2026-05-23

### 修復
- **文字溢出檢查**：新增水平溢出檢測，比較每行寬度與文字框寬度，右側截斷的文字也能檢出
- **診斷工具升級 v4**：顯示行寬溢出行數和文字框寬度

## [2.3] — 2026-05-23

### 修復
- **hex 精度**：透過 Illustrator ICC 色彩描述檔轉換 CMYK→hex，不再使用簡易公式近似值
- 已有精確 hex 的顏色在 tooltip 中不再顯示 (≈) 標記
- 色票顯示後自動非同步更新 hex 值，確保與 Illustrator 一致

## [2.2] — 2026-05-23

### 修復
- **文字套色**：應用顏色時正確處理 TextFrame，使用 characterAttributes.fillColor 設定文字顏色
- **提取文字色**：從文字提取顏色時優先讀取 characterAttributes.fillColor
- **hex 精度**：RGB 顏色提取時直接計算 hex，不再經過 CMYK 雙重轉換
- **移除除錯 toast**

### 改善
- **HEX≈ 標記**：hex 值右側顯示「HEX≈」提示為近似值

## [2.0] — 2026-05-23

### 修复
- **從選取提取顏色無反應**：三項修復 — (1) 無顏色組時顯示提示而非靜默退出 (2) ExtendScript 用 toFixed(0) 取代 String 隱式拼裝確保 CMYK 精度 (3) 新增 NoColor/GradientColor 不支援類型提示

### 新增
- **重置按鈕**：面板底部新增「重置所有設定」按鈕

## [1.8] — 2026-05-23

### 新增
- **重置按鈕**：面板底部新增「重置所有設定」按鈕，清除 localStorage 和所有 JSON 設定檔，方便測試首次安裝效果

## [1.8] — 2026-05-23

### 改善
- **momo 組青春配色**：默認顏色改為低彩度柔和色調（蜜桃粉/薄荷綠/薰衣草/奶油黃），取代原高彩度原色
- **尊重用戶刪除**：移除 init() 強制重建 momo 邏輯，僅在首次安裝（無任何儲存資料）時建立默認組

## [1.7] — 2026-05-23

### 改善
- **新建顏色組自動進入命名模式**：點擊「新建顏色組」後立即顯示內聯輸入框，用戶可直接輸入名稱，無需額外點擊「重命名」

## [1.6] — 2026-05-23

### 修復
- **momo 顏色組被覆蓋**：`loadLibrary()` 原執行 `library = parsed` 完全替換了 `init()` 同步建立的 momo 組。改為 `mergeGroups()` 合併策略，按名稱去重，保留 momo
- **localStorage 殘留測試資料**：偵錯期間產生的 5 個「新颜色组」讓 `groups.length === 0` 條件永遠不成立。加入一次性 v1.6 遷移旗標清除舊資料

### 改善
- **載入邏輯防禦**：`loadLibrary()` 不再直接覆蓋 `library` 物件，改為合併已存在的群組，確保同步初始化不被非同步載入破壞

## [1.5] — 2026-05-23

### 新增
- **新建顏色組提示名稱**：點擊「新建顏色組」後自動進入內聯命名模式

### 改善
- **強制預設組**：`init()` 同步確保 momo 顏色組存在，不依賴非同步載入

## [1.4] — 2026-05-23

### 新增
- **預設顏色**：首次啟動自動在 "momo" 顏色組建立紅/藍/黃/黑四個常用顏色

## [1.3] — 2026-05-23

### 新增
- **RGB / hex 支援**：顏色方塊 hover 同時顯示 CMYK、RGB、hex 三組值
- **hex 輸入**：編輯器移除 C/M/Y/K 輸入框，改為單一 hex 輸入（如 `#FF3366`），自動轉換為 CMYK 儲存
- **即時資訊列**：編輯器顯示轉換後的 CMYK + RGB 數值

## [1.2] — 2026-05-23

### 修復

- **版本號對齊**：`manifest.xml` 從 `1.0.0` 修正為 `1.2`，與 `panel.js` 和 README 一致
- **安全性修復**：7 個 JSX 腳本中的 `eval()` 全部替換為 `JSON.parse`，消除任意程式碼執行風險
- **寫入錯誤檢查**：`saveLibrary()` 現在檢查 `cep.fs` 回傳碼，雙層儲存（檔案系統+localStorage）均失敗時顯示提示
- **DOM 置換風險**：`showGroupRenameInput` 改用 CSS 顯示/隱藏切換，不再使用 `replaceChild`，避免 select 永久丟失
- **操作反饋**：`applyColor()` 顯示套用物件數量，`captureFromAI()` 顯示失敗原因（無文件/無選取/無填色）

### 改善

- **儲存去抖**：顏色編輯等事件操作使用 200ms debounce 寫入磁碟，初始載入和匯入仍即時儲存
- **共用模組**：抽取 `jsx/scripts/_shared.jsx` 包含 `loadPrefs`/`savePrefs`/`_cp`/`_pf`，7 個腳本不再重複定義
- **視覺通知**：新增 `toast()` 函數，底部浮現式提示，無彈窗
