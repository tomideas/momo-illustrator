# Momo Tools - 項目信息

## ⚠️ 關鍵信息

**這是 Adobe Illustrator CEP 擴展的實際安裝位置**

```
📍 實際位置（正式安裝目錄）:
/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/

📍 源代碼備份位置（開發用）:
/Volumes/ssd/temp/@coding/adobe-illustrator-extension/
```

---

## 📂 實際安裝目錄結構

```
/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/
│
├── PROJECT_INFO.md                    ⭐ 本文件 - 項目說明與路徑對照
├── README.md                          📖 完整功能文檔（複製自源代碼）
│
├── CSXS/
│   └── manifest.xml                   ⚙️ CEP 擴展配置文件
│
├── css/
│   └── style.css                      🎨 UI 樣式表（所有按鈕、菜單、顏色塊）
│
├── js/
│   ├── panel.js                       🔧 主控制器（按鈕事件綁定）
│   └── color_library.js               🌈 顏色庫核心邏輯（650+ 行）
│
├── jsx/
│   └── scripts/                       🖼️ Illustrator ExtendScript 文件
│       ├── artboard_duplicate_v1.0.9.jsx
│       ├── artboard_relayout_v1.5.7.jsx
│       ├── artboard_renamer_v1.0.8.jsx
│       ├── add_page_numbers_tomideas.jsx
│       ├── generate_color_box.jsx
│       ├── illustrator_text_style_checker_v8.1.8_compact_cn.jsx
│       ├── check_text_color.jsx
│       ├── check_overset_text.jsx
│       ├── check_trailing_text.jsx
│       ├── research_trailing_text_probe.jsx
│       └── debug_overset.jsx
│
├── images/
│   ├── IconLight.png                  💡 淺色主題圖標
│   └── IconDark.png                   🌙 深色主題圖標
│
└── index.html                         📄 面板 UI 入口（HTML 結構）
```

---

## 🔗 文件對照與修改指南

### 核心業務邏輯

| 檔案 | 完整路徑 | 用途 | 修改頻率 |
|------|---------|------|---------|
| **color_library.js** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/color_library.js` | 顏色庫管理（導入導出、CMYK 編輯等） | ⭐⭐⭐ 經常 |
| **panel.js** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/panel.js` | 事件綁定、按鈕連接 | ⭐⭐ 有時 |
| **index.html** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/index.html` | UI 元素、菜單項、編輯框 | ⭐⭐ 有時 |

### 樣式與配置

| 檔案 | 完整路徑 | 用途 | 修改頻率 |
|------|---------|------|---------|
| **style.css** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/css/style.css` | 按鈕樣式、顏色塊、菜單外觀 | ⭐ 很少 |
| **manifest.xml** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/CSXS/manifest.xml` | 菜單名、窗口大小、兼容版本 | ⭐ 很少 |

### Illustrator 交互層

| 目錄 | 完整路徑 | 說明 |
|------|---------|------|
| **jsx/scripts/** | `/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/jsx/scripts/` | 每個按鈕對應一個 .jsx 文件 |

---

## 🔄 同步關係

### 當前同步機制

```
實際安裝目錄 ←→ 源代碼目錄
(Adobe CEP)    (開發備份)

/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/
          ↕ (需手動同步)
/Volumes/ssd/temp/@coding/adobe-illustrator-extension/extension/com.tomideas.illustratortools/
```

### 同步命令

**從實際目錄 → 備份源代碼**:
```bash
cp -r "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/color_library.js" \
      "/Volumes/ssd/temp/@coding/adobe-illustrator-extension/extension/com.tomideas.illustratortools/js/"
```

**從源代碼 → 實際目錄**:
```bash
cp -r "/Volumes/ssd/temp/@coding/adobe-illustrator-extension/extension/com.tomideas.illustratortools/"* \
      "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/"
```

---

## 📝 修改工作流

### ✏️ 修改顏色庫功能

1. **編輯文件**:
   ```
   /Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/color_library.js
   ```

2. **測試**:
   - 在 Illustrator 中重啟面板（關閉→打開）
   - 或使用「開發工具」實時刷新

3. **備份同步**:
   ```bash
   cp -r "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/" \
         "/Volumes/ssd/temp/@coding/adobe-illustrator-extension/extension/com.tomideas.illustratortools/"
   ```

### 🎨 修改樣式

1. **編輯**:
   ```
   /Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/css/style.css
   ```

2. **刷新**: Illustrator 面板會自動讀取新樣式

### 📄 修改 UI 結構

1. **編輯**:
   ```
   /Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/index.html
   ```

2. **檢查對應的 ID**:
   - 確保 `<button id="cl-btn-more">` 等 ID 在 JS 中被正確引用
   - 檢查 color_library.js 中的 `document.getElementById("xxx")`

---

## 📊 關鍵數據存儲位置

### 顏色庫數據

**位置 1 - 文件系統（優先）**:
```
{Folder.userData}/MomoTools/color_library.json
```
實際路徑（macOS）:
```
~/Library/Application Support/Adobe/Illustrator/zh_TW/color_library.json
（或類似的 Adobe 用戶數據目錄）
```

**位置 2 - 瀏覽器 localStorage（備用）**:
```
Key: "MomoTools_ColorLibrary"
```

### 數據持久化流程

```
用戶編輯顏色
    ↓
saveEditorColor() 調用
    ↓
saveLibrary()
    ├─ 保存到文件系統 (cep.fs)
    └─ 保存到 localStorage (備用)
    ↓
Illustrator 重啟時 loadLibrary()
    ├─ 先試讀文件系統
    └─ 失敗則讀 localStorage
```

---

## 🔍 文件版本追蹤

| 文件 | 版本 | 最後修改 | 行數 |
|------|------|---------|------|
| index.html | 1.0 | 2026-05-23 | 171 |
| style.css | 1.0 | 2026-05-23 | 351 |
| panel.js | 1.2 | 2026-05-23 | 47 |
| color_library.js | 1.0 | 2026-05-23 | ~650 |
| manifest.xml | 1.0 | 2026-05-23 | 53 |

---

## ⚡ 快速命令

**查看實際安裝位置內容**:
```bash
ls -la "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/"
```

**查看顏色庫文件**:
```bash
cat "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/color_library.js" | head -50
```

**編輯核心文件**:
```bash
nano "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/js/color_library.js"
```

---

## 🔐 權限與訪問

```bash
# 檢查目錄權限
ls -ld "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/"

# 確保有寫入權限（必要時）
chmod -R u+rw "/Users/tomtam/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/"
```

---

## 📚 參考文檔

- **README.md** - 完整的功能、代碼、API 文檔
- **CSXS/manifest.xml** - CEP 配置格式說明
- **color_library.js** - 代碼內注釋詳細

---

**文檔日期**: 2026-05-23  
**擴展版本**: 1.2  
**Adobe Illustrator 兼容**: 17.0 - 99.9
