#target illustrator

// ============================================================
// 溢出诊断（互動式逐框比對）
// 版本：3.0.1 (跟隨 check_overset_text v5.9.3)
//
// 流程：
//   1. 逐個選取 Area Text 框 + 縮放至該框
//   2. 顯示腳本判斷（v5.9.2 規則）
//   3. 問使用者：看實際畫面有沒有紅 + → Yes / No / 跳過 / 停止
//   4. 比對腳本判斷 vs 使用者判斷，找出 FP/FN
//   5. 輸出細節報告到 ~/Desktop/overset_diagnosis.txt
// ============================================================

(function () {
    var VERSION = "3.0.1";
    var TOLERANCE = 4;

    if (app.documents.length === 0) {         alert("请先打开文件。"); return; }

    var doc = app.activeDocument;
    var AREA = 0; try { AREA = TextType.AREATEXT; } catch (e) {}

    function stripWS(s) { return String(s).replace(/[\x00-\x1F\x7F\s]/g, ""); }
    function normContents(s) { return String(s).replace(/[\x03\r]/g, ""); }

    function sumLinesStrip(tf) {
        var v = 0;
        try { for (var i = 0; i < tf.lines.length; i++) {
            try { v += stripWS(tf.lines[i].contents).length; } catch (e) {}
        } } catch (e) {}
        return v;
    }

    function m8Probe(tf) {
        var orig = normContents(tf.contents);
        if (!orig.length) return false;
        var grp = null;
        try {
            grp = tf.parent.groupItems.add();
            var dup = tf.duplicate(grp, ElementPlacement.PLACEATEND);
            dup.convertAreaObjectToPointObject();
            var conv = normContents(grp.pageItems[0].contents);
            grp.remove();
            return orig !== conv;
        } catch (e) {
            try { if (grp) grp.remove(); } catch (e2) {}
            return false;
        }
    }

    function m12Probe(tf) {
        try {
            var paras = tf.paragraphs.length;
            var effective = paras - 1; // 扣除隱式末段符
            if (effective < 2) return false;
            var gb = tf.geometricBounds;
            var frameH = gb[1] - gb[3];
            if (frameH <= 0) return false;
            var leading = 0;
            try { leading = tf.textRange.characterAttributes.leading; } catch (e) {}
            if (!leading || leading <= 0) {
                try { leading = tf.textRange.characterAttributes.size * 1.2; } catch (e) {}
            }
            if (!leading || leading <= 0) return false;
            return (effective * leading) > (frameH + leading * 0.6);
        } catch (e) { return false; }
    }

    function abOf(tf) {
        try {
            var b = tf.geometricBounds;
            var cx = (b[0]+b[2])/2, cy = (b[1]+b[3])/2;
            for (var i = 0; i < doc.artboards.length; i++) {
                var r = doc.artboards[i].artboardRect;
                if (cx >= r[0] && cx <= r[2] && cy <= r[1] && cy >= r[3]) return i+1;
            }
        } catch (e) {}
        return "外";
    }

    function escTxt(s) {
        return String(s).replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\x03/g, "\\x03");
    }

    // 收集所有 Area Text
    var frames = [];
    for (var i = 0; i < doc.textFrames.length; i++) {
        try { if (doc.textFrames[i].kind === AREA) frames.push(doc.textFrames[i]); }
        catch (e) {}
    }
    if (frames.length === 0) { alert("沒有 Area Text 文字框可診斷。"); return; }

    // 逐框互動
    var results = [];
    var counts = { match:0, fp:0, fn:0, skip:0 };
    var stopped = false;

    for (var n = 0; n < frames.length; n++) {
        if (stopped) break;
        var tf = frames[n];

        // 算腳本判斷
        var contents = ""; try { contents = String(tf.contents || ""); } catch (e) {}
        var m4a = stripWS(contents).length - sumLinesStrip(tf);
        var m8 = m8Probe(tf);
        var m12 = m12Probe(tf);

        var scriptOverset = (m4a > TOLERANCE) || m8 || m12;
        var trigger = "ok";
        if (m4a > TOLERANCE) trigger = "M4a (隱藏實字 " + m4a + ")";
        else if (m8) trigger = "M8 (轉點文字)";
        else if (m12) trigger = "M12 (空段超框)";

        // 選取＋縮放
        try { app.executeMenuCommand("deselectall"); } catch (e) {}
        try { tf.selected = true; } catch (e) {}
        try { app.executeMenuCommand("fitin"); } catch (e) {}
        try { doc.redraw(); } catch (e) {}

        // 對話框
        var dlg = new Window("dialog", "溢出诊断 [" + (n+1) + "/" + frames.length + "]");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";
        dlg.margins = 16;
        dlg.spacing = 10;

        var info = dlg.add("panel", undefined, "框 #" + (n+1) + " (畫板 " + abOf(tf) + ")");
        info.alignChildren = "fill";
        info.margins = 12;
        info.spacing = 4;

        var preview = contents.substring(0, 60).replace(/[\r\n]/g, " ");
        var pt = info.add("statictext", undefined, "內容: " + preview, { multiline: true });
        pt.preferredSize.width = 380;
        pt.preferredSize.height = 36;

        var scriptLine = info.add("statictext", undefined,
            "腳本判斷: " + (scriptOverset ? "🔴 溢出 — " + trigger : "✓ 正常"));
        scriptLine.graphics.font = ScriptUI.newFont(scriptLine.graphics.font.name, "BOLD", 12);

        dlg.add("statictext", undefined, "請看 Illustrator 畫面，這個框右下角有沒有紅色 +？");

        var btns = dlg.add("group");
        btns.alignment = "center";
        btns.spacing = 6;

        var btnYes = btns.add("button", undefined, "有紅+ (溢出)");
        var btnNo = btns.add("button", undefined, "無紅+ (正常)");
        var btnSkip = btns.add("button", undefined, "跳過");
        var btnStop = btns.add("button", undefined, "停止");

        var userAnswer = null;
        btnYes.onClick = function () { userAnswer = true; dlg.close(); };
        btnNo.onClick = function () { userAnswer = false; dlg.close(); };
        btnSkip.onClick = function () { userAnswer = "skip"; dlg.close(); };
        btnStop.onClick = function () { stopped = true; dlg.close(); };

        dlg.show();
        if (stopped) break;

        var status = "?";
        if (userAnswer === "skip") {
            counts.skip++;
            status = "skip";
        } else if (userAnswer === true) {
            // 使用者說有溢出
            if (scriptOverset) { counts.match++; status = "✓ 一致"; }
            else { counts.fn++; status = "❌ FN 漏判"; }
        } else if (userAnswer === false) {
            // 使用者說正常
            if (!scriptOverset) { counts.match++; status = "✓ 一致"; }
            else { counts.fp++; status = "❌ FP 誤判"; }
        }

        results.push({
            idx: n+1,
            ab: abOf(tf),
            preview: preview,
            m4a: m4a, m8: m8, m12: m12,
            scriptOverset: scriptOverset, trigger: trigger,
            userAnswer: userAnswer, status: status,
            contents: contents
        });
    }

    // 輸出報告
    var out = [];
    out.push("溢出诊断互動報告 v" + VERSION + " (規則: v5.9.2)");
    out.push("文件: " + doc.name + "   AI: " + app.version);
    out.push("已比對: " + results.length + " / " + frames.length + " 框");
    out.push("============================================================");
    out.push("總結:");
    out.push("  ✓ 一致     " + counts.match);
    out.push("  ❌ FP 誤判 " + counts.fp + "  (腳本標但實際正常)");
    out.push("  ❌ FN 漏判 " + counts.fn + "  (實際溢出但腳本沒標)");
    out.push("  ⊘ 跳過     " + counts.skip);
    out.push("============================================================");

    for (var r = 0; r < results.length; r++) {
        var R = results[r];
        out.push("");
        out.push("框 #" + R.idx + " 畫板 " + R.ab + "   " + R.status);
        out.push("  內容: " + R.preview);
        out.push("  腳本: " + (R.scriptOverset ? "🔴 溢出 — " + R.trigger : "✓ 正常"));
        out.push("  使用者: " + (R.userAnswer === "skip" ? "skip" : (R.userAnswer ? "有紅+" : "無紅+")));
        out.push("  M4a=" + R.m4a + "  M8=" + R.m8 + "  M12=" + R.m12);
    }

    var f = new File(Folder.desktop + "/overset_diagnosis.txt");
    f.encoding = "UTF-8"; f.open("w"); f.write(out.join("\n")); f.close();

    alert("診斷完成 v" + VERSION + "\n\n" +
        "✓ 一致 " + counts.match + "\n" +
        "❌ FP " + counts.fp + " (誤判)\n" +
        "❌ FN " + counts.fn + " (漏判)\n" +
        "⊘ 跳過 " + counts.skip + "\n\n" +
        "細節報告:\n" + f.fsName);
})();
