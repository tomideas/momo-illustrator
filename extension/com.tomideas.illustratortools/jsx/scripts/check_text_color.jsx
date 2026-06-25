#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var SCRIPT_VERSION = "1.9.1";
    var LAYER_LABELS    = "颜色编号";
    var LAYER_ATTENTION = "单次颜色标注";
    var LAYER_LEGEND    = "颜色说明";

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

    // 标注编号配色板：每个颜色编号用一种区分度高、白底可读的颜色（画板标注与图例共用）。
    var LABEL_COLORS = [
        [0, 114, 206],   [220, 40, 40],   [0, 150, 70],    [240, 130, 0],
        [150, 60, 200],  [0, 160, 165],   [205, 0, 140],   [120, 80, 40],
        [40, 40, 200],   [170, 130, 0],   [90, 90, 90],    [0, 90, 160]
    ];
    function labelColor(i) {
        var c = LABEL_COLORS[i % LABEL_COLORS.length];
        return makeRGB(c[0], c[1], c[2]);
    }

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
                            colorMap[key] = { label: colorToLabel(fillColor), color: fillColor, charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
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
                        colorMap[key] = { label: colorToLabel(fillColor), color: fillColor, charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
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
                        colorMap[key] = { label: colorToLabel(strokeColor) + "（描边）", color: strokeColor, charCount: 0, frameCount: 0, seen: {}, frames: [], artboards: {}, sampleText: "" };
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
        if (opts.removeOld) { removeLayer(LAYER_LABELS); removeLayer(LAYER_ATTENTION); removeLayer(LAYER_LEGEND); }

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
                        lbl.textRange.characterAttributes.fillColor = labelColor(gi);
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
    // Legend / 生成说明
    // ==========================
    function estimateTextWidth(text, size) {
        return Math.max(80, String(text).length * size * 0.58);
    }

    function setLegendFont(tf) {
        var names = ["SourceHanSansSC-Regular", "AdobeSongStd-Light", "SimSun"];
        for (var i = 0; i < names.length; i++) {
            try { tf.textRange.characterAttributes.textFont = app.textFonts.getByName(names[i]); return; } catch (e) {}
        }
    }

    function legendTypeText(opts) {
        var parts = [];
        if (opts.checkText)   parts.push("文字");
        if (opts.checkShapes) parts.push("形状");
        if (opts.checkStroke) parts.push("描边");
        return parts.join(" / ");
    }

    function addColorLegend(layer, colorMap, sortedKeys, opts) {
        try {
            if (doc.artboards.length === 0) return;

            var padding = 12;
            var gap = 40;
            var lineHeight = 16;
            var titleHeight = 22;

            var lines = [];

            lines.push({ type: "text", text: "颜色编号说明", size: 12, color: makeRGB(0, 0, 0), height: titleHeight });
            lines.push({ type: "text", text: "检查类型：" + legendTypeText(opts), size: 8, color: makeRGB(0, 0, 0), height: lineHeight });
            if (opts.markAttention) {
                lines.push({ type: "text", text: "数字颜色与画板标注一一对应；「需注意」= 出现 ≤ " + opts.threshold + " 次", size: 8, color: makeRGB(0, 0, 0), height: lineHeight + 4 });
            } else {
                lines.push({ type: "text", text: "数字颜色与画板标注一一对应；按出现次数由多到少排序", size: 8, color: makeRGB(0, 0, 0), height: lineHeight + 4 });
            }

            for (var i = 0; i < sortedKeys.length; i++) {
                var g = colorMap[sortedKeys[i]];
                var isAttention = opts.markAttention && g.frameCount <= opts.threshold;
                lines.push({
                    type: "row",
                    text: (i + 1) + ". " + g.label + " × " + g.frameCount + (isAttention ? "  需注意" : ""),
                    size: 8,
                    color: labelColor(i),
                    swatchColor: g.color,
                    height: lineHeight
                });
            }

            var maxTextWidth = 0, contentHeight = 0;
            for (var j = 0; j < lines.length; j++) {
                var prefixWidth = lines[j].type === "row" ? 16 : 0;
                var w = prefixWidth + estimateTextWidth(lines[j].text, lines[j].size);
                if (w > maxTextWidth) maxTextWidth = w;
                contentHeight += lines[j].height;
            }

            var legendW = Math.max(260, maxTextWidth + padding * 2);
            var legendH = contentHeight + padding * 2;

            var firstAb = doc.artboards[0].artboardRect;
            var x = firstAb[0] + 20;
            var y = firstAb[1] + gap + legendH - padding;

            var bg = layer.pathItems.rectangle(y + padding, x - padding, legendW, legendH);
            bg.filled = true;
            bg.fillColor = makeRGB(255, 255, 255);
            bg.stroked = true;
            bg.strokeWidth = 0.5;
            bg.strokeColor = makeRGB(180, 180, 180);

            var currentY = y;
            for (var k = 0; k < lines.length; k++) {
                var lineInfo = lines[k];
                if (lineInfo.type === "row") {
                    var swatch = layer.pathItems.rectangle(currentY + 8, x, 10, 10);
                    swatch.stroked = true;
                    swatch.strokeWidth = 0.25;
                    swatch.strokeColor = makeRGB(180, 180, 180);
                    try { swatch.filled = true; swatch.fillColor = lineInfo.swatchColor; }
                    catch (eSw) { swatch.filled = false; }

                    var rowText = layer.textFrames.add();
                    rowText.contents = lineInfo.text;
                    rowText.textRange.characterAttributes.size = lineInfo.size;
                    rowText.textRange.characterAttributes.fillColor = lineInfo.color;
                    setLegendFont(rowText);
                    rowText.position = [x + 16, currentY + 9];
                } else {
                    var textLine = layer.textFrames.add();
                    textLine.contents = lineInfo.text;
                    textLine.textRange.characterAttributes.size = lineInfo.size;
                    textLine.textRange.characterAttributes.fillColor = lineInfo.color;
                    setLegendFont(textLine);
                    textLine.position = [x, currentY];
                }
                currentY -= lineInfo.height;
            }
        } catch (e) {}
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
        checkStroke: true,
        createLegend: true
    });

    var dlg = new Window("dialog", "颜色检查 v" + SCRIPT_VERSION);
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

    var attRow = outPanel.add("group");
    attRow.orientation = "row";
    attRow.alignChildren = ["left", "center"];
    var chkAttention = attRow.add("checkbox", undefined, "红框标出出现次数 ≤");
    var thresholdInput = attRow.add("edittext", undefined, prefs.threshold);
    thresholdInput.characters = 3;
    attRow.add("statictext", undefined, "次的颜色");

    var chkRemoveOld = outPanel.add("checkbox", undefined, "运行前删除旧标注图层");

    var chkLegend = outPanel.add("checkbox", undefined, "生成说明");
    var legendHelp = outPanel.add("statictext", undefined, "编号 + 颜色色块汇总，同一图层。\n说明置于首画板上方（画板外白底）。", { multiline: true });
    legendHelp.preferredSize = [320, 30];

    chkAttention.value = prefs.markAttention;
    chkRemoveOld.value = prefs.removeOld;
    chkLegend.value = prefs.createLegend;

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
            markLabels:    true,
            markAttention: chkAttention.value,
            removeOld:     chkRemoveOld.value,
            threshold:     threshold,
            visibleOnly:   chkVisibleOnly.value,
            checkText:     chkCheckText.value,
            checkShapes:   chkCheckShapes.value,
            checkStroke:   chkCheckStroke.value,
            createLegend:  chkLegend.value
        };

        savePrefs("color_check.json", {
            range: trimText(rangeInput.text),
            visibleOnly: chkVisibleOnly.value,
            markAttention: chkAttention.value,
            threshold: trimText(thresholdInput.text),
            removeOld: chkRemoveOld.value,
            checkText: chkCheckText.value,
            checkShapes: chkCheckShapes.value,
            checkStroke: chkCheckStroke.value,
            createLegend: chkLegend.value
        });
        var b = dlg.bounds; savePrefs("text_color_pos.json", { x: b[0], y: b[1] });
        dlg.close();

        var colorMap = scan(abIndexes, opts);
        var keys = [];
        for (var k in colorMap) { if (colorMap.hasOwnProperty(k)) keys.push(k); }

        if (keys.length === 0) { alert("未找到任何对象。"); return; }

        keys.sort(function (a, b) { return colorMap[b].charCount - colorMap[a].charCount; });

        drawMarkers(colorMap, keys, opts);

        if (opts.createLegend) {
            var legendLayer = getOrCreateLayer(LAYER_LEGEND);
            addColorLegend(legendLayer, colorMap, keys, opts);
        }

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
            "图层：" + LAYER_LABELS + " / " + LAYER_ATTENTION + (opts.createLegend ? " / " + LAYER_LEGEND : "");
        alert(summaryMsg);
    };

    var pos = loadPos("text_color_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();
})();
