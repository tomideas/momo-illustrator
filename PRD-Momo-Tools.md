# PRD: Momo Tools

> 基於 `create-prd` 技能 8 段式範本

---

## 1. 摘要 / Summary

Momo Tools 是一款 Adobe Illustrator CEP 擴展面板，為平面設計師與印前製作人員提供畫板管理、色彩管理、文字品控、網格輔助、筆記記錄五大類自動化工具。它用一鍵批量操作替代 Illustrator 原生的重複手動流程，將印前品控從「人工目視逐項檢查」變成「點擊即掃描、自動標記」。所有操作以 Toast（輕提示）替代彈窗，不中斷工作流。

---

## 2. 聯絡人 / Contacts

| 姓名 / Name | 角色 / Role | 備註 / Comment |
|---|---|---|
| Momo (tomideas) | 產品經理 / 開發者 · Developer & PM | 獨立開發與維護 |
| 火山字型 canfei (hstype.com) | 網格系統原作者 · Grid System Original Author | 網格系統基於其開源腳本移植 |

---

## 3. 背景 / Background

### 3.1 這是什麼？

設計師在 Adobe Illustrator 中進行多畫板文件製作、品牌色彩管理、印前品控時，遇到大量無法批量執行的手動作業：複製畫板不帶內容、重命名需逐個雙擊、檢查文字溢出要逐個框點開看、確認色彩空間要吸管逐個吸。這些步驟**單次不超過 10 秒，但 100 個畫板就是半小時——且極易漏檢**。

Momo Tools 把所有這些步驟自動化為「選取範圍 → 點擊按鈕 → 完成」，讓設計師專注於設計本身而非機械操作。

### 3.2 為什麼是現在？

- **個人痛點累積至臨界點 / Personal pain threshold reached**：開發者本人就是設計師，在多產品線（Kandao 品牌）物料製作中積累了 50+ 個腳本片段，需要一個統一面板來承載
- **CEP 當前可用但面臨淘汰 / CEP is available but facing deprecation**：Adobe 正推動 UXP 取代 CEP。在 CEP 仍被支援的窗口期內，需同步準備 UXP 遷移路線
- **需注意 / Caveat**：Unity 的網格系統移植自 JSXBIN 反編譯程式碼（火山字型 canfei），授權狀態需釐清
- **無現成方案 / No existing solution**：市面上沒有同時覆蓋畫板、色彩、文字、網格、筆記的 Illustrator 面板

---

## 4. 目標 / Objective

### 4.1 目標 / Objective

為 Adobe Illustrator 設計師建立一個**零學習成本、零彈窗干擾**的實用工具面板，在以下場景中將操作效率提升 10 倍以上：

1. 多畫板文件管理（複製、重命名、排列、頁碼）
2. 品牌色彩庫建立與應用
3. 印前文字品控（溢出、空白、樣式一致性）
4. 設計網格輔助（瑞士/等分/黃金比例）
5. 內嵌筆記記錄

### 4.2 為什麼重要？/ Why It Matters

| 維度 / Dimension | 價值 / Value |
|---|---|
| **對使用者 / For Users** | 節省每日 30-90 分鐘的重複操作時間；減少印前出錯的退件風險 |
| **對維護者 / For Developer** | 沉澱個人知識為可維護產品；具備開源/商業化潛力 |

### 4.3 與策略對齊 / Strategy Alignment

本工具是開發者「設計師工具鏈」產品矩陣的第一款產品。先驗證單一 Adobe 應用（Illustrator）的擴展面板模式，再考慮擴展至 Photoshop、InDesign。

### 4.4 關鍵結果 / Key Results (SMART OKRs)

| KR | 指標 / Metric | 目標 / Target | 衡量 / Measurement |
|---|---|---|---|
| KR1 | 面板功能覆蓋率 | 5 大模組全部可用 | 每個模組至少 1 個核心功能已實作 |
| KR2 | 印前檢查準確率 | 文字溢出檢查誤報率 < 1% | 透過診斷工具（FP/FN 對比）驗證 |
| KR3 | 操作效率 | 每次批量操作 ≤ 3 次點擊完成 | 使用者主觀回饋 |
| KR4 | 無崩潰率 | 100%（零面板白屏/崩潰） | 日常使用觀察 |
| KR5 | 顏色庫持久化可靠性 | 資料遺失率 = 0% | 雙重持久化（檔案 + localStorage）覆蓋 |
| KR6 | CEP 淘汰風險管理 | 2026-Q4 前完成 UXP 可行性評估 | 確認所有核心功能在 UXP 中的對應 API |
| KR7 | 印前檢查回歸覆蓋 | 溢出檢查至少 3 個已知案例通過 | 手動 smoke test 清單（暫無自動化框架） |

---

## 5. 市場區隔 / Market Segment(s)

