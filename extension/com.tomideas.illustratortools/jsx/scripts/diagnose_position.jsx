#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    function padRight(s, n) {
        s = String(s);
        while (s.length < n) s += " ";
        return s;
    }

    function padLeft(s, n) {
        s = String(s);
        while (s.length < n) s = " " + s;
        return s;
    }

    var TOOLS = [
        ["duplicate",      "duplicate_pos.json"],
        ["relayout",       "relayout_pos.json"],
        ["renamer",        "renamer_pos.json"],
        ["text_style",     "text_style_pos.json"],
        ["overset",        "overset_pos.json"],
        ["trailing",       "trailing_pos.json"],
        ["text_color",     "text_color_pos.json"],
        ["page_numbers",   "page_numbers_pos.json"],
        ["color_box",      "color_box_pos.json"],
        ["grid_system",    "grid_system_pos.json"]
    ];

    var report = [];
    report.push("=== 位置诊断 ===");
    report.push("Folder.userData = " + Folder.userData);
    report.push("目录 = " + Folder.userData + "/MomoTools");
    report.push("");
    report.push("工具           | 存在 | 字节  | loadPos 返回");
    report.push("---------------|------|-------|---------------------");

    for (var i = 0; i < TOOLS.length; i++) {
        var name = TOOLS[i][0];
        var file = TOOLS[i][1];
        var fullPath = Folder.userData + "/MomoTools/" + file;

        var exists = " 否";
        var size = "    -";
        var raw = "-";
        var lp = "-";

        try {
            var f = new File(fullPath);
            if (f.exists) {
                exists = " 是";
                size = padLeft(String(f.length), 5);
                if (f.length > 0 && f.length < 200) {
                    f.open("r");
                    raw = f.read();
                    f.close();
                } else if (f.length === 0) {
                    raw = "(空)";
                } else {
                    raw = "(" + f.length + " 字节)";
                }
            }
        } catch (e) {
            raw = "(读失败:" + e.message + ")";
        }

        try {
            var r = loadPos(file);
            if (r && typeof r === "object") {
                lp = "(" + r.x + ", " + r.y + ")";
                if (r.x >= 0 && r.y >= 0) lp += " ✓";
                else lp += " ✗(负数)";
            } else {
                lp = "(无返回值)";
            }
        } catch (e) {
            lp = "(loadPos异常)";
        }

        report.push(padRight(name, 14) + " |" + exists + " |" + size + " | " + raw + " | " + lp);
    }

    report.push("");
    report.push("=== _shared.jsx 函数存在性 ===");
    report.push("loadPos     = " + (typeof loadPos));
    report.push("loadPrefs   = " + (typeof loadPrefs));
    report.push("savePrefs   = " + (typeof savePrefs));
    report.push("_pf         = " + (typeof _pf));

    var dlg = new Window("dialog", "位置诊断");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.margins = 12;

    var info = dlg.add("statictext", undefined, "位置记忆诊断 — 检查 pos.json 存在性 + loadPos 返回值");
    info.preferredSize.width = 580;

    var text = dlg.add("edittext", undefined, report.join("\n"), {
        multiline: true,
        readonly: true,
        scrolling: true
    });
    text.preferredSize = [680, 340];
    text.alignment = "fill";

    var btnRow = dlg.add("group");
    btnRow.alignment = "right";
    btnRow.add("button", undefined, "关闭", { name: "cancel" });

    dlg.center();
    dlg.show();
})();
