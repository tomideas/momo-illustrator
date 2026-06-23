#target illustrator

// 溢出诊断 v4：检查行宽溢出 + stripWS diff
(function () {
    if (app.documents.length === 0) { alert("请先打开文件"); return; }

    var doc = app.activeDocument;
    var AREA_TEXT_KIND = 0;
    try { AREA_TEXT_KIND = TextType.AREATEXT; } catch (e) {}

    function stripWS(s) {
        return String(s).replace(/[\x00-\x1F\x7F\s]/g, "");
    }

    var allFrames = [];
    for (var i = 0; i < doc.textFrames.length; i++) {
        var tf = doc.textFrames[i];
        try {
            var kind = null;
            try { kind = tf.kind; } catch (e) {}
            if (kind !== AREA_TEXT_KIND) continue;
            var len = 0;
            try { len = String(tf.contents).length; } catch (e) {}
            allFrames.push({ tf: tf, len: len });
        } catch (e) {}
    }
    allFrames.sort(function (a, b) { return b.len - a.len; });

    var report = "=== 溢出诊断 v4（stripWS + 行宽检查）===\n";
    report += "当前 TOLERANCE = 4\n\n";

    var shown = 0;
    for (var j = 0; j < allFrames.length && shown < 15; j++) {
        var tf2 = allFrames[j].tf;
        shown++;

        var rawContents = "";
        try { rawContents = String(tf2.contents); } catch (e) {}

        var totalRaw = rawContents.length;
        var totalStripped = stripWS(rawContents).length;

        var visibleRaw = 0;
        var visibleStripped = 0;
        var lineCount = 0;
        try { lineCount = tf2.lines.length; } catch (e) {}

        // Check horizontal overflow
        var hOverflow = false;
        var hOverflowLines = 0;
        var frameWidth = 0;
        try {
            var gb = tf2.geometricBounds;
            frameWidth = gb[2] - gb[0];
            for (var k = 0; k < lineCount; k++) {
                try {
                    var lineCS = 0;
                    try { lineCS = stripWS(tf2.lines[k].contents).length; } catch (e) {}
                    var lineBounds = tf2.lines[k].geometricBounds;
                    if (lineBounds && (lineBounds[2] - lineBounds[0]) > frameWidth + 1) {
                        hOverflow = true;
                        hOverflowLines++;
                    }
                    visibleRaw += String(tf2.lines[k].contents).length;
                    visibleStripped += lineCS;
                } catch (e) {}
            }
        } catch (e) {}

        var diffStripped = totalStripped - visibleStripped;
        var flags = [];
        if (diffStripped > 4) flags.push("⚠ 垂直溢出");
        else if (diffStripped > 0) flags.push("差值(正常)");
        if (hOverflow) flags.push("⚠ 行宽溢出(" + hOverflowLines + "行)");
        var flagStr = flags.length ? "  ← " + flags.join(", ") : "";

        report += "── 框 " + shown + "（raw長度=" + totalRaw + "）──\n";
        report += "  前40字: " + rawContents.replace(/[\x00-\x1F\x7F]/g, "·").replace(/\s+/g," ").substring(0, 40) + "\n";
        report += "  lines: " + lineCount + "  frameW: " + Math.round(frameWidth) + "\n";
        report += "  raw:      contents=" + totalRaw + "  lines=" + visibleRaw + "  diff=" + (totalRaw-visibleRaw) + "\n";
        report += "  stripped: contents=" + totalStripped + "  lines=" + visibleStripped + "  diff=" + diffStripped + flagStr + "\n\n";
    }

    report += "总计 " + allFrames.length + " 个 Area Text 框";

    var dlg = new Window("dialog", "溢出诊断 v4");
    dlg.orientation = "column"; dlg.alignChildren = "fill"; dlg.margins = 10;
    var box = dlg.add("edittext", undefined, report, { multiline: true, scrolling: true });
    box.preferredSize = [560, 520];
    dlg.add("button", undefined, "关闭", { name: "ok" }).onClick = function () { dlg.close(); };
    dlg.center(); dlg.show();
})();
