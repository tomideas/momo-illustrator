# Momo Tools — Adobe Illustrator 擴充套件

中文 | [English](README.md)

![Momo Tools 主面板一覽 — Momo Tools 與 Momo Notes](site/momo-tools-preview.png?v=20260626-0155)

🎨 **認識 Momo Tools** — 一款由設計師打造的 Illustrator 外掛面板，把那些 AI 原生做不到、或做起來很慢的事，收進一個順手的小面板裡 ✨。**帶著內容複製畫板** 📐、**重新排列與批次更名**、**清點文件用色** 🎨、**管理品牌色庫**（CMYK / JSON）、**檢查文字樣式 / 溢位 / 尾端空白** ✍️、**生成排版網格與頁碼** 📏，還有 **Momo Notes** 筆記 📝 — 主題自動跟隨 Illustrator 深淺色 🌗，點按鈕即執行，不用記快捷鍵。

| | |
|---|---|
| **安裝包** | [Releases](https://github.com/tomideas/momo-illustrator/releases) — `momo-tools-*.zxp` 或 `momo-tools-*-cep.zip` |
| **使用指南** | [tomideas.github.io/momo-illustrator](https://tomideas.github.io/momo-illustrator/) |
| **版本** | v2.127 · Illustrator 17.0 – 99.9 |

## ✨ 功能

- 📐 **畫板** — 複製（帶內容，區別於 AI 原生複製）、重新排列、批次更名
- 🏷️ **顏色標籤** — 從選中物件提取填色，自動生成色塊說明
- 🔍 **顏色檢查** — 用色清點、彩色編號、標出稀有色、畫板圖例
- 🎨 **顏色庫** — 品牌標準色，以 CMYK 為準，JSON 匯入匯出，跨檔案持久化
- ✍️ **樣式檢查** — 按字號 / 字型 / 顏色分組，標出少見樣式與框內混合樣式
- 📦 **溢位檢查** — 找出區域文字溢位（印前最常見問題）
- 🧹 **尾端空白** — 清理行尾隱藏空格
- 📏 **網格系統** — 瑞士網格 / 等分網格（© canfei / 火山字型）
- 🔢 **批次頁碼** — 多畫板自動編號
- 📝 **Momo Notes** — 獨立筆記面板（多標籤、Markdown 表格、Cmd+Z 撤銷）

## 📦 安裝

任選 **一種** 方式，安裝後均需 **完全退出並重啟** Illustrator。

### 方法一 — ZXP 安裝（推薦）

1. 📥 從 [Releases](https://github.com/tomideas/momo-illustrator/releases) 下載最新 `momo-tools-x.xx.zxp`
2. 📥 安裝 [ZXP/UXP Installer](https://aescripts.com/learn/post/zxp-installer)（macOS 或 Windows 版）
3. 📂 將 `.zxp` **拖入**安裝器視窗
4. 🔄 重啟 Illustrator
5. 🎨 **macOS**：`視窗` → `擴充套件功能` → `Momo Tools` · **Windows**：`Window` → `Extensions` → `Momo Tools`

> 截圖與演示影片見 [使用指南 → 安裝](https://tomideas.github.io/momo-illustrator/#install)

### 方法二 — 手動安裝（CEP 資料夾）

1. 📥 從 [Releases](https://github.com/tomideas/momo-illustrator/releases) 下載 `momo-tools-x.xx-cep.zip`，解壓得到 `com.tomideas.illustratortools` 資料夾（名稱須保持此樣）
2. 📁 複製到 CEP 擴充套件目錄：

| 系統 | 路徑 |
|------|------|
| **macOS** | `~/Library/Application Support/Adobe/CEP/extensions/com.tomideas.illustratortools/` |
| **Windows** | `%APPDATA%\Adobe\CEP\extensions\com.tomideas.illustratortools\` |

**若目錄不存在，需自行建立**（首次安裝 CEP 擴充套件時很常見）：

```bash
# macOS — 一鍵建立並開啟
mkdir -p ~/Library/Application\ Support/Adobe/CEP/extensions
open ~/Library/Application\ Support/Adobe/CEP/extensions
```

```cmd
REM Windows
mkdir "%APPDATA%\Adobe\CEP\extensions"
explorer "%APPDATA%\Adobe\CEP\extensions"
```

將 **`com.tomideas.illustratortools`** 整個資料夾放入 `extensions`（不要只複製內部檔案）。

3. 🔓 **啟用未簽名擴充套件**（首次必做 — 須先完全退出 Illustrator）：

```bash
# macOS
defaults write com.adobe.CSXS.11 PlayerDebugMode 1
defaults write com.adobe.CSXS.12 PlayerDebugMode 1
```

```cmd
REM Windows
reg add "HKCU\Software\Adobe\CSXS.11" /v PlayerDebugMode /t REG_SZ /d 1 /f
reg add "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

Adobe 官方相容表顯示 Illustrator 25.3 整合 CEP 11、Illustrator 29.5.1 開始整合 CEP 12。兩條都執行可相容不同版本；外掛清單裡的 `RequiredRuntime 6.0` 只是最低要求，不代表應使用 `CSXS.6`。

4. 🔄 重啟 Illustrator → 從擴充套件選單開啟 **Momo Tools**

### 解除安裝

刪除 CEP 目錄下的 `com.tomideas.illustratortools` 資料夾並重啟 Illustrator。顏色庫與筆記資料單獨存放，不會被刪除。

## 📖 使用指南

完整說明（HTML，GitHub Pages）：

👉 [tomideas.github.io/momo-illustrator](https://tomideas.github.io/momo-illustrator/)

原始檔在 [`site/`](site/)。版本記錄見 [`CHANGELOG.md`](CHANGELOG.md)。

## 🗂️ 倉庫結構

```
momo-illustrator/
├── README.md              # 📄 English
├── README.zh-CN.md        # 📄 本檔案（簡體中文）
├── CHANGELOG.md           # 📋 版本記錄
├── site/                  # 📖 使用指南（GitHub Pages）
│   ├── index.html
│   └── assets/            # 截圖與演示影片
├── extension/             # 🧩 CEP 擴充套件原始碼
│   └── com.tomideas.illustratortools/
│       ├── CSXS/manifest.xml
│       ├── js/              # 面板邏輯
│       └── jsx/scripts/     # Illustrator 指令碼
└── scripts/               # 🔧 打安裝包指令碼
```

`@Reference/`、內部開發筆記、診斷探針等 **僅保留在本地**，不會上傳至此倉庫。

## 💾 顏色庫資料

儲存在本機：

- **macOS**：`~/Library/Application Support/MomoTools/color_library.json`
- **Windows**：`%APPDATA%\MomoTools\`
- 備用：面板 `localStorage`

可透過面板 **•••** 選單匯入 / 匯出 JSON 備份。

## ❓ 常見問題

**選單裡找不到 Momo Tools？**  
→ 確認已開啟 PlayerDebugMode，資料夾名為 `com.tomideas.illustratortools`，並完全重啟 Illustrator。

**顏色重啟後變白？**  
→ 編輯色塊時保持 CMYK 與 HEX 同步；建議定期匯出 JSON 備份。

**更多說明**  
→ [使用指南](https://tomideas.github.io/momo-illustrator/) · [常見問題](https://tomideas.github.io/momo-illustrator/#trouble)

---

- **開發者**：Momo (tomideas)
- **許可**：見倉庫釋出說明
