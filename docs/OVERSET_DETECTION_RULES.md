# Illustrator 文字溢出檢測規則總結

> 最後更新：2026-05-27（v5.9.3 定稿）
> 適用：Illustrator 30.3+ via ExtendScript / CEP

這份文件記錄所有試過的方法、各自的失敗原因，以及最終採用的規則組合。**下次改之前先讀這份，不要再重跑全部測試。**

---

## 核心發現

Illustrator 的 ExtendScript DOM **沒有可靠的 `isOverset` 布林值**（不像 InDesign 有 `textFrame.overflowing`）。所有方法都是間接推斷。

需要組合多個獨立指標，每個指標都有一類覆蓋盲區。

---

## 三條 Illustrator 文字模型陷阱

理解這三個陷阱是寫對檢測規則的前提。

### 陷阱 1：隱式末段符（implicit `\r` terminator）

Illustrator 為**每個** Area Text 自動在 `contents` 末尾附加一個 `\r`。

```
你打字  "Hello"
contents 實際 = "Hello\r"     ← 多了一個你沒打的 \r
paragraphs   = ["Hello", ""]   ← 多了一個空段
```

**影響**：
- 任何「contents 結尾有 \r 就標」的規則 → 全檔誤報（每框都中）
- 任何「paragraphs.length × leading > frameH」的規則 → 單行框誤報
- 必須先「扣掉一個 \r」或「`paragraphs - 1`」再判斷

### 陷阱 2：串接框的字數 = 整個 Story 的字數

串接框（threaded frames，next/prev 連起來的）：

| 屬性 | 回傳值 |
|------|--------|
| `tf.contents` | ✅ 只含本框文字 |
| `tf.lines` | ✅ 只含本框可見行 |
| `tf.characters` | ❌ **整個 Story 的字數**（含下一框的文字！）|

**影響**：
- 用 `tf.characters` 計算「字數差」→ 串接框必假陽性
- 必須只用 `tf.contents` 計算

### 陷阱 3：`\r` vs 空白的處理差異

`tf.lines[i].contents` 與 `tf.contents` 對 `\r` 的處理不同：

```
contents       = "A\rB\rC\r"    ← 段落終止符在裡面
sum(lines.len) = "A" + "B" + "C" = 3    ← 段落終止符不在 line.contents 裡
diff           = 3                ← 等於段落數
```

**影響**：
- 用「contents.length - sum(lines.length)」找隱藏字 → diff 永遠 ≥ 段落數
- 多段落框（表格、列表）必假陽性
- 必須在比對前先去掉 `\r`（用 `stripWS` 而不是 `stripKeepSpaces`）

---

## 方法總表

| ID | 方法 | 狀態 | 失敗原因 |
|----|------|------|---------|
| M1 | `tf.overflows` 屬性 | ❌ AI 30+ 廢棄 | 永遠 `undefined` |
| M2 | `tf.story.overflows` | ❌ AI 30+ 廢棄 | 永遠 `undefined` |
| M3 | `tf.nextFrame != null` | ⚪ 資訊 | 不能單獨判斷，只代表「有串接」 |
| **M4a** | `stripWS(contents).length - sum(stripWS(lines).length) > 4` | ✅ **採用** | — |
| M4b | `stripKeepSpaces` 版本（保留空格/\r）| ❌ 撤回 | 陷阱 3，多段落必假陽性 |
| M4c | raw 版本（不去任何字）| ❌ 撤回 | 陷阱 3，多段落必假陽性 |
| M5 | `maxLineW > frameW`（行寬>框寬）| ❌ 不準 | AI 30 量測常為 0 |
| M6 | 末字 insertionPoint 右側超出框寬 | ❌ 不準 | AI 30 量測常為 0 |
| M7 | `insertionPoint.parentTextFrames.length === 0` | ❌ 廢棄 | AI 30 對所有框都回傳 0 |
| **M8** | 複製→`convertAreaObjectToPointObject`→ `normContents` 比對 | ✅ **採用** | — |
| M9 | `lines.length × leading > frameH` | ⚪ 不可靠 | 自動行距下 leading=0 |
| M10 | 輪廓 bounds vs path bounds | ❌ 不準 | 對 \r 溢出無感 |
| M11 | `tf.characters - sum(lines.characters)` | ❌ **必殺** | 陷阱 2，串接框全檔誤報 |
| **M12** | `(paragraphs - 1) × leading > frameH + 0.6×leading` | ✅ **採用** | — |

---

## 最終規則（v5.9.3）