### 5.1 核心使用者 / Core Users

本工具按**工作任務（Jobs to be Done）**定義使用者，非人口統計：

| 區隔 / Segment | JTBD | 規模 / Scale | 使用頻率 / Frequency |
|---|---|---|---|
| **平面設計師 / Graphic Designer** | 快速管理多畫板文件（系列廣告/社群圖卡/簡報）；需要網格輔助排版 | 個人使用者（開發者本人+潛在社群用戶） | 每日 |
| **印前製作員 / Prepress Operator** | 交付前掃描文件：文字溢出、色彩空間不符、樣式不一致 | 個人使用者 | 每次交付前 |
| **品牌色彩管理員 / Brand Color Manager** | 維護多產品線標準色庫；確保跨文件色值一致 | 個人使用者 | 每週 |
| **包裝設計師 / Packaging Designer** | 多語言多版本畫板快速生成 | 個人使用者 | 每專案 |

### 5.2 非目標使用者 / Non-target Users

- 僅使用 AI 進行插畫創作、不涉及多畫板/文字排版的使用者
- 團隊協作場景（v1 不支援雲端共享）
- 非中文母語設計師（UI 目前僅支援簡體中文）

### 5.3 限制條件 / Constraints

- Illustrator 版本需 ≥ CS6 (16.0)，主測試版本為 CC 2018+
- **平台風險 / Platform Risk**：CEP 為 Adobe legacy 技術，未來 AI 版本可能移除支援。產品生命週期與 CEP 支援週期綁定
- **維護限制 / Maintenance Constraint**：單人開發，無備援。所有 ExtendScript 與 CEP 知識集中於一人
- 僅支援 CMYK 和 RGB 色彩空間（專色 Spot Color 待開發）
- 面板需在 Illustrator 的 CEP 調試模式或簽名安裝下運行
- 無自動化測試框架，所有驗證依賴手動測試與診斷腳本

---

## 6. 價值主張 / Value Proposition(s)

### 6.1 顧客任務 / Customer Jobs

| JTBD | 現有方案 / Current Alternative | 我們的方案 / Our Solution |
|---|---|---|
| 批量複製畫板（含內容） | 手動逐個複製貼上內容 | 一鍵複製 + 查找替換命名 + 間距控制 |
| 檢查 100+ 個文字框是否有溢出 | 逐個點開看右下角紅點 | 一鍵掃描全部畫板，紅框標記 |
| 管理品牌色庫並應用到設計中 | AI 色板面板（不支援分組/跨檔案） | 自建顏色庫（分組/導入導出/一鍵應用） |
| 生成設計網格參考線 | 手繪或用 AI 分割工具（不精準） | 一鍵生成瑞士/等分/黃金比例三種網格 |

### 6.2 痛點解決 / Pain Relievers

- ❌ **人工漏檢 / Manual oversight** → ✅ 自動掃描 + 視覺標記（紅框/橙框）
- ❌ **彈窗打斷 / Dialog interruption** → ✅ Toast 輕提示，不中斷操作
- ❌ **重複操作 / Repetitive work** → ✅ 批量操作（30 個畫板一次處理）
- ❌ **跨文件色值不一致 / Cross-file color drift** → ✅ 顏色庫本地持久化，全文件可用
- ❌ **CMYK↔HEX 轉換不准 / Inaccurate conversion** → ✅ ICC 精準轉換（app.convertSampleColor）

### 6.3 競爭優勢 / Competitive Differentiation

| 功能 / Feature | AI 原生 | Momo Tools |
|---|---|---|
| 複製畫板（含內容） | 需腳本 | ✅ 一鍵 |
| 文字溢出檢測 | 手動 | ✅ 三規則自動掃描 |
| 自定義顏色庫（分組+拖拽） | ❌ | ✅ |
| 網格系統（3 種） | ❌ | ✅ |
| 筆記面板 | ❌ | ✅ |
| Toast 無彈窗設計 | ❌ | ✅ |

---

## 7. 解決方案 / Solution

### 7.1 UX / 原型 / UX & Prototypes

**面板佈局 / Panel Layout：**
- 分 4 大功能組：畫板工具、顏色工具、文字工具、工具集
- 隱藏開發者工具（連點 footer 3 次啟用）
- 獨立筆記面板（`note.html`，獨立面板 ID）
- 自動跟隨 Illustrator 主題（深色/淺色）

**互動原則 / Interaction Principles：**
- 所有操作以 Toast（1.8 秒輕提示）反饋，無 `alert()`/`confirm()`/`prompt()`
- 按鈕點擊即執行，不彈確認框
- 長時間操作（如文字掃描）以 Toast 顯示進度
- 無可用操作時按鈕自動置灰
- 主題（深色/淺色）即時跟隨 Illustrator 切換

### 7.2 核心功能 / Key Features

#### 模組一：畫板工具 / Artboard Tools

