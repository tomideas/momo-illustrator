#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
    var report = [];
    report.push("=== 样式库存诊断 ===");
    report.push("");

    // Check inventory file
    var invFile = _pf("text_style_inventory.json");
    report.push("text_style_inventory.json:");
    report.push("  存在: " + invFile.exists);
    report.push("  大小: " + (invFile.exists ? invFile.length + " 字节" : "（无）"));
    if (invFile.exists && invFile.length > 0) {
        try {
            invFile.open("r");
            var raw = invFile.read();
            invFile.close();
            if (raw.length > 600) raw = raw.substring(0, 600) + "...";
            report.push("  内容: " + raw);
            try {
                var s = _parseJson(raw);
                var keys = 0;
                for (var k in s) { if (s.hasOwnProperty(k)) keys++; }
                report.push("  键数: " + keys);
            } catch (e) { report.push("  解析失败: " + e.message); }
        } catch (e) { report.push("  读取失败: " + e.message); }
    }

    // Check diagnostic marker
    var diagFile = new File(Folder.userData + "/MomoTools/_inv_diag.txt");
    report.push("");
    report.push("_inv_diag.txt (直写标记，无 try/catch):");
    report.push("  存在: " + diagFile.exists);
    if (diagFile.exists) {
        try {
            diagFile.open("r");
            report.push("  内容: " + diagFile.read());
            diagFile.close();
        } catch (e) { report.push("  读取失败"); }
    }

    // _shared.jsx functions
    report.push("");
    report.push("=== 函数检查 ===");
    report.push("_pf         = " + (typeof _pf));
    report.push("_parseJson  = " + (typeof _parseJson));
    report.push("savePrefs   = " + (typeof savePrefs));
    report.push("loadPos     = " + (typeof loadPos));

    var dlg = new Window("dialog", "库存诊断");
    dlg.orientation = "column";
    dlg.alignChildren = "fill";
    dlg.margins = 12;

    var text = dlg.add("edittext", undefined, report.join("\n"), {
        multiline: true,
        readonly: true,
        scrolling: true
    });
    text.preferredSize = [600, 300];

    var btnRow = dlg.add("group");
    btnRow.alignment = "right";
    btnRow.add("button", undefined, "关闭", { name: "cancel" });

    dlg.center();
    dlg.show();
})();
