#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

// ============================================================
// 颜色标签生成
// 版本：2.1.0
// 支持多选物件，批量生成 CMYK 色块标签
// ============================================================

(function () {
    var VERSION = "2.1.0";
    var LABEL_LAYER = "颜色标签";

    if (app.documents.length === 0) { alert("请先打开文件。"); return; }
    if (app.selection.length === 0) { alert("请先选择一个或多个物件。"); return; }

    var doc = app.activeDocument;
    var sel = app.selection;

    // ==========================
    // 颜色工具
    // ==========================
    function colorToKey(c) {
        if (!c) return null;
        try {
            switch (c.typename) {
                case "CMYKColor":  return "cmyk:" + Math.round(c.cyan) + "," + Math.round(c.magenta) + "," + Math.round(c.yellow) + "," + Math.round(c.black);
                case "RGBColor":   return "rgb:"  + Math.round(c.red)  + "," + Math.round(c.green)  + "," + Math.round(c.blue);
                case "GrayColor":  return "gray:"  + Math.round(c.gray);
                case "SpotColor":  return "spot:"  + c.spot.name;
                case "NoColor":    return null;
                default:           return null;
            }
        } catch (e) { return null; }
    }

    function cmykStr(c) {
        try { return "C" + Math.round(c.cyan) + "  M" + Math.round(c.magenta) + "  Y" + Math.round(c.yellow) + "  K" + Math.round(c.black); }
        catch (e) { return ""; }
    }

    function colorToLabel(c) {
        if (!c) return "";
        try {
            // Swatch name first
            var swName = "";
            try {
                if (c.typename !== "NoColor" && c.typename !== "PatternColor") {
                    var sw = c.swatch;
                    if (sw && sw.name && sw.name !== "[None]") swName = sw.name;
                }
            } catch (e) {}

            switch (c.typename) {
                case "CMYKColor":
                    var ck = cmykStr(c);
                    return swName ? swName + "\n" + ck : ck;
                case "RGBColor":
                    return (swName ? swName + "\n" : "") + "RGB(" + Math.round(c.red) + ", " + Math.round(c.green) + ", " + Math.round(c.blue) + ")";
                case "GrayColor":
                    return (swName ? swName + "\n" : "") + "K" + Math.round(c.gray);
                case "SpotColor":
                    var sn = c.spot.name;
                    try {
                        var sc = c.spot.color;
                        if (sc.typename === "CMYKColor") sn += "\n" + cmykStr(sc);
                    } catch (e) {}
                    return sn;
                default: return swName || "";
            }
        } catch (e) { return ""; }
    }

    function getItemFill(item) {
        // 1. 路径/形状：直接取 fillColor
        try { if (item.filled && item.fillColor) return item.fillColor; } catch (e) {}

        // 2. 文字框：取第一个字符的填色
        try {
            if (item.typename === "TextFrame") {
                var chars = item.characters;
                for (var ci = 0; ci < chars.length; ci++) {
                    var txt = "";
                    try { txt = chars[ci].contents; } catch (e) { continue; }
                    if (!txt || /^\s+$/.test(txt)) continue;
                    var c = chars[ci].characterAttributes.fillColor;
                    if (c && c.typename !== "NoColor") return c;
                }
            }
        } catch (e) {}

        // 3. 复合路径
        try {
            if (item.typename === "CompoundPathItem") {
                var pp = item.pathItems[0];
                if (pp.filled && pp.fillColor) return pp.fillColor;
            }
        } catch (e) {}

        return null;
    }

    // ==========================
    // 收集所有选中物件的颜色（去重）
    // ==========================
    var colorList = []; // { key, color, label }
    var seen = {};

    function collectFromItem(item) {
        try {
            // 群组递归
            if (item.typename === "GroupItem") {
                for (var gi = 0; gi < item.pageItems.length; gi++) {
                    collectFromItem(item.pageItems[gi]);
                }
                return;
            }
            var c = getItemFill(item);
            if (!c) return;
            var key = colorToKey(c);
            if (!key || seen[key]) return;
            seen[key] = true;
            colorList.push({ key: key, color: c, label: colorToLabel(c) });
        } catch (e) {}
    }

    for (var i = 0; i < sel.length; i++) {
        collectFromItem(sel[i]);
    }

    if (colorList.length === 0) {
        alert("所选物件没有可识别的填色（CMYK/RGB/Gray/Spot）。");
        return;
    }

    // ==========================
    // 設定持久化
    // ==========================
    var SETTINGS_FILE = new File(Folder.userData + "/MomoTools/color_box_settings.json");

    function loadSettings() {
        var defaults = { boxW:20, boxH:20, fSize:8, textBlack:true, horizontal:true, posMode:0, gap:10 };
        try {
            if (!SETTINGS_FILE.exists) return defaults;
            SETTINGS_FILE.open("r");
            var raw = SETTINGS_FILE.read();
            SETTINGS_FILE.close();
            var s = _parseJson(raw);
            return {
                boxW:      s.boxW      || defaults.boxW,
                boxH:      s.boxH      || defaults.boxH,
                fSize:     s.fSize     || defaults.fSize,
                textBlack: (s.textBlack !== undefined) ? s.textBlack : defaults.textBlack,
                horizontal:(s.horizontal !== undefined) ? s.horizontal : defaults.horizontal,
                posMode:   (s.posMode  !== undefined) ? s.posMode  : defaults.posMode,
                gap:       s.gap       || defaults.gap
            };
        } catch (e) { return defaults; }
    }

    function saveSettings(s) {
        try {
            var dir = new Folder(Folder.userData + "/MomoTools");
            if (!dir.exists) dir.create();
            SETTINGS_FILE.open("w");
            SETTINGS_FILE.write(
                '{"boxW":' + s.boxW + ',"boxH":' + s.boxH +
                ',"fSize":' + s.fSize + ',"textBlack":' + s.textBlack +
                ',"horizontal":' + s.horizontal + ',"posMode":' + s.posMode +
                ',"gap":' + s.gap + '}'
            );
            SETTINGS_FILE.close();
        } catch (e) {}
    }

    var prefs = loadSettings();

    // ==========================
    // 取得当前画板范围
    // ==========================
    var abIdx = doc.artboards.getActiveArtboardIndex();
    var ab = doc.artboards[abIdx].artboardRect; // [left, top, right, bottom]  top > bottom

    // ==========================
    // UI
    // ==========================
    var dlg = new Window("dialog", "颜色标签 v" + VERSION);
    dlg.orientation = "column"; dlg.alignChildren = "fill";
    dlg.spacing = 8; dlg.margins = [14, 16, 14, 14];

    // 颜色预览
    var prevPanel = dlg.add("panel", undefined, "检测到 " + colorList.length + " 种颜色");
    prevPanel.orientation = "column"; prevPanel.alignChildren = "fill";
    prevPanel.margins = [10, 14, 10, 8]; prevPanel.spacing = 3;
    var prevText = "";
    for (var pi = 0; pi < colorList.length; pi++) {
        prevText += (pi+1) + ". " + colorList[pi].label.replace(/\n/g, "  ") + "\n";
    }
    var prevBox = prevPanel.add("edittext", undefined, prevText, { multiline: true, scrolling: true });
    prevBox.preferredSize = [340, Math.min(80, colorList.length * 18 + 10)];

    // 色块尺寸
    var sizePanel = dlg.add("panel", undefined, "色块尺寸（pt）");
    sizePanel.orientation = "row"; sizePanel.alignChildren = ["left","center"];
    sizePanel.margins = [10, 14, 10, 10]; sizePanel.spacing = 8;
    sizePanel.add("statictext", undefined, "宽").preferredSize.width = 20;
    var wInput = sizePanel.add("edittext", undefined, String(prefs.boxW)); wInput.characters = 6;
    sizePanel.add("statictext", undefined, "高").preferredSize.width = 20;
    var hInput = sizePanel.add("edittext", undefined, String(prefs.boxH)); hInput.characters = 6;

    // 文字设置
    var textPanel = dlg.add("panel", undefined, "文字设置");
    textPanel.orientation = "column"; textPanel.alignChildren = "fill";
    textPanel.margins = [10, 14, 10, 10]; textPanel.spacing = 6;

    var fontRow = textPanel.add("group");
    fontRow.orientation = "row"; fontRow.alignChildren = ["left","center"];
    fontRow.add("statictext", undefined, "字体大小").preferredSize.width = 60;
    var fontSizeInput = fontRow.add("edittext", undefined, String(prefs.fSize)); fontSizeInput.characters = 6;
    fontRow.add("statictext", undefined, "pt");

    var colorRow = textPanel.add("group");
    colorRow.orientation = "row"; colorRow.alignChildren = ["left","center"];
    colorRow.add("statictext", undefined, "文字颜色").preferredSize.width = 60;
    var textColorList = colorRow.add("dropdownlist", undefined, ["黑色 K100", "白色 K0"]);
    textColorList.selection = prefs.textBlack ? 0 : 1;

    var dirRow = textPanel.add("group");
    dirRow.orientation = "row"; dirRow.alignChildren = ["left","center"];
    dirRow.add("statictext", undefined, "排列方向").preferredSize.width = 60;
    var dirList = dirRow.add("dropdownlist", undefined, ["横排 →", "纵排 ↓"]);
    dirList.selection = prefs.horizontal ? 0 : 1;

    // 位置
    var posPanel = dlg.add("panel", undefined, "色块位置");
    posPanel.orientation = "column"; posPanel.alignChildren = "fill";
    posPanel.margins = [10, 14, 10, 10]; posPanel.spacing = 4;

    var positions = [
        "画板右侧外",
        "画板下方外",
        "画板左侧外",
        "画板上方外",
        "各物件右侧"
    ];
    var posList = posPanel.add("dropdownlist", undefined, positions);
    posList.selection = prefs.posMode || 0;

    var gapRow = posPanel.add("group");
    gapRow.orientation = "row"; gapRow.alignChildren = ["left","center"];
    gapRow.add("statictext", undefined, "间距").preferredSize.width = 36;
    var gapInput = gapRow.add("edittext", undefined, String(prefs.gap)); gapInput.characters = 6;
    gapRow.add("statictext", undefined, "pt（色块之间及距画板）");

    // 按钮
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row"; btnGroup.alignment = "right";
    btnGroup.add("button", undefined, "取消", { name: "cancel" }).onClick = function () {
        var b = dlg.bounds; savePrefs("color_box_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    var okBtn = btnGroup.add("button", undefined, "生成", { name: "ok" });
    okBtn.onClick = function () {
        var boxW    = parseFloat(wInput.text) || 50;
        var boxH    = parseFloat(hInput.text) || 50;
        var fSize   = parseFloat(fontSizeInput.text) || 8;
        var textBlack = textColorList.selection.index === 0;
        var horizontal = dirList.selection.index === 0;
        var posMode = posList.selection.index;
        var gap     = parseFloat(gapInput.text) || 10;
        saveSettings({ boxW:boxW, boxH:boxH, fSize:fSize, textBlack:textBlack, horizontal:horizontal, posMode:posMode, gap:gap });
        var b = dlg.bounds; savePrefs("color_box_pos.json", { x: b[0], y: b[1] });
        dlg.close();
        generate(boxW, boxH, fSize, textBlack, horizontal, posMode, gap);
    };

    var pos = loadPos("color_box_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();

    // ==========================
    // 生成
    // ==========================
    function getOrCreateLabelLayer() {
        try { return doc.layers.getByName(LABEL_LAYER); } catch (e) {}
        var l = doc.layers.add();
        l.name = LABEL_LAYER;
        return l;
    }

    // 取得 layer 現有內容的邊界框
    function getLayerBounds(layer) {
        var L = Infinity, T = -Infinity, R = -Infinity, B = Infinity;
        try {
            for (var i = 0; i < layer.pageItems.length; i++) {
                var gb = layer.pageItems[i].geometricBounds; // [left,top,right,bottom]
                if (gb[0] < L) L = gb[0];
                if (gb[1] > T) T = gb[1];
                if (gb[2] > R) R = gb[2];
                if (gb[3] < B) B = gb[3];
            }
        } catch (e) {}
        return (L === Infinity) ? null : { left:L, top:T, right:R, bottom:B };
    }

    function generate(boxW, boxH, fSize, textBlack, horizontal, posMode, gap) {
        var tc = new CMYKColor();
        if (textBlack) { tc.cyan=0; tc.magenta=0; tc.yellow=0; tc.black=100; }
        else           { tc.cyan=0; tc.magenta=0; tc.yellow=0; tc.black=0; }

        var layer = getOrCreateLabelLayer();

        if (posMode === 4) {
            generatePerObject(boxW, boxH, fSize, tc, gap, layer);
            return;
        }

        // 現有內容的邊界（記住上次位置用）
        var prev = getLayerBounds(layer);

        // 計算起點（Illustrator Y 向上：top > bottom）
        var startX, startY;

        if (posMode === 0) {
            // 畫板右側外，縱排往下堆疊
            startX = ab[2] + gap;
            startY = prev ? prev.bottom - gap : ab[1];
            if (horizontal) {
                startX = prev ? prev.right + gap : ab[2] + gap;
                startY = ab[1];
            }
        } else if (posMode === 1) {
            // 畫板下方外，橫排向右延伸
            startX = prev ? prev.right + gap : ab[0];
            startY = ab[3] - gap;
            if (!horizontal) {
                startX = ab[0];
                startY = prev ? prev.bottom - gap : ab[3] - gap;
            }
        } else if (posMode === 2) {
            // 畫板左側外
            startX = prev ? prev.left - gap - boxW : ab[0] - gap - boxW;
            startY = ab[1];
            if (horizontal) {
                startX = prev ? prev.left - gap - boxW : ab[0] - gap - boxW;
            }
        } else {
            // 畫板上方外
            startX = prev ? prev.right + gap : ab[0];
            startY = prev ? prev.top + gap + boxH : ab[1] + gap + boxH;
            if (!horizontal) {
                startX = ab[0];
                startY = prev ? prev.top + gap + boxH : ab[1] + gap + boxH;
            }
        }

        // 批量放置：動態量 group 尺寸決定下一個位置
        var curX = startX, curY = startY;
        for (var i = 0; i < colorList.length; i++) {
            var bx = curX, by = curY;
            if (posMode === 2 && horizontal) bx = curX; // 左側特殊：curX 已遞減

            var grp = placeColorBox(colorList[i], bx, by, boxW, boxH, fSize, tc, layer, gap, horizontal);

            // 量 group 實際邊界，推算下一個起點
            if (grp) {
                try {
                    var gb = grp.geometricBounds; // [left, top, right, bottom]
                    var gW = gb[2] - gb[0]; // 實際寬
                    var gH = gb[1] - gb[3]; // 實際高（Y 向上，top>bottom）
                    if (horizontal) {
                        if (posMode === 2) curX -= (gW + gap); // 左側：往左
                        else              curX += (gW + gap);  // 其餘：往右
                    } else {
                        if (posMode === 3) curY += (gH + gap); // 上方：往上
                        else              curY -= (gH + gap);  // 其餘：往下
                    }
                } catch (e) {
                    // fallback
                    if (horizontal) curX += boxW + gap;
                    else            curY -= boxH + gap;
                }
            }
        }

        // no alert
    }

    function generatePerObject(boxW, boxH, fSize, tc, gap, _unused, horizontal) {
        var layer = getOrCreateLabelLayer();
        for (var i = 0; i < sel.length; i++) {
            var item = sel[i];
            var c = getItemFill(item);
            if (!c) continue;
            var key = colorToKey(c);
            if (!key) continue;
            var label = colorToLabel(c);

            var gb;
            try { gb = item.geometricBounds; } catch (e) { continue; }
            // 各物件右側：文字固定在右側（縱排邏輯）
            placeColorBox({ color: c, label: label }, gb[2] + gap, gb[1], boxW, boxH, fSize, tc, layer, gap, false);
        }
        // no alert
    }

    function placeColorBox(entry, bx, by, boxW, boxH, fSize, tc, layer, gap, horizontal) {
        // rectangle(top, left, width, height) — Illustrator Y轴向上 top > bottom
        var rect = layer.pathItems.rectangle(by, bx, boxW, boxH);
        rect.filled = true; rect.stroked = false;
        try { rect.fillColor = entry.color; } catch (e) {}

        var tf = layer.textFrames.add();
        tf.contents = entry.label;
        tf.textRange.characterAttributes.size = fSize;
        try { tf.textRange.characterAttributes.fillColor = tc; } catch (e) {}

        if (horizontal) {
            tf.position = [bx, by + fSize * 1.4]; // 文字在上方
        } else {
            tf.position = [bx + boxW + gap * 0.5, by]; // 文字在右側
        }

        // Group 並回傳，讓 generate 量實際寬高決定下一個位置
        try {
            var grp = layer.groupItems.add();
            rect.move(grp, ElementPlacement.PLACEATEND);
            tf.move(grp, ElementPlacement.PLACEATEND);
            return grp;
        } catch (e) {}
        return null;
    }
})();
