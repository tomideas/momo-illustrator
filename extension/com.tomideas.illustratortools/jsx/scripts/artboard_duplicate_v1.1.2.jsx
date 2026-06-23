#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var SCRIPT_VERSION = "1.1.2";
    var NOTE_LOCKED = "%dupAbLocked";
    var NOTE_HIDDEN = "%dupAbHidden";
    var SCAN_MAX_ARTBOARDS = 40;
    var ITEM_VISIT_LIMIT = 12000;

    if (app.documents.length === 0) {
        alert("请先打开 Illustrator 文件。");
        return;
    }

    var doc = app.activeDocument;

    // ==========================
    // Helpers
    // ==========================
    function trimText(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function parseArtboardRange(rangeText, total) {
        rangeText = trimText(rangeText);
        var result = [];
        var seen = {};

        if (rangeText === "" || rangeText.toLowerCase() === "all") {
            for (var a = 1; a <= total; a++) {
                result.push(a - 1);
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
                    if (p >= 1 && p <= total && !seen[p]) {
                        result.push(p - 1);
                        seen[p] = true;
                    }
                }
            } else {
                var single = parseInt(part, 10);
                if (!isNaN(single) && single >= 1 && single <= total && !seen[single]) {
                    result.push(single - 1);
                    seen[single] = true;
                }
            }
        }

        return result;
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

    function measureDocumentLayout(document) {
        var count = document.artboards.length;
        var items = [];
        var minLeft = Infinity;
        var minBottom = Infinity;
        var i;
        var m;

        for (i = 0; i < count; i++) {
            m = getMetrics(document.artboards[i]);
            items.push({ index: i, m: m });
            if (m.left < minLeft) minLeft = m.left;
            if (m.bottom < minBottom) minBottom = m.bottom;
        }

        if (count === 0) {
            return null;
        }

        var rowTol = items[0].m.height * 0.2 + 4;
        var sorted = items.slice().sort(function (a, b) {
            if (Math.abs(a.m.top - b.m.top) > rowTol) {
                return b.m.top - a.m.top;
            }
            return a.m.left - b.m.left;
        });

        var rows = [];
        var row;
        var ri;
        var prevTop = sorted[0].m.top;

        row = [sorted[0]];
        rows.push(row);

        for (i = 1; i < sorted.length; i++) {
            if (Math.abs(sorted[i].m.top - prevTop) <= rowTol) {
                row.push(sorted[i]);
            } else {
                row = [sorted[i]];
                rows.push(row);
                prevTop = sorted[i].m.top;
            }
        }

        for (ri = 0; ri < rows.length; ri++) {
            rows[ri].sort(function (a, b) {
                return a.m.left - b.m.left;
            });
        }

        var width = rows[0][0].m.width;
        var height = rows[0][0].m.height;
        var hGaps = [];
        var vGaps = [];
        var r;
        var c;

        for (r = 0; r < rows.length; r++) {
            for (c = 0; c < rows[r].length - 1; c++) {
                hGaps.push(rows[r][c + 1].m.left - rows[r][c].m.right);
            }
        }

        for (r = 0; r < rows.length - 1; r++) {
            var upper = rows[r];
            var lower = rows[r + 1];
            var upperBottom = upper[0].m.bottom;
            var lowerTop = lower[0].m.top;
            vGaps.push(upperBottom - lowerTop);
        }

        function avg(arr, fallback) {
            if (!arr.length) return fallback;
            var sum = 0;
            for (i = 0; i < arr.length; i++) {
                sum += arr[i];
            }
            return sum / arr.length;
        }

        var hGap = avg(hGaps, 20);
        var vGap = avg(vGaps, 20);
        if (hGap < 0) hGap = 20;
        if (vGap < 0) vGap = 20;

        var maxCols = 0;
        for (r = 0; r < rows.length; r++) {
            if (rows[r].length > maxCols) maxCols = rows[r].length;
        }

        return {
            minLeft: minLeft,
            minBottom: minBottom,
            width: width,
            height: height,
            hGap: hGap,
            vGap: vGap,
            rowTol: rowTol,
            cols: maxCols,
            rows: rows.length
        };
    }

    function sortIndexesVisual(document, indexes, rowTol) {
        return indexes.slice().sort(function (a, b) {
            var ra = getMetrics(document.artboards[a]);
            var rb = getMetrics(document.artboards[b]);
            if (Math.abs(ra.top - rb.top) > rowTol) {
                return rb.top - ra.top;
            }
            return ra.left - rb.left;
        });
    }

    function getSelectionBounds(document, indexes) {
        var minLeft = Infinity;
        var maxTop = -Infinity;
        var i;
        var m;

        for (i = 0; i < indexes.length; i++) {
            m = getMetrics(document.artboards[indexes[i]]);
            if (m.left < minLeft) minLeft = m.left;
            if (m.top > maxTop) maxTop = m.top;
        }

        return { minLeft: minLeft, maxTop: maxTop };
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

    function itemOnArtboard(item, rect) {
        try {
            var b = item.geometricBounds;
            var cx = (b[0] + b[2]) / 2;
            var cy = (b[1] + b[3]) / 2;
            return cx >= rect[0] && cx <= rect[2] && cy <= rect[3] && cy <= rect[1];
        } catch (e) {
            return false;
        }
    }

    function boundsOverlap(rect, b) {
        return !(b[2] < rect[0] || b[0] > rect[2] || b[3] > rect[1] || b[1] < rect[3]);
    }

    function countSelectableOnArtboard(document, abIndex) {
        document.artboards.setActiveArtboardIndex(abIndex);
        document.selectObjectsOnActiveArtboard();
        var n = selection.length;
        selection = null;
        return n;
    }

    function snapshotLayerLocks(layers, stack) {
        var i;
        for (i = 0; i < layers.length; i++) {
            stack.push({ layer: layers[i], locked: layers[i].locked });
            if (layers[i].layers.length) {
                snapshotLayerLocks(layers[i].layers, stack);
            }
        }
    }

    function restoreLayerLocks(stack) {
        var i;
        for (i = 0; i < stack.length; i++) {
            stack[i].layer.locked = stack[i].locked;
        }
    }

    function unlockAllLayers(layers) {
        var i;
        for (i = 0; i < layers.length; i++) {
            layers[i].locked = false;
            if (layers[i].layers.length) {
                unlockAllLayers(layers[i].layers);
            }
        }
    }

    function countSelectableAfterLayerUnlock(document, abIndex) {
        var stack = [];
        snapshotLayerLocks(document.layers, stack);
        unlockAllLayers(document.layers);
        var n = countSelectableOnArtboard(document, abIndex);
        restoreLayerLocks(stack);
        return n;
    }

    function visitItemsOnArtboard(document, abIndex, visitor) {
        var rect = document.artboards[abIndex].artboardRect;
        var state = { count: 0, stop: false };

        function walkItem(item, layerLocked) {
            if (state.stop) return;
            state.count++;
            if (state.count > ITEM_VISIT_LIMIT) {
                state.stop = true;
                return;
            }

            var b;
            try {
                b = item.geometricBounds;
                if (!boundsOverlap(rect, b)) return;
            } catch (e) {
                return;
            }

            visitor(item, layerLocked);

            if (item.typename === "GroupItem" && item.pageItems.length) {
                var k;
                for (k = 0; k < item.pageItems.length; k++) {
                    walkItem(item.pageItems[k], layerLocked);
                }
            }
        }

        function walkLayers(layers, parentLocked) {
            var i;
            var j;
            var layer;
            var layerLocked;
            if (state.stop) return;
            for (i = 0; i < layers.length; i++) {
                layer = layers[i];
                layerLocked = parentLocked || layer.locked;
                for (j = 0; j < layer.pageItems.length; j++) {
                    walkItem(layer.pageItems[j], layerLocked);
                    if (state.stop) return;
                }
                if (layer.layers.length) {
                    walkLayers(layer.layers, layerLocked);
                }
            }
        }

        walkLayers(document.layers, false);
        return !state.stop;
    }

    function scanArtboardIssues(document, abIndex) {
        var stats = { locked: 0, hidden: 0, lockedLayers: 0 };
        var scanOk;

        scanOk = visitItemsOnArtboard(document, abIndex, function (item, layerLocked) {
            // 只計算個別物件鎖定/隱藏，圖層鎖定由腳本自動處理不計入
            if (item.locked) stats.locked++;
            if (item.hidden) stats.hidden++;
        });

        if (!scanOk) {
            return { ok: false, stats: stats };
        }

        // 移除圖層鎖定的額外計算（圖層解鎖由 snapshotLayerLocks 自動處理）

        return { ok: true, stats: stats };
    }

    function scanCopyIssues(document, indexes) {
        if (indexes.length > SCAN_MAX_ARTBOARDS) {
            return {
                locked: 0,
                hidden: 0,
                lines: [],
                hasIssues: false,
                skipped: true,
                skipReason:
                    "已选 " + indexes.length + " 个画板，为加快速度跳过锁定/隐藏检查。"
            };
        }

        var totalLocked = 0;
        var totalHidden = 0;
        var lines = [];
        var i;
        var idx;
        var abStats;

        for (i = 0; i < indexes.length; i++) {
            idx = indexes[i];
            var abResult = scanArtboardIssues(document, idx);
            if (!abResult.ok) {
                return {
                    locked: 0,
                    hidden: 0,
                    lines: [],
                    hasIssues: false,
                    skipped: true,
                    skipReason: "文件对象过多，已跳过锁定/隐藏检查。"
                };
            }
            abStats = abResult.stats;
            if (abStats.locked > 0 || abStats.hidden > 0) {
                lines.push(
                    "画板 " +
                        (idx + 1) +
                        "：锁定 " +
                        abStats.locked +
                        "、隐藏 " +
                        abStats.hidden
                );
            }
            totalLocked += abStats.locked;
            totalHidden += abStats.hidden;
        }

        return {
            locked: totalLocked,
            hidden: totalHidden,
            lines: lines,
            hasIssues: totalLocked > 0 || totalHidden > 0,
            skipped: false
        };
    }

    function prepareItemsOnArtboards(document, indexes) {
        var re = new RegExp(NOTE_LOCKED + "|" + NOTE_HIDDEN, "gi");
        var i;
        var idx;

        for (i = 0; i < indexes.length; i++) {
            idx = indexes[i];
            visitItemsOnArtboard(document, idx, function (item, layerLocked) {
                try {
                    item.note = item.note.replace(re, "");
                    if (item.locked || layerLocked) {
                        item.locked = false;
                        item.note += NOTE_LOCKED;
                    }
                    if (item.hidden) {
                        item.hidden = false;
                        item.note += NOTE_HIDDEN;
                    }
                } catch (e) {}
            });
        }
    }

    function restoreItemsOnArtboards(document, indexes) {
        var re = new RegExp(NOTE_LOCKED + "|" + NOTE_HIDDEN, "gi");
        var i;
        var idx;

        for (i = 0; i < indexes.length; i++) {
            idx = indexes[i];
            visitItemsOnArtboard(document, idx, function (item) {
                try {
                    if (item.note.indexOf(NOTE_LOCKED) >= 0) {
                        item.note = item.note.replace(re, "");
                        item.locked = true;
                    }
                    if (item.note.indexOf(NOTE_HIDDEN) >= 0) {
                        item.note = item.note.replace(re, "");
                        item.hidden = true;
                    }
                } catch (e) {}
            });
        }
    }

    function duplicateAndMoveArtwork(document, srcIdx, dx, dy) {
        document.artboards.setActiveArtboardIndex(srcIdx);
        document.selectObjectsOnActiveArtboard();

        var dupItems = [];
        var i;
        var docCS = CoordinateSystem.DOCUMENTCOORDINATESYSTEM;
        var abCS = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
        var isDoc = app.coordinateSystem === docCS;

        // 只複製頂層物件（不深入群組內部），保留圖層結構
        for (i = 0; i < selection.length; i++) {
            try {
                dupItems.push(selection[i].duplicate());
            } catch (e) {}
        }
        selection = null;

        for (i = 0; i < dupItems.length; i++) {
            try {
                var pos = isDoc
                    ? dupItems[i].position
                    : document.convertCoordinate(dupItems[i].position, docCS, abCS);
                dupItems[i].position = [pos[0] + dx, pos[1] + dy];
            } catch (e2) {}
        }

        return dupItems.length;
    }

    function toFloat(value, fallback) {
        var n = parseFloat(String(value).replace(/,/g, "."));
        return isNaN(n) ? fallback : n;
    }

    function buildCopyName(originalName, nameOpts) {
        var name = originalName;
        var findText = trimText(nameOpts.findText);

        if (findText !== "") {
            if (nameOpts.useRegex) {
                name = name.replace(new RegExp(findText, "g"), nameOpts.replaceText);
            } else {
                name = name.split(findText).join(nameOpts.replaceText);
            }
        }

        return name;
    }

    function duplicateArtboardsToBelow(document, sourceIndexes, nameOpts, layoutOpts) {
        var base = measureDocumentLayout(document);
        if (!base || !layoutOpts) return 0;

        var sorted = sortIndexesVisual(document, sourceIndexes, base.rowTol);
        var selBounds = getSelectionBounds(document, sorted);
        var anchorTop = base.minBottom - layoutOpts.vGap - layoutOpts.offsetY;
        var anchorLeft = base.minLeft + layoutOpts.offsetX;
        var created = 0;
        var savedCoord = app.coordinateSystem;
        var savedAbIdx = document.artboards.getActiveArtboardIndex();
        var i;
        var srcIdx;
        var srcAb;
        var srcM;
        var relX;
        var relY;
        var newTop;
        var newLeft;
        var newRect;
        var newAb;
        var dx;
        var dy;
        var copied;

        for (i = 0; i < sorted.length; i++) {
            srcIdx = sorted[i];
            srcAb = document.artboards[srcIdx];
            srcM = getMetrics(srcAb);
            relX = srcM.left - selBounds.minLeft;
            relY = selBounds.maxTop - srcM.top;
            newTop = anchorTop - relY;
            newLeft = anchorLeft + relX;
            newRect = [newLeft, newTop, newLeft + srcM.width, newTop - srcM.height];

            dx = newLeft - srcM.left;
            dy = newTop - srcM.top;

            copied = duplicateAndMoveArtwork(document, srcIdx, dx, dy);

            try {
                newAb = document.artboards.add(newRect);
                newAb.name = buildCopyName(srcAb.name, nameOpts);
            } catch (eAb) {
                throw new Error("无法创建画板 " + (srcIdx + 1) + "，请检查排版间距是否过大。");
            }

            created++;
        }

        try {
            document.artboards.setActiveArtboardIndex(savedAbIdx);
        } catch (eRestore) {}
        app.coordinateSystem = savedCoord;
        return created;
    }

    function repeatChar(ch, count) {
        var s = "";
        var c;
        for (c = 0; c < count; c++) {
            s += ch;
        }
        return s;
    }

    function addArtboardListRow(lb, abIndex) {
        var label = (abIndex + 1) + "  |  " + doc.artboards[abIndex].name;
        var item = lb.add("item", label);
        try {
            if (item.subItems && item.subItems.length > 0) {
                item.subItems[0].text = repeatChar("\u00A0", 64);
            }
        } catch (e) {}
    }

    // ==========================
    // UI
    // ==========================
        var prefs = loadPrefs("duplicate.json", {findText:"FR_",replaceText:"xx_",hGap:"20",vGap:"20",offsetX:"0",offsetY:"0"});
    // ── 設定持久化（_shared.jsx）──

    var dlg = new Window("dialog", "复制画板 v" + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 4;
    dlg.margins = 10;
    try { dlg.properties = { resizeable: true }; } catch (e) {}
    try { dlg.resizeable = true; } catch (e) {}

    var activeIndex = doc.artboards.getActiveArtboardIndex();
    var totalArtboards = doc.artboards.length;
    var syncingRange = false;
    var docLayout = measureDocumentLayout(doc);

    var targetPanel = dlg.add("panel", undefined, "1. 选择画板");
    targetPanel.orientation = "column";
    targetPanel.alignChildren = "fill";
    targetPanel.margins = [10, 12, 10, 8];
    targetPanel.spacing = 4;

    targetPanel.add(
        "statictext",
        undefined,
        "Shift 多选或输入范围（如 1-5, 8, 11-13）。复制后放在现有画板正下方，间距自动沿用。",
        { multiline: true }
    );

    var LIST_W = 400;
    var LIST_H = 260;
    var listbox = targetPanel.add("listbox", undefined, undefined, {
        multiselect: true,
        numberOfColumns: 2,
        showHeaders: false,
        columnWidths: [260, 140]
    });
    listbox.preferredSize = [LIST_W, LIST_H];
    listbox.itemSize = [LIST_W, 22];
    var listIndexes = [];

    for (var ab = 0; ab < totalArtboards; ab++) {
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
    rangeInput.characters = 26;
    var selectAllBtn = rangeRow.add("button", undefined, "全部");

    var namePanel = dlg.add("panel", undefined, "2. 名称编辑");
    namePanel.orientation = "column";
    namePanel.alignChildren = "fill";
    namePanel.margins = [8, 8, 8, 6];

    var renameCheckbox = namePanel.add("checkbox", undefined, "重命名复制的画板");

    function addOptionRow(parent, label, defaultValue, chars, labelWidth) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = labelWidth || 72;
        var input = row.add("edittext", undefined, defaultValue);
        input.characters = chars || 18;
        return input;
    }

    var findInput = addOptionRow(namePanel, "查找", prefs.findText, 14);
    var replaceInput = addOptionRow(namePanel, "替换为", prefs.replaceText, 14);
    findInput.enabled = false;
    replaceInput.enabled = false;

    var namePreviewText = namePanel.add("statictext", undefined, "（未启用重命名，画板保留原名）", { multiline: true });
    namePreviewText.preferredSize = [460, 20];

    renameCheckbox.onClick = function () {
        var en = renameCheckbox.value;
        findInput.enabled = en;
        replaceInput.enabled = en;
        updateSummary();
    };

    var layoutPanel = dlg.add("panel", undefined, "3. 位置与间距（自动检测，可微调）");
    layoutPanel.orientation = "column";
    layoutPanel.alignChildren = "fill";
    layoutPanel.margins = [8, 8, 8, 6];
    layoutPanel.spacing = 2;

    var summaryText = layoutPanel.add("statictext", undefined, "", { multiline: true });

    function addLayoutRow(parent, label, defaultValue, labelWidth) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = labelWidth || 88;
        var input = row.add("edittext", undefined, defaultValue);
        input.characters = 10;
        row.add("statictext", undefined, "pt");
        return input;
    }

    var gapPanel = layoutPanel.add("panel", undefined, "间距");
    gapPanel.orientation = "column";
    gapPanel.alignChildren = "fill";
    gapPanel.margins = [6, 5, 6, 5];
    gapPanel.spacing = 2;

    var gapRow = gapPanel.add("group");
    gapRow.orientation = "row";
    gapRow.alignChildren = ["left", "center"];

    var hGapInput = addLayoutRow(gapRow, "左右间距", prefs.hGap, 72);
    var vGapInput = addLayoutRow(gapRow, "上下间距", prefs.vGap, 72);

    var offsetPanel = layoutPanel.add("panel", undefined, "整体位移");
    offsetPanel.orientation = "column";
    offsetPanel.alignChildren = "fill";
    offsetPanel.margins = [6, 5, 6, 5];
    offsetPanel.spacing = 2;

    var offsetRow = offsetPanel.add("group");
    offsetRow.orientation = "row";
    offsetRow.alignChildren = ["left", "center"];

    var offsetXInput = addLayoutRow(offsetRow, "左右位移", prefs.offsetX, 72);
    var offsetYInput = addLayoutRow(offsetRow, "向下位移", prefs.offsetY, 72);

    var resetLayoutBtn = layoutPanel.add("button", undefined, "重置检测值");
    resetLayoutBtn.alignment = "right";

    function fillDetectedLayout() {
        if (!docLayout) return;
        hGapInput.text = String(Math.round(docLayout.hGap * 10) / 10);
        vGapInput.text = String(Math.round(docLayout.vGap * 10) / 10);
        offsetXInput.text = "0";
        offsetYInput.text = "0";
    }

    function getLayoutOptionsFromUI() {
        var fallbackH = docLayout ? docLayout.hGap : 20;
        var fallbackV = docLayout ? docLayout.vGap : 20;
        return {
            hGap: toFloat(hGapInput.text, fallbackH),
            vGap: toFloat(vGapInput.text, fallbackV),
            offsetX: toFloat(offsetXInput.text, 0),
            offsetY: toFloat(offsetYInput.text, 0)
        };
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

    function clearListSelection() {
        var ci;
        for (ci = 0; ci < listbox.items.length; ci++) {
            listbox.items[ci].selected = false;
        }
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

    function formatRangePart(start, end) {
        var a = start + 1;
        var b = end + 1;
        return a === b ? String(a) : a + "-" + b;
    }

    function getTargetIndexes() {
        var rangeText = trimText(rangeInput.text);
        if (rangeText !== "") {
            var fromRange = parseArtboardRange(rangeText, totalArtboards);
            if (fromRange.length > 0) return fromRange;
        }
        return getIndexesFromList(listbox, listIndexes);
    }

    function updateSummary() {
        var indexes = getTargetIndexes();
        if (!docLayout) {
            summaryText.text = "无法分析画板排版";
            namePreviewText.text = "";
            return;
        }
        if (indexes.length === 0) {
            summaryText.text = "未选择画板";
            namePreviewText.text = "";
            return;
        }

        var opts = getLayoutOptionsFromUI();

        summaryText.text =
            "将复制 " +
            indexes.length +
            " 个画板到网格下方，检测约 " +
            docLayout.cols +
            " 列 × " +
            docLayout.rows +
            " 行\n当前间距：左右 " +
            Math.round(opts.hGap) +
            " pt，上下 " +
            Math.round(opts.vGap) +
            " pt，位移：右 " +
            Math.round(opts.offsetX) +
            " 下 " +
            Math.round(opts.offsetY) +
            " pt";

        if (renameCheckbox && renameCheckbox.value) {
            var nameOpts = getNameOptionsFromUI();
            var sampleIdx = indexes[0];
            var sampleOld = doc.artboards[sampleIdx].name;
            var sampleNew = buildCopyName(sampleOld, nameOpts);
            namePreviewText.text = "例：" + sampleOld + " → " + sampleNew;
        } else if (renameCheckbox) {
            namePreviewText.text = "（未启用重命名，画板保留原名）";
        }
    }

    function getNameOptionsFromUI() {
        if (!renameCheckbox.value) {
            return { findText: "", replaceText: "", useRegex: false };
        }
        return {
            findText: findInput.text,
            replaceText: replaceInput.text,
            useRegex: false
        };
    }

    function syncRangeFromList() {
        if (syncingRange) return;
        var indexes = getIndexesFromList(listbox, listIndexes);
        syncingRange = true;
        if (indexes.length > 0) {
            rangeInput.text = indexesToRangeText(indexes);
        } else {
            rangeInput.text = "";
        }
        syncingRange = false;
        updateSummary();
    }

    listbox.onClick = syncRangeFromList;
    listbox.onChange = syncRangeFromList;
    rangeInput.onChanging = updateSummary;
    hGapInput.onChanging = updateSummary;
    vGapInput.onChanging = updateSummary;
    offsetXInput.onChanging = updateSummary;
    offsetYInput.onChanging = updateSummary;
    findInput.onChanging = updateSummary;
    replaceInput.onChanging = updateSummary;

    resetLayoutBtn.onClick = function () {
        fillDetectedLayout();
        updateSummary();
    };

    selectAllBtn.onClick = function () {
        syncingRange = true;
        clearListSelection();
        rangeInput.text = "all";
        syncingRange = false;
        updateSummary();
    };

    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";

    var cancelBtn = btnGroup.add("button", undefined, "取消", { name: "cancel" });
    var okBtn = btnGroup.add("button", undefined, "复制", { name: "ok" });

    cancelBtn.onClick = function () {
        var b = dlg.bounds;
        savePrefs("duplicate_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    okBtn.onClick = function () {
        var indexes = getTargetIndexes();
        if (indexes.length === 0) {
            alert("请先选择要复制的画板");
            return;
        }

        var nameOpts = getNameOptionsFromUI();
        var layoutOpts = getLayoutOptionsFromUI();
        var report = scanCopyIssues(doc, indexes);
        var restoreAfterCopy = false;
        var skipNote = "";

        if (report.skipped && report.skipReason) {
            skipNote = report.skipReason;
        }

        if (report.hasIssues) {
            var msg =
                "复制范围内检测到：\n" +
                "· 锁定对象 " +
                report.locked +
                " 个\n" +
                "· 隐藏对象 " +
                report.hidden +
                " 个\n\n" +
                "这些对象通常不会被复制。\n\n";
            if (report.lines.length > 0 && report.lines.length <= 8) {
                msg += report.lines.join("\n") + "\n\n";
            } else if (report.lines.length > 8) {
                msg += report.lines.slice(0, 8).join("\n") + "\n…\n\n";
            }
            msg += "按「确定」= 临时解锁并显示后复制（完成后恢复原状态）\n按「取消」= 中止复制";

            if (!confirm(msg)) {
                return;
            }
            restoreAfterCopy = true;
        }

        savePrefs("duplicate.json", {findText:findInput.text,replaceText:replaceInput.text,hGap:hGapInput.text,vGap:vGapInput.text,offsetX:offsetXInput.text,offsetY:offsetYInput.text});
        var b = dlg.bounds;
        savePrefs("duplicate_pos.json", { x: b[0], y: b[1] });
                dlg.close();

        var oldLevel = app.userInteractionLevel;
        app.userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;

        var layerLockStack = [];
        var count = 0;

        snapshotLayerLocks(doc.layers, layerLockStack);
        unlockLayers(doc.layers);

        try {
            if (restoreAfterCopy) {
                prepareItemsOnArtboards(doc, indexes);
            }
            count = duplicateArtboardsToBelow(doc, indexes, nameOpts, layoutOpts);
        } catch (err) {
            if (restoreAfterCopy) {
                restoreItemsOnArtboards(doc, indexes);
            }
            restoreLayerLocks(layerLockStack);
            app.userInteractionLevel = oldLevel;
            alert("复制失败：\n" + err);
            return;
        }

        if (restoreAfterCopy) {
            restoreItemsOnArtboards(doc, indexes);
        }
        restoreLayerLocks(layerLockStack);

        app.userInteractionLevel = oldLevel;

        // 取消選取複製後的物件
        try { app.executeMenuCommand("deselectall"); } catch (e) {}
    };

    fillDetectedLayout();
    syncRangeFromList();
    updateSummary();
    var pos = loadPos("duplicate_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();
})();