| 功能 / Feature | 優先級 / Priority | 狀態 / Status |
|---|---|---|
| 複製畫板（含內容 + 查找替換命名 + 間距控制） | P0 | ✅ v1.1.2 |
| 畫板更名（4 模式：模板/替換/逐行/後綴） | P1 | ✅ v1.2.1 |
| 重新排列畫板（網格排列 + 間距控制） | P1 | ✅ v1.5.8 |

#### 模組二：顏色工具 / Color Tools

| 功能 / Feature | 優先級 / Priority | 狀態 / Status |
|---|---|---|
| 顏色庫（分組 CRUD + CMYK/HEX 雙通道編輯 + ICC 轉換） | P0 | ✅ |
| 顏色庫（導入導出 JSON + 拖拽排序 + 分組排序） | P0 | ✅ |
| 一鍵應用到選中物件（遞歸進群組） | P0 | ✅ |
| 從選中物件提取顏色到庫 | P1 | ✅ |
| 顏色檢查（掃描 RGB/CMYK 混用） | P1 | ✅ v1.6.0 |
| 顏色標籤生成（CMYK 色值標籤） | P2 | ✅ |
| 顏色搜尋/過濾 | P0（待開發） | ❌ |
| 專色標記（Spot Color） | P1（待開發） | ❌ |
| 批量顏色編輯 | P1（待開發） | ❌ |

#### 模組三：文字工具 / Text Tools

| 功能 / Feature | 優先級 / Priority | 狀態 / Status |
|---|---|---|
| 文字溢出檢查（M4a+M8+M12 三規則） | P0 | ✅ v5.9.3 |
| 文字樣式檢查（字體/字號/行距 + 庫存模式） | P1 | ✅ v8.2.0 |
| 尾端空白檢查（空格/製表符/空段落） | P2 | ✅ v1.0.1 |

#### 模組四：工具集 / Utility Tools

| 功能 / Feature | 優先級 / Priority | 狀態 / Status |
|---|---|---|
| 網格系統（瑞士/等分/黃金比例 + 預覽 + 轉參考線） | P1 | ✅ v1.0.0 |
| 批量頁碼（9 方位 + 自訂格式） | P2 | ✅ |
| Momo 筆記（多標籤 + Markdown 表格 + 拖拽排序） | P2 | ✅ v1.6 |

#### 模組五：開發者工具（隱藏）/ Dev Tools (Hidden)

| 功能 / Feature | 狀態 / Status |
|---|---|
| 溢出診斷（逐幀 FP/FN 對比） | ✅ |
| 尾端診斷（逐字符視覺化） | ✅ |
| 位置診斷（檢查位置記憶檔案） | ✅ |
| 庫存診斷（檢查樣式庫存） | ✅ |
| 重置所有設定 | ✅ |

### 7.3 技術架構 / Technology

```
CEP Panel (HTML/CSS/JS)
  │  CSInterface → window.__adobe_cep__.evalScript()
  ▼
ExtendScript (JSX) → Illustrator DOM API

持久化 / Persistence:
  cep.fs (主) + localStorage (備援)
```

**技術選型 / Technical Decisions：**

| 決策 / Decision | 原因 / Rationale |
|---|---|
| CEP Panel + ExtendScript（非 UXP） | 向下相容 CS6，覆蓋更多使用者 |
| 雙重持久化（檔案 + localStorage） | 檔案可靠但需權限；localStorage 作為 fallback |
| CMYK→HEX 經 `app.convertSampleColor()` | ICC 精準轉換，非簡易公式 |
| ES3 相容（無 let/const/JSON） | ExtendScript 引擎限制 |
| `_shared.jsx` 統一載入 | 無模組系統，不載入即靜默崩潰 |
| Toast 替代彈窗 | 不中斷工作流 |

### 7.4 假設 / Assumptions

#### 已驗證 / Validated

| # | 假設 / Assumption | 驗證方式 / Validation | 狀態 / Status |
|---|---|---|---|
| A1 | 設計師願意在 AI 側邊欄安裝第三方面板 | 開發者本人日常使用 6+ 個月 | ✅ 確認 |
| A2 | Toast 反饋足以取代彈窗 | 50+ 版本迭代，從未回退為彈窗 | ✅ 確認 |
| A3 | ICC 轉換（`app.convertSampleColor`）精度足夠 | 與 Photoshop/InDesign 校色結果對比 | ✅ 確認 |
| A4 | 目前所有功能在 ExtendScript 中皆可實現 | 5 大模組全部已實作 | ✅ 確認 |

#### 持續監控 / Under Monitoring

