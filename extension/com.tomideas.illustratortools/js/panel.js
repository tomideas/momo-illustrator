(function () {
    var PANEL_VERSION = "2.102";
    var SystemPath = { EXTENSION: "extension" };

    function CSInterface() {}
    CSInterface.prototype.evalScript = function (script, callback) {
        window.__adobe_cep__.evalScript(script, function (result) {
            if (typeof callback === "function") callback(result);
        });
    };
    CSInterface.prototype.getSystemPath = function (pathType) {
        return decodeURIComponent(window.__adobe_cep__.getSystemPath(pathType));
    };
    CSInterface.prototype.getHostEnvironment = function () {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    };
    CSInterface.prototype.addEventListener = function (type, listener) {
        window.__adobe_cep__.addEventListener(type, listener);
    };
    CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
        return window.__adobe_cep__.requestOpenExtension(extensionId, params);
    };

    var cs = new CSInterface();

    // ── Theme ──
    function rgbToHex(c) {
        if (!c) return "#535353";
        var col = c.color || c;
        return "#" + ((1 << 24) | (Math.round(col.red||0) << 16) | (Math.round(col.green||0) << 8) | Math.round(col.blue||0)).toString(16).slice(1);
    }
    function isDark(hex) {
        var r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
        return (0.2126*r + 0.7152*g + 0.0722*b) < 0.5;
    }
    function shiftColor(hex, amt) {
        var n = parseInt(hex.slice(1), 16);
        var c = function(v){return Math.min(255,Math.max(0,v));};
        var r = c(((n>>16)&0xFF)+amt), g = c(((n>>8)&0xFF)+amt), b = c((n&0xFF)+amt);
        return "#"+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1);
    }
    function applyTheme() {
        var root = document.documentElement;
        var bg = "#535353", accent = "#96a5be";
        try {
            var skin = cs.getHostEnvironment().appSkinInfo;
            if (skin) {
                bg = rgbToHex(skin.panelBackgroundColor) || bg;
            }
        } catch (e) {}
        var dark = isDark(bg);
        var d = dark ? -9 : -8;
        var h = dark ? 5 : -7;
        root.style.setProperty("--bg", bg);
        root.style.setProperty("--bg-secondary", shiftColor(bg, d));
        root.style.setProperty("--bg-hover", shiftColor(bg, h));
        root.style.setProperty("--bg-active", accent);
        root.style.setProperty("--fg", dark ? "#e0e0e0" : "#222222");
        root.style.setProperty("--fg-dim", dark ? "#999999" : "#777777");
        root.style.setProperty("--fg-bright", dark ? "#ffffff" : "#000000");
        root.style.setProperty("--border", dark ? "rgba(160,160,160,0.15)" : "rgba(0,0,0,0.12)");
        root.style.setProperty("--border-strong", dark ? "rgba(140,140,140,0.25)" : "rgba(0,0,0,0.2)");
        root.style.setProperty("--scrollbar-track", dark ? "#444444" : "#dddddd");
        root.style.setProperty("--scrollbar-thumb", dark ? "#777777" : "#bbbbbb");
    }
    applyTheme();
    try { cs.addEventListener("com.adobe.csxs.events.ThemeColorChanged", applyTheme); } catch (e) {}

    function runScript(filename) {
        var extPath = cs.getSystemPath(SystemPath.EXTENSION).replace(/\\/g, "/");
        var scriptPath = extPath + "/jsx/scripts/" + filename;
        scriptPath = scriptPath.replace(/"/g, '\\"');
        cs.evalScript('$.evalFile("' + scriptPath + '")', function (result) {
            if (result && result.indexOf("EvalScript error") !== -1) {
                alert("Script error:\n" + result);
            }
        });
    }

    function bind(id, filename) {
        document.getElementById(id).addEventListener("click", function () {
            runScript(filename);
        });
    }

    bind("btn-duplicate",    "artboard_duplicate_v1.1.2.jsx");
    bind("btn-relayout",     "artboard_relayout_v1.5.8.jsx");
    bind("btn-renamer",      "artboard_renamer_v1.2.1.jsx");
    bind("btn-grid",         "grid_system_v1.3.0.jsx");
    bind("btn-page-numbers", "add_page_numbers_tomideas.jsx");
    bind("btn-color-box",    "generate_color_box.jsx");
    bind("btn-text-checker", "illustrator_text_style_checker_v8.2.0_compact_cn.jsx");
    bind("btn-text-color",   "check_text_color.jsx");
    bind("btn-overset",      "check_overset_text.jsx");
    bind("btn-trailing-text", "check_trailing_text.jsx");
    bind("btn-debug",        "research_overset_probe.jsx");
    bind("btn-trailing-debug", "research_trailing_text_probe.jsx");
    bind("btn-pos-diag",     "diagnose_position.jsx");
    bind("btn-inv-diag",     "diagnose_inventory.jsx");

    document.getElementById("btn-reset").addEventListener("click", function () {
        if (!confirm("确定要重置所有设置吗？\n这将清除颜色库和所有工具参数。")) return;
        try {
            window.localStorage.removeItem("MomoTools_ColorLibrary");
            window.localStorage.removeItem("MomoTools_migrated_v16");
        } catch (e) {}
        var script =
            '(function(){' +
            'var dir=Folder.userData.fsName+"/MomoTools";' +
            'var folder=new Folder(dir);' +
            'if(!folder.exists){return "OK:0";}' +
            'var files=folder.getFiles("*.json");' +
            'for(var i=0;i<files.length;i++){files[i].remove();}' +
            'return "OK:"+files.length;' +
            '})()';
        cs.evalScript(script, function (result) {
            if (result && result.indexOf("OK") === 0) {
                var count = result.split(":")[1] || "0";
                alert("已重置！\n清除 " + count + " 个设置文件。\n请重新打开面板。");
            }
        });
    });

    document.getElementById("btn-note").addEventListener("click", function () {
        // 第一次調用喚起面板；第二次延遲 300ms 作為 fallback（首次點擊只初始化不顯示時補一刀）。
        // 改為非同步：避免同步連調在第一次 CEF 渲染進程還沒就緒時被第二次打斷 → 白屏。
        try {
            cs.requestOpenExtension("com.tomideas.illustratortools.note", "");
        } catch (e) {
            if (typeof console !== "undefined") console.log("open note panel error:", e);
        }
        setTimeout(function () {
            try {
                cs.requestOpenExtension("com.tomideas.illustratortools.note", "");
            } catch (e) {}
        }, 300);
    });

    var footer = document.getElementById("footer-version");
    if (footer) {
        footer.textContent = "v" + PANEL_VERSION + "  Momo Tools";
        footer.title = "连点 3 次显示开发工具";
        var devClicks = 0, devTimer = null;
        footer.addEventListener("click", function () {
            devClicks++;
            if (devTimer) clearTimeout(devTimer);
            devTimer = setTimeout(function () { devClicks = 0; }, 600);
            if (devClicks < 3) return;
            devClicks = 0;
            var dev = document.getElementById("dev-tools-group");
            if (!dev) return;
            dev.style.display = dev.style.display === "none" ? "block" : "none";
        });
    }
})();
