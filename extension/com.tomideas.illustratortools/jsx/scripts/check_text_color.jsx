#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var SCRIPT_VERSION = "1.6.0";
    var LAYER_LABELS    = "颜色编号";
    var LAYER_ATTENTION = "单次颜色标注";

    if (app.documents.length === 0) { alert("请先打开文件。"); return; }

    var doc = app.activeDocument;
    var totalArtboards = doc.artboards.length;

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

    function colorToKey(c) {
        if (!c) return "none";
        try {
            switch (c.typename) {
                case "RGBColor":  return "rgb:"  + Math.round(c.red)   + "," + Math.round(c.green)   + "," + Math.round(c.blue);
                case "CMYKColor": return "cmyk:" + Math.round(c.cyan)  + "," + Math.round(c.magenta) + "," + Math.round(c.yellow) + "," + Math.round(c.black);
                case "GrayColor": return "gray:" + Math.round(c.gray);
                case "SpotColor": return "spot:" + c.spot.name;
                case "NoColor":   return "none";
                default:          return "other:" + c.typename;
            }
        } catch (e) { return "error"; }
    }

    function cmykStr(c) {
        try { return "C" + Math.round(c.cyan) + " M" + Math.round(c.magenta) + " Y" + Math.round(c.yellow) + " K" + Math.round(c.black); }
        catch (e) { return ""; }
    }

    function colorToLabel(c) {
        if (!c) return "无填色";
        try {
            var swatchName = "";
            try {
                if (c.typename !== "NoColor" && c.typename !== "PatternColor") {
                    var sw = c.swatch;
                    if (sw && sw.name && sw.name !== "[None]" && sw.name !== "") swatchName = sw.name;
                }
            } catch (e) {}

            switch (c.typename) {
                case "CMYKColor":
                    var ck = cmykStr(c);
                    return swatchName ? swatchName + "  " + ck : ck;
                case "RGBColor":
                    return (swatchName ? swatchName + "  " : "") +
                           "RGB(" + Math.round(c.red) + ", " + Math.round(c.green) + ", " + Math.round(c.blue) + ")";
                case "GrayColor":
                    return (swatchName ? swatchName + "  " : "") + "Gray " + Math.round(c.gray) + "%";
                case "SpotColor":
                    var sn = c.spot.name;
                    try {
                        var sc = c.spot.color;
                        if (sc.typename === "CMYKColor") sn += "  " + cmykStr(sc);
                    } catch (e) {}
                    return sn;
                case "NoColor":       return "无填色";
                case "PatternColor":  return "图案填色";
                case "GradientColor": return "渐变填色";
                default:              return swatchName || c.typename;
            }
        } catch (e) { return "未知"; }
    }

    function artboardNumberOf(obj, abIndexes) {
        var b;
        try { b = obj.geometricBounds; } catch (e) { return 0; }
        var cx = (b[0] + b[2]) / 2;
        var cy = (b[1] + b[3]) / 2;
        for (var i = 0; i < abIndexes.length; i++) {
            var r = doc.artboards[abIndexes[i]].artboardRect;
            if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return abIndexes[i] + 1;
        }
        return 0;
    }

    function makeRGB(r, g, b) { var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c; }

    function getOrCreateLayer(name) {
        try { return doc.layers.getByName(name); } catch (e) {
            var l = doc.layers.add(); l.name = name; return l;
        }
    }

    function removeLayer(name) {
        try { var l = doc.layers.getByName(name); l.locked = false; l.visible = true; l.remove(); } catch (e) {}
    }

    function shortText(obj) {
        try {
            if (obj.typename === "TextFrame") {
                var s = trimText(String(obj.contents)).replace(/[\r\n]+/g, " ");
                return s.length > 30 ? s.substring(0, 30) + "…" : s;
            }
            return "形状";
        } catch (e) { return ""; }
    }

    function artboardsText(set) {
        var nums = [];
        for (var k in set) { if (set.hasOwnProperty(k)) nums.push(parseInt(k, 10)); }
        nums.sort(function (a, b) { return a - b; });
        return nums.length === 0 ? "画板外" : nums.join(", ");
    }

    // ==========================
    // Scan
    // ==========================
    function isVisible(obj) {
        try {
            var p = obj;
            while (p && p.typename !== "Document") {
                try { if (p.hidden)  return false; } catch (e) {}
                try { if (p.visible === false) return false; } catch (e) {}
                p = p.parent;
            }
        } catch (e) {}
        return true;
    }

    function scan(abIndexes, opts) {
        var colorMap = {}; // key -> { label, charCount, frameCount, frames[], artboards{} }

        if (opts.checkText) {
            for (var i = 0; i < doc.textFrames.length; i++) {
                var tf = doc.textFrames[i];
                try {
                    if (tf.locked || tf.hidden) continue;
                    if (opts.visibleOnly && !isVisible(tf)) continue;
                    var abNum = artboardNumberOf(tf, abIndexes);
                    if (abNum === 0 && abIndexes.length > 0) continue;

                    var chars = tf.characters;
                    for (var j = 0; j < chars.length; j++) {
                        var ch = chars[j];
                        var txt; try { txt = ch.contents; } catch (e) { continue; }
                        if (!txt || /^[\r\n\t ]+$/.test(txt)) continue;
                        var fillColor; try { fillColor = ch.characterAttributes.fillColor; } catch (e) { continue; }
                        var key = colorToKey(fillColor);
                        if (!colorMap[key]) {
                            colorMap[key] = { label: colorToLabel(fillColor), charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
                        }
                        var g = colorMap[key];
                        g.charCount++;
                        var fid = i + "_";
                        if (!g.seen[fid]) {
                            g.seen[fid] = true; g.frameCount++; g.frames.push(tf);
                            if (abNum > 0) g.artboards[abNum] = true;
                            if (g.sampleText === "") g.sampleText = shortText(tf);
                        }
                    }
                } catch (err) {}
            }
        }

        if (opts.checkShapes) {
            for (var si = 0; si < doc.pathItems.length; si++) {
                var pi = doc.pathItems[si];
                try {
                    if (pi.locked || pi.hidden) continue;
                    if (!pi.filled) continue;
                    if (opts.visibleOnly && !isVisible(pi)) continue;
                    var abNum = artboardNumberOf(pi, abIndexes);
                    if (abNum === 0 && abIndexes.length > 0) continue;

                    var fillColor; try { fillColor = pi.fillColor; } catch (e) { continue; }
                    if (!fillColor || fillColor.typename === "NoColor") continue;

                    var key = colorToKey(fillColor);
                    if (!colorMap[key]) {
                        colorMap[key] = { label: colorToLabel(fillColor), charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
                    }
                    var g = colorMap[key];
                    g.charCount++;
                    var fid = "s" + si;
                    if (!g.seen[fid]) {
                        g.seen[fid] = true; g.frameCount++; g.frames.push(pi);
                        if (abNum > 0) g.artboards[abNum] = true;
                        if (g.sampleText === "") g.sampleText = shortText(pi);
                    }
                } catch (err) {}
            }
        }

        if (opts.checkStroke) {
            for (var si = 0; si < doc.pathItems.length; si++) {
                var pi = doc.pathItems[si];
                try {
                    if (pi.locked || pi.hidden) continue;
                    if (!pi.stroked) continue;
                    if (opts.visibleOnly && !isVisible(pi)) continue;
                    var abNum = artboardNumberOf(pi, abIndexes);
                    if (abNum === 0 && abIndexes.length > 0) continue;

                    var strokeColor; try { strokeColor = pi.strokeColor; } catch (e) { continue; }
                    if (!strokeColor || strokeColor.typename === "NoColor") continue;

                    var key = "stroke:" + colorToKey(strokeColor);
                    if (!colorMap[key]) {
                        colorMap[key] = { label: colorToLabel(strokeColor) + "（描边）", charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
                    }
                    var g = colorMap[key];
                    g.charCount++;
                    var fid = "s" + si;
                    if (!g.seen[fid]) {
                        g.seen[fid] = true; g.frameCount++; g.frames.push(pi);
                        if (abNum > 0) g.artboards[abNum] = true;
                        if (g.sampleText === "") g.sampleText = shortText(pi);
                    }
                } catch (err) {}
            }
        }

        return colorMap;
    }

    // ==========================
    // Mark layers
    // ==========================
    function drawMarkers(colorMap, sortedKeys, opts) {
        if (opts.removeOld) { removeLayer(LAYER_LABELS); removeLayer(LAYER_ATTENTION); }

        var labelLayer    = opts.markLabels    ? getOrCreateLayer(LAYER_LABELS)    : null;
        var attentionLayer = opts.markAttention ? getOrCreateLayer(LAYER_ATTENTION) : null;

        for (var gi = 0; gi < sortedKeys.length; gi++) {
            var key = sortedKeys[gi];
            var g = colorMap[key];
            var isAttention = g.frameCount <= opts.threshold;
            var id = gi + 1;
            var isStroke = key.indexOf("stroke:") === 0;

            for (var fi = 0; fi < g.frames.length; fi++) {
                var obj = g.frames[fi];
                var gb; try { gb = obj.geometricBounds; } catch (e) { continue; }
                var left = gb[0], top = gb[1], right = gb[2];

                if (labelLayer) {
                    var lbl = labelLayer.textFrames.add();
                    lbl.contents = String(id);
                    lbl.position = isStroke ? [right + 2, top] : [left - 12, top];
                    try {
                        lbl.textRange.characterAttributes.size = 7;
                        lbl.textRange.characterAttributes.fillColor = isAttention ? makeRGB(200, 40, 40) : makeRGB(60, 120, 200);
                    } catch (e) {}
                }

                if (attentionLayer && isAttention) {
                    var PAD = 3;
                    var w = gb[2] - gb[0] + PAD * 2;
                    var h = gb[1] - gb[3] + PAD * 2;
                    if (w > 0 && h > 0) {
                        var rect = attentionLayer.pathItems.rectangle(top + PAD, left - PAD, w, h);
                        rect.filled = false; rect.stroked = true;
                        rect.strokeWidth = 1.5;
                        rect.strokeColor = isStroke ? makeRGB(200, 100, 40) : makeRGB(200, 40, 40);
                    }
                }
            }
        }
    }

    // ==========================
    // Report
    // ==========================
    function buildReport(colorMap, sortedKeys, abIndexes, opts) {
        var totalChars = 0;
        for (var i = 0; i < sortedKeys.length; i++) totalChars += colorMap[sortedKeys[i]].charCount;

        var now = new Date();
        var dateStr = now.getFullYear() + "-" + pad2(now.getMonth() + 1) + "-" + pad2(now.getDate())
            + "  " + pad2(now.getHours()) + ":" + pad2(now.getMinutes());

        var t = "";
        t += "颜色检查报告  v" + SCRIPT_VERSION + "\n";
        t += "检查时间：" + dateStr + "\n";
        t += "画板范围：" + (abIndexes.length === totalArtboards ? "全部" : abIndexes.map(function(x){return x+1;}).join(", ")) + "\n";
        t += "颜色种数：" + sortedKeys.length + "   /   总数量：" + totalChars + "\n";
        var types = [];
        if (opts.checkText) types.push("文字");
        if (opts.checkShapes) types.push("形状");
        if (opts.checkStroke) types.push("描边");
        t += "检查类型：" + types.join(" + ") + "\n";
        t += "\n";

        t += "一、颜色分组（按使用量排序）\n";
        t += "------------------------\n";
        for (var j = 0; j < sortedKeys.length; j++) {
            var key = sortedKeys[j];
            var g = colorMap[key];
            var pct = Math.round(g.charCount / totalChars * 100);
            var isAttention = g.frameCount <= opts.threshold;
            t += "[" + (j + 1) + "] × " + g.frameCount + " 个对象";
            if (isAttention) t += "    ★ 出现 ≤ " + opts.threshold + " 次（需确认）";
            t += "\n";
            t += "    颜色：" + g.label + "\n";
            t += "    数量：" + g.charCount + " 个（占 " + pct + "%）\n";
            t += "    画板：" + artboardsText(g.artboards) + "\n";
            t += "    示例：" + g.sampleText + "\n\n";
        }

        var N = opts.threshold;
        t += "二、出现次数 ≤ " + N + " 次的颜色（需确认）\n";
        t += "------------------------\n";
        var hasAttention = false;
        for (var k = 0; k < sortedKeys.length; k++) {
            var g2 = colorMap[sortedKeys[k]];
            if (g2.frameCount > N) continue;
            hasAttention = true;
            t += "[" + (k + 1) + "]  " + g2.label + "  ×" + g2.frameCount + "\n";
            t += "    画板：" + artboardsText(g2.artboards) + "\n";
            t += "    示例：" + g2.sampleText + "\n\n";
        }
        if (!hasAttention) t += "没有出现次数 ≤ " + N + " 次的颜色。\n\n";

        return t;
    }

    function pad2(n) { return n < 10 ? "0" + n : String(n); }

    function showResultWindow(reportText, opts) {
        var rdlg = new Window("dialog", "颜色报告");
        rdlg.orientation = "column";
        rdlg.alignChildren = "fill";
        rdlg.margins = 14;

        rdlg.add("statictext", undefined, "检查完成。★ = 出现次数 ≤ " + opts.threshold + " 次，已在画板上标红框。");

        var box = rdlg.add("edittext", undefined, reportText, { multiline: true, scrolling: true });
        box.preferredSize.width = 680;
        box.preferredSize.height = 520;

        var btnGroup = rdlg.add("group");
        btnGroup.orientation = "row";
        btnGroup.alignment = "right";
        btnGroup.add("button", undefined, "确定", { name: "ok" }).onClick = function () { rdlg.close(); };

        rdlg.center();
        rdlg.show();
    }

    // ==========================
    // UI — Input
    // ==========================
    var prefs = loadPrefs("color_check.json", { 
        range: "all", 
        visibleOnly: true, 
        markLabels: true, 
        markAttention: true, 
        threshold: "1", 
        removeOld: true,
        checkText: true,
        checkShapes: true,
        checkStroke: true
    });

    var dlg = new Window("dialog", "颜色 v" + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 8;
    dlg.margins = [14, 16, 14, 14];

    var rangePanel = dlg.add("panel", undefined, "1. 检查范围");
    rangePanel.orientation = "column";
    rangePanel.alignChildren = "fill";
    rangePanel.margins = [10, 14, 10, 10];
    rangePanel.spacing = 6;

    var rangeRow = rangePanel.add("group");
    rangeRow.orientation = "row";
    rangeRow.alignChildren = ["left", "center"];
    var rl = rangeRow.add("statictext", undefined, "画板范围");
    rl.preferredSize.width = 60;
    var rangeInput = rangeRow.add("edittext", undefined, prefs.range);
    rangeInput.characters = 22;
    rangePanel.add("statictext", undefined, "all = 全部；1-10；1,3,5 = 指定画板");

    var typeRow = rangePanel.add("group");
    typeRow.orientation = "row";
    typeRow.alignChildren = ["left", "center"];
    typeRow.spacing = 10;
    var chkCheckText = typeRow.add("checkbox", undefined, "文字");
    chkCheckText.value = prefs.checkText;
    var chkCheckShapes = typeRow.add("checkbox", undefined, "形状");
    chkCheckShapes.value = prefs.checkShapes;
    var chkCheckStroke = typeRow.add("checkbox", undefined, "描边");
    chkCheckStroke.value = prefs.checkStroke;

    var outPanel = dlg.add("panel", undefined, "2. 输出方式");
    outPanel.orientation = "column";
    outPanel.alignChildren = "left";
    outPanel.margins = [10, 14, 10, 10];
    outPanel.spacing = 5;

    var chkVisibleOnly = outPanel.add("checkbox", undefined, "只检查可见对象（跳过隐藏图层）");
    chkVisibleOnly.value = prefs.visibleOnly;

    var chkLabels    = outPanel.add("checkbox", undefined, "标注颜色编号（蓝色数字）");

    var attRow = outPanel.add("group");
    attRow.orientation = "row";
    attRow.alignChildren = ["left", "center"];
    var chkAttention = attRow.add("checkbox", undefined, "红框标出出现次数 ≤");
    var thresholdInput = attRow.add("edittext", undefined, prefs.threshold);
    thresholdInput.characters = 3;
    attRow.add("statictext", undefined, "次的颜色");

    var chkRemoveOld = outPanel.add("checkbox", undefined, "运行前删除旧标注图层");
    chkLabels.value = prefs.markLabels;
    chkAttention.value = prefs.markAttention;
    chkRemoveOld.value = prefs.removeOld;

    chkAttention.onClick = function () {
        thresholdInput.enabled = chkAttention.value;
    };

    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";
    btnGroup.add("button", undefined, "取消", { name: "cancel" }).onClick = function () {
        var b = dlg.bounds; savePrefs("text_color_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    var okBtn = btnGroup.add("button", undefined, "检查", { name: "ok" });
    okBtn.onClick = function () {
        var abIndexes = parseArtboardRange(trimText(rangeInput.text), totalArtboards);
        if (abIndexes.length === 0) { alert("画板范围无效。"); return; }

        if (!chkCheckText.value && !chkCheckShapes.value && !chkCheckStroke.value) {
            alert("请至少选择一种检查类型（文字、形状或描边）。");
            return;
        }

        var threshold = 1;
        if (chkAttention.value) {
            var t = parseInt(thresholdInput.text, 10);
            if (!isNaN(t) && t >= 1) threshold = t;
        }

        var opts = {
            markLabels:    chkLabels.value,
            markAttention: chkAttention.value,
            removeOld:     chkRemoveOld.value,
            threshold:     threshold,
            visibleOnly:   chkVisibleOnly.value,
            checkText:     chkCheckText.value,
            checkShapes:   chkCheckShapes.value,
            checkStroke:   chkCheckStroke.value
        };

        savePrefs("color_check.json", { 
            range: trimText(rangeInput.text), 
            visibleOnly: chkVisibleOnly.value, 
            markLabels: chkLabels.value, 
            markAttention: chkAttention.value, 
            threshold: trimText(thresholdInput.text), 
            removeOld: chkRemoveOld.value,
            checkText: chkCheckText.value,
            checkShapes: chkCheckShapes.value,
            checkStroke: chkCheckStroke.value
        });
        var b = dlg.bounds; savePrefs("text_color_pos.json", { x: b[0], y: b[1] });
        dlg.close();

        var colorMap = scan(abIndexes, opts);
        var keys = [];
        for (var k in colorMap) { if (colorMap.hasOwnProperty(k)) keys.push(k); }

        if (keys.length === 0) { alert("未找到任何对象。"); return; }

        keys.sort(function (a, b) { return colorMap[b].charCount - colorMap[a].charCount; });

        drawMarkers(colorMap, keys, opts);

        // 計算需注意數量
        var attentionCount = 0;
        for (var ai = 0; ai < keys.length; ai++) {
            if (colorMap[keys[ai]].frameCount <= opts.threshold) attentionCount++;
        }

        // 簡潔提示窗口
        var summaryMsg = "颜色检查 v" + SCRIPT_VERSION + "\n\n" +
            "发现颜色：" + keys.length + " 种\n" +
            "需注意（出现 ≤ " + opts.threshold + " 次）：" + attentionCount + " 种\n\n" +
            "已在画板标注\n" +
            "图层：" + LAYER_LABELS + " / " + LAYER_ATTENTION + "\n\n" +
            "按确定查看详细报告。";
        alert(summaryMsg);

        var report = buildReport(colorMap, keys, abIndexes, opts);
        showResultWindow(report, opts);
    };

    var pos = loadPos("text_color_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();
})();
