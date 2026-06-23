#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

// ============================================================
// 文字溢出检查
// 版本：5.9.3
//
// CHANGELOG
// 5.9.3  M12 公式修正：(paragraphs - 1) × leading > frameH + 0.6×leading
//        Illustrator contents 永遠尾隨隱式 \r，不扣除會把單行正常框誤判
//        (12/17 框 FP 全是這原因，例如 "Ajustes\r" 在剛好一行高的框)。
// 5.9.2  M12 回退至「段落高度比對」(5.9.0 邏輯)：
//        實測 5.9.1 的 paragraphs > lines 會造成大量誤判
//        （多段落內容在正常框內也會 paragraphs > lines）。
//        回到 paragraphs × leading > frameH 的高度公式，較保守但較準確。
// 5.9.1  [已撤回] 改用 paragraphs > lines 比對 → 多段落正常框被誤判。
// 5.9.0  批次矩陣定稿（Untitled-3.ai 17 框人工標注）：
//        • M4b/M4c **必殺**：保留 \r 會把段落分隔符算成隱藏，多段落框（表格/列表）必假陽性
//          證據：框#1 25 段表格 M4b=24/M4c=25；框#3 9 段 FAQ M4b/M4c=9。
//        • 保留 M4a（去全部空白，含 \r）+ M8（轉點文字比對）為主要規則。
//        • 新增 M12「段落高度比對」：paragraphs × leading > frameH。
// 5.8.0  M11 假陽性根因：tf.characters 是 story 全字數（含串接下一框）→ 已移除。
// 5.7.0  回退至 5.1 邏輯（僅 M4+M8）；移除 M11（串接框 gap=1 全檔假陽性）。尾端 Enter/空格不支援。
// 5.6.0  字符行差 gap≥1 → 14 框多數誤報，已撤回
// 5.5.0  尾端 Enter/空格：characters 集合 vs lines[].characters（探針證實幾何/輪廓 outH<pathH 無效）
// 5.4.0  尾端 Enter/空格：leading×行數 + 輪廓 bounds（社群點文字法不涵蓋 contents 不變的版面溢流）
// 5.3.0  點文字寬高比對（對 Enter/空格探針 SAME 無效，已改由 5.4 取代）
// 5.2.0  修復尾端 Enter/空格：版面行高檢測 + 保留空白字元差（stripWS 會抹掉換行故漏判）
// 5.1.0  依 AI 30.3 探針定稿：僅 M4(字數差)+M8(點文字對照)；移除無效 overflows/行寬/insertionPoint
// 5.0.0  新增點文字對照探針：hidden≈0 但末行/水平仍裁切時可檢出（同排右側漏判）
// 4.5.0  移除 story.overflows / insertionPoint 誤判；原生 overflows 需佐證；加強水平量測
// 4.4.0  優先使用 Illustrator 原生 overflows 與末字 insertionPoint 檢測（修復水平溢出漏判）
// 4.3.0  新增水平溢出检查：检测行宽超出文字框宽度的情况
// 4.2.0  修正误判：stripWS 清除 control chars，tolerance=4，不自动选中文字框
// 4.1.0  新增设置对话框：画板范围、只检查可见文字、删除旧图层
// 4.0.0  核心方法：contents.length - sum(lines[i].characters.length) > 2
// ============================================================

