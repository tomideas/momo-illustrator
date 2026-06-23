#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

// ============================================================
// 尾端空白 / 空段检查
// 版本：1.0.1
//
// 独立于文字溢出检查：只标记 Area Text 内容末尾的空格、Tab、
// 全角空格、换行或空段落，作为清理规则使用。
// ============================================================

(function () {
    var VERSION = "1.0.1";
    var MARK_LAYER = "尾端空白空段标注";

    if (app.documents.length === 0) { alert("请先打开文件。"); return; }

    var doc = app.activeDocument;
    var totalArtboards = doc.artboards.length;
    var AREA_TEXT_KIND = 0;
    try { AREA_TEXT_KIND = TextType.AREATEXT; } catch (e) {}

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
        if (abIndexes.length === totalArtboards) return true;
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

    function makeRGB(r, g, b) {
        var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c;
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

    function stripImplicitFinalParagraph(s) {
        // Illustrator Area Text 的 contents 通常會自帶一個末尾段落結束符。
        // 這個符號不是使用者多按 Enter，必須先忽略，否則正常文字框會全被標成空段。
        return String(s).replace(/[\r\n\x03]$/, "");
    }

    function detectTrailingIssue(tf) {
        var s = "";
        try { s = String(tf.contents || ""); } catch (e) { return null; }
        if (!s.length) return null;

        s = stripImplicitFinalParagraph(s);
        if (!s.length) return null;

        if (/[\r\n\x03]+[ \t\u00A0\u3000\r\n\x03]*$/.test(s)) return "空段";
        if (/[ \t\u00A0\u3000]+$/.test(s)) return "空白";
        return null;
    }

    function issueTailPreview(tf) {
        var s = "";
        try { s = String(tf.contents || ""); } catch (e) { return ""; }
        s = stripImplicitFinalParagraph(s);
        s = s.replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/\x03/g, "\\x03");
        if (s.length > 42) s = "..." + s.substring(s.length - 42);
        return s;
    }

    function findArtboardNumber(tf, abIndexes) {
        try {
            var gb = tf.geometricBounds;
            var cx = (gb[0] + gb[2]) / 2, cy = (gb[1] + gb[3]) / 2;
            for (var ai = 0; ai < abIndexes.length; ai++) {
                var r = doc.artboards[abIndexes[ai]].artboardRect;
                if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return abIndexes[ai] + 1;
            }
        } catch (e) {}
        return 0;
    }

    function markFrame(tf, layer, index, issue) {
        var gb; try { gb = tf.geometricBounds; } catch (e) { return; }
        var PAD = 4;
        var left = gb[0] - PAD, top = gb[1] + PAD;
        var w = (gb[2] + PAD) - left, h = top - (gb[3] - PAD);
        if (w <= 0 || h <= 0) return;

        var color = makeRGB(240, 160, 48);
        var rect = layer.pathItems.rectangle(top, left, w, h);
        rect.filled = false; rect.stroked = true; rect.strokeWidth = 2;
        rect.strokeColor = color;

        var lbl = layer.textFrames.add();
        lbl.contents = "尾端" + issue + " " + index;
        lbl.position = [left, top + 12];
        try {
            lbl.textRange.characterAttributes.size = 8;
            lbl.textRange.characterAttributes.fillColor = color;
        } catch (e) {}
    }

    function showResult(found, checked, skipped, items, markLayer) {
        if (found === 0) {
            try { markLayer.remove(); } catch (e) {}
            alert("尾端空白 / 空段检查 v" + VERSION + "\n\n" +
                  "检查完成，未发现尾端空白或空段。\n\n" +
                  "已检查：" + checked + " 个区域文字框\n" +
                  "跳过：" + skipped + " 个");
            return;
        }

        var details = "";
        for (var i = 0; i < items.length; i++) {
            var it = items[i];
            details += "[" + it.index + "]  画板 " + (it.abNum || "外") +
                       "  尾端" + it.issue + "  " + it.preview + "\n";
        }
        alert("尾端空白 / 空段检查 v" + VERSION + "\n\n" +
              "发现需清理：" + found + " 处\n\n" +
              details + "\n" +
              "已检查：" + checked + " 个区域文字框\n" +
              "跳过：" + skipped + " 个\n\n" +
              "已用橙框标出，图层：\n" + MARK_LAYER);
    }

    var prefs = loadPrefs("trailing_text.json", { range:"all", visibleOnly:true, removeOld:true });

    var dlg = new Window("dialog", "尾端空白 v" + VERSION);
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
        var b = dlg.bounds; savePrefs("trailing_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    var okBtn = btnGroup.add("button", undefined, "检查", { name: "ok" });
    okBtn.onClick = function () {
        var abIndexes = parseArtboardRange(trimText(rangeInput.text), totalArtboards);
        if (abIndexes.length === 0) { alert("画板范围无效。"); return; }
        savePrefs("trailing_text.json", { range:trimText(rangeInput.text), visibleOnly:chkVisibleOnly.value, removeOld:chkRemoveOld.value });
        var b = dlg.bounds; savePrefs("trailing_pos.json", { x: b[0], y: b[1] });
        dlg.close();
        runCheck(abIndexes, chkVisibleOnly.value, chkRemoveOld.value);
    };

    var pos = loadPos("trailing_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();

    function runCheck(abIndexes, visibleOnly, removeOld) {
        if (removeOld) removeLayerByName(MARK_LAYER);

        var markLayer = doc.layers.add();
        markLayer.name = MARK_LAYER;

        try { app.executeMenuCommand("deselectall"); } catch (e) {}

        var snapshot = [];
        for (var s = 0; s < doc.textFrames.length; s++) snapshot.push(doc.textFrames[s]);

        var skipped = 0, checked = 0, found = 0;
        var items = [];

        for (var i = 0; i < snapshot.length; i++) {
            var tf = snapshot[i];
            try {
                var itemLocked = false; try { itemLocked = tf.locked; } catch (e) {}
                var itemHidden = false; try { itemHidden = tf.hidden; } catch (e) {}
                if (itemLocked || itemHidden) { skipped++; continue; }
                if (visibleOnly && !isVisible(tf)) { skipped++; continue; }

                var kind = null; try { kind = tf.kind; } catch (e) {}
                if (kind !== AREA_TEXT_KIND) continue;
                if (!frameOnArtboards(tf, abIndexes)) { skipped++; continue; }

                checked++;
                var issue = detectTrailingIssue(tf);
                if (!issue) continue;

                found++;
                markFrame(tf, markLayer, found, issue);
                items.push({
                    index: found,
                    abNum: findArtboardNumber(tf, abIndexes),
                    issue: issue,
                    preview: issueTailPreview(tf)
                });
            } catch (err) {
                skipped++;
            }
        }

        showResult(found, checked, skipped, items, markLayer);
    }
})();
