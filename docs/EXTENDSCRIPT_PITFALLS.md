# ExtendScript 坑与约定 / Pitfalls & Conventions

> 最后更新：2026-06-19
> 适用：Illustrator ExtendScript / CEP + `_shared.jsx`

这份文件记录反复踩过的坑和最终约定。**改代码前先读，不要再重跑全部调试。**

---

## 1. `JSON` 对象不存在

**ExtendScript 没有 `JSON.parse` / `JSON.stringify`。** 所有直接调用都会抛 `JSON is undefined`。

### ✅ 正确做法

使用 `_shared.jsx` 里的 `_parseJson(raw)`：

```javascript
var s = _parseJson(raw);  // 自动检测 JSON.parse，没有就 eval 后备
```

### ❌ 错误做法

```javascript
var s = JSON.parse(raw);  // 静默失败，catch 返回默认值，你永远不知道数据丢了
```

---

## 2. `loadPrefs` 只复制 defaults 已有的 key

`_shared.jsx` 的 `loadPrefs(n, d)` 有一条关键逻辑：

```javascript
for (var k in s) { if (r.hasOwnProperty(k)) r[k] = s[k]; }
```

它只把文件里**已在 defaults 中**的 key 合并进结果。defaults 里没有的 key 会被丢弃。

### ✅ 正确用法

```javascript
var prefs = loadPrefs("relayout.json", { hGap: "62", vGap: "86", rowPat: "10,5,10" });
// 文件里只有 "hGap" 和 "vGap" → 只更新这两个，rowPat 保持默认
```

### ❌ 错误用法

```javascript
// 想读一个 key 未知的映射表（如样式代号表）
var inv = loadPrefs("inventory.json", {});  // defaults 是空对象 → 所有 key 被过滤 → 永远返回 {}
```

### ✅ 替代方案

key 未知时，用 `_parseJson` 直读文件：

```javascript
var f = _pf("inventory.json");
if (f.exists) { f.open("r"); var raw = f.read(); f.close(); return _parseJson(raw); }
return {};
```

---

## 3. `savePrefs` 对复杂对象静默失败

`savePrefs` 用 `for...in` + `hasOwnProperty` 遍历对象，且键名不转义。含中文、特殊字符的长键名可能导致生成无效 JSON（0 字节文件）。

### ✅ 正确做法

大量/复杂键名时，直接 `File.write` + 手动转义：

```javascript
var parts = [];
for (var i = 0; i < items.length; i++) {
    var esc = String(key).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    parts.push('"' + esc + '":' + val);
}
f.write("{" + parts.join(",") + "}");
```

---

## 4. 对话框位置记忆 / Dialog Position Memory

### 约定

- **读**：`var pos = loadPos("xxx_pos.json");`
- **写**：`savePrefs("xxx_pos.json", { x: b[0], y: b[1] });` （关闭前）
- **设**：`try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }`

### ❌ 不要做

- **不要** `if (pos.x >= 0)` 守卫 — 双屏副屏坐标是负数（合法）
- **不要** 用 `loadPrefs` 读位置 — 有 `loadPos` 专用函数（在 `_shared.jsx`）
- **不要** 在 `runBtn` 里忘记保存位置

### 双屏陷阱

macOS 双屏时，左边副屏的 x 坐标为负数（如 -1343）。把对话框拖到副屏后保存，x 就是负数。**负数坐标是合法位置**，不要当非法。

---

## 5. ES3 限制 / ES3 Limitations

ExtendScript 基于 ECMAScript 3（ES3），没有：

| 不可用 | 替代 |
|--------|------|
| `String.padEnd` / `padStart` | 手动 `while (s.length < n) s += " ";` |
| `Array.forEach` | `for (var i=0; i<arr.length; i++)` |
| `Array.indexOf` | 手动循环或 RegExp |
| `Array.map` / `filter` | 手动循环 |
| `Object.keys` | `for (var k in obj)` |
| `String.trim` | 项目内用 `trimText()` |
| `let` / `const` | 只用 `var` |
| `JSON.parse` / `JSON.stringify` | `_parseJson()` / 手动拼接 |

---

## 6. `_shared.jsx` 的 include 必须显式写

每个脚本必须在 `#target illustrator` 之后写：

```javascript
$.evalFile(File($.fileName).parent + "/_shared.jsx");
```

漏掉这行 → `loadPrefs` / `savePrefs` / `loadPos` / `_pf` 全部未定义 → 脚本静默崩溃。

---

## 7. ScriptUI 对话框模式

### 按钮约定

- `取消` → `{ name: "cancel" }`（自动绑定 ESC）
- 执行按钮 → `{ name: "ok" }`（2 字中文标签）
- 取消在左，执行在右

### 位置记忆模板

```javascript
// 加载位置
var pos = loadPos("xxx_pos.json");
try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
dlg.show();

// 保存位置（取消按钮）
cancelBtn.onClick = function () {
    var b = dlg.bounds; savePrefs("xxx_pos.json", { x: b[0], y: b[1] });
    dlg.close();
};

// 保存位置（执行按钮）
runBtn.onClick = function () {
    var b = dlg.bounds; savePrefs("xxx_pos.json", { x: b[0], y: b[1] });
    dlg.close();
    doWork(options);
};
```

---

## 8. 工程诊断模式 / Dev Tools

面板底部 `v2.89 Momo Tools` **快速连点 3 次**（600ms 内）显示隐藏的开发工具组。
2 秒无操作自动隐藏计数。

可用诊断：
- 📍 位置诊断 → 检查所有 `xxx_pos.json` 的存在性 + `loadPos` 返回值
- ▶ 溢出/尾端诊断 → 逐框互动式 FP/FN 比对

---

## 9. 已踩过的返工清单

以下问题不应再发生：

1. ~~忘记 `$.evalFile(_shared.jsx)` → 脚本静默崩溃~~ → 引入脚本模板检查
2. ~~`JSON.parse` 静默失败 → 数据丢失不知~~ → 全用 `_parseJson()`
3. ~~`loadPrefs({})` 空 defaults → 读取全部丢弃~~ → 用直读 + `_parseJson`
4. ~~`pos.x >= 0` 拒绝双屏负数~~ → 已全部移除该判断（**教训：batch regex 替换后必须 grep `dlg.show()` 验证，本次曾意外删除了 9 个脚本的 show 调用**）
5. ~~`savePrefs` 0 字节库存文件~~ → 改用直接 File.write
6. ~~`padEnd` 在 ExtendScript 不可用~~ → 改用 while 循环
