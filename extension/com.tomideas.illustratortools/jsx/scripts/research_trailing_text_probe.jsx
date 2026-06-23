#target illustrator

// ============================================================
// 尾端空白 / 空段诊断（互動式逐框比對）
// 版本：2.0.0 (跟隨 check_trailing_text v1.0.1)
//
// 流程：
//   1. 逐個選取 Area Text 框 + 縮放
//   2. 顯示腳本判斷（空段 / 空白 / 正常）+ 內容尾端可視化
//   3. 問使用者：應該標 / 不應該 / 跳過 / 停止
//   4. 比對腳本 vs 使用者，找 FP/FN
//   5. 輸出報告到 ~/Desktop/trailing_text_diagnosis.txt
// ============================================================

(function () {
    var VERSION = "2.0.0";

    if (app.documents.length === 0) {         alert("请先打开文件。"); return; }

    var doc = app.activeDocument;
    var AREA = 0; try { AREA = TextType.AREATEXT; } catch (e) {}

    // 與 check_trailing_text v1.0.1 相同邏輯
    function stripImplicitFinalParagraph(s) {
        return String(s).replace(/[\r\n\x03]$/, "");
    }

    function detectIssue(tf) {
        var s = "";
        try { s = String(tf.contents || ""); } catch (e) { return null; }
        if (!s.length) return null;
        s = stripImplicitFinalParagraph(s);
        if (!s.length) return null;
        if (/[\r\n\x03]+[ \t 　\r\n\x03]*$/.test(s)) return "空段";
        if (/[ \t 　]+$/.test(s)) return "空白";
        return null;
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

    // 把不可見字元顯化：\r → ↵\r, 空格 → ·, 全角空格 → □
    function visualizeTail(s, n) {
        s = String(s);
        var t = s.length > n ? s.substring(s.length - n) : s;
        return t.replace(/\r/g, "↵")
                .replace(/\n/g, "⤶")
                .replace(/\t/g, "→")
                .replace(/ /g, "·")
                .replace(/　/g, "□")
                .replace(/ /g, "·")
                .replace(/\x03/g, "✓");
    }

    function tailCodes(s, n) {
        s = String(s);
        var start = Math.max(0, s.length - n), a = [];
        for (var i = start; i < s.length; i++) {
            var h = s.charCodeAt(i).toString(16).toUpperCase();
            while (h.length < 4) h = "0" + h;
            a.push("U+" + h);
        }
        return a.join(" ");
    }

    var frames = [];
    for (var i = 0; i < doc.textFrames.length; i++) {
        try { if (doc.textFrames[i].kind === AREA) frames.push(doc.textFrames[i]); }
        catch (e) {}
    }
    if (frames.length === 0) { alert("沒有 Area Text 文字框可診斷。"); return; }

    var results = [];
    var counts = { match:0, fp:0, fn:0, skip:0 };
    var stopped = false;

    for (var n = 0; n < frames.length; n++) {
        if (stopped) break;
        var tf = frames[n];

        var contents = ""; try { contents = String(tf.contents || ""); } catch (e) {}
        var issue = detectIssue(tf);
        var scriptFlag = (issue !== null);

        // 選取＋縮放
        try { app.executeMenuCommand("deselectall"); } catch (e) {}
        try { tf.selected = true; } catch (e) {}
        try { app.executeMenuCommand("fitin"); } catch (e) {}
        try { doc.redraw(); } catch (e) {}

        var dlg = new Window("dialog", "尾端空白诊断 [" + (n+1) + "/" + frames.length + "]");
        dlg.orientation = "column";
        dlg.alignChildren = "fill";
        dlg.margins = 16;
        dlg.spacing = 10;

        var info = dlg.add("panel", undefined, "框 #" + (n+1) + " (畫板 " + abOf(tf) + ")");
        info.alignChildren = "fill";
        info.margins = 12;
        info.spacing = 4;

        var preview = contents.substring(0, 50).replace(/[\r\n]/g, " ");
        var pt = info.add("statictext", undefined, "內容: " + preview, { multiline: true });
        pt.preferredSize.width = 420;
        pt.preferredSize.height = 32;

        var tailVis = info.add("statictext", undefined, "尾端可視化: " + visualizeTail(contents, 25));
        tailVis.graphics.font = ScriptUI.newFont("Courier", "REGULAR", 12);

        var tailCode = info.add("statictext", undefined, "尾端 codes: " + tailCodes(contents, 6));
        tailCode.graphics.font = ScriptUI.newFont("Courier", "REGULAR", 10);

        var scriptLine = info.add("statictext", undefined,
            "腳本判斷: " + (scriptFlag ? "🟠 標記為 " + issue : "✓ 正常"));
        scriptLine.graphics.font = ScriptUI.newFont(scriptLine.graphics.font.name, "BOLD", 12);

        dlg.add("statictext", undefined,
            "圖例: ↵ = Enter，· = 空格，□ = 全角空格，→ = Tab");
        dlg.add("statictext", undefined,
            "你認為這框應該被標出來清理嗎？");

        var btns = dlg.add("group");
        btns.alignment = "center";
        btns.spacing = 6;

        var btnYes = btns.add("button", undefined, "應該標 (有問題)");
        var btnNo = btns.add("button", undefined, "不應該 (正常)");
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
            if (scriptFlag) { counts.match++; status = "✓ 一致"; }
            else { counts.fn++; status = "❌ FN 漏判"; }
        } else if (userAnswer === false) {
            if (!scriptFlag) { counts.match++; status = "✓ 一致"; }
            else { counts.fp++; status = "❌ FP 誤判"; }
        }

        results.push({
            idx: n+1,
            ab: abOf(tf),
            preview: preview,
            tailVis: visualizeTail(contents, 25),
            tailCode: tailCodes(contents, 6),
            issue: issue,
            scriptFlag: scriptFlag,
            userAnswer: userAnswer,
            status: status
        });
    }

    var out = [];
    out.push("尾端空白诊断互動報告 v" + VERSION + " (規則: check_trailing_text v1.0.1)");
    out.push("文件: " + doc.name + "   AI: " + app.version);
    out.push("已比對: " + results.length + " / " + frames.length + " 框");
    out.push("============================================================");
    out.push("總結:");
    out.push("  ✓ 一致     " + counts.match);
    out.push("  ❌ FP 誤判 " + counts.fp + "  (腳本標但實際正常)");
    out.push("  ❌ FN 漏判 " + counts.fn + "  (實際應標但腳本沒標)");
    out.push("  ⊘ 跳過     " + counts.skip);
    out.push("============================================================");

    for (var r = 0; r < results.length; r++) {
        var R = results[r];
        out.push("");
        out.push("框 #" + R.idx + " 畫板 " + R.ab + "   " + R.status);
        out.push("  內容: " + R.preview);
        out.push("  尾端: " + R.tailVis + "    codes: " + R.tailCode);
        out.push("  腳本: " + (R.scriptFlag ? "🟠 " + R.issue : "✓ 正常"));
        out.push("  使用者: " + (R.userAnswer === "skip" ? "skip" : (R.userAnswer ? "應該標" : "不應該")));
    }

    var f = new File(Folder.desktop + "/trailing_text_diagnosis.txt");
    f.encoding = "UTF-8"; f.open("w"); f.write(out.join("\n")); f.close();

    alert("診斷完成 v" + VERSION + "\n\n" +
        "✓ 一致 " + counts.match + "\n" +
        "❌ FP " + counts.fp + " (誤判)\n" +
        "❌ FN " + counts.fn + " (漏判)\n" +
        "⊘ 跳過 " + counts.skip + "\n\n" +
        "細節報告:\n" + f.fsName);
})();
