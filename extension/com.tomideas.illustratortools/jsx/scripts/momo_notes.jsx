#target illustrator
#targetengine "MomoToolsNotes"

// Native, non-modal notes window. Illustrator 30.6 / CEP 12.1 can load a
// secondary CEP page while never presenting its pixels; ScriptUI bypasses it.
(function () {
    var GLOBAL_KEY = "__momoToolsNotesWindow";
    var existing = $.global[GLOBAL_KEY];
    if (existing && existing instanceof Window) {
        try { existing.show(); existing.active = true; } catch (e) {}
        return "OK:existing";
    }

    var dataDir = new Folder(Folder.userData + "/MomoTools");
    var files = [new File(dataDir.fsName + "/notes.0.json"), new File(dataDir.fsName + "/notes.1.json")];
    var nextSlot = 0, lastTime = 0, state = null, loadError = false, editorBaseline = "";

    function parseJson(raw) {
        if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(raw);
        return eval("(" + raw + ")");
    }
    function valid(s) {
        if (!s || s.version !== 2 || !(s.tabs instanceof Array) || !(s.contents instanceof Array) ||
            !s.tabs.length || s.tabs.length > 10 || s.tabs.length !== s.contents.length ||
            typeof s.updatedAt !== "number" || !isFinite(s.updatedAt) ||
            typeof s.active !== "number" || s.active < 0 || s.active >= s.tabs.length || s.active % 1 ||
            typeof s.fontSize !== "number" || s.fontSize < 9 || s.fontSize > 32) return false;
        for (var i = 0; i < s.tabs.length; i++) {
            if (typeof s.tabs[i] !== "string" || typeof s.contents[i] !== "string") return false;
        }
        return true;
    }
    function readFile(file) {
        if (!file.exists) return null;
        try {
            file.encoding = "UTF-8";
            if (!file.open("r")) return false;
            var raw = file.read(); file.close();
            var parsed = parseJson(raw);
            return valid(parsed) ? parsed : false;
        } catch (e) { try { file.close(); } catch (ignore) {} return false; }
    }
    function loadState() {
        var best = null, newestSlot = -1, foundFile = false;
        for (var i = 0; i < files.length; i++) {
            var candidate = readFile(files[i]);
            if (candidate === false) { loadError = true; foundFile = true; continue; }
            if (!candidate) continue;
            foundFile = true;
            if (!best || candidate.updatedAt > best.updatedAt) { best = candidate; newestSlot = i; }
        }
        if (best) { nextSlot = 1 - newestSlot; lastTime = best.updatedAt; return best; }
        if (foundFile || loadError) return null;
        return {version: 2, updatedAt: 0, tabs: ["\u7b14\u8bb0 1"], contents: [""], active: 0, fontSize: 13};
    }
    function quote(s) {
        return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
            .replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t")
            .replace(/[\u0000-\u001f]/g, function (c) {
                var h = c.charCodeAt(0).toString(16); while (h.length < 4) h = "0" + h; return "\\u" + h;
            }) + '"';
    }
    function stringify(s) {
        var tabs = [], contents = [];
        for (var i = 0; i < s.tabs.length; i++) { tabs.push(quote(s.tabs[i])); contents.push(quote(s.contents[i])); }
        return "{" + '"version":2,' + '"updatedAt":' + s.updatedAt + "," +
            '"tabs":[' + tabs.join(",") + "]," + '"contents":[' + contents.join(",") + "]," +
            '"active":' + s.active + "," + '"fontSize":' + s.fontSize + "}";
    }
    function saveState() {
        if (!state || loadError) return false;
        if (!dataDir.exists && !dataDir.create()) return false;
        state.updatedAt = Math.max(new Date().getTime(), lastTime + 1); lastTime = state.updatedAt;
        var raw = stringify(state), file = files[nextSlot];
        try {
            file.encoding = "UTF-8";
            if (!file.open("w")) return false;
            file.write(raw); file.close();
            var check = readFile(file);
            if (!check || check.updatedAt !== state.updatedAt) return false;
            nextSlot = 1 - nextSlot; return true;
        } catch (e) { try { file.close(); } catch (ignore) {} return false; }
    }
    function decodeEntities(text) {
        var map = {amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " "};
        return text.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, function (whole, key) {
            var lower = key.toLowerCase();
            if (map.hasOwnProperty(lower)) return map[lower];
            if (lower.charAt(0) === "#") {
                var hex = lower.charAt(1) === "x", n = parseInt(lower.substring(hex ? 2 : 1), hex ? 16 : 10);
                if (!isNaN(n)) return String.fromCharCode(n);
            }
            return whole;
        });
    }
    function htmlToText(html) {
        var text = String(html || "");
        text = text.replace(/<\s*br\s*\/?>/gi, "\n")
            .replace(/<\s*(div|p|li|h[1-6])(?:\s[^>]*)?>/gi, "\n")
            .replace(/<\s*\/\s*(div|p|li|h[1-6])\s*>/gi, "\n")
            .replace(/<\s*\/\s*(td|th)\s*>/gi, "\t")
            .replace(/<\s*\/\s*tr\s*>/gi, "\n").replace(/<[^>]*>/g, "");
        text = decodeEntities(text).replace(/\r\n?/g, "\n").replace(/\t+\n/g, "\n");
        return text.replace(/^\n+|\n+$/g, "");
    }

    state = loadState();
    if (!state) {
        alert("\u7b14\u8bb0\u6587\u4ef6\u65e0\u6cd5\u8bfb\u53d6\u3002\u539f\u5b58\u6863\u5df2\u4fdd\u7559\uff0c\u6ca1\u6709\u5199\u5165\u7a7a\u767d\u5185\u5bb9\u3002\n\n\u8bf7\u5148\u5907\u4efd MomoTools/notes.0.json \u4e0e notes.1.json\u3002");
        return "E:load";
    }

    var win = new Window("palette", "Momo Notes", undefined, {resizeable: true});
    win.orientation = "column"; win.alignChildren = ["fill", "fill"]; win.spacing = 6; win.margins = 10;
    win.preferredSize = [560, 640];
    var tabsPanel = win.add("tabbedpanel");
    tabsPanel.alignment = ["fill", "fill"]; tabsPanel.preferredSize = [520, 560]; tabsPanel.minimumSize = [280, 140];
    var bottom = win.add("group"); bottom.orientation = "row"; bottom.alignChildren = ["left", "center"];
    var addButton = bottom.add("button", undefined, "+"); addButton.preferredSize = [34, 24];
    var renameButton = bottom.add("button", undefined, "\u6539\u540d"); renameButton.preferredSize = [54, 24];
    var deleteButton = bottom.add("button", undefined, "\u5220\u9664"); deleteButton.preferredSize = [54, 24];
    var smaller = bottom.add("button", undefined, "-"); smaller.preferredSize = [34, 24];
    var fontLabel = bottom.add("statictext", undefined, state.fontSize + "px"); fontLabel.preferredSize = [42, 18];
    var larger = bottom.add("button", undefined, "+"); larger.preferredSize = [34, 24];
    var clearButton = bottom.add("button", undefined, "\u6e05\u9664"); clearButton.preferredSize = [58, 24];
    var status = bottom.add("statictext", undefined, ""); status.alignment = ["fill", "center"];
    var tabControls = [], editors = [], editorBaselines = [], rebuilding = false;

    function styleEditor(editor) {
        try {
            editor.graphics.backgroundColor = editor.graphics.newBrush(editor.graphics.BrushType.SOLID_COLOR, [0.68, 0.68, 0.68, 1]);
            editor.graphics.foregroundColor = editor.graphics.newPen(editor.graphics.PenType.SOLID_COLOR, [0.10, 0.10, 0.10, 1], 1);
        } catch (e) {}
    }
    function setEditorFont() {
        for (var i = 0; i < editors.length; i++) {
            try { editors[i].graphics.font = ScriptUI.newFont("dialog", "REGULAR", state.fontSize); } catch (e) {}
        }
        fontLabel.text = state.fontSize + "px";
    }
    function setStatus(text) { status.text = text || ""; }
    function commitEditors() {
        for (var i = 0; i < editors.length; i++) {
            var current = String(editors[i].text || "").replace(/\r\n?/g, "\n");
            if (current !== editorBaselines[i]) { state.contents[i] = current; editorBaselines[i] = current; }
        }
    }
    function persist() { commitEditors(); setStatus(saveState() ? "\u5df2\u4fdd\u5b58" : "\u4fdd\u5b58\u5931\u8d25"); }
    function getActiveEditor() { return editors[state.active]; }
    function editorChanged() {
        if (rebuilding) return;
        var idx = this._stateIndex;
        var current = String(this.text || "").replace(/\r\n?/g, "\n");
        state.contents[idx] = current; editorBaselines[idx] = current;
        setStatus(saveState() ? "\u5df2\u4fdd\u5b58" : "\u4fdd\u5b58\u5931\u8d25");
    }
    function rebuildTabs(focusEditor) {
        rebuilding = true;
        while (tabsPanel.children.length) tabsPanel.remove(tabsPanel.children[0]);
        tabControls = []; editors = []; editorBaselines = [];
        for (var i = 0; i < state.tabs.length; i++) {
            var tab = tabsPanel.add("tab", undefined, state.tabs[i]);
            tab._stateIndex = i; tab.orientation = "column"; tab.alignChildren = ["fill", "fill"]; tab.margins = 6;
            var editor = tab.add("edittext", undefined, "", {multiline: true, scrolling: false, wantReturn: true});
            editor._stateIndex = i; editor.alignment = ["fill", "fill"];
            editor.preferredSize = [500, 520]; editor.minimumSize = [260, 100];
            editorBaselines[i] = htmlToText(state.contents[i]); editor.text = editorBaselines[i];
            styleEditor(editor); editor.onChanging = editorChanged;
            tabControls.push(tab); editors.push(editor);
        }
        tabsPanel.selection = tabControls[state.active];
        deleteButton.enabled = state.tabs.length > 1;
        setEditorFont(); rebuilding = false;
        win.layout.layout(true);
        if (focusEditor) { try { getActiveEditor().active = true; } catch (e) {} }
    }

    tabsPanel.onChange = function () {
        if (rebuilding || !tabsPanel.selection) return;
        var next = tabsPanel.selection._stateIndex;
        if (next === state.active) return;
        commitEditors(); state.active = next; persist();
        try { getActiveEditor().active = true; } catch (e) {}
    };
    addButton.onClick = function () {
        if (state.tabs.length >= 10) { alert("\u6700\u591a\u53ef\u5efa\u7acb 10 \u4e2a\u5206\u9875\u3002"); return; }
        commitEditors(); state.tabs.push("\u7b14\u8bb0 " + (state.tabs.length + 1)); state.contents.push("");
        state.active = state.tabs.length - 1; rebuildTabs(true); persist();
    };
    renameButton.onClick = function () {
        var name = prompt("\u5206\u9875\u540d\u79f0", state.tabs[state.active], "Momo Notes");
        if (name === null) return;
        name = String(name).replace(/^\s+|\s+$/g, ""); if (!name) return;
        commitEditors(); state.tabs[state.active] = name; rebuildTabs(true); persist();
    };
    deleteButton.onClick = function () {
        if (state.tabs.length <= 1 || !confirm("\u5220\u9664\u5206\u9875 \"" + state.tabs[state.active] + "\"\uff1f")) return;
        state.tabs.splice(state.active, 1); state.contents.splice(state.active, 1);
        if (state.active >= state.tabs.length) state.active = state.tabs.length - 1;
        rebuildTabs(true); persist();
    };
    smaller.onClick = function () { if (state.fontSize > 9) { state.fontSize--; setEditorFont(); persist(); } };
    larger.onClick = function () { if (state.fontSize < 32) { state.fontSize++; setEditorFont(); persist(); } };
    clearButton.onClick = function () {
        if (!confirm("\u6e05\u9664\u76ee\u524d\u5206\u9875\u5185\u5bb9\uff1f")) return;
        var editor = getActiveEditor(); editor.text = ""; editorBaselines[state.active] = ""; state.contents[state.active] = "";
        persist(); editor.active = true;
    };
    win.onResizing = win.onResize = function () { this.layout.resize(); };
    win.onClose = function () { persist(); $.global[GLOBAL_KEY] = null; };

    rebuildTabs(true); $.global[GLOBAL_KEY] = win; win.center(); win.show();
    return "OK:new";
}());