```javascript
function isOverset(tf) {
    if (contents.length === 0 && lines.length === 0) return false;

    // M4a：實字被裁 → 垂直溢出（任何字被切掉）
    if (stripWS(tf.contents).length - sumStripWS(tf.lines) > 4)
        return "vertical";

    // M8：轉點文字後 contents 縮短 → 任何字被裁（含水平裁切）
    if (probeOverflowByPointContents(tf))
        return "point";

    // M12：純空段超框 → 尾端 \r\r 或多餘段落落在框外
    if ((tf.paragraphs.length - 1) * leading > frameH + 0.6 * leading)
        return "trailing";

    return false;
}
```

### 為什麼這三個一起用

每個方法都有獨立的盲區，組合起來才能覆蓋：

| 案例 | M4a | M8 | M12 |
|------|-----|----|----|
| 實字被切掉（橫向/縱向）| ✅ 觸發 | ✅ 觸發 | — |
| 末行尾端 `\r\r` 純空段溢出 | ❌ 看不到 | ❌ 看不到 | ✅ 觸發 |
| 串接框 normal | ✅ 不觸發 | ✅ 不觸發 | ✅ 不觸發 |
| 多段落表格 normal | ✅ 不觸發 | ✅ 不觸發 | ✅ 不觸發 |
| 單行框 + 一個 `\r` normal | ✅ 不觸發 | ✅ 不觸發 | ✅ **不觸發**（靠 `-1` 修正） |

### TOLERANCE = 4 的理由

- 真實溢出通常 hidden ≥ 5
- 浮點誤差、字型載入時序、Illustrator 內部量化會貢獻 1-2
- 4 留出安全邊際，不會吸收任何「真的有 5+ 字被切」的案例

---

## 反模式（不要再用的方法）

1. **任何用 `tf.characters` 的字數計算** — 串接框 = 整個 story
2. **任何保留 `\r` 的「字數差」方法** — 段落分隔符會被算成隱藏
3. **`tf.overflows` / `story.overflows`** — AI 30+ 不回傳
4. **沒扣 `-1` 的 paragraphs × leading** — 隱式末段符會讓單行框誤報
5. **單純依賴幾何（M5/M6/M10）** — AI 30 量測 API 已退化

---

## 診斷工具

| 工具 | 用途 |
|------|------|
| `check_overset_text.jsx` | 正式檢查器（採用上面三條規則）|
| `research_overset_probe.jsx` | **互動診斷**：逐框選取＋顯示腳本判斷＋問使用者 Y/N，比對 FP/FN |

## 測試用案例（最少集合）

要驗證新版本不退步，至少跑這幾種：

1. **單行短文字** `"Ajustes\r"` → 不該標
2. **多段落表格** `"A\rB\rC\rD\r..."` 25 行 → 不該標
3. **串接框正常** chain of 3 frames，每框 nextFrame != null，內容剛好分配 → 不該標
4. **橫向裁切** 一行字太長，最後幾個字被切 → 該標
5. **縱向裁切** 多行，最後幾行被切 → 該標
6. **尾端 `\r\r`** 內容後面多按一個 Enter → 該標（如果空段沒位置可放）
7. **尾端空格** `"hello   \r"` 在剛好一行高的框 → 看 leading × 1 是否 > frameH

---

## 歷史教訓

| 版本 | 修了什麼 | 又壞了什麼 |
|------|---------|-----------|
| 5.0 | 加入 M8 點文字探針 | — |
| 5.5 | M5/M6 幾何法 | AI 30 量測 API 失效，回退 |
| 5.6 | 加 M11 字符差 | 串接框全檔假陽性，撤回 |
| 5.7 | 回退 M4+M8 only | 尾端 \r\r 純空段抓不到 |
| 5.8 | 加 M4b/M4c | 多段落框假陽性 |
| 5.9.0 | 加 M12 高度公式 | — |
| 5.9.1 | M12 改成 paragraphs > lines | 多段落正常框全誤報，撤回 |
| 5.9.2 | M12 回退高度公式 | 單行框 + 隱式 \r 仍誤報 |
| **5.9.3** | M12 公式扣掉隱式末段符（-1）| **目前定稿** |

**關鍵教訓**：
- 不要憑感覺改公式，先用「互動診斷」跑 17+ 框，看 FP/FN 矩陣再決定
- 改完新版本，一定要用上面 7 種測試案例都跑一次
- 任何規則改動都要寫進 changelog 並標註「為什麼這樣修」
