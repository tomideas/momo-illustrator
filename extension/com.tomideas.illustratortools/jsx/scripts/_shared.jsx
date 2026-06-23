// _shared.jsx — Momo Tools 共用工具函数
// 使用方式: $.evalFile(File($.fileName).parent + "/_shared.jsx");

function _pf(n) { return new File(Folder.userData + "/MomoTools/" + n); }

function _parseJson(raw) {
    if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(raw);
    return eval("(" + raw + ")");
}

function loadPrefs(n, d) {
    var f = _pf(n);
    try {
        if (!f.exists) return _cp(d);
        f.open("r"); var raw = f.read(); f.close();
        var s = _parseJson(raw);
        var r = _cp(d);
        for (var k in s) { if (r.hasOwnProperty(k)) r[k] = s[k]; }
        return r;
    } catch (e) { return _cp(d); }
}

function savePrefs(n, obj) {
    try {
        var dir = new Folder(Folder.userData + "/MomoTools");
        if (!dir.exists) dir.create();
        var f = _pf(n); f.open("w");
        var p = [];
        for (var k in obj) {
            if (!obj.hasOwnProperty(k)) continue;
            var v = obj[k];
            p.push('"' + k + '":' + (typeof v === "string" ? '"' + String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"' : v));
        }
        f.write("{" + p.join(",") + "}"); f.close();
    } catch (e) {}
}

function loadPos(n) {
    try {
        var f = _pf(n);
        if (!f.exists || f.length < 4) return { x: -1, y: -1 };
        f.open("r"); var raw = f.read(); f.close();
        if (!raw || raw.length < 4) return { x: -1, y: -1 };
        var s = _parseJson(raw);
        var x = parseInt(s.x, 10);
        var y = parseInt(s.y, 10);
        if (isNaN(x) || isNaN(y)) return { x: -1, y: -1 };
        return { x: x, y: y };
    } catch (e) { return { x: -1, y: -1 }; }
}

function _posLog(n, msg) {
    try {
        var f = _pf("_pos_log.txt");
        f.open("a");
        f.write(n + "|" + msg + "\n");
        f.close();
    } catch (e) {}
}

function _cp(o) { var c = {}; for (var k in o) { if (o.hasOwnProperty(k)) c[k] = o[k]; } return c; }
