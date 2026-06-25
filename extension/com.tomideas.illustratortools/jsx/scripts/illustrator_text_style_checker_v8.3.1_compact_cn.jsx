#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

// 文字样式检查工具 v8 紧凑版（混合样式轻/中/重扫描、单框/全局上限）

(function () {
    var SCRIPT_VERSION = "8.3.1";

    if (app.documents.length === 0) {
        alert("请先打开一个 Illustrator 文件。");
        return;
    }

    var doc = app.activeDocument;

    // ==========================
    // 简体中文图层名称
    // ==========================
    var LAYER_GROUP_LABELS = "文字样式标注";
    var LAYER_LEGEND = "文字样式说明";
    var LAYER_MIXED = "文本框混合样式标注";

    // ==========================
    // 基础工具
    // ==========================
    function trimText(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function toFloat(value, fallback) {
        var n = parseFloat(value);
        return isNaN(n) ? fallback : n;
    }

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : n;
    }

    function round2(n) {
        return Math.round(n * 100) / 100;
    }

    function makeRGB(r, g, b) {
        var c = new RGBColor();
        c.red = r;
        c.green = g;
        c.blue = b;
        return c;
    }

    // 回傳可讀色彩描述字串：優先取色票名稱（Swatch），沒有則取原始色彩模式簡稱。
    // 這樣使用者可直接對照 Illustrator「色票」面板，不用記 CMYK 數字。
    function colorToInfo(color) {
        if (!color) return "无填色";

        try {
            // 嘗試取得色票名稱（最直覺）
            var swatchName = "";
            try {
                if (color.typename !== "NoColor" && color.typename !== "PatternColor") {
                    var sw = color.swatch;
                    if (sw) swatchName = sw.name;
                }
            } catch (es) {}

            if (swatchName && swatchName !== "[None]" && swatchName !== "") {
                return swatchName;
            }

            if (color.typename === "RGBColor") {
                return "RGB(" +
                    Math.round(color.red) + "," +
                    Math.round(color.green) + "," +
                    Math.round(color.blue) + ")";
            }

            if (color.typename === "GrayColor") {
                return "Gray(" + Math.round(color.gray) + "%)";
            }

            if (color.typename === "CMYKColor") {
                return "CMYK(" +
                    Math.round(color.cyan) + "," +
                    Math.round(color.magenta) + "," +
                    Math.round(color.yellow) + "," +
                    Math.round(color.black) + ")";
            }

            if (color.typename === "SpotColor") {
                var spotName = "";
                try { spotName = color.spot.name; } catch (e) {}
                return "Spot[" + spotName + "]";
            }

            if (color.typename === "NoColor") {
                return "无填色";
            }
        } catch (e) {}

        return "未知";
    }

    function hexToRGBColor(hex, fallbackColor) {
        hex = trimText(hex);

        if (hex === "") {
            return fallbackColor;
        }

        if (hex.charAt(0) === "#") {
            hex = hex.substring(1);
        }

        if (hex.length === 3) {
            hex = hex.charAt(0) + hex.charAt(0) +
                  hex.charAt(1) + hex.charAt(1) +
                  hex.charAt(2) + hex.charAt(2);
        }

        if (hex.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(hex)) {
            return fallbackColor;
        }

        return makeRGB(
            parseInt(hex.substring(0, 2), 16),
            parseInt(hex.substring(2, 4), 16),
            parseInt(hex.substring(4, 6), 16)
        );
    }

    function estimateTextWidth(text, size) {
        // 只是用于说明背景宽度估算，不影响实际文字
        return Math.max(80, String(text).length * size * 0.58);
    }

    function getAllArtboardsBounds() {
        if (doc.artboards.length === 0) {
            return { left: 0, top: 0, right: 0, bottom: 0 };
        }

        var first = doc.artboards[0].artboardRect;
        var left = first[0];
        var top = first[1];
        var right = first[2];
        var bottom = first[3];

        for (var i = 1; i < doc.artboards.length; i++) {
            var r = doc.artboards[i].artboardRect;
            if (r[0] < left) left = r[0];
            if (r[1] > top) top = r[1];
            if (r[2] > right) right = r[2];
            if (r[3] < bottom) bottom = r[3];
        }

        return {
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };
    }

    function snippet(text, maxLen) {
        text = String(text).replace(/\r/g, " ").replace(/\n/g, " ");
        text = trimText(text);

        if (text.length > maxLen) {
            return text.substring(0, maxLen) + "...";
        }

        return text;
    }

    function removeLayer(layerName) {
        try {
            var layer = doc.layers.getByName(layerName);
            layer.locked = false;
            layer.visible = true;
            layer.remove();
        } catch (e) {}
    }

    function getOrCreateLayer(layerName) {
        try {
            var layer = doc.layers.getByName(layerName);
            layer.locked = false;
            layer.visible = true;
            return layer;
        } catch (e) {
            var newLayer = doc.layers.add();
            newLayer.name = layerName;
            return newLayer;
        }
    }

    function getArtboardNumber(bounds) {
        var x = (bounds[0] + bounds[2]) / 2;
        var y = (bounds[1] + bounds[3]) / 2;

        for (var i = 0; i < doc.artboards.length; i++) {
            var r = doc.artboards[i].artboardRect;
            var left = r[0];
            var top = r[1];
            var right = r[2];
            var bottom = r[3];

            if (x >= left && x <= right && y <= top && y >= bottom) {
                return i + 1;
            }
        }

        return 0;
    }

    function parseNumberRange(rangeText, minValue, maxValue) {
        rangeText = trimText(rangeText);
        var result = [];
        var seen = {};

        if (rangeText === "" || rangeText.toLowerCase() === "all" || rangeText === "全部") {
            for (var a = minValue; a <= maxValue; a++) {
                result.push(a);
            }
            return result;
        }

        var parts = rangeText.split(",");

        for (var i = 0; i < parts.length; i++) {
            var part = trimText(parts[i]);
            if (part === "") continue;

            if (part.indexOf("-") >= 0) {
                var bounds = part.split("-");
                if (bounds.length !== 2) continue;

                var start = parseInt(trimText(bounds[0]), 10);
                var end = parseInt(trimText(bounds[1]), 10);

                if (isNaN(start) || isNaN(end)) continue;

                if (start > end) {
                    var tmp = start;
                    start = end;
                    end = tmp;
                }

                for (var p = start; p <= end; p++) {
                    if (p >= minValue && p <= maxValue && !seen[p]) {
                        result.push(p);
                        seen[p] = true;
                    }
                }
            } else {
                var single = parseInt(part, 10);

                if (!isNaN(single) && single >= minValue && single <= maxValue && !seen[single]) {
                    result.push(single);
                    seen[single] = true;
                }
            }
        }

        return result;
    }

    function makeNumberMap(list) {
        var map = {};

        for (var i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }

        return map;
    }

    function parseArtboardRange(rangeText, total) {
        rangeText = trimText(rangeText);
        var result = [];
        var seen = {};
        var i;
        var part;
        var bounds;
        var start;
        var end;
        var p;
        var single;

        if (rangeText === "" || rangeText.toLowerCase() === "all" || rangeText === "全部") {
            for (var a = 1; a <= total; a++) {
                result.push(a - 1);
            }
            return result;
        }

        var parts = rangeText.split(",");
        for (i = 0; i < parts.length; i++) {
            part = trimText(parts[i]);
            if (part === "") continue;

            if (part.indexOf("-") >= 0) {
                bounds = part.split("-");
                if (bounds.length !== 2) continue;
                start = parseInt(trimText(bounds[0]), 10);
                end = parseInt(trimText(bounds[1]), 10);
                if (isNaN(start) || isNaN(end)) continue;
                if (start > end) {
                    var tmp = start;
                    start = end;
                    end = tmp;
                }
                for (p = start; p <= end; p++) {
                    if (p >= 1 && p <= total && !seen[p]) {
                        result.push(p - 1);
                        seen[p] = true;
                    }
                }
            } else {
                single = parseInt(part, 10);
                if (!isNaN(single) && single >= 1 && single <= total && !seen[single]) {
                    result.push(single - 1);
                    seen[single] = true;
                }
            }
        }

        return result;
    }

    function formatRangePart(start, end) {
        var a = start + 1;
        var b = end + 1;
        return a === b ? String(a) : a + "-" + b;
    }

    function indexesToRangeText(indexes) {
        if (!indexes.length) return "";
        var sorted = indexes.slice().sort(function (a, b) {
            return a - b;
        });
        var parts = [];
        var start = sorted[0];
        var prev = sorted[0];
        var i;

        for (i = 1; i < sorted.length; i++) {
            if (sorted[i] === prev + 1) {
                prev = sorted[i];
                continue;
            }
            parts.push(formatRangePart(start, prev));
            start = sorted[i];
            prev = sorted[i];
        }
        parts.push(formatRangePart(start, prev));
        return parts.join(",");
    }

    function getIndexesFromList(lb, indexMap) {
        var indexes = [];
        var i;
        for (i = 0; i < lb.items.length; i++) {
            if (lb.items[i].selected) {
                indexes.push(indexMap[i]);
            }
        }
        return indexes;
    }

    function addArtboardListRow(lb, abIndex) {
        var label = (abIndex + 1) + "  |  " + doc.artboards[abIndex].name;
        var item = lb.add("item", label);
        try {
            if (item.subItems && item.subItems.length > 0) {
                item.subItems[0].text = repeatChar("\u00A0", 80);
            }
        } catch (e) {}
    }

    function repeatChar(ch, n) {
        var s = "";
        for (var i = 0; i < n; i++) s += ch;
        return s;
    }

    function getTargetIndexes() {
        var rangeText = trimText(rangeInput.text);
        if (rangeText !== "") {
            var fromRange = parseArtboardRange(rangeText, totalArtboards);
            if (fromRange.length > 0) return fromRange;
        }
        return getIndexesFromList(listbox, listIndexes);
    }

    function clearListSelection() {
        var ci;
        for (ci = 0; ci < listbox.items.length; ci++) {
            listbox.items[ci].selected = false;
        }
    }

    function syncRangeFromList() {
        if (syncingRange) return;
        var indexes = getIndexesFromList(listbox, listIndexes);
        syncingRange = true;
        rangeInput.text = indexes.length > 0 ? indexesToRangeText(indexes) : "";
        syncingRange = false;
    }

    function normalizeSize(size, tolerance) {
        if (size === null) {
            return {
                key: "未知字号",
                label: "未知字号",
                value: -1
            };
        }

        var v;

        if (tolerance > 0) {
            v = Math.round(size / tolerance) * tolerance;
        } else {
            v = size;
        }

        v = round2(v);

        return {
            key: v + " pt",
            label: v + " pt",
            value: v
        };
    }

    function getCharStyleFromAttributes(attrs, sizeTolerance) {
        var size = null;
        var fontName = "未知字体";
        var rgb = null;

        if (attrs !== null) {
            try {
                size = attrs.size;
            } catch (e1) {}

            try {
                fontName = attrs.textFont.name;
            } catch (e2) {}

            try {
                rgb = colorToInfo(attrs.fillColor);
            } catch (e3) {}
        }

        var sizeInfo = normalizeSize(size, sizeTolerance);

        return {
            rawSize: size,
            sizeKey: sizeInfo.key,
            sizeLabel: sizeInfo.label,
            sizeValue: sizeInfo.value,
            fontName: fontName,
            colorInfo: rgb
        };
    }

    function getFirstAttrs(tf) {
        try {
            if (tf.textRange.characters.length > 0) {
                return tf.textRange.characters[0].characterAttributes;
            }
        } catch (e) {}

        try {
            return tf.textRange.characterAttributes;
        } catch (e2) {}

        return null;
    }

    function getBounds(tf) {
        try {
            return tf.visibleBounds;
        } catch (e) {
            return [0, 0, 0, 0];
        }
    }

    function getTextFrameInfoByFirstChar(tf, sizeTolerance) {
        var attrs = getFirstAttrs(tf);
        var style = getCharStyleFromAttributes(attrs, sizeTolerance);
        var bounds = getBounds(tf);

        return {
            textFrame: tf,
            textShort: snippet(tf.contents, 44),
            rawSize: style.rawSize,
            sizeKey: style.sizeKey,
            sizeLabel: style.sizeLabel,
            sizeValue: style.sizeValue,
            fontName: style.fontName,
            colorInfo: style.colorInfo,
            bounds: bounds,
            artboardNumber: getArtboardNumber(bounds)
        };
    }

    function shouldIgnoreChar(ch, options) {
        // 空格、换行是否忽略，避免换行字符属性造成误判
        if (!options.ignoreWhitespace) return false;

        if (ch === " " || ch === "\r" || ch === "\n" || ch === "\t") {
            return true;
        }

        return false;
    }

    function buildStyleKeyFromInfo(info, options) {
        var parts = [];

        if (options.groupSize) parts.push("字号=" + info.sizeLabel);
        if (options.groupFont) parts.push("字体=" + info.fontName);
        if (options.groupColor) parts.push("颜色=" + info.colorInfo);

        return parts.join(" | ");
    }

    function buildStyleDisplayFromInfo(info, options) {
        var parts = [];

        if (options.groupSize) parts.push("字号：" + info.sizeLabel);
        if (options.groupFont) parts.push("字体：" + info.fontName);
        if (options.groupColor) parts.push("颜色：" + info.colorInfo);

        return parts.join(" / ");
    }

    function bumpMixedScanUsed(globalState, n) {
        if (!globalState) return;
        globalState.mixedScanCharsUsed += n;
    }

    function scanInternalFallbackSingle(tf, options, charsChecked) {
        var fallbackInfo = getTextFrameInfoByFirstChar(tf, options.sizeTolerance);
        var fallbackKey = buildStyleKeyFromInfo(fallbackInfo, options);
        var fallbackDisplay = buildStyleDisplayFromInfo(fallbackInfo, options);

        var one = {
            key: fallbackKey,
            display: fallbackDisplay,
            count: Math.max(1, charsChecked),
            example: fallbackInfo.textShort
        };

        return {
            styles: [one],
            styleCount: 1,
            charsChecked: Math.max(1, charsChecked),
            runs: [],
            internalScanSkipped: false,
            internalScanNote: ""
        };
    }

    function collectLightSampleIndices(charLen, maxSamples) {
        if (charLen <= 0) return [];

        var seen = {};
        var out = [];

        function add(ix) {
            ix = Math.max(0, Math.min(charLen - 1, Math.floor(ix)));
            if (!seen[ix]) {
                seen[ix] = true;
                out.push(ix);
            }
        }

        add(0);
        add(charLen - 1);
        add((charLen - 1) * 0.5);
        add((charLen - 1) * 0.25);
        add((charLen - 1) * 0.75);

        var budget = maxSamples - out.length;
        var step = Math.max(1, Math.floor(charLen / Math.max(1, budget)));

        for (var i = 0; i < charLen && out.length < maxSamples; i += step) {
            add(i);
        }

        out.sort(function (a, b) {
            return a - b;
        });

        return out;
    }

    function processCharObject(chObj, options, stylesByKey, styles, runsState) {
        var ch = "";

        try {
            ch = chObj.contents;
        } catch (ce) {
            ch = "";
        }

        if (shouldIgnoreChar(ch, options)) {
            return false;
        }

        var attrs = null;

        try {
            attrs = chObj.characterAttributes;
        } catch (ae) {
            attrs = null;
        }

        var style = getCharStyleFromAttributes(attrs, options.sizeTolerance);
        var pseudoInfo = {
            sizeLabel: style.sizeLabel,
            sizeValue: style.sizeValue,
            fontName: style.fontName,
            colorInfo: style.colorInfo
        };

        var key = buildStyleKeyFromInfo(pseudoInfo, options);
        var display = buildStyleDisplayFromInfo(pseudoInfo, options);

        if (key === "") {
            return false;
        }

        if (!stylesByKey[key]) {
            stylesByKey[key] = {
                key: key,
                display: display,
                count: 0,
                example: ""
            };
            styles.push(stylesByKey[key]);
        }

        stylesByKey[key].count++;

        if (stylesByKey[key].example === "" && trimText(ch) !== "") {
            stylesByKey[key].example = ch;
        }

        if (runsState !== null) {
            if (runsState.currentRunKey === "") {
                runsState.currentRunKey = key;
                runsState.currentRunText = ch;
            } else if (runsState.currentRunKey === key) {
                runsState.currentRunText += ch;
            } else {
                runsState.runs.push({
                    key: runsState.currentRunKey,
                    text: snippet(runsState.currentRunText, 24)
                });
                runsState.currentRunKey = key;
                runsState.currentRunText = ch;
            }
        }

        return true;
    }

    function finalizeStyles(stylesByKey, styles, runsState) {
        if (runsState !== null && runsState.currentRunKey !== "") {
            runsState.runs.push({
                key: runsState.currentRunKey,
                text: snippet(runsState.currentRunText, 24)
            });
        }

        styles.sort(function (a, b) {
            return b.count - a.count;
        });

        return {
            styles: styles,
            styleCount: styles.length,
            charsChecked: 0,
            runs: runsState ? runsState.runs : [],
            internalScanSkipped: false,
            internalScanNote: ""
        };
    }

    function scanTextFrameInternalStyles(tf, options, globalState) {
        if (!options.detectMixed) {
            var r0 = scanInternalFallbackSingle(tf, options, 1);
            r0.internalScanNote = "已关闭「框内混合检查」，按首字符统计本框。";
            return r0;
        }

        var charLen = 0;

        try {
            charLen = tf.textRange.characters.length;
        } catch (eLen) {
            return scanInternalFallbackSingle(tf, options, 1);
        }

        if (charLen === 0) {
            return scanInternalFallbackSingle(tf, options, 0);
        }

        // 超短文本：直接全扫，抽样反而慢
        if (charLen <= 30) {
            try {
                var chars = tf.textRange.characters;
                var stylesByKeyS = {};
                var stylesS = [];
                var runsStateS = { currentRunKey: "", currentRunText: "", runs: [] };
                var checkedS = 0;
                for (var s = 0; s < charLen; s++) {
                    if (processCharObject(chars[s], options, stylesByKeyS, stylesS, runsStateS)) {
                        checkedS++;
                        bumpMixedScanUsed(globalState, 1);
                    }
                }
                var outS = finalizeStyles(stylesByKeyS, stylesS, runsStateS);
                outS.charsChecked = checkedS;
                outS.internalScanNote = "全文扫描（" + charLen + " 字符）。";
                return outS;
            } catch (e) {
                return scanInternalFallbackSingle(tf, options, 1);
            }
        }

        // 中等长度：分段抽样，每段取1个，更快且覆盖均匀
        if (charLen <= 1200) {
            try {
                var chars = tf.textRange.characters;
                var segSize = Math.max(1, Math.floor(charLen / 12));
                var stylesByKeyM = {};
                var stylesM = [];
                var runsStateM = { currentRunKey: "", currentRunText: "", runs: [] };
                var checkedM = 0;
                for (var seg = 0; seg < 12; seg++) {
                    var ix = Math.min(charLen - 1, seg * segSize);
                    if (processCharObject(chars[ix], options, stylesByKeyM, stylesM, runsStateM)) {
                        checkedM++;
                        bumpMixedScanUsed(globalState, 1);
                    }
                }
                var outM = finalizeStyles(stylesByKeyM, stylesM, runsStateM);
                outM.charsChecked = checkedM;
                outM.internalScanNote = "分段抽样（12 点）：各样式「字符数」为抽样命中次数（非全文精确）。";
                return outM;
            } catch (e) {
                return scanInternalFallbackSingle(tf, options, 1);
            }
        }

        // 长文本：轻量抽样
        try {
            var chars = tf.textRange.characters;
            var capSamples = 14;
            if (charLen > 8000) capSamples = Math.min(capSamples, 10);
            if (charLen > 30000) capSamples = Math.min(capSamples, 6);

            var indices = collectLightSampleIndices(charLen, capSamples);
            var stylesByKeyL = {};
            var stylesL = [];
            var runsStateL = {
                currentRunKey: "",
                currentRunText: "",
                runs: []
            };
            var checkedL = 0;
            var k;

            for (k = 0; k < indices.length; k++) {
                if (processCharObject(chars[indices[k]], options, stylesByKeyL, stylesL, runsStateL)) {
                    checkedL++;
                    bumpMixedScanUsed(globalState, 1);
                }
            }

            var outL = finalizeStyles(stylesByKeyL, stylesL, runsStateL);
            outL.charsChecked = checkedL;
            outL.internalScanNote = "轻量抽样（最多 " + capSamples + " 点）：各样式「字符数」为抽样命中次数（非全文精确），极端混排可能漏检。";
            return outL;
        } catch (e) {
            return scanInternalFallbackSingle(tf, options, 1);
        }
    }

    function groupingLogicText(options) {
        var parts = [];

        if (options.groupSize) parts.push("字号");
        if (options.groupFont) parts.push("字体");
        if (options.groupColor) parts.push("颜色");

        return parts.join(" + ");
    }

    function attentionRuleText(options) {
        if (options.attentionMode === 0) return "只盘点，不判断需注意";
        if (options.attentionMode === 1) return "标记出现次数 ≤ " + options.rareThreshold + " 的样式组";
        return "未知规则";
    }

    function getGroupColor(index) {
        var palette = [
            [255, 59, 48],
            [0, 122, 255],
            [52, 199, 89],
            [255, 149, 0],
            [175, 82, 222],
            [255, 45, 85],
            [90, 200, 250],
            [88, 86, 214],
            [142, 142, 147],
            [255, 204, 0],
            [0, 160, 160],
            [180, 90, 40]
        ];

        var p = palette[(index - 1) % palette.length];
        return makeRGB(p[0], p[1], p[2]);
    }

    // 编号说明行左侧小色块：分组含「颜色」时尝试从 key 解析 CMYK/RGB/Gray/Spot 并画近似色；无法解析时回退 getGroupColor。
    function legendRowSwatchColor(g, options) {
        if (options.groupColor) {
            try {
                var keyStr = String(g.key);

                // CMYK(c,m,y,k)
                var cm = keyStr.match(/颜色=CMYK\((\d+),(\d+),(\d+),(\d+)\)/);
                if (cm) {
                    var cc = parseInt(cm[1], 10) / 100;
                    var mm = parseInt(cm[2], 10) / 100;
                    var yy = parseInt(cm[3], 10) / 100;
                    var kk = parseInt(cm[4], 10) / 100;
                    return makeRGB(
                        Math.round(255 * (1 - cc) * (1 - kk)),
                        Math.round(255 * (1 - mm) * (1 - kk)),
                        Math.round(255 * (1 - yy) * (1 - kk))
                    );
                }

                // RGB(r,g,b)
                var rm = keyStr.match(/颜色=RGB\((\d+),(\d+),(\d+)\)/);
                if (rm) {
                    return makeRGB(parseInt(rm[1], 10), parseInt(rm[2], 10), parseInt(rm[3], 10));
                }

                // Gray(v%)
                var gm = keyStr.match(/颜色=Gray\((\d+)%\)/);
                if (gm) {
                    var gv = Math.round(255 * (100 - parseInt(gm[1], 10)) / 100);
                    return makeRGB(gv, gv, gv);
                }

                // 无填色 / 未知
                if (keyStr.indexOf("颜色=无填色") !== -1 || keyStr.indexOf("颜色=未知") !== -1) {
                    return makeRGB(230, 230, 230);
                }
            } catch (e) {}
        }

        return getGroupColor(g.id);
    }

    function saveStyleInventory(groups) {
        try {
            var dir = new Folder(Folder.userData + "/MomoTools");
            if (!dir.exists) dir.create();

            var f = _pf("text_style_inventory.json");
            f.open("w");
            var parts = [];
            for (var i = 0; i < groups.length; i++) {
                var g = groups[i];
                if (!g || typeof g.key !== "string" || !g.key) continue;
                var esc = "";
                for (var j = 0; j < g.key.length; j++) {
                    var cp = g.key.charCodeAt(j);
                    if (cp >= 32 && cp <= 126 && cp !== 34 && cp !== 92) {
                        esc += g.key.charAt(j);
                    } else if (cp === 34) {
                        esc += '\\"';
                    } else if (cp === 92) {
                        esc += "\\\\";
                    } else {
                        var h = cp.toString(16);
                        while (h.length < 4) h = "0" + h;
                        esc += "\\u" + h;
                    }
                }
                parts.push('"' + esc + '":' + g.id);
            }
            f.write("{" + parts.join(",") + "}");
            f.close();
        } catch (e) {}
    }

    function saveStyleCounts(groups) {
        try {
            var prev = loadStyleCounts();
            for (var i = 0; i < groups.length; i++) {
                var g = groups[i];
                if (!g || g.id <= 0) continue;
                prev[g.id] = g.count;
            }
            var f = _pf("text_style_counts.json");
            f.open("w");
            var p = [];
            for (var k in prev) {
                if (prev.hasOwnProperty(k)) {
                    p.push('"' + k + '":' + prev[k]);
                }
            }
            f.write("{" + p.join(",") + "}");
            f.close();
        } catch (e) {}
    }

    function loadStyleInventory() {
        try {
            var f = _pf("text_style_inventory.json");
            if (!f.exists || f.length < 4) return {};
            f.open("r");
            var raw = f.read();
            f.close();
            if (!raw || raw.length < 4) return {};
            // Pre-decode \uXXXX → Chinese
            var decoded = "";
            var i = 0;
            while (i < raw.length) {
                if (raw.charAt(i) === "\\" && raw.charAt(i + 1) === "u" && i + 5 < raw.length) {
                    var cp = parseInt(raw.substring(i + 2, i + 6), 16);
                    if (!isNaN(cp)) { decoded += String.fromCharCode(cp); i += 6; continue; }
                }
                decoded += raw.charAt(i); i++;
            }
            return _parseJson(decoded);
        } catch (e) { return {}; }
    }

    function loadStyleCounts() {
        try {
            var f = _pf("text_style_counts.json");
            if (!f.exists || f.length < 4) return {};
            f.open("r"); var raw = f.read(); f.close();
            return raw ? _parseJson(raw) : {};
        } catch (e) { return {}; }
    }

    function sortGroups(groups, options) {
        groups.sort(function (a, b) {
            if (b.count !== a.count) return b.count - a.count;

            if (options.groupSize && b.sizeValue !== a.sizeValue) {
                return b.sizeValue - a.sizeValue;
            }

            if (a.key < b.key) return -1;
            if (a.key > b.key) return 1;
            return 0;
        });

        if (options.continueMode) {
            var inv = loadStyleInventory();
            var prevCounts = loadStyleCounts();
            var usedIds = {};
            var maxId = 0;
            for (var i = 0; i < groups.length; i++) {
                var g = groups[i];
                var savedId = inv[g.key];
                if (typeof savedId === "number" && savedId > 0) {
                    g.id = savedId;
                    usedIds[savedId] = true;
                    if (savedId > maxId) maxId = savedId;
                    if (typeof prevCounts[String(savedId)] === "number") {
                        g.count += prevCounts[String(savedId)];
                    }
                }
            }
            var nextId = maxId + 1;
            for (var j = 0; j < groups.length; j++) {
                var gj = groups[j];
                if (gj.id === 0) {
                    while (usedIds[nextId]) nextId++;
                    gj.id = nextId;
                    usedIds[nextId] = true;
                    nextId++;
                }
            }
        } else {
            for (var i = 0; i < groups.length; i++) {
                groups[i].id = i + 1;
            }
        }
    }

    function decideAttention(groups, options) {
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];

            g.needAttention = false;
            g.attentionReason = "";

            if (options.attentionMode === 0) {
                continue;
            }

            if (options.attentionMode === 1) {
                if (g.count <= options.rareThreshold) {
                    g.needAttention = true;
                    g.attentionReason = "出现次数 ≤ " + options.rareThreshold;
                }
            }
        }
    }

    function addNumberLabel(layer, bounds, groupId, labelSize, offsetIndex) {
        try {
            var oIdx = toInt(offsetIndex, 0);
            // 每个标签估算宽度 = labelSize 像素 × 字符数 + padding × 2 + 间距 2
            var slotWidth = (labelSize * 0.7) * String(groupId).length + 4 + 2;
            var left = bounds[0] + oIdx * slotWidth;
            var top = bounds[1];
            var bgColor = getGroupColor(groupId);

            var label = layer.textFrames.add();
            label.contents = String(groupId);
            label.textRange.characterAttributes.size = labelSize;
            label.textRange.characterAttributes.fillColor = makeRGB(255, 255, 255);
            try {
                label.textRange.characterAttributes.textFont = app.textFonts.getByName("SourceHanSansSC-Regular");
            } catch (e) {
                try {
                    label.textRange.characterAttributes.textFont = app.textFonts.getByName("AdobeSongStd-Light");
                } catch (e2) {
                    try {
                        label.textRange.characterAttributes.textFont = app.textFonts.getByName("SimSun");
                    } catch (e3) {}
                }
            }
            label.position = [left, top + labelSize + 3];

            var padding = 2;
            var labelW = Math.max(10, label.width + padding * 2);
            var labelH = Math.max(10, label.height + padding * 2);

            var bg = layer.pathItems.rectangle(
                top + labelSize + 6,
                left - padding,
                labelW,
                labelH
            );

            bg.filled = true;
            bg.fillColor = bgColor;
            bg.stroked = false;

            label.zOrder(ZOrderMethod.BRINGTOFRONT);
        } catch (e) {}
    }

    function addAttentionMarker(layer, bounds, groupId, labelSize, labelText) {
        try {
            var left = bounds[0];
            var top = bounds[1];
            var right = bounds[2];
            var bottom = bounds[3];

            var padding = 4;
            var width = Math.max(1, right - left + padding * 2);
            var height = Math.max(1, top - bottom + padding * 2);

            var rect = layer.pathItems.rectangle(
                top + padding,
                left - padding,
                width,
                height
            );

            rect.filled = false;
            rect.stroked = true;
            rect.strokeWidth = 1.5;
            rect.strokeColor = makeRGB(255, 0, 0);

            var label = layer.textFrames.add();
            label.contents = labelText || ("注意 " + groupId);
            label.textRange.characterAttributes.size = Math.max(labelSize, 7);
            label.textRange.characterAttributes.fillColor = makeRGB(255, 0, 0);
            try {
                label.textRange.characterAttributes.textFont = app.textFonts.getByName("SourceHanSansSC-Regular");
            } catch (e) {
                try {
                    label.textRange.characterAttributes.textFont = app.textFonts.getByName("AdobeSongStd-Light");
                } catch (e2) {
                    try {
                        label.textRange.characterAttributes.textFont = app.textFonts.getByName("SimSun");
                    } catch (e3) {}
                }
            }
            label.position = [right + 3, top + Math.max(labelSize + 4, 10)];
        } catch (e) {}
    }

    function collectTextFramesFromGroupRecursive(groupItem, arr, seen) {
        var i;
        try {
            for (i = 0; i < groupItem.textFrames.length; i++) {
                var tf = groupItem.textFrames[i];
                try {
                    var id = tf.uuid || tf.id || tf.typename + "_" + arr.length;
                    if (!seen[id]) {
                        seen[id] = true;
                        arr.push(tf);
                    }
                } catch (e) {}
            }
        } catch (e0) {}

        try {
            for (i = 0; i < groupItem.groupItems.length; i++) {
                collectTextFramesFromGroupRecursive(groupItem.groupItems[i], arr, seen);
            }
        } catch (e1) {}
    }

    function collectTextFramesFromLayerRecursive(layer, arr, seen) {
        var i;
        try {
            for (i = 0; i < layer.textFrames.length; i++) {
                var tf = layer.textFrames[i];
                try {
                    var id = tf.uuid || tf.id || tf.typename + "_" + arr.length;
                    if (!seen[id]) {
                        seen[id] = true;
                        arr.push(tf);
                    }
                } catch (e) {}
            }
        } catch (e0) {}

        try {
            for (i = 0; i < layer.groupItems.length; i++) {
                collectTextFramesFromGroupRecursive(layer.groupItems[i], arr, seen);
            }
        } catch (e1) {}

        try {
            for (i = 0; i < layer.layers.length; i++) {
                collectTextFramesFromLayerRecursive(layer.layers[i], arr, seen);
            }
        } catch (e2) {}
    }

    function collectAllTextFramesUnique(document) {
        var arr = [];
        var seen = {};
        var i;
        var t;

        function add(tf) {
            try {
                var id = tf.uuid || tf.id || tf.typename + "_" + arr.length;
                if (!seen[id]) {
                    seen[id] = true;
                    arr.push(tf);
                }
            } catch (e) {}
        }

        try {
            for (i = 0; i < document.textFrames.length; i++) {
                add(document.textFrames[i]);
            }
        } catch (e0) {}

        try {
            for (i = 0; i < document.stories.length; i++) {
                var story = document.stories[i];
                for (t = 0; t < story.textFrames.length; t++) {
                    add(story.textFrames[t]);
                }
            }
        } catch (e1) {}

        try {
            for (i = 0; i < document.layers.length; i++) {
                collectTextFramesFromLayerRecursive(document.layers[i], arr, seen);
            }
        } catch (e2) {}

        return arr;
    }

    function getTextFrameKindLabel(tf) {
        try {
            if (tf.kind === TextType.POINTTEXT) return "点文字";
            if (tf.kind === TextType.AREATEXT) return "区域文字";
            if (tf.kind === TextType.PATHTEXT) return "路径文字";
        } catch (ek) {}

        return "未知";
    }

    function addLegend(layer, groups, mixedList, options) {
        try {
            if (doc.artboards.length === 0) return;

            var padding = 12;
            var gap = options.legendGap;
            var lineHeight = 16;
            var titleHeight = 22;
            var maxRows = groups.length;

            var lines = [];

            lines.push({
                type: "text",
                text: "文字样式编号说明",
                size: 12,
                color: makeRGB(0, 0, 0),
                height: titleHeight
            });

            lines.push({
                type: "text",
                text: "分组逻辑：" + groupingLogicText(options),
                size: 8,
                color: makeRGB(0, 0, 0),
                height: lineHeight
            });

            lines.push({
                type: "text",
                text: "混合内部扫描：轻量抽样（快，可能漏检）",
                size: 8,
                color: makeRGB(0, 0, 0),
                height: lineHeight
            });

            lines.push({
                type: "text",
                text: "注意规则：" + attentionRuleText(options) + "；混合：" + mixedList.length,
                size: 8,
                color: makeRGB(0, 0, 0),
                height: lineHeight + 4
            });

            for (var i = 0; i < maxRows; i++) {
                var g = groups[i];
                var status = g.needAttention ? " 需注意" : "";

                lines.push({
                    type: "row",
                    text: g.id + ". " + g.display + " × " + g.count + status,
                    size: 8,
                    color: g.needAttention ? makeRGB(255, 0, 0) : makeRGB(0, 0, 0),
                    swatchColor: legendRowSwatchColor(g, options),
                    height: lineHeight
                });
            }

            // 已显示全部组，不再截断

            var maxTextWidth = 0;
            var contentHeight = 0;

            for (var j = 0; j < lines.length; j++) {
                var prefixWidth = lines[j].type === "row" ? 16 : 0;
                var w = prefixWidth + estimateTextWidth(lines[j].text, lines[j].size);

                if (w > maxTextWidth) {
                    maxTextWidth = w;
                }

                contentHeight += lines[j].height;
            }

            var legendW = Math.max(260, maxTextWidth + padding * 2);
            var legendH = contentHeight + padding * 2;

            var firstAb = doc.artboards[0].artboardRect;

            // 固定放在第一个画板上方，画板外；不压到版面。
            var x = firstAb[0] + 20;

            // Illustrator 坐标向上为更大的 y。
            // 背景底部 = 第一个画板顶部 + 间距。
            var y = firstAb[1] + gap + legendH - padding;

            if (options.legendBackground) {
                var bg = layer.pathItems.rectangle(
                    y + padding,
                    x - padding,
                    legendW,
                    legendH
                );

                bg.filled = true;
                bg.fillColor = hexToRGBColor(options.legendBgColor, makeRGB(255, 255, 255));
                bg.stroked = true;
                bg.strokeWidth = 0.5;
                bg.strokeColor = makeRGB(180, 180, 180);
            }

            var currentY = y;

            for (var k = 0; k < lines.length; k++) {
                var lineInfo = lines[k];

                if (lineInfo.type === "row") {
                    var swatch = layer.pathItems.rectangle(currentY + 8, x, 10, 10);
                    swatch.filled = true;
                    swatch.fillColor = lineInfo.swatchColor;
                    swatch.stroked = false;

                    var rowText = layer.textFrames.add();
                    rowText.contents = lineInfo.text;
                    rowText.textRange.characterAttributes.size = lineInfo.size;
                    rowText.textRange.characterAttributes.fillColor = lineInfo.color;
                    try {
                        rowText.textRange.characterAttributes.textFont = app.textFonts.getByName("SourceHanSansSC-Regular");
                    } catch (e) {
                        try {
                            rowText.textRange.characterAttributes.textFont = app.textFonts.getByName("AdobeSongStd-Light");
                        } catch (e2) {
                            try {
                                rowText.textRange.characterAttributes.textFont = app.textFonts.getByName("SimSun");
                            } catch (e3) {}
                        }
                    }
                    rowText.position = [x + 16, currentY + 9];
                } else {
                    var textLine = layer.textFrames.add();
                    textLine.contents = lineInfo.text;
                    textLine.textRange.characterAttributes.size = lineInfo.size;
                    textLine.textRange.characterAttributes.fillColor = lineInfo.color;
                    try {
                        textLine.textRange.characterAttributes.textFont = app.textFonts.getByName("SourceHanSansSC-Regular");
                    } catch (e) {
                        try {
                            textLine.textRange.characterAttributes.textFont = app.textFonts.getByName("AdobeSongStd-Light");
                        } catch (e2) {
                            try {
                                textLine.textRange.characterAttributes.textFont = app.textFonts.getByName("SimSun");
                            } catch (e3) {}
                        }
                    }
                    textLine.position = [x, currentY];
                }

                currentY -= lineInfo.height;
            }
        } catch (e) {}
    }


    function runCheck(options) {
        var selected = options.selectedIndexes;

        if (!selected || selected.length === 0) {
            alert("画板范围无效。\n请选择画板或输入：all、1-10、1,3 等。");
            return;
        }

        var selectedMap = makeNumberMap(selected);

        var savedRedraw;
        try {
            savedRedraw = app.scriptPreferences.enableRedraw;
            app.scriptPreferences.enableRedraw = false;
        } catch (eread) {
            savedRedraw = undefined;
        }

        try {

        if (!options.continueMode) {
            removeLayer(LAYER_GROUP_LABELS);
            removeLayer(LAYER_LEGEND);
            removeLayer(LAYER_MIXED);
        }

        var labelLayer = getOrCreateLayer(LAYER_GROUP_LABELS);
        var attentionLayer = labelLayer;
        var legendLayer = options.createLegend ? getOrCreateLayer(LAYER_LEGEND) : null;
        var mixedLayer = options.markMixed ? getOrCreateLayer(LAYER_MIXED) : null;

        var groupsByKey = {};
        var groups = [];
        var checkedFrames = 0;
        var checkedChars = 0;
        var mixedList = [];
        var globalState = {
            mixedScanCharsUsed: 0
        };

        var styleInventoryOn = options.groupSize || options.groupFont || options.groupColor || options.detectMixed;

        var textFrames = collectAllTextFramesUnique(doc);

        for (var i = 0; i < textFrames.length; i++) {
            var tf = textFrames[i];

            if (trimText(tf.contents) === "") {
                continue;
            }

            try {
                var layerName = tf.layer.name;

                if (
                    layerName === LAYER_GROUP_LABELS ||
                    layerName === LAYER_LEGEND ||
                    layerName === LAYER_MIXED
                ) {
                    continue;
                }

                if (options.onlyVisible && !tf.layer.visible) {
                    continue;
                }
            } catch (e) {}

            var frameInfo = getTextFrameInfoByFirstChar(tf, options.sizeTolerance);

            if (frameInfo.artboardNumber === 0) {
                if (!options.includeOutsideArtboard) {
                    continue;
                }
            } else {
                if (!selectedMap[frameInfo.artboardNumber]) {
                    continue;
                }
            }

            checkedFrames++;

            if (!styleInventoryOn) {
                continue;
            }

            var internal = scanTextFrameInternalStyles(tf, options, globalState);
            checkedChars += internal.charsChecked;

            if (internal.styleCount > 1 && options.detectMixed) {
                var scanNote = trimText(internal.internalScanNote || "");

                var mx = {
                    textFrame: tf,
                    textShort: frameInfo.textShort,
                    bounds: frameInfo.bounds,
                    artboardNumber: frameInfo.artboardNumber,
                    styles: internal.styles,
                    runs: internal.runs,
                    scanNote: scanNote
                };

                mixedList.push(mx);

                if (options.markMixed && mixedLayer !== null) {
                    addAttentionMarker(mixedLayer, frameInfo.bounds, 0, options.labelSize, "混合");
                }
            }

            for (var s = 0; s < internal.styles.length; s++) {
                var style = internal.styles[s];

                if (!groupsByKey[style.key]) {
                    groupsByKey[style.key] = {
                        id: 0,
                        key: style.key,
                        display: style.display,
                        count: 0,
                        charCount: 0,
                        sizeValue: frameInfo.sizeValue,
                        sampleText: frameInfo.textShort,
                        artboards: {},
                        items: [],
                        needAttention: false,
                        attentionReason: ""
                    };

                    groups.push(groupsByKey[style.key]);
                }

                var group = groupsByKey[style.key];
                group.count++;
                group.charCount += style.count;
                group.items.push({
                    info: frameInfo,
                    textFrame: tf
                });

                if (frameInfo.artboardNumber > 0) {
                    group.artboards[frameInfo.artboardNumber] = true;
                }
            }
        }

        sortGroups(groups, options);
        saveStyleInventory(groups);
        saveStyleCounts(groups);
        decideAttention(groups, options);

        var attentionCount = 0;
        // 追踪每个文本框已画过几个编号标签（用于混合框多颜色并排显示）
        var frameLabelOffsets = {};

        for (var g = 0; g < groups.length; g++) {
            var groupItem = groups[g];
            var maxLabels = toInt(options.maxLabelsPerGroup, 0);
            var labelCap = maxLabels <= 0 ? groupItem.items.length : Math.min(groupItem.items.length, maxLabels);

            for (var j = 0; j < groupItem.items.length; j++) {
                var item = groupItem.items[j];

                if (labelLayer !== null && j < labelCap) {
                    var fid = "";
                    try { fid = item.textFrame.uuid; } catch (eu) {}
                    if (!fid) { fid = "f_" + g + "_" + j; }
                    var offIx = frameLabelOffsets[fid] || 0;
                    addNumberLabel(labelLayer, item.info.bounds, groupItem.id, options.labelSize, offIx);
                    frameLabelOffsets[fid] = offIx + 1;
                }

                if (groupItem.needAttention) {
                    attentionCount++;

                    if (attentionLayer !== null) {
                        addAttentionMarker(attentionLayer, item.info.bounds, groupItem.id, options.labelSize, "注意 " + groupItem.id);
                    }
                }
            }
        }

        if (options.createLegend && legendLayer !== null) {
            addLegend(legendLayer, groups, mixedList, options);
        }

        var summaryMsg = "样式检查 v" + SCRIPT_VERSION + "\n\n" +
            "发现样式：" + groups.length + " 组\n" +
            (options.attentionMode === 1 ? "需注意（出现 ≤ " + options.rareThreshold + " 次）：" + attentionCount + " 组\n" : "") +
            (options.markMixed ? "混合样式框：" + mixedList.length + " 个\n" : "") +
            "\n已在画板标注\n" +
            "图层：" + LAYER_GROUP_LABELS + (options.createLegend ? " / " + LAYER_LEGEND : "") + (options.markMixed ? " / " + LAYER_MIXED : "");
        alert(summaryMsg);

        } finally {
            try {
                if (savedRedraw !== undefined) {
                    app.scriptPreferences.enableRedraw = savedRedraw;
                }
            } catch (eread2) {}
        }
    }

    // ==========================
    // UI 界面：v8 紧凑版
    // ==========================
    var dlg = new Window("dialog", "样式检查 v" + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 8;
    dlg.margins = 12;

    function addInputRow(parent, label, defaultValue, chars, labelWidth) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];

        var labelText = group.add("statictext", undefined, label);
        labelText.preferredSize.width = labelWidth || 110;

        var input = group.add("edittext", undefined, defaultValue);
        input.characters = chars || 16;

        return input;
    }

    function addHelp(parent, text) {
        var wrap = 340;
        var help;

        try {
            help = parent.add("statictext", undefined, text, { multiline: true });
        } catch (e0) {
            help = parent.add("statictext", undefined, text);
        }

        help.graphics.font = ScriptUI.newFont(help.graphics.font.name, "REGULAR", 10);

        try {
            help.preferredSize.width = wrap;
        } catch (e1) {}

        return help;
    }

    // 1. 范围
    var activeIndex = doc.artboards.getActiveArtboardIndex();
    var totalArtboards = doc.artboards.length;
    var syncingRange = false;

    var rangePanel = dlg.add("panel", undefined, "1. 范围");
    rangePanel.orientation = "column";
    rangePanel.alignChildren = "fill";
    rangePanel.margins = [8, 10, 8, 6];
    rangePanel.spacing = 3;

    var LIST_W = 360;
    var LIST_H = 88;
    var listbox = rangePanel.add("listbox", undefined, undefined, {
        multiselect: true,
        numberOfColumns: 2,
        showHeaders: false,
        columnWidths: [240, 120]
    });
    listbox.preferredSize = [LIST_W, LIST_H];
    listbox.alignment = "fill";
    listbox.itemSize = [LIST_W, 18];
    var listIndexes = [];

    var LIST_MAX = 80;
    if (totalArtboards > LIST_MAX) {
        addHelp(rangePanel, "共 " + totalArtboards + " 个画板，请用「范围」输入（如 3-254），列表仅显示前 " + LIST_MAX + " 个");
    }

    var listLimit = totalArtboards > LIST_MAX ? LIST_MAX : totalArtboards;
    for (var ab = 0; ab < listLimit; ab++) {
        addArtboardListRow(listbox, ab);
        listIndexes.push(ab);
        if (ab === activeIndex) {
            listbox.items[ab].selected = true;
        }
    }

    var rangeRow = rangePanel.add("group");
    rangeRow.orientation = "row";
    rangeRow.alignChildren = ["left", "center"];

    rangeRow.add("statictext", undefined, "画板范围").preferredSize.width = 64;
    var rangeInput = rangeRow.add("edittext", undefined, String(activeIndex + 1));
    rangeInput.characters = 18;
    var selectAllBtn = rangeRow.add("button", undefined, "全部");

    var modeRow = rangePanel.add("group");
    modeRow.orientation = "row";
    modeRow.alignChildren = ["left", "center"];

    modeRow.add("statictext", undefined, "模式").preferredSize.width = 64;
    var freshModeRadio = modeRow.add("radiobutton", undefined, "全新");
    freshModeRadio.value = true;
    var continueModeRadio = modeRow.add("radiobutton", undefined, "延续");
    modeRow.add("statictext", undefined, "（分段用）");

    addHelp(rangePanel, "列表多选，或在「画板范围」输入：all、1-10、1,3 等。\n大文件建议选指定画板 +「延续」分段检查，接续编号。");

    listbox.onClick = syncRangeFromList;
    listbox.onChange = syncRangeFromList;

    selectAllBtn.onClick = function () {
        syncingRange = true;
        for (var ai = 0; ai < listbox.items.length; ai++) {
            listbox.items[ai].selected = true;
        }
        rangeInput.text = "all";
        syncingRange = false;
    };

    // 2. 分类与检查
    var groupPanel = dlg.add("panel", undefined, "2. 分类与检查");
    groupPanel.orientation = "column";
    groupPanel.alignChildren = "fill";
    groupPanel.margins = 10;

    var groupRow = groupPanel.add("group");
    groupRow.orientation = "row";
    groupRow.alignChildren = ["left", "center"];

    var groupSizeCheck = groupRow.add("checkbox", undefined, "字号");
    groupSizeCheck.value = true;

    var groupFontCheck = groupRow.add("checkbox", undefined, "字体");
    groupFontCheck.value = true;

    var groupColorCheck = groupRow.add("checkbox", undefined, "颜色");
    groupColorCheck.value = true;

    addHelp(groupPanel, "按选中维度将文字分组（例如「字号+字体」两组一致才算同组）。");

    var mixedRow1 = groupPanel.add("group");
    mixedRow1.orientation = "row";
    mixedRow1.alignChildren = ["left", "center"];

    var detectMixedCheck = mixedRow1.add("checkbox", undefined, "检查框内混合样式（标红框）");
    detectMixedCheck.value = false;

    addHelp(groupPanel, "框内同一行出现多种样式时标红框。维度与上栏一致；空格换行忽略。");

    function updateMixedEnabled() {
        var anyGroup = groupSizeCheck.value || groupFontCheck.value || groupColorCheck.value;
        detectMixedCheck.enabled = anyGroup;
        if (!anyGroup) detectMixedCheck.value = false;
    }

    groupSizeCheck.onClick = updateMixedEnabled;
    groupFontCheck.onClick = updateMixedEnabled;
    groupColorCheck.onClick = updateMixedEnabled;
    updateMixedEnabled();

    // 3. 输出方式
    var outputPanel = dlg.add("panel", undefined, "3. 输出方式");
    outputPanel.orientation = "column";
    outputPanel.alignChildren = "left";
    outputPanel.margins = 10;
    outputPanel.spacing = 5;

    var onlyVisibleCheck = outputPanel.add("checkbox", undefined, "只检查可见对象（跳过隐藏图层）");
    onlyVisibleCheck.value = true;

    var includeOutsideCheck = outputPanel.add("checkbox", undefined, "包含画板外文字");
    includeOutsideCheck.value = false;

    var attentionRow = outputPanel.add("group");
    attentionRow.orientation = "row";
    attentionRow.alignChildren = ["left", "center"];
    var markAttentionCheck = attentionRow.add("checkbox", undefined, "红框标出出现次数 ≤");
    markAttentionCheck.value = true;
    var rareThresholdInput = attentionRow.add("edittext", undefined, "1");
    rareThresholdInput.characters = 3;
    attentionRow.add("statictext", undefined, "次的样式");

    var createLegendCheck = outputPanel.add("checkbox", undefined, "生成说明");
    createLegendCheck.value = true;

    markAttentionCheck.onClick = function () {
        rareThresholdInput.enabled = markAttentionCheck.value;
    };

    // 按钮
    var buttonGroup = dlg.add("group");
    buttonGroup.orientation = "row";
    buttonGroup.alignment = "right";

    var cancelBtn = buttonGroup.add("button", undefined, "取消", { name: "cancel" });
    var runBtn = buttonGroup.add("button", undefined, "检查", { name: "ok" });

    cancelBtn.onClick = function () {
        var b = dlg.bounds; savePrefs("text_style_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    runBtn.onClick = function () {
        var hasGroup = groupSizeCheck.value || groupFontCheck.value || groupColorCheck.value;
        var hasMixed = detectMixedCheck.value;

        if (hasMixed && !hasGroup) {
            alert("开启「框内混合检查」时，请至少勾选一个分组逻辑（同一字号 / 同一字体 / 同一颜色）。");
            return;
        }

        if (!hasGroup && !hasMixed) {
            alert("请至少选择一种：分组逻辑、或「框内混合检查」。");
            return;
        }

        var rareThreshold = toInt(rareThresholdInput.text, 1);
        var attentionMode = markAttentionCheck.value ? 1 : 0;

        if (attentionMode === 1 && rareThreshold < 1) {
            alert("N 值必须大于等于 1。");
            return;
        }

        var zeroBased = getTargetIndexes();
        if (zeroBased.length === 0) {
            alert("画板范围无效。\n请选择画板或输入：all、1-10、1,3 等。");
            return;
        }

        var selectedIndexes = [];
        for (var si = 0; si < zeroBased.length; si++) selectedIndexes.push(zeroBased[si] + 1);

        var options = {
            selectedIndexes: selectedIndexes,
            rangeText: trimText(rangeInput.text),
            onlyVisible: onlyVisibleCheck.value,
            includeOutsideArtboard: includeOutsideCheck.value,

            groupSize: groupSizeCheck.value,
            groupFont: groupFontCheck.value,
            groupColor: groupColorCheck.value,
            sizeTolerance: 0.1,

            detectMixed: detectMixedCheck.value,
            markMixed: detectMixedCheck.value,
            ignoreWhitespace: true,

            attentionMode: attentionMode,
            rareThreshold: rareThreshold,

            createLegend: createLegendCheck.value,
            continueMode: continueModeRadio.value,
            labelSize: 7,
            maxLabelsPerGroup: 0,

            // 编号说明固定设置：第一个画板上方，画板外，白色纸底
            legendGap: 40,
            legendBackground: true,
            legendBgColor: "#FFFFFF"
        };

        var b = dlg.bounds; savePrefs("text_style_pos.json", { x: b[0], y: b[1] });
        dlg.close();
        runCheck(options);
    };

    var pos = loadPos("text_style_pos.json");
    if (pos.x < 0 && pos.y < 0) { dlg.center(); }
    else { try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); } }
    dlg.show();

})();
