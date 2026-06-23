#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var SCRIPT_VERSION = "1.5.8";

    if (app.documents.length === 0) {
        alert("请先打开 Illustrator 文件。");
        return;
    }

    var doc = app.activeDocument;

    function trimText(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function toFloat(value, fallback) {
        var n = parseFloat(String(value).replace(/,/g, "."));
        return isNaN(n) ? fallback : n;
    }

    function toInt(value, fallback) {
        var n = parseInt(String(value), 10);
        return isNaN(n) ? fallback : n;
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

        if (rangeText === "" || rangeText.toLowerCase() === "all") {
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

    function getMetrics(ab) {
        var r = ab.artboardRect;
        return {
            left: r[0],
            top: r[1],
            right: r[2],
            bottom: r[3],
            width: r[2] - r[0],
            height: r[1] - r[3]
        };
    }

    /** 仅根据「将要排版」的画板检测间距与单元尺寸 */
    function measureSelectionLayout(document, indexes) {
        var items = [];
        var cellW = 0;
        var cellH = 0;
        var i;
        var m;
        var rowTol;
        var sorted;
        var hGaps = [];
        var vGaps = [];
        var ri;

        for (i = 0; i < indexes.length; i++) {
            m = getMetrics(document.artboards[indexes[i]]);
            items.push({ index: indexes[i], m: m });
            if (m.width > cellW) cellW = m.width;
            if (m.height > cellH) cellH = m.height;
        }

        if (!items.length) {
            return null;
        }

        rowTol = cellH * 0.2 + 4;
        sorted = items.slice().sort(function (a, b) {
            if (Math.abs(a.m.top - b.m.top) > rowTol) {
                return b.m.top - a.m.top;
            }
            return a.m.left - b.m.left;
        });

        for (i = 0; i < sorted.length - 1; i++) {
            if (Math.abs(sorted[i].m.top - sorted[i + 1].m.top) <= rowTol) {
                hGaps.push(sorted[i + 1].m.left - sorted[i].m.right);
            } else {
                vGaps.push(sorted[i].m.bottom - sorted[i + 1].m.top);
            }
        }

        function avg(arr, fallback) {
            if (!arr.length) return fallback;
            var sum = 0;
            var j;
            for (j = 0; j < arr.length; j++) {
                sum += arr[j];
            }
            return sum / arr.length;
        }

        var hGap = avg(hGaps, 20);
        var vGap = avg(vGaps, 20);
        if (hGap < 0) hGap = 20;
        if (vGap < 0) vGap = 20;

        return {
            cellW: cellW,
            cellH: cellH,
            hGap: hGap,
            vGap: vGap,
            rowTol: rowTol
        };
    }

    function sortIndexes(document, indexes, order, rowTol) {
        if (order === "index") {
            return indexes.slice().sort(function (a, b) {
                return a - b;
            });
        }
        if (order === "name") {
            return indexes.slice().sort(function (a, b) {
                var na = document.artboards[a].name;
                var nb = document.artboards[b].name;
                if (na < nb) return -1;
                if (na > nb) return 1;
                return 0;
            });
        }
        return indexes.slice().sort(function (a, b) {
            var ra = getMetrics(document.artboards[a]);
            var rb = getMetrics(document.artboards[b]);
            if (Math.abs(ra.top - rb.top) > rowTol) {
                return rb.top - ra.top;
            }
            return ra.left - rb.left;
        });
    }

    function getSelectionAnchor(document, indexes) {
        var anchorTop = -Infinity;
        var anchorLeft = Infinity;
        var i;
        var m;

        for (i = 0; i < indexes.length; i++) {
            m = getMetrics(document.artboards[indexes[i]]);
            if (m.top > anchorTop) anchorTop = m.top;
            if (m.left < anchorLeft) anchorLeft = m.left;
        }

        return { top: anchorTop, left: anchorLeft };
    }

    function resolveAnchor(document, sortedIndexes, sl, options) {
        var anchorLeft;
        var anchorTop;

        if (options.anchorMode === "below") {
            var refIdx = options.refArtboardIndex;
            if (refIdx < 0 || refIdx >= document.artboards.length) {
                throw new Error("起点画板编号无效。");
            }
            var refM = getMetrics(document.artboards[refIdx]);
            anchorLeft = refM.left + options.offsetX;
            anchorTop = refM.bottom - sl.vGap + options.offsetY;
        } else {
            var box = getSelectionAnchor(document, sortedIndexes);
            anchorLeft = box.left + options.offsetX;
            anchorTop = box.top + options.offsetY;
        }

        return { left: anchorLeft, top: anchorTop };
    }

    function unlockLayers(layers) {
        var i;
        for (i = 0; i < layers.length; i++) {
            if (layers[i].locked) layers[i].locked = false;
            if (layers[i].layers.length) {
                unlockLayers(layers[i].layers);
            }
        }
    }

    function boundsOverlap(rect, b) {
        return !(b[2] < rect[0] || b[0] > rect[2] || b[3] > rect[1] || b[1] < rect[3]);
    }

    /** 收集与画板重叠的顶层 pageItems（群组整体移动，不递归子项） */
    function collectItemsOnArtboard(document, abIndex) {
        var rect = document.artboards[abIndex].artboardRect;
        var found = [];

        function walkLayers(layers) {
            var i;
            var j;
            var item;
            for (i = 0; i < layers.length; i++) {
                for (j = 0; j < layers[i].pageItems.length; j++) {
                    item = layers[i].pageItems[j];
                    try {
                        if (boundsOverlap(rect, item.geometricBounds)) {
                            found.push(item);
                        }
                    } catch (e) {}
                }
                if (layers[i].layers.length) {
                    walkLayers(layers[i].layers);
                }
            }
        }

        walkLayers(document.layers);
        return found;
    }

    function shiftItemByDelta(document, item, dx, dy, isDoc) {
        var docCS = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        var abCS = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
        var pos = isDoc
            ? item.position
            : document.convertCoordinate(item.position, docCS, abCS);
        item.position = [pos[0] + dx, pos[1] + dy];
    }

    function moveArtboardAndContents(document, abIndex, dx, dy) {
        if (dx === 0 && dy === 0) return;

        document.artboards.setActiveArtboardIndex(abIndex);

        var docCS = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        var isDoc = app.coordinateSystem === docCS;
        var items = [];
        var j;

        document.selectObjectsOnActiveArtboard();
        for (j = 0; j < selection.length; j++) {
            items.push(selection[j]);
        }
        selection = null;

        if (items.length === 0) {
            items = collectItemsOnArtboard(document, abIndex);
        }

        for (j = 0; j < items.length; j++) {
            try {
                shiftItemByDelta(document, items[j], dx, dy, isDoc);
            } catch (e) {}
        }

        var ab = document.artboards[abIndex];
        var r = ab.artboardRect;
        ab.artboardRect = [r[0] + dx, r[1] + dy, r[2] + dx, r[3] + dy];
    }

    function makeProgressWindow(total) {
        var w = new Window("palette", "重新排列中");
        w.spacing = 6;
        w.margins = [12, 10, 12, 10];
        w.add("statictext", undefined, "正在移动画板及内容，请稍候…");
        var barGrp = w.add("group");
        barGrp.orientation = "row";
        barGrp.alignChildren = ["left", "center"];
        var countText = barGrp.add("statictext", undefined, "0 / " + total);
        countText.preferredSize = [120, 18];
        var pctText = barGrp.add("statictext", undefined, "0%");
        pctText.preferredSize = [40, 18];
        w.countText = countText;
        w.pctText = pctText;
        w.total = total;
        w.show();
        return w;
    }

    function updateProgress(w, done) {
        w.countText.text = done + " / " + w.total;
        w.pctText.text = Math.round((done / w.total) * 100) + "%";
        w.update();
    }

    function parseRowPattern(text) {
        text = trimText(text);
        var rows = [];
        var parts;
        var i;
        var n;

        if (!text) return rows;

        parts = text.split(/[,，;；\s\n\r]+/);
        for (i = 0; i < parts.length; i++) {
            n = parseInt(trimText(parts[i]), 10);
            if (!isNaN(n) && n > 0) {
                rows.push(n);
            }
        }
        return rows;
    }

    function sumRowPattern(pattern) {
        var sum = 0;
        var i;
        for (i = 0; i < pattern.length; i++) {
            sum += pattern[i];
        }
        return sum;
    }

    function expandRowPattern(total, basePattern) {
        var pattern = [];
        var remaining;
        var i;
        var sz;

        if (!basePattern.length) {
            return { pattern: [], error: "请填写各行个数" };
        }

        var sumBase = sumRowPattern(basePattern);
        if (sumBase > total) {
            return { pattern: [], error: "各行合计超过选中数量" };
        }

        // 填入用户指定的各行
        for (i = 0; i < basePattern.length; i++) {
            pattern.push(basePattern[i]);
        }

        // 剩余画板：其余每行固定，固定值 = 输入列表最后一个数字
        var tailPerRow = basePattern[basePattern.length - 1];
        if (tailPerRow < 1) tailPerRow = 1;
        remaining = total - sumBase;

        while (remaining > 0) {
            sz = remaining >= tailPerRow ? tailPerRow : remaining;
            pattern.push(sz);
            remaining -= sz;
        }

        return { pattern: pattern, error: "" };
    }

    function resolveRowPattern(sortedLength, options) {
        var base = parseRowPattern(options.rowPatternText);
        var expanded = expandRowPattern(sortedLength, base);
        if (expanded.error) {
            throw new Error(expanded.error);
        }
        return expanded.pattern;
    }

    function getExpandedPatternForPreview(total, basePattern) {
        return expandRowPattern(total, basePattern);
    }

    function buildLayoutPreview(document, sorted, pattern, errHint) {
        var lines = [];
        var artIdx = 0;
        var r;
        var c;
        var abIdx;
        var firstNum;
        var lastNum;
        var rowCount;

        if (errHint) {
            lines.push(errHint);
        }

        if (!pattern.length) {
            return lines.length ? lines.join("\n") : "（无预览）";
        }

        for (r = 0; r < pattern.length; r++) {
            rowCount = 0;
            firstNum = null;
            lastNum = null;
            for (c = 0; c < pattern[r]; c++) {
                if (artIdx >= sorted.length) break;
                abIdx = sorted[artIdx++];
                rowCount++;
                if (firstNum === null) {
                    firstNum = abIdx + 1;
                }
                lastNum = abIdx + 1;
            }
            if (rowCount === 0) break;
            lines.push(
                "第" + (r + 1) + "行  " + firstNum + " – " + lastNum + "  (" + rowCount + "个)"
            );
        }

        if (artIdx < sorted.length) {
            lines.push("⚠ 预览未排完（请检查设置）");
        }

        return lines.join("\n");
    }

    function relayoutSelected(document, targetIndexes, options) {
        if (!targetIndexes.length) {
            throw new Error("请先选择要排版的画板。");
        }

        var sl = measureSelectionLayout(document, targetIndexes);
        if (!sl) {
            throw new Error("无法分析选中画板。");
        }

        var sorted = sortIndexes(document, targetIndexes, options.sortOrder, sl.rowTol);
        var pattern = resolveRowPattern(sorted.length, options);
        var anchor = resolveAnchor(document, sorted, sl, options);
        var cellW = sl.cellW;
        var cellH = sl.cellH;
        var hGap = options.hGap;
        var vGap = options.vGap;
        var savedAb = document.artboards.getActiveArtboardIndex();
        var savedCoord = app.coordinateSystem;
        var i;
        var row;
        var col;
        var artIdx;
        var idx;
        var m;
        var newLeft;
        var newTop;

        var moves = [];
        artIdx = 0;
        for (row = 0; row < pattern.length; row++) {
            for (col = 0; col < pattern[row]; col++) {
                idx = sorted[artIdx++];
                newLeft = anchor.left + col * (cellW + hGap);
                newTop = anchor.top - row * (cellH + vGap);
                m = getMetrics(document.artboards[idx]);
                moves.push({
                    idx: idx,
                    dx: newLeft - m.left,
                    dy: newTop - m.top
                });
            }
        }

        var total = moves.length;
        var progWin = makeProgressWindow(total);

        unlockLayers(document.layers);

        app.coordinateSystem = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;

        for (i = 0; i < moves.length; i++) {
            var mv = moves[i];
            moveArtboardAndContents(document, mv.idx, mv.dx, mv.dy);
            if ((i + 1) % 10 === 0 || i === moves.length - 1) {
                updateProgress(progWin, i + 1);
            }
        }

        app.coordinateSystem = savedCoord;

        try {
            document.artboards.setActiveArtboardIndex(savedAb);
        } catch (eRestore) {}

        progWin.close();

        return { moved: total, rows: pattern.length, pattern: pattern };
    }

    function addArtboardListRow(lb, abIndex) {
        lb.add("item", (abIndex + 1) + "  |  " + doc.artboards[abIndex].name);
    }

    // ==========================
    // UI
    // ==========================
    var activeIndex = doc.artboards.getActiveArtboardIndex();
    var totalArtboards = doc.artboards.length;
    var syncingRange = false;

    var prefs = loadPrefs("relayout.json", {
        hGap: "62",
        vGap: "86",
        rowPat: "10,5,10",
        orderMode: 0
    });

    var dlg = new Window("dialog", "重新排列 v" + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 4;
    dlg.margins = 8;

    var summaryText = dlg.add("statictext", undefined, "已选 0 个画板", { multiline: false });
    summaryText.preferredSize = [400, 18];

    // ── 目标范围 ──
    var targetPanel = dlg.add("panel", undefined, "选择画板");
    targetPanel.orientation = "column";
    targetPanel.alignChildren = "fill";
    targetPanel.margins = [8, 10, 8, 6];
    targetPanel.spacing = 3;

    var LIST_W = 380;
    var LIST_H = 100;
    var listbox = targetPanel.add("listbox", undefined, undefined, {
        multiselect: true,
        numberOfColumns: 2,
        showHeaders: false,
        columnWidths: [240, 130]
    });
    listbox.preferredSize = [LIST_W, LIST_H];
    listbox.alignment = "fill";
    listbox.itemSize = [LIST_W, 18];
    var listIndexes = [];

    var LIST_MAX = 80;
    var listHint = null;
    if (totalArtboards > LIST_MAX) {
        listHint = targetPanel.add(
            "statictext",
            undefined,
            "共 " + totalArtboards + " 个画板，请用「范围」输入（如 3-254），列表仅显示前 " + LIST_MAX + " 个"
        );
    }

    var listLimit = totalArtboards > LIST_MAX ? LIST_MAX : totalArtboards;
    for (var ab = 0; ab < listLimit; ab++) {
        addArtboardListRow(listbox, ab);
        listIndexes.push(ab);
        if (ab === activeIndex) {
            listbox.items[ab].selected = true;
        }
    }

    var rangeRow = targetPanel.add("group");
    rangeRow.orientation = "row";
    rangeRow.alignChildren = ["left", "center"];
    rangeRow.add("statictext", undefined, "范围").preferredSize.width = 36;
    var rangeInput = rangeRow.add("edittext", undefined, String(activeIndex + 1));
    rangeInput.characters = 24;
    var selectAllBtn = rangeRow.add("button", undefined, "全部");

    // ── 排列参数 ──
    var gridPanel = dlg.add("panel", undefined, "排列方式");
    gridPanel.orientation = "column";
    gridPanel.alignChildren = "fill";
    gridPanel.margins = [8, 10, 8, 6];
    gridPanel.spacing = 4;

    // 1. 各行分布
    var patternRow = gridPanel.add("group");
    patternRow.orientation = "row";
    patternRow.alignChildren = ["left", "center"];
    patternRow.add("statictext", undefined, "每行个数").preferredSize.width = 56;
    var rowPatternInput = patternRow.add("edittext", undefined, prefs.rowPat);
    rowPatternInput.characters = 24;
    patternRow.add("statictext", undefined, "个（逗号分隔）");

    // 2. 间距
    var gapRow = gridPanel.add("group");
    gapRow.orientation = "row";
    gapRow.alignChildren = ["left", "center"];

    function addGapInput(parent, label, val, lw) {
        parent.add("statictext", undefined, label).preferredSize.width = lw || 44;
        var input = parent.add("edittext", undefined, val);
        input.characters = 7;
        parent.add("statictext", undefined, "pt");
        return input;
    }

    var hGapInput = addGapInput(gapRow, "左右间距", prefs.hGap, 56);
    var vGapInput = addGapInput(gapRow, "上下间距", prefs.vGap, 56);

    // 3. 画板顺序
    var orderRow = gridPanel.add("group");
    orderRow.orientation = "row";
    orderRow.alignChildren = ["left", "center"];
    orderRow.add("statictext", undefined, "画板顺序").preferredSize.width = 56;
    var orderIndex = orderRow.add("radiobutton", undefined, "编号");
    orderIndex.value = (prefs.orderMode === 0);
    var orderVisual = orderRow.add("radiobutton", undefined, "视觉位置");
    var orderName = orderRow.add("radiobutton", undefined, "名称");
    orderVisual.value = (prefs.orderMode === 1);
    orderName.value = (prefs.orderMode === 2);

    // ── 起点（单行）──
    var anchorPanel = dlg.add("panel", undefined, "放置位置");
    anchorPanel.orientation = "row";
    anchorPanel.alignChildren = ["left", "center"];
    anchorPanel.margins = [8, 10, 8, 8];

    var anchorKeep = anchorPanel.add("radiobutton", undefined, "选区左上");
    anchorKeep.value = true;
    var anchorBelow = anchorPanel.add("radiobutton", undefined, "画板");
    var refAbInput = anchorPanel.add("edittext", undefined, String(activeIndex + 1));
    refAbInput.characters = 5;
    anchorPanel.add("statictext", undefined, "正下方");
    anchorPanel.add("statictext", undefined, "  偏移");
    var offsetXInput = anchorPanel.add("edittext", undefined, "0");
    offsetXInput.characters = 5;
    anchorPanel.add("statictext", undefined, "X");
    var offsetYInput = anchorPanel.add("edittext", undefined, "0");
    offsetYInput.characters = 5;
    anchorPanel.add("statictext", undefined, "Y pt");

    // ── 预览（底部，可滚动）──
    var previewPanel = dlg.add("panel", undefined, "预览");
    previewPanel.orientation = "column";
    previewPanel.alignChildren = "fill";
    previewPanel.margins = [8, 8, 8, 4];
    var previewText = previewPanel.add("edittext", undefined, "", {
        multiline: true,
        scrolling: true,
        readonly: true
    });
    previewText.preferredSize = [400, 72];
    previewText.alignment = "fill";

    // ── 按钮（底部）──
    var btnRow = dlg.add("group");
    btnRow.alignment = "right";
    btnRow.spacing = 6;
    btnRow.add("button", undefined, "取消", { name: "cancel" });
    btnRow.add("button", undefined, "排列", { name: "ok" });

    function getTargetIndexes() {
        var rangeText = trimText(rangeInput.text);
        if (rangeText !== "") {
            var fromRange = parseArtboardRange(rangeText, totalArtboards);
            if (fromRange.length > 0) return fromRange;
        }
        return getIndexesFromList(listbox, listIndexes);
    }

    function getSortOrder() {
        if (orderVisual.value) return "visual";
        if (orderName.value) return "name";
        return "index";
    }

    function clearListSelection() {
        var ci;
        for (ci = 0; ci < listbox.items.length; ci++) {
            listbox.items[ci].selected = false;
        }
    }

    function fillGapsFromSelection() {
        var targets = getTargetIndexes();
        if (!targets.length) return;
        var sl = measureSelectionLayout(doc, targets);
        if (!sl) return;
        hGapInput.text = String(Math.round(sl.hGap * 10) / 10);
        vGapInput.text = String(Math.round(sl.vGap * 10) / 10);
    }

    function getPreviewPatternData(targets, sorted) {
        var base = parseRowPattern(rowPatternInput.text);
        return getExpandedPatternForPreview(targets.length, base);
    }

    function updateSummary() {
        var targets = getTargetIndexes();
        refAbInput.enabled = anchorBelow.value;

        if (targets.length === 0) {
            summaryText.text = "未选择画板";
            previewText.text = "";
            return;
        }

        var sl = measureSelectionLayout(doc, targets);
        var sorted = sortIndexes(doc, targets, getSortOrder(), sl ? sl.rowTol : 4);
        var pv = getPreviewPatternData(targets, sorted);
        var pattern = pv.pattern;
        var cell = sl ? Math.round(sl.cellW) + "×" + Math.round(sl.cellH) : "?";

        if (pv.error) {
            summaryText.text = "选中 " + targets.length + " 个 · " + (pattern.length ? pattern.length + " 行预览" : "无法排满") + " · " + cell;
            previewText.text = buildLayoutPreview(doc, sorted, pattern, "⚠ " + pv.error);
            return;
        }

        summaryText.text = targets.length + " 个 · " + pattern.length + " 行 · " + cell + " pt";
        previewText.text = buildLayoutPreview(doc, sorted, pattern, "");
    }

    function syncRangeFromList() {
        if (syncingRange) return;
        var indexes = getIndexesFromList(listbox, listIndexes);
        syncingRange = true;
        rangeInput.text = indexes.length > 0 ? indexesToRangeText(indexes) : "";
        syncingRange = false;
        fillGapsFromSelection();
        updateSummary();
    }

    rowPatternInput.onChanging = updateSummary;
    hGapInput.onChanging = updateSummary;
    vGapInput.onChanging = updateSummary;
    orderIndex.onClick = updateSummary;
    orderVisual.onClick = updateSummary;
    orderName.onClick = updateSummary;
    anchorKeep.onClick = updateSummary;
    anchorBelow.onClick = updateSummary;
    refAbInput.onChanging = updateSummary;
    offsetXInput.onChanging = updateSummary;
    offsetYInput.onChanging = updateSummary;

    listbox.onClick = syncRangeFromList;
    listbox.onChange = syncRangeFromList;

    selectAllBtn.onClick = function () {
        syncingRange = true;
        clearListSelection();
        rangeInput.text = "all";
        syncingRange = false;
        updateSummary();
    };

    rangeInput.onChanging = function () {
        fillGapsFromSelection();
        updateSummary();
    };

    fillGapsFromSelection();
    updateSummary();

    try {
        dlg.preferredSize = [420, 500];
    } catch (eSize) {}

    var dlgResult = 2;
    try {
        var pos = loadPos("relayout_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlgResult = dlg.show();
    try { var b = dlg.bounds; savePrefs("relayout_pos.json", { x: b[0], y: b[1] }); } catch (e) {}
    } catch (eDlg) {
        alert("界面错误：\n" + eDlg.message);
        return;
    }

    if (dlgResult !== 1) {
        return;
    }

    var targets = getTargetIndexes();
    if (targets.length === 0) {
        alert("请先选择画板（例如 87-99 或 171-212）。");
        return;
    }

    if (targets.length > 60) {
        if (!confirm("将排列 " + targets.length + " 个画板。数量较多，建议确认范围正确。\n继续？", true, "确认")) {
            return;
        }
    }

    try {
        savePrefs("relayout.json", {
            hGap: hGapInput.text,
            vGap: vGapInput.text,
            rowPat: rowPatternInput.text,
            orderMode: orderIndex.value ? 0 : orderVisual.value ? 1 : 2
        });

        var result = relayoutSelected(doc, targets, {
            layoutMode: "custom",
            rowPatternText: rowPatternInput.text,
            hGap: toFloat(hGapInput.text, 62),
            vGap: toFloat(vGapInput.text, 86),
            sortOrder: getSortOrder(),
            anchorMode: anchorBelow.value ? "below" : "keep",
            refArtboardIndex: toInt(refAbInput.text, activeIndex + 1) - 1,
            offsetX: toFloat(offsetXInput.text, 0),
            offsetY: toFloat(offsetYInput.text, 0)
        });

        // 靜默完成，不彈窗
    } catch (err) {
        alert("操作失败：\n" + err.message);
    }
})();
