#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    if (app.documents.length === 0) {
        alert("请先打开 Illustrator 文件。");
        return;
    }

    var doc = app.activeDocument;

    // ==========================
    // 固定默认设置
    // ==========================
    var FIXED_LAYER_NAME = "Page Numbers";
    var FIXED_FONT_NAME = "";

    // ==========================
    // Helper functions
    // ==========================
    function trimText(s) {
        return String(s).replace(/^\s+|\s+$/g, "");
    }

    function toInt(value, fallback) {
        var n = parseInt(value, 10);
        return isNaN(n) ? fallback : n;
    }

    function toFloat(value, fallback) {
        var n = parseFloat(value);
        return isNaN(n) ? fallback : n;
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

    function safeGetFont(fontName) {
        fontName = trimText(fontName);
        if (fontName === "") return null;

        try {
            return app.textFonts.getByName(fontName);
        } catch (e) {
            return null;
        }
    }

    function removeLayerByName(doc, layerName) {
        try {
            var layer = doc.layers.getByName(layerName);
            layer.locked = false;
            layer.visible = true;
            layer.remove();
        } catch (e) {}
    }

    function getOrCreateLayer(doc, layerName) {
        try {
            return doc.layers.getByName(layerName);
        } catch (e) {
            var layer = doc.layers.add();
            layer.name = layerName;
            return layer;
        }
    }

    function applyTextAlign(textFrame, alignIndex) {
        try {
            if (alignIndex === 0) textFrame.textRange.paragraphAttributes.justification = Justification.LEFT;
            if (alignIndex === 1) textFrame.textRange.paragraphAttributes.justification = Justification.CENTER;
            if (alignIndex === 2) textFrame.textRange.paragraphAttributes.justification = Justification.RIGHT;
        } catch (e) {}
    }

    function applyTextColor(textFrame, grayValue) {
        grayValue = Math.max(0, Math.min(100, grayValue));

        try {
            var gray = new GrayColor();
            gray.gray = grayValue;
            textFrame.textRange.characterAttributes.fillColor = gray;
        } catch (e) {}
    }

    function buildPageText(pageNumber, totalArtboards, styleIndex, customText) {
        // styleIndex:
        // 0 = 1
        // 1 = 1 / 90
        // 2 = 第 1 页
        // 3 = Page 1
        // 4 = 自定义
        if (styleIndex === 0) return String(pageNumber);
        if (styleIndex === 1) return pageNumber + " / " + totalArtboards;
        if (styleIndex === 2) return "第 " + pageNumber + " 页";
        if (styleIndex === 3) return "Page " + pageNumber;

        var text = customText;
        text = text.replace(/\{page\}/g, pageNumber);
        text = text.replace(/\{total\}/g, totalArtboards);
        return text;
    }

    function getSelectedStyleIndex() {
        if (stylePlain.value) return 0;
        if (styleTotal.value) return 1;
        if (styleChinese.value) return 2;
        if (styleCustom.value) return 4;
        return 1;
    }

    function addPageNumbers(options) {
        var totalArtboards = doc.artboards.length;
        var selectedIndexes = parseArtboardRange(options.rangeText, totalArtboards);

        if (selectedIndexes.length === 0) {
            alert("画板范围无效。\n请输入 all、1-10、1,3 等。");
            return;
        }

        if (options.removeOld) {
            removeLayerByName(doc, options.layerName);
        }

        var pageLayer = getOrCreateLayer(doc, options.layerName);
        pageLayer.locked = false;
        pageLayer.visible = true;

        var fontObj = safeGetFont(options.fontName);
        var createdCount = 0;

        for (var i = 0; i < selectedIndexes.length; i++) {
            var artboardIndex = selectedIndexes[i];
            var artboard = doc.artboards[artboardIndex];
            var rect = artboard.artboardRect;

            var left = rect[0];
            var top = rect[1];
            var right = rect[2];
            var bottom = rect[3];

            var pageNumber;
            if (options.useArtboardNumber) {
                pageNumber = artboardIndex + 1;
            } else {
                pageNumber = options.startNumber + i;
            }

            var content = buildPageText(
                pageNumber,
                totalArtboards,
                options.styleIndex,
                options.customText
            );

            var tf = pageLayer.textFrames.add();
            tf.contents = content;
            tf.textRange.characterAttributes.size = options.fontSize;

            if (fontObj !== null) {
                try {
                    tf.textRange.characterAttributes.textFont = fontObj;
                } catch (e2) {}
            }

            applyTextAlign(tf, options.alignIndex);
            applyTextColor(tf, options.grayValue);

            // 临时定位，用于计算文字宽高
            tf.position = [left, top];

            var textW = tf.width;
            var textH = tf.height;
            var x = left;
            var y = top;

            /*
                Illustrator 的 textFrame.position 接近文字对象左上坐标。
                底部位置要加 textH，文字才会完整留在画板内。
            */

            // positionIndex:
            // 0 Bottom Center, 1 Bottom Right, 2 Bottom Left,
            // 3 Top Center, 4 Top Right, 5 Top Left,
            // 6 Center
            if (options.positionIndex === 0) {
                x = (left + right) / 2 - textW / 2;
                y = bottom + options.marginY + textH;
            } else if (options.positionIndex === 1) {
                x = right - textW - options.marginX;
                y = bottom + options.marginY + textH;
            } else if (options.positionIndex === 2) {
                x = left + options.marginX;
                y = bottom + options.marginY + textH;
            } else if (options.positionIndex === 3) {
                x = (left + right) / 2 - textW / 2;
                y = top - options.marginY;
            } else if (options.positionIndex === 4) {
                x = right - textW - options.marginX;
                y = top - options.marginY;
            } else if (options.positionIndex === 5) {
                x = left + options.marginX;
                y = top - options.marginY;
            } else if (options.positionIndex === 6) {
                x = (left + right) / 2 - textW / 2;
                y = (top + bottom) / 2 + textH / 2;
            }

            tf.position = [x, y];
            createdCount++;
        }
    }

    // ==========================
    // UI
    // ==========================
        var prefs = loadPrefs("page_numbers.json", {range:"all",startNum:"1",styleIdx:1,customText:"{page} / {total}",posIdx:0,alignIdx:1,marginX:"24",marginY:"8",fontSize:"10",gray:"100",useAbNum:false,removeOld:true});

    // ── 設定持久化（_shared.jsx）──

    var dlg = new Window("dialog", "批量页码");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.spacing = 10;
    dlg.margins = 14;

    function addInputRow(parent, label, defaultValue, chars, labelWidth) {
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];

        var labelText = group.add("statictext", undefined, label);
        labelText.preferredSize.width = labelWidth || 165;

        var input = group.add("edittext", undefined, defaultValue);
        input.characters = chars || 20;

        return input;
    }

    function addHelp(parent, text) {
        var help = parent.add("statictext", undefined, text);
        help.graphics.font = ScriptUI.newFont(help.graphics.font.name, "REGULAR", 10);
        return help;
    }

    // 1. 画板
    var rangePanel = dlg.add("panel", undefined, "1. 画板");
    rangePanel.orientation = "column";
    rangePanel.alignChildren = "fill";
    rangePanel.margins = 12;

    var rangeInput = addInputRow(rangePanel, "范围", prefs.range, 24);
    addHelp(rangePanel, "all = 全部 · 1-10 · 1,3,5-8");

    var startNumberInput = addInputRow(rangePanel, "起始页码", prefs.startNum, 24);

    // 2. 样式
    var stylePanel = dlg.add("panel", undefined, "2. 样式");
    stylePanel.orientation = "column";
    stylePanel.alignChildren = "left";
    stylePanel.margins = 12;

    var styleRow1 = stylePanel.add("group");
    styleRow1.orientation = "row";
    styleRow1.alignChildren = ["left", "center"];

    var stylePlain = styleRow1.add("radiobutton", undefined, "1");
    var styleTotal = styleRow1.add("radiobutton", undefined, "1 / 90");
    var styleChinese = styleRow1.add("radiobutton", undefined, "第 1 页");
    styleTotal.value = true;

    var styleCustom = styleRow1.add("radiobutton", undefined, "自定义");
    var customInput = styleRow1.add("edittext", undefined, prefs.customText);
    customInput.characters = 18;
    customInput.enabled = false;

    function updateCustomInput() {
        customInput.enabled = styleCustom.value;
    }

    stylePlain.onClick = updateCustomInput;
    styleTotal.onClick = updateCustomInput;
    styleChinese.onClick = updateCustomInput;
    styleCustom.onClick = updateCustomInput;
    updateCustomInput();

    // 3. 位置与外观
    var layoutPanel = dlg.add("panel", undefined, "3. 位置与外观");
    layoutPanel.orientation = "column";
    layoutPanel.alignChildren = "fill";
    layoutPanel.margins = 12;

    var posGroup = layoutPanel.add("group");
    posGroup.orientation = "row";
    posGroup.alignChildren = ["left", "center"];
    var posLabel = posGroup.add("statictext", undefined, "位置");
    posLabel.preferredSize.width = 100;
    var positionList = posGroup.add("dropdownlist", undefined, [
        "底部居中",
        "右下角",
        "左下角",
        "顶部居中",
        "右上角",
        "左上角",
        "正中央"
    ]);
    positionList.selection = 0;

    var alignGroup = layoutPanel.add("group");
    alignGroup.orientation = "row";
    alignGroup.alignChildren = ["left", "center"];
    var alignLabel = alignGroup.add("statictext", undefined, "对齐");
    alignLabel.preferredSize.width = 100;
    var alignList = alignGroup.add("dropdownlist", undefined, [
        "左对齐",
        "居中",
        "右对齐"
    ]);
    alignList.selection = 1;

    var marginXInput = addInputRow(layoutPanel, "水平边距", prefs.marginX, 24, 100);
    var marginYInput = addInputRow(layoutPanel, "垂直边距", prefs.marginY, 24, 100);
    addHelp(layoutPanel, "边距越大越往内缩；底部位置已修正。");

    var fontSizeInput = addInputRow(layoutPanel, "字体大小", prefs.fontSize, 24, 100);
    var grayInput = addInputRow(layoutPanel, "灰度 0-100", prefs.gray, 24, 100);
    addHelp(layoutPanel, "灰度：100 = 黑色，0 = 白色。");

    // 4. 选项
    var optionPanel = dlg.add("panel", undefined, "4. 选项");
    optionPanel.orientation = "column";
    optionPanel.alignChildren = "left";
    optionPanel.margins = 12;

    var useArtboardCheck = optionPanel.add("checkbox", undefined, "跟随画板编号");
    useArtboardCheck.value = false;

    var removeOldCheck = optionPanel.add("checkbox", undefined, "删除旧图层");
    removeOldCheck.value = true;

    // Buttons
    var btnGroup = dlg.add("group");
    btnGroup.orientation = "row";
    btnGroup.alignment = "right";

    var cancelBtn = btnGroup.add("button", undefined, "取消", { name: "cancel" });
    var okBtn = btnGroup.add("button", undefined, "生成", { name: "ok" });

    cancelBtn.onClick = function () {
        var b = dlg.bounds; savePrefs("page_numbers_pos.json", { x: b[0], y: b[1] });
        dlg.close();
    };

    okBtn.onClick = function () {
        var rangeText = trimText(rangeInput.text);
        var startNumber = toInt(startNumberInput.text, 1);
        var fontSize = toFloat(fontSizeInput.text, 10);
        var marginX = toFloat(marginXInput.text, 24);
        var marginY = toFloat(marginYInput.text, 8);
        var grayValue = toFloat(grayInput.text, 100);
        var styleIndex = getSelectedStyleIndex();

        if (fontSize <= 0) {
            alert("字体大小必须大于 0。");
            return;
        }

        if (positionList.selection === null) {
            alert("请选择页码位置。");
            return;
        }

        if (alignList.selection === null) {
            alert("请选择文字对齐方式。");
            return;
        }

        savePrefs("page_numbers.json", {range:trimText(rangeInput.text),startNum:startNumberInput.text,styleIdx:getSelectedStyleIndex(),customText:customInput.text,posIdx:positionList.selection?positionList.selection.index:0,alignIdx:alignList.selection?alignList.selection.index:1,marginX:marginXInput.text,marginY:marginYInput.text,fontSize:fontSizeInput.text,gray:grayInput.text,useAbNum:useArtboardCheck.value,removeOld:removeOldCheck.value});
        var b = dlg.bounds; savePrefs("page_numbers_pos.json", { x: b[0], y: b[1] });
                dlg.close();

        addPageNumbers({
            layerName: FIXED_LAYER_NAME,
            rangeText: rangeText,
            startNumber: startNumber,
            fontSize: fontSize,
            fontName: FIXED_FONT_NAME,
            styleIndex: styleIndex,
            customText: customInput.text,
            positionIndex: positionList.selection.index,
            alignIndex: alignList.selection.index,
            marginX: marginX,
            marginY: marginY,
            grayValue: grayValue,
            useArtboardNumber: useArtboardCheck.value,
            removeOld: removeOldCheck.value
        });
    };

    var pos = loadPos("page_numbers_pos.json");
    try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
    dlg.show();
})();