(function () {
    var VERSION = "5.9.3";
    var TOLERANCE = 4;
    var MARK_LAYER = "文字溢出标注";

    if (app.documents.length === 0) { alert("请先打开文件。"); return; }

    var doc = app.activeDocument;
    var totalArtboards = doc.artboards.length;
    var AREA_TEXT_KIND = 0;
    try { AREA_TEXT_KIND = TextType.AREATEXT; } catch (e) {}

    // ==========================
    // Helpers
    // ==========================
    function trimText(s) { return String(s).replace(/^\s+|\s+$/g, ""); }

    function parseArtboardRange(text, total) {
        text = trimText(text);
        var result = [], seen = {};
        if (text === "" || text.toLowerCase() === "all") {
            for (var i = 0; i < total; i++) result.push(i);
            return result;
        }
        var parts = text.split(",");
        for (var p = 0; p < parts.length; p++) {
            var part = trimText(parts[p]);
            if (part.indexOf("-") >= 0) {
                var b = part.split("-");
                var a1 = parseInt(b[0], 10), a2 = parseInt(b[1], 10);
                if (isNaN(a1) || isNaN(a2)) continue;
                if (a1 > a2) { var tmp = a1; a1 = a2; a2 = tmp; }
                for (var n = a1; n <= a2; n++) {
                    if (n >= 1 && n <= total && !seen[n]) { result.push(n - 1); seen[n] = true; }
                }
            } else {
                var s = parseInt(part, 10);
                if (!isNaN(s) && s >= 1 && s <= total && !seen[s]) { result.push(s - 1); seen[s] = true; }
            }
        }
        return result;
    }

    function frameOnArtboards(tf, abIndexes) {
        if (abIndexes.length === totalArtboards) return true; // all
        var b; try { b = tf.geometricBounds; } catch (e) { return false; }
        var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
        for (var i = 0; i < abIndexes.length; i++) {
            var r = doc.artboards[abIndexes[i]].artboardRect;
            if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return true;
        }
        return false;
    }

    function isVisible(tf) {
        try {
            var p = tf;
            while (p && p.typename !== "Document") {
                try { if (p.hidden) return false; } catch (e) {}
                try { if (p.visible === false) return false; } catch (e) {}
                p = p.parent;
            }
        } catch (e) {}
        return true;
    }

    function showResult(found, checked, skipped, items, markLayer) {
        if (found === 0) {
            try { markLayer.remove(); } catch (e) {}
            alert("文字溢出检查 v" + VERSION + "\n\n" +
                  "检查完成，未发现文字溢出。\n\n" +
                  "已检查：" + checked + " 个文字框\n" +
                  "跳过：" + skipped + " 个");
        } else {
            var details = "";
            for (var i = 0; i < items.length; i++) {
                var it = items[i];
                var tag = it.pointProbe ? " [点文字]" : (it.vertical ? " [垂直]" : "");
                details += "[溢出 " + it.index + "]  画板 " + (it.abNum || "外") +
                           "  隐藏 " + it.hidden + " 字" + tag + "\n";
            }
            alert("文字溢出检查 v" + VERSION + "\n\n" +
                  "发现溢出：" + found + " 处\n\n" +
                  details + "\n" +
                  "已检查：" + checked + " 个文字框\n" +
                  "跳过：" + skipped + " 个\n\n" +
                  "已用红框标出，图层：\n" + MARK_LAYER);
        }
    }

    function stripWS(s) {
        // 去除空白 + Illustrator 的特殊格式字符（軟回車  等 control chars）
        return String(s).replace(/[\x00-\x1F\x7F\s]/g, "");
    }

    function countVisibleNonWS(tf) {
        var visibleNonWS = 0;
        try {
            for (var i = 0; i < tf.lines.length; i++) {
                try { visibleNonWS += stripWS(tf.lines[i].contents).length; } catch (e) {}
            }
        } catch (e) {}
        return visibleNonWS;
    }

    // 保留空格/換行，只去掉 control char（用於尾端空格、軟回車）
    function stripKeepSpaces(s) {
        return String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/\x03/g, "");
    }

    function countHiddenKeepSpaces(tf) {
        var total = 0, vis = 0;
        try { total = stripKeepSpaces(tf.contents).length; } catch (e) { return 0; }
        try {
            for (var i = 0; i < tf.lines.length; i++) {
                try { vis += stripKeepSpaces(tf.lines[i].contents).length; } catch (e) {}
            }
        } catch (e) {}
        return total - vis;
    }

    function countHiddenRaw(tf) {
        var total = 0, vis = 0;
        try { total = String(tf.contents).length; } catch (e) { return 0; }
        try {
            for (var i = 0; i < tf.lines.length; i++) {
                try { vis += String(tf.lines[i].contents).length; } catch (e) {}
            }
        } catch (e) {}
        return total - vis;
    }

    function normContents(s) {
        return String(s).replace(/[\x03\r]/g, "");
    }

    // 複製→轉點文字：溢出時 contents 變短（水平裁切等）
    function probeOverflowByPointContents(tf) {
        var orig = normContents(tf.contents);
        if (!orig.length) return false;
        var grp = null;
        try {
            grp = tf.parent.groupItems.add();
            var dup = tf.duplicate(grp, ElementPlacement.PLACEATEND);
            dup.convertAreaObjectToPointObject();
            var conv = normContents(grp.pageItems[0].contents);
            grp.remove();
            return orig !== conv;
        } catch (e) {
            try { if (grp) grp.remove(); } catch (e2) {}
            return false;
        }
    }

    // M12：段落高度比對（抓尾端 \r\r 純空段溢出）
    //
    // 公式: (paragraphs - 1) × leading > frameH + 0.6×leading
    //
    // 為什麼 -1：Illustrator 為每個 Area Text 自動附加一個隱式末段符
    //          (contents 永遠以 \r 結尾)，這個段落不需要實際渲染空間。
    //          不扣除會誤判單行正常框（2 × leading 永遠 > 單行框高）。
    function probeTrailingParaOverset(tf) {
        try {
            var paraCount = 0;
            try { paraCount = tf.paragraphs.length; } catch (e) { return false; }
            // 扣除隱式末段符：< 3 表示沒有額外空段（< 2 段內容 + 1 末段符）
            var effective = paraCount - 1;
            if (effective < 2) return false;

            var gb = tf.geometricBounds;
            var frameH = gb[1] - gb[3];
            if (frameH <= 0) return false;

            var leading = 0;
            try { leading = tf.textRange.characterAttributes.leading; } catch (e) {}
            if (!leading || leading <= 0) {
                try { leading = tf.textRange.characterAttributes.size * 1.2; } catch (e) {}
            }
            if (!leading || leading <= 0) return false;

            var needH = effective * leading;
            return needH > frameH + leading * 0.6;
        } catch (e) { return false; }
    }

    function isOverset(tf) {
        // ── 規則（v5.9）：
        //   M4a (stripWS) > TOLERANCE  → 實字被裁
        //   M8  (point dup contents 縮短) → 任何字被裁
        //   M12 (paragraphs × leading > frameH) → 純空段溢出（trailing \r\r）
        // ── 移除：M4b/M4c（保留 \r 會把段落數算成隱藏，多段落框假陽性）
        try {
            if (String(tf.contents).length === 0 && tf.lines.length === 0) return false;
        } catch (e) { return false; }

        // M4a：去除所有空白字元後比對（裁切實字最可靠）
        var totalNonWS = 0;
        try { totalNonWS = stripWS(tf.contents).length; } catch (e) {}
        var hidden = totalNonWS - countVisibleNonWS(tf);
        if (hidden > TOLERANCE) return "vertical";

        // M8：複製本框 → 轉點文字，contents 變短表示有文字被裁切
        if (probeOverflowByPointContents(tf)) return "point";

        // M12：純空段溢出（尾端 \r\r 但框裝不下）
        if (probeTrailingParaOverset(tf)) return "trailing";

        return false;
    }

    function removeLayerByName(name) {
        for (var i = doc.layers.length - 1; i >= 0; i--) {
            try {
                if (doc.layers[i].name === name) {
                    doc.layers[i].locked = false; doc.layers[i].visible = true; doc.layers[i].remove();
                }
            } catch (e) {}
        }
    }

    function markFrame(tf, layer, index) {
        var gb; try { gb = tf.geometricBounds; } catch (e) { return; }
        var PAD = 4;
        var left = gb[0] - PAD, top = gb[1] + PAD;
        var w = (gb[2] + PAD) - left, h = top - (gb[3] - PAD);
        if (w <= 0 || h <= 0) return;
        var rect = layer.pathItems.rectangle(top, left, w, h);
        rect.filled = false; rect.stroked = true; rect.strokeWidth = 2;
        rect.strokeColor = makeRGB(220, 30, 30);
        var lbl = layer.textFrames.add();
        lbl.contents = "溢出 " + index;
        lbl.position = [left, top + 12];
        try {
            lbl.textRange.characterAttributes.size = 8;
            lbl.textRange.characterAttributes.fillColor = makeRGB(220, 30, 30);
        } catch (e) {}
    }

    function makeRGB(r, g, b) {
        var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c;
    }

    // ==========================
    // UI
    // ==========================
    var prefs = loadPrefs("overset.json", { range:"all", visibleOnly:true, removeOld:true });

    // ── 設定持久化（_shared.jsx）──

    var dlg = new Window("dialog", "溢出检查 v" + VERSION);
    dlg.orientation = "column"; dlg.alignChildren = "fill";
    dlg.spacing = 8; dlg.margins = [14, 16, 14, 14];

    var rangePanel = dlg.add("panel", undefined, "1. 检查范围");
    rangePanel.orientation = "column"; rangePanel.alignChildren = "fill";
    rangePanel.margins = [10, 14, 10, 10]; rangePanel.spacing = 6;

    var rangeRow = rangePanel.add("group");
    rangeRow.orientation = "row"; rangeRow.alignChildren = ["left", "center"];
    var rl = rangeRow.add("statictext", undefined, "画板范围");
    rl.preferredSize.width = 60;
    var rangeInput = rangeRow.add("edittext", undefined, prefs.range);
    rangeInput.characters = 22;
    rangePanel.add("statictext", undefined, "all = 全部；1-10；1,3,5 = 指定画板");

    var outPanel = dlg.add("panel", undefined, "2. 输出方式");
    outPanel.orientation = "column"; outPanel.alignChildren = "left";
    outPanel.margins = [10, 14, 10, 10]; outPanel.spacing = 5;

    var chkVisibleOnly = outPanel.add("checkbox", undefined, "只检查可见文字（跳过隐藏图层）");
    var chkRemoveOld   = outPanel.add("checkbox", undefined, "运行前删除旧标注图层");
    chkVisibleOnly.value = prefs.visibleOnly;
    chkRemoveOld.value   = prefs.removeOld;

    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row"; btnGroup.alignment = "right";
    btnGroup.add("button", undefined, "取消", { name: "cancel" }).onClick = function () {
        var b = dlg.bounds; savePrefs("overset_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    var okBtn = btnGroup.add("button", undefined, "检查", { name: "ok" });
    okBtn.onClick = function () {
        var abIndexes = parseArtboardRange(trimText(rangeInput.text), totalArtboards);
        if (abIndexes.length === 0) { alert("画板范围无效。"); return; }
        savePrefs("overset.json", { range:trimText(rangeInput.text), visibleOnly:chkVisibleOnly.value, removeOld:chkRemoveOld.value });
        var b = dlg.bounds; savePrefs("overset_pos.json", { x: b[0], y: b[1] });
        dlg.close();
        runCheck(abIndexes, chkVisibleOnly.value, chkRemoveOld.value);
    };

    var pos = loadPos("overset_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();

    // ==========================
    // Run
    // ==========================
    function runCheck(abIndexes, visibleOnly, removeOld) {
        if (removeOld) removeLayerByName(MARK_LAYER);

        try { doc.redraw(); } catch (e) {}

        var markLayer = doc.layers.add();
        markLayer.name = MARK_LAYER;

        try { app.executeMenuCommand("deselectall"); } catch (e) {}

        var snapshot = [];
        for (var s = 0; s < doc.textFrames.length; s++) snapshot.push(doc.textFrames[s]);

        var total = snapshot.length, skipped = 0, notArea = 0, checked = 0, found = 0;
        var oversetItems = []; // 收集溢出框信息

        for (var i = 0; i < snapshot.length; i++) {
            var tf = snapshot[i];
            try {
                var itemLocked = false; try { itemLocked = tf.locked; } catch (e) {}
                var itemHidden = false; try { itemHidden = tf.hidden; } catch (e) {}
                if (itemLocked || itemHidden) { skipped++; continue; }
                if (visibleOnly && !isVisible(tf)) { skipped++; continue; }

                var kind = null; try { kind = tf.kind; } catch (e) {}
                if (kind !== AREA_TEXT_KIND) { notArea++; continue; }

                if (!frameOnArtboards(tf, abIndexes)) { skipped++; continue; }

                checked++;
                var totalChars = 0, visChars = 0, hiddenChars = 0;
                try { totalChars = stripWS(tf.contents).length; } catch (e) {}
                visChars = countVisibleNonWS(tf);
                hiddenChars = totalChars - visChars;

                var method = isOverset(tf);
                if (method) {
                    found++;
                    markFrame(tf, markLayer, found);
                    var pointProbe = (method === "point");
                    var vertical = (method === "vertical");
                    var preview = "";
                    try { preview = String(tf.contents).replace(/[\r\n]+/g, " ").substring(0, 40); } catch (e) {}
                    var abNum = 0;
                    try {
                        var gb = tf.geometricBounds;
                        var cx = (gb[0] + gb[2]) / 2, cy = (gb[1] + gb[3]) / 2;
                        for (var ai = 0; ai < abIndexes.length; ai++) {
                            var r = doc.artboards[abIndexes[ai]].artboardRect;
                            if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) { abNum = abIndexes[ai] + 1; break; }
                        }
                    } catch (e) {}
                    oversetItems.push({
                        index: found, abNum: abNum, preview: preview,
                        total: totalChars, visible: visChars, hidden: hiddenChars,
                        vertical: vertical, pointProbe: pointProbe
                    });
                }
            } catch (err) { skipped++; }
        }

        showResult(found, checked, skipped, oversetItems, markLayer);
    }
})();