| # | 假設 / Assumption | 驗證方式 / Validation | 狀態 / Status |
|---|---|---|---|
| A5 | 文字溢出三規則（M4a/M8/M12）覆蓋所有場景 | 診斷工具持續驗證 FP/FN；已知：點文字/路徑文字不檢查 | ⚠️ 持續監控 |
| A6 | CEP 將繼續被 Illustrator 支援 — **最高風險假設** | 監控 Adobe CEP/UXP 公告；每個 AI 大版本手動測試 | ⚠️ 持續監控 |
| A7 | AI 版本升級不破壞 JSX DOM API | 建立 smoke test 清單，每次大版本升級手動驗證 | ⚠️ 持續監控 |
| A8 | `cep.fs` 在所有使用者環境中可用 | localStorage fallback 確保資料不丟；收集 fs 失敗案例 | ⚠️ 持續監控 |
| A9 | 顏色庫 JSON 格式不需要遷移機制 | 目前無 schema version 欄位；格式變更時需手動處理相容 | ⚠️ 持續監控 |

#### 待驗證 / Unvalidated

| # | 假設 / Assumption | 風險 / Risk | 驗證方式 / Validation | 狀態 / Status |
|---|---|---|---|---|
| A10 | 開發者可長期獨立維護此產品 | **高** — 唯一開發者消失 = 產品死亡 | 完善 AI Agent 開發指引；考慮開源 | ❌ 待驗證 |
| A11 | 網格系統反編譯程式碼無法律風險 | **高** — 移植自 JSXBIN 反編譯原始碼 | 聯繫原作者 canfei 取得許可，或從頭重寫 | ❌ 待驗證 |
| A12 | 中文使用者群體足夠支撐產品持續維護 | **中** — 目前僅開發者本人使用 | 若推廣：在中文設計社群釋出測試版 | ❌ 待驗證 |
| A13 | 按鈕標籤對新使用者自解釋 | **中** — 「文字溢出檢查」vs「尾端空白檢查」區別不明顯 | 讓新使用者不看文件操作，觀察困惑點 | ❌ 待驗證 |
| A14 | 筆記面板在 AI 內有實際使用場景 | **低** — 設計師可能偏好外部筆記工具 | 觀察使用頻率；若長期零使用考慮移除 | ❌ 待驗證 |
| A15 | 使用者需要雲端同步色彩庫 | **低** — 目前單人使用，手動複製已足夠 | 待使用者數 > 10 且跨裝置需求出現時再評估 | ❌ 待驗證 |

---

## 8. 發布 / Release

### 8.1 版本規劃 / Version Plan

| 版本 / Version | 範圍 / Scope | 相對時間 / Relative Timeframe |
|---|---|---|
| **v1.0 – v2.99（已完成）** | 5 大模組全部功能 + 主題適配 + Toast 互動 + 雙重持久化 + 開發者工具 | 已完成（50+ 次迭代） |
| **v3.0（下一階段）** | 色彩搜尋/過濾 + 專色標記 + 批量顏色編輯 | 2-4 週 |
| **v3.x（中期）** | **UXP 平台遷移調研**（最高優先級技術債） + 色彩歷史記錄 + 色彩預設主題 + 鍵盤快捷鍵 + 顏色庫 schema 版本標記 | 4-8 週 |
| **v4.0（遠期）** | UXP 完整遷移 + 雲端同步（若使用者需求驗證通過） | 待評估 |

### 8.2 已知風險與緩解 / Known Risks & Mitigations

| 風險 / Risk | 嚴重程度 / Severity | 緩解措施 / Mitigation | 期限 / Due |
|---|---|---|---|
| CEP 平台遭 Adobe 淘汰 | 🚨 Launch-Blocking | 監控公告 + UXP 可行性調研（v3.x） | 2026-Q4 |
| 單人開發維護中斷 | 🚨 Launch-Blocking | 完善 AI Agent 開發指引 + 考慮開源 | 2026-Q3 |
| 網格系統反編譯程式碼授權不明 | ⚡ Fast-Follow | 聯繫原作者 canfei 或重寫 | 2026-Q3 |
| 顏色庫格式變更導致資料損壞 | ⚡ Fast-Follow | 加入 schema version 欄位 + 遷移邏輯 | v3.x |
| 零自動化測試無法偵測回歸 | 🔍 Track | 建立手動 smoke test 清單；長期評估自動化可行性 | 持續 |

### 8.2 發布策略 / Release Strategy

- **滾動發布 / Rolling Release**：每次功能修復或新增後立即遞增版本號並更新 CHANGELOG
- **無需審批 / No Approval Required**：個人工具，直接在開發者 AI 中載入
- **文檔同步 / Docs Sync**：每版同步更新 `manifest.xml`、`panel.js PANEL_VERSION`、`README.md`、`CHANGELOG.md`

---

> **文件版本 / Doc Version:** v1.0 | **生成日期 / Generated:** 2026-06-21 | **基於技能 / Based on:** create-prd (PM Skills Marketplace · phuryn/pm-skills)
