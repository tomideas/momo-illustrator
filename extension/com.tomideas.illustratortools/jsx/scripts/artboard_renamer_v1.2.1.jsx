#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var SCRIPT_VERSION = "1.2.1";

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

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : n;
    }

    /** 填 1=一位(0~9)  2=两位(00)  3=三位(000)；也可直接填 00、000 */
    function parsePadPattern(padText) {
        padText = trimText(padText);
        if (padText === "") return 1;
        if (/^0+$/.test(padText)) return padText.length;
        var n = toInt(padText, 1);
        return n >= 1 ? n : 1;
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

    function padNumber(num, width) {
        var s = String(num);
        while (s.length < width) {
            s = "0" + s;
        }
        return s;
    }

    function applyTemplate(template, ctx) {
        var text = template;
        text = text.replace(/\{n\}/g, ctx.seq);
        text = text.replace(/\{i\}/g, ctx.index);
        text = text.replace(/\{name\}/g, ctx.oldName);
        return text;
    }

    function buildNames(indexes, options) {
        var names = [];
        var mode = options.mode;

        for (var i = 0; i < indexes.length; i++) {
            var idx = indexes[i];
            var oldName = doc.artboards[idx].name;
            var newName = oldName;

            if (mode === 0) {
                var seqNum = options.startNumber + i;
                var seqText = padNumber(seqNum, options.padWidth);
                newName = applyTemplate(options.template, {
                    seq: seqText,
                    index: String(idx + 1),
                    oldName: oldName
                });
            } else if (mode === 1) {
                newName = oldName;
                if (options.findText !== "") {
                    if (options.useRegex) {
                        var re = new RegExp(options.findText, "g");
                        newName = oldName.replace(re, options.replaceText);
                    } else {
                        newName = oldName.split(options.findText).join(options.replaceText);
                    }
                }
            } else if (mode === 2) {
                newName = options.nameLines[i] || oldName;
            } else if (mode === 3) {
                newName = oldName + (options.suffix || "");
            }

            names.push(newName);
        }

        return names;
    }

    function renameArtboards(indexes, names) {
        for (var i = 0; i < indexes.length; i++) {
            var idx = indexes[i];
            var name = trimText(names[i]);
            if (name === "") continue;
            doc.artboards[idx].name = name;
        }
    }

    function indexesToRangeText(indexes) {
        if (!indexes.length) return "";
        var sorted = indexes.slice(0).sort(function (a, b) {
            return a - b;
        });
        var parts = [];
        var start = sorted[0];
        var prev = sorted[0];

        for (var i = 1; i < sorted.length; i++) {
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

    function getIndexesFromList(lb, indexMap) {
        var indexes = [];
        for (var i = 0; i < lb.items.length; i++) {
            if (lb.items[i].selected) {
                indexes.push(indexMap[i]);
            }
        }
        return indexes;
    }

    function syncListSelection(lb, indexMap, indexes) {
        var map = {};
        for (var i = 0; i < indexes.length; i++) {
            map[indexes[i]] = true;
        }
        for (var j = 0; j < lb.items.length; j++) {
            lb.items[j].selected = !!map[indexMap[j]];
        }
    }

    function buildPreviewText(indexes, names) {
        var lines = [];
        for (var i = 0; i < indexes.length; i++) {
            var idx = indexes[i];
            lines.push((idx + 1) + "  " + doc.artboards[idx].name + "  →  " + names[i]);
        }
        return lines.join("\n");
    }

    function parseNameLines(text, expectedCount) {
        var raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
        var lines = [];
        for (var i = 0; i < raw.length; i++) {
            lines.push(raw[i]);
        }
        while (lines.length < expectedCount) {
            lines.push("");
        }
        if (lines.length > expectedCount) {
            lines.length = expectedCount;
        }
        return lines;
    }

    function repeatChar(ch, count) {
        var s = "";
        for (var c = 0; c < count; c++) {
            s += ch;
        }
        return s;
    }

    /** 雙欄 + 尾端空白：讓整列都可點（ScriptUI 單欄常只能點到文字） */
    function addArtboardListRow(lb, abIndex) {
        var label = (abIndex + 1) + "  |  " + doc.artboards[abIndex].name;
        var item = lb.add("item", label);
        try {
            if (item.subItems && item.subItems.length > 0) {
                item.subItems[0].text = repeatChar("\u00A0", 64);
            }
        } catch (e) {}
        return item;
    }

    // ==========================
    // UI
    // ==========================
        var prefs = loadPrefs("renamer.json", {mode:0,template:"FR_{n}",startNum:"1",padPat:"1",findText:"",replaceText:"",suffix:"",useRegex:false});

    // ── 設定持久化（_shared.jsx）──

    var dlg = new Window("dialog", "画板更名 v" + SCRIPT_VERSION);
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 6;
    dlg.margins = 10;

    var activeIndex = doc.artboards.getActiveArtboardIndex();
    var totalArtboards = doc.artboards.length;
    var syncingRange = false;

    // --- Target ---
    var targetPanel = dlg.add("panel", undefined, "1. 目标画板");
    targetPanel.orientation = "column";
    targetPanel.alignChildren = "fill";
    targetPanel.margins = [10, 12, 10, 8];
    targetPanel.spacing = 4;

    targetPanel.add(
        "statictext",
        undefined,
        "点选列表写入范围（Shift 连选一段，Cmd 可加选）；也可直接输入范围。"
    );

    var LIST_W = 400;
    var LIST_H = 308;
    var listbox = targetPanel.add("listbox", undefined, undefined, {
        multiselect: true,
        numberOfColumns: 2,
        showHeaders: false,
        columnWidths: [260, 140]
    });
    listbox.preferredSize = [LIST_W, LIST_H];
    listbox.itemSize = [LIST_W, 22];
    listbox.alignment = ["fill", "top"];
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

    // --- Naming ---
    var modePanel = dlg.add("panel", undefined, "2. 命名规则");
    modePanel.orientation = "column";
    modePanel.alignChildren = "fill";
    modePanel.margins = [10, 12, 10, 8];
    modePanel.spacing = 4;

    var modeRow = modePanel.add("group");
    modeRow.orientation = "row";
    var modeTemplate = modeRow.add("radiobutton", undefined, "编号");
    var modeFind = modeRow.add("radiobutton", undefined, "替换");
    var modeLines = modeRow.add("radiobutton", undefined, "逐行");
    var modeSuffix = modeRow.add("radiobutton", undefined, "后缀");
    modeTemplate.value=(prefs.mode===0);modeFind.value=(prefs.mode===1);modeLines.value=(prefs.mode===2);modeSuffix.value=(prefs.mode===3);

    function addLabeledInput(parent, label, defaultValue, chars, labelWidth) {
        var row = parent.add("group");
        row.orientation = "row";
        row.alignChildren = ["left", "center"];
        row.add("statictext", undefined, label).preferredSize.width = labelWidth || 72;
        var input = row.add("edittext", undefined, defaultValue);
        input.characters = chars || 18;
        return input;
    }

    var modeBody = modePanel.add("group");
    modeBody.orientation = "stack";
    modeBody.alignChildren = "fill";
    modeBody.preferredSize = [400, 98];

    var templateGroup = modeBody.add("group");
    templateGroup.orientation = "column";
    templateGroup.alignChildren = "fill";
    templateGroup.spacing = 4;

    var templateInput = addLabeledInput(templateGroup, "编号格式", prefs.template, 20);
    var startNumberInput = addLabeledInput(templateGroup, "起始", prefs.startNum, 6);
    var padPatternInput = addLabeledInput(templateGroup, "位数", prefs.padPat, 6);
    templateGroup.add("statictext", undefined, "例：FR_{n} → FR_01, FR_02…  占位符：{n}=序号 {i}=画板号 {name}=原名");

    var findGroup = modeBody.add("group");
    findGroup.orientation = "column";
    findGroup.alignChildren = "fill";
    findGroup.spacing = 4;
    findGroup.visible = false;
    var findInput = addLabeledInput(findGroup, "查找", prefs.findText || "", 20);
    var replaceInput = addLabeledInput(findGroup, "替换为", prefs.replaceText || "", 20);
    var regexCheck = findGroup.add("checkbox", undefined, "正则匹配");
    regexCheck.value = prefs.useRegex;
    findGroup.add("statictext", undefined, "例：查找 FR_ 替换为 CN_ → FR_01 → CN_01  留空则不替换");

    var linesGroup = modeBody.add("group");
    linesGroup.orientation = "column";
    linesGroup.alignChildren = "fill";
    linesGroup.visible = false;
    linesGroup.add("statictext", undefined, "逐行输入新名称，顺序对应上方已选画板，空行保留原名");
    var linesInput = linesGroup.add("edittext", undefined, "", { multiline: true, scrolling: true });
    linesInput.preferredSize = [380, 56];

    var suffixGroup = modeBody.add("group");
    suffixGroup.orientation = "column";
    suffixGroup.alignChildren = "fill";
    suffixGroup.spacing = 4;
    suffixGroup.visible = false;
    var suffixInput = addLabeledInput(suffixGroup, "后缀文本", prefs.suffix || "", 20);
    suffixGroup.add("statictext", undefined, "在原名末尾追加固定文字。例：后缀 _v2 → FR_01_v2");

    // --- Preview ---
    var previewPanel = dlg.add("panel", undefined, "3. 预览");
    previewPanel.orientation = "column";
    previewPanel.alignChildren = "fill";
    previewPanel.margins = [10, 10, 10, 8];

    var previewText = previewPanel.add("edittext", undefined, "", { multiline: true, scrolling: true });
    previewText.readonly = true;
    previewText.preferredSize = [400, 72];

    function getTargetIndexes() {
        var rangeText = trimText(rangeInput.text);
        if (rangeText !== "") {
            var fromRange = parseArtboardRange(rangeText, totalArtboards);
            if (fromRange.length > 0) return fromRange;
        }
        return getIndexesFromList(listbox, listIndexes);
    }

    function clearListSelection() {
        for (var ci = 0; ci < listbox.items.length; ci++) {
            listbox.items[ci].selected = false;
        }
    }

    function collectOptions(indexes) {
        var mode = 0;
        if (modeFind.value) mode = 1;
        if (modeLines.value) mode = 2;
        if (modeSuffix.value) mode = 3;

        return {
            mode: mode,
            template: templateInput.text,
            startNumber: toInt(startNumberInput.text, 1),
            padWidth: parsePadPattern(padPatternInput.text),
            findText: findInput.text,
            replaceText: replaceInput.text,
            suffix: suffixInput.text,
            useRegex: regexCheck.value,
            nameLines: parseNameLines(linesInput.text, indexes.length)
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
        updatePreview();
    }

    function updateModeVisibility() {
        templateGroup.visible = modeTemplate.value;
        findGroup.visible = modeFind.value;
        linesGroup.visible = modeLines.value;
        suffixGroup.visible = modeSuffix.value;
        updatePreview();
    }

    function updatePreview() {
        var indexes = getTargetIndexes();
        if (indexes.length === 0) {
            previewText.text = "未选择画板";
            return;
        }
        var names = buildNames(indexes, collectOptions(indexes));
        previewText.text = indexes.length + " 个：\n" + buildPreviewText(indexes, names);
    }

    modeTemplate.onClick = updateModeVisibility;
    modeFind.onClick = updateModeVisibility;
    modeLines.onClick = updateModeVisibility;
    modeSuffix.onClick = updateModeVisibility;

    templateInput.onChanging = updatePreview;
    startNumberInput.onChanging = updatePreview;
    padPatternInput.onChanging = updatePreview;
    findInput.onChanging = updatePreview;
    replaceInput.onChanging = updatePreview;
    suffixInput.onChanging = updatePreview;
    regexCheck.onClick = updatePreview;
    linesInput.onChanging = updatePreview;

    listbox.onClick = syncRangeFromList;
    listbox.onChange = syncRangeFromList;
    listbox.onDoubleClick = syncRangeFromList;

    selectAllBtn.onClick = function () {
        syncingRange = true;
        clearListSelection();
        rangeInput.text = "all";
        syncingRange = false;
        updatePreview();
    };

    rangeInput.onChanging = updatePreview;

    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";

    var cancelBtn = btnGroup.add("button", undefined, "取消", { name: "cancel" });
    var okBtn = btnGroup.add("button", undefined, "更名", { name: "ok" });

    cancelBtn.onClick = function () {
        var b = dlg.bounds; savePrefs("renamer_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    okBtn.onClick = function () {
        var indexes = getTargetIndexes();
        if (indexes.length === 0) {
            alert("请先选择画板（列表点选或输入范围）");
            return;
        }

        var options = collectOptions(indexes);
        if (options.mode === 0 && trimText(options.template) === "") {
            alert("模板不能为空");
            return;
        }

        if (options.mode === 2) {
            var hasAny = false;
            for (var li = 0; li < options.nameLines.length; li++) {
                if (trimText(options.nameLines[li]) !== "") {
                    hasAny = true;
                    break;
                }
            }
            if (!hasAny) {
                alert("请至少输入一行新名称");
                return;
            }
        }

        if (options.mode === 3 && trimText(options.suffix) === "") {
            alert("后缀不能为空");
            return;
        }

        savePrefs("renamer.json", {mode:modeTemplate.value?0:modeFind.value?1:modeLines.value?2:3,template:templateInput.text,startNum:startNumberInput.text,padPat:padPatternInput.text,findText:findInput.text,replaceText:replaceInput.text,suffix:suffixInput.text,useRegex:regexCheck.value});
                renameArtboards(indexes, buildNames(indexes, options));
        var b = dlg.bounds; savePrefs("renamer_pos.json", { x: b[0], y: b[1] });
        dlg.close();
        alert("已更名 " + indexes.length + " 个画板");
    };

    syncRangeFromList();
    updateModeVisibility();
    var pos = loadPos("renamer_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();
})();
