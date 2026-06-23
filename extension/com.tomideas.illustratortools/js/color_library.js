// color_library.js  — Momo Tools 自定义颜色库
(function () {
    "use strict";

    // ── CEP bridge ──────────────────────────────────────────────
    function evalAI(script, cb) {
        window.__adobe_cep__.evalScript(script, function (r) {
            if (typeof cb === "function") cb(r);
        });
    }

    // ── State ────────────────────────────────────────────────────
    var library    = { version: "1.0", groups: [] };
    var sortDir    = "asc"; // asc / desc

    var curGroup   = 0;   // current group index
    var libPath    = null; // native FS path, resolved on init
    var editingIdx = -2;  // -2=closed, -1=new color, ≥0=edit existing
    var saveTimer  = null; // debounce timer for saveLibrary
    

    // ── Path init (async via evalScript) ────────────────────────
    function initPath(cb) {
        evalAI(
            '(Folder.userData.fsName + "/MomoTools/color_library.json")',
            function (p) { libPath = p || ""; if (cb) cb(); }
        );
    }

    // ── File I/O via cep.fs ──────────────────────────────────────
    var FS_UTF8 = 4; // CEP cep.fs encoding constant for UTF-8

    function getCepFs() {
        return window.cep && window.cep.fs ? window.cep.fs : null;
    }

    function loadLibrary() {
        var loaded = false;

        // Try to load from file system first
        if (libPath) {
            var fs = getCepFs();
            if (fs) {
                var res = fs.readFile(libPath, FS_UTF8);
                if (res.err === 0 && res.data) {
                    try {
                        var parsed = JSON.parse(res.data);
                        if (parsed && Array.isArray(parsed.groups)) {
                            library = parsed;
                            loaded = true;
                        }
                    } catch (e) {}
                }
            }
        }

        // Fallback: try to load from localStorage
        if (!loaded) {
            try {
                var stored = window.localStorage.getItem("MomoTools_ColorLibrary");
                if (stored) {
                    var parsed = JSON.parse(stored);
                    if (parsed && Array.isArray(parsed.groups)) {
                        library = parsed;
                        loaded = true;
                    }
                }
            } catch (e) {}
        }

        // Only create default momo group if NO data was loaded (first install)
        if (!loaded && library.groups.length === 0) {
            library.groups.push({
                id: "g_default_momo",
                name: "momo",
                colors: [
                    { id: "c_default_1", name: "蜜桃粉", c: 0,  m: 45, y: 35, k: 0,  hex: "FF8CA6" },
                    { id: "c_default_2", name: "薄荷绿", c: 45, m: 0,  y: 30, k: 0,  hex: "8CFFB2" },
                    { id: "c_default_3", name: "薰衣草", c: 25, m: 40, y: 0,  k: 0,  hex: "BF99FF" },
                    { id: "c_default_4", name: "奶油黄", c: 0,  m: 15, y: 60, k: 0,  hex: "FFD966" }
                ]
            });
            saveLibrary();
        }

        // Migration: populate empty "momo" group (only if momo exists but has no colors)
        for (var gi = 0; gi < library.groups.length; gi++) {
            var g = library.groups[gi];
            if (g.name === "momo" && g.colors && g.colors.length === 0) {
                g.colors = [
                    { id: "c_default_1", name: "蜜桃粉", c: 0,  m: 45, y: 35, k: 0  },
                    { id: "c_default_2", name: "薄荷绿", c: 45, m: 0,  y: 30, k: 0  },
                    { id: "c_default_3", name: "薰衣草", c: 25, m: 40, y: 0,  k: 0  },
                    { id: "c_default_4", name: "奶油黄", c: 0,  m: 15, y: 60, k: 0  }
                ];
                saveLibrary(); break;
            }
        }
        sortGroups("asc");
        curGroup = Math.max(0, Math.min(curGroup, library.groups.length - 1));
        renderAll();
    }

    function saveLibrary() {
        var json = JSON.stringify(library, null, 2);

        var fsErr = false;

        if (libPath) {
            var fs = getCepFs();
            if (fs) {
                var dir = libPath.substring(0, libPath.lastIndexOf("/"));
                var statDir = fs.stat(dir);
                if (statDir.err !== 0) {
                    var mkResult = fs.makedir(dir);
                    if (mkResult.err !== 0) fsErr = true;
                }
                if (!fsErr) {
                    var wr = fs.writeFile(libPath, json, FS_UTF8);
                    if (wr.err !== 0) fsErr = true;
                }
            }
        }

        try {
            window.localStorage.setItem("MomoTools_ColorLibrary", json);
        } catch (e) {
            if (fsErr) toast("保存失败：文件系统和本地存储均不可用");
        }
    }

    function saveLibraryDebounced() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveLibrary, 200);
    }

    function toast(msg, duration) {
        duration = duration || 1800;
        var t = document.createElement("div");
        t.textContent = msg;
        t.style.cssText = "position:fixed;bottom:10px;left:50%;transform:translateX(-50%);"
            + "background:rgba(0,0,0,0.85);color:#fff;font-size:10px;padding:5px 12px;"
            + "border-radius:3px;z-index:9999;pointer-events:none;white-space:nowrap;"
            + "transition:opacity 0.3s;opacity:0;";
        document.body.appendChild(t);
        requestAnimationFrame(function () { t.style.opacity = "1"; });
        setTimeout(function () {
            t.style.opacity = "0";
            setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
        }, duration);
    }

    // ── Convert CMYK → hex via Illustrator (ICC-accurate) ────
    function cmykToHexViaAI(cols, cb) {
        if (!cols || !cols.length) { if (cb) cb({}); return; }
        var parts = [];
        for (var i = 0; i < cols.length; i++) {
            parts.push(Math.round(cols[i].c) + "," + Math.round(cols[i].m) + "," + Math.round(cols[i].y) + "," + Math.round(cols[i].k));
        }
        var script =
            '(function(){' +
            'try{' +
            'if(!app.documents.length){return "ERR";}' +
            'var doc=app.activeDocument;' +
            'var items="' + parts.join("|") + '";' +
            'var arr=items.split("|");' +
            'var h=function(n){var s=Math.round(n).toString(16);return s.length<2?"0"+s:s;};' +
            'var result=[];' +
            'for(var i=0;i<arr.length;i++){' +
            'var p=arr[i].split(",");' +
            'try{' +
            'var rgb=app.convertSampleColor(ImageColorSpace.CMYK,[+p[0],+p[1],+p[2],+p[3]],ImageColorSpace.RGB,ColorConvertPurpose.defaultpurpose);' +
            'result.push(h(rgb[0])+h(rgb[1])+h(rgb[2]));' +
            '}catch(e1){' +
            'var r2=255*(1-(+p[0])/100)*(1-(+p[3])/100);' +
            'var g2=255*(1-(+p[1])/100)*(1-(+p[3])/100);' +
            'var b2=255*(1-(+p[2])/100)*(1-(+p[3])/100);' +
            'result.push(h(r2)+h(g2)+h(b2));' +
            '}' +
            '}' +
            'return result.join("|");' +
            '}catch(e3){return "E:CONV";}' +
            '})()';
        evalAI(script, function (r) {
            if (!r || r === "ERR" || r === "E:CONV") { if (cb) cb({}); return; }
            if (r.indexOf("E:") === 0) { if (cb) cb({}); return; }
            var map = {};
            var hexes = r.split("|");
            for (var i = 0; i < cols.length && i < hexes.length; i++) {
                map[cols[i].id] = hexes[i].toUpperCase();
            }
            if (cb) cb(map);
        });
    }

    // ── Color utilities ──────────────────────────────────────────
    function cmykToRgb(c, m, y, k) {
        c = Math.max(0, Math.min(1, +c / 100));
        m = Math.max(0, Math.min(1, +m / 100));
        y = Math.max(0, Math.min(1, +y / 100));
        k = Math.max(0, Math.min(1, +k / 100));
        return {
            r: Math.round(255 * (1 - c) * (1 - k)),
            g: Math.round(255 * (1 - m) * (1 - k)),
            b: Math.round(255 * (1 - y) * (1 - k))
        };
    }

    function brightness(rgb) {
        return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    }

    function swatchBgStyle(col) {
        if (col.hex && col.hex.length === 6) {
            return "#" + col.hex;
        }
        var rgb = cmykToRgb(col.c, col.m, col.y, col.k);
        return "rgb(" + rgb.r + "," + rgb.g + "," + rgb.b + ")";
    }

    function cmykLabel(col) {
        return "C" + Math.round(col.c) + " M" + Math.round(col.m) +
               " Y" + Math.round(col.y) + " K" + Math.round(col.k);
    }

    function rgbLabel(r, g, b) { return "R" + r + " G" + g + " B" + b; }

    function cmykToHex(col) {
        if (col.hex) return "#" + col.hex.toUpperCase();
        var rgb = cmykToRgb(col.c, col.m, col.y, col.k);
        return "#" + h2(rgb.r) + h2(rgb.g) + h2(rgb.b);
    }

    function h2(n) {
        var s = n.toString(16).toUpperCase();
        return s.length < 2 ? "0" + s : s;
    }

    function hexToCmyk(hex) {
        hex = hex.replace(/^#/, "");
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length !== 6) return null;
        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        var rr = r / 255, gg = g / 255, bb = b / 255;
        var k = 1 - Math.max(rr, gg, bb);
        if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
        var ic = 1 - k;
        return {
            c: Math.round((ic - rr) / ic * 100),
            m: Math.round((ic - gg) / ic * 100),
            y: Math.round((ic - bb) / ic * 100),
            k: Math.round(k * 100)
        };
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, "");
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        if (hex.length !== 6) return null;
        return {
            r: parseInt(hex.substring(0,2), 16),
            g: parseInt(hex.substring(2,4), 16),
            b: parseInt(hex.substring(4,6), 16)
        };
    }

    // ── Render ───────────────────────────────────────────────────
    function renderGroupSelect() {
        var sel = document.getElementById("cl-group-select");
        sel.innerHTML = "";
        if (!library.groups.length) {
            var o = document.createElement("option");
            o.textContent = "— 点击 + 新建颜色组 —";
            sel.appendChild(o);
            return;
        }
        for (var i = 0; i < library.groups.length; i++) {
            var opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = library.groups[i].name;
            if (i === curGroup) opt.selected = true;
            sel.appendChild(opt);
        }
    }

    function renderSwatches() {
        var container = document.getElementById("cl-swatches");
        container.innerHTML = "";

        if (!library.groups.length) {
            container.innerHTML = '<div class="cl-empty">新建颜色组后可添加颜色</div>';
            return;
        }
        var group = library.groups[curGroup];
        if (!group || !group.colors || !group.colors.length) {
            container.innerHTML = '<div class="cl-empty">点击「添加颜色」或「从选中提取」</div>';
            return;
        }

        for (var i = 0; i < group.colors.length; i++) {
            container.appendChild(buildSwatch(group.colors[i], i));
        }
    }

    function buildSwatch(col, idx) {
        var bg  = swatchBgStyle(col);
        var rgb = cmykToRgb(col.c, col.m, col.y, col.k);
        var hexStr = cmykToHex(col);
        if (col.hex && col.hex.length === 6) {
            hexStr = "#" + col.hex.toUpperCase();
            rgb = {
                r: parseInt(col.hex.substring(0, 2), 16),
                g: parseInt(col.hex.substring(2, 4), 16),
                b: parseInt(col.hex.substring(4, 6), 16)
            };
        }
        var light = brightness(rgb) > 140;

        var sw = document.createElement("div");
        sw.className = "cl-swatch";
        sw.draggable = true;
        sw.style.background = bg;
        sw.title = col.name + "\n" + cmykLabel(col)
            + "\n" + rgbLabel(rgb.r, rgb.g, rgb.b)
            + "\n" + hexStr
            + "\n\n单击应用填充，双击编辑，拖动排序";

        sw.addEventListener("dragstart", (function (i) {
            return function (e) {
                e.dataTransfer.setData("text/plain", "" + i);
                e.dataTransfer.effectAllowed = "move";
                sw.style.opacity = "0.4";
            };
        })(idx));
        sw.addEventListener("dragend", function () {
            sw.style.opacity = "1";
            var all = document.querySelectorAll(".cl-swatch");
            for (var j = 0; j < all.length; j++) all[j].classList.remove("cl-sw-dragover");
        });
        sw.addEventListener("dragover", function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            sw.classList.add("cl-sw-dragover");
        });
        sw.addEventListener("dragleave", function () {
            sw.classList.remove("cl-sw-dragover");
        });
        sw.addEventListener("drop", (function (i) {
            return function (e) {
                e.preventDefault();
                e.stopPropagation();
                sw.classList.remove("cl-sw-dragover");
                var fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
                if (isNaN(fromIdx) || fromIdx === i) return;
                var group = library.groups[curGroup];
                if (!group || !group.colors) return;
                var moved = group.colors.splice(fromIdx, 1)[0];
                group.colors.splice(i, 0, moved);
                saveLibraryDebounced();
                renderSwatches();
            };
        })(idx));

        var lbl = document.createElement("span");
        lbl.className = "cl-sw-label";
        lbl.style.color = light ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.85)";
        lbl.textContent = col.name;
        sw.appendChild(lbl);

        var del = document.createElement("span");
        del.className = "cl-sw-del";
        del.textContent = "×";
        del.title = "删除颜色";
        del.addEventListener("click", (function (i) {
            return function (e) { e.stopPropagation(); deleteColor(i); };
        })(idx));
        sw.appendChild(del);

        sw.addEventListener("click", (function (i) {
            return function () { applyColor(i); };
        })(idx));

        sw.addEventListener("dblclick", (function (i) {
            return function (e) { e.stopPropagation(); openEditor(i); };
        })(idx));

        return sw;
    }

    function renderAll() {
        renderGroupSelect();
        renderSwatches();
        closeEditor();
        refreshHexFromAI();
    }

    // Ask Illustrator for ICC-accurate hex values, then update swatch tooltips
    function refreshHexFromAI() {
        if (!library.groups.length) return;
        var group = library.groups[curGroup];
        if (!group || !group.colors || !group.colors.length) return;
        cmykToHexViaAI(group.colors, function (map) {
            if (!map) { toast("hex转换：未收到结果"); return; }
            var updated = 0;
            for (var i = 0; i < group.colors.length; i++) {
                if (map[group.colors[i].id]) {
                    group.colors[i].hex = map[group.colors[i].id];
                    updated++;
                }
            }
            if (updated > 0) {
                saveLibraryDebounced();
                renderSwatches();
            }
        });
    }

    // ── Color editor ─────────────────────────────────────────────
    function openEditor(colorIdx) {
        editingIdx = colorIdx;
        var group = library.groups[curGroup];
        var col = (colorIdx >= 0 && group && group.colors[colorIdx])
                  ? group.colors[colorIdx] : null;

        var c = col ? Math.round(col.c) : 0;
        var m = col ? Math.round(col.m) : 0;
        var y = col ? Math.round(col.y) : 0;
        var k = col ? Math.round(col.k) : 0;

        document.getElementById("cl-ed-name").value = col ? col.name : "新颜色";
        var initHex = col && col.hex ? col.hex.replace("#", "") : cmykToHex({c:c,m:m,y:y,k:k}).replace("#", "");
        document.getElementById("cl-ed-hex").value = initHex;
        document.getElementById("cl-ed-c").value = c;
        document.getElementById("cl-ed-m").value = m;
        document.getElementById("cl-ed-y").value = y;
        document.getElementById("cl-ed-k").value = k;

        updateEditorPreview();
        document.getElementById("cl-editor").style.display = "block";
        var ni = document.getElementById("cl-ed-name");
        ni.focus(); ni.select();
    }

    function closeEditor() {
        editingIdx = -2;
        var ed = document.getElementById("cl-editor");
        if (ed) ed.style.display = "none";
    }

    function updateEditorPreview(forceHex) {
        var hexInput = document.getElementById("cl-ed-hex");
        
        if (forceHex) {
            hexInput.value = forceHex.toUpperCase();
        }

        var hexVal = hexInput.value || "000000";
        if (hexVal.length !== 6) {
            var cVal = parseInt(document.getElementById("cl-ed-c").value, 10);
            var mVal = parseInt(document.getElementById("cl-ed-m").value, 10);
            var yVal = parseInt(document.getElementById("cl-ed-y").value, 10);
            var kVal = parseInt(document.getElementById("cl-ed-k").value, 10);
            if (!isNaN(cVal) && !isNaN(mVal) && !isNaN(yVal) && !isNaN(kVal)) {
                var rgb = cmykToRgb(cVal, mVal, yVal, kVal);
                hexVal = h2(rgb.r) + h2(rgb.g) + h2(rgb.b);
            }
        }

        var r = parseInt(hexVal.substring(0, 2), 16) || 0;
        var g = parseInt(hexVal.substring(2, 4), 16) || 0;
        var b = parseInt(hexVal.substring(4, 6), 16) || 0;

        document.getElementById("cl-ed-preview").style.background =
            "rgb(" + r + "," + g + "," + b + ")";

        var rr = document.getElementById("cl-ed-rgb-r");
        var rg = document.getElementById("cl-ed-rgb-g");
        var rb = document.getElementById("cl-ed-rgb-b");
        if (rr) rr.textContent = "R" + r;
        if (rg) rg.textContent = "G" + g;
        if (rb) rb.textContent = "B" + b;
    }

    function saveEditorColor() {
        var name = (document.getElementById("cl-ed-name").value || "").trim() || "新颜色";

        var group = library.groups[curGroup];
        if (!group) return;

        var c = parseInt(document.getElementById("cl-ed-c").value, 10);
        var m = parseInt(document.getElementById("cl-ed-m").value, 10);
        var y = parseInt(document.getElementById("cl-ed-y").value, 10);
        var k = parseInt(document.getElementById("cl-ed-k").value, 10);
        if (isNaN(c)) c = 0; if (isNaN(m)) m = 0; if (isNaN(y)) y = 0; if (isNaN(k)) k = 0;
        c = Math.max(0, Math.min(100, c));
        m = Math.max(0, Math.min(100, m));
        y = Math.max(0, Math.min(100, y));
        k = Math.max(0, Math.min(100, k));

        var hexVal = (document.getElementById("cl-ed-hex").value || "").replace(/^#/, "").toUpperCase();
        if (hexVal.length !== 6) {
            var rgb = cmykToRgb(c, m, y, k);
            hexVal = h2(rgb.r) + h2(rgb.g) + h2(rgb.b);
        }

        var entry = { id: "c" + Date.now(), name: name,
            c: c, m: m, y: y, k: k, hex: hexVal };
        if (editingIdx >= 0 && group.colors[editingIdx]) {
            entry.id = group.colors[editingIdx].id;
            group.colors[editingIdx] = entry;
        } else {
            group.colors.push(entry);
        }

        closeEditor();
        saveLibraryDebounced();
        renderSwatches();
    }

    // ── Apply color to Illustrator selection ─────────────────────
    function applyColor(colorIdx) {
        var group = library.groups[curGroup];
        if (!group || !group.colors[colorIdx]) return;
        var col = group.colors[colorIdx];
        toast("正在应用 C" + Math.round(col.c) + " M" + Math.round(col.m) + " Y" + Math.round(col.y) + " K" + Math.round(col.k) + "...", 800);

        var script =
            '(function(){' +
            'try{' +
            'if(!app.documents.length){return "E:no_doc";}' +
            'var sel=app.activeDocument.selection;' +
            'if(!sel||!sel.length){return "E:no_sel";}' +
            'var ck=new CMYKColor();' +
            'ck.cyan=' + col.c + ';ck.magenta=' + col.m + ';' +
            'ck.yellow=' + col.y + ';ck.black=' + col.k + ';' +
            'var n=0,skipped=0,det={};' +
            'function ap(items){for(var i=0;i<items.length;i++){try{' +
            'var it=items[i],t=it.typename;' +
            'if(t==="GroupItem"){ap(it.pageItems);}' +
            'else if(t==="CompoundPathItem"){var ok=false;if(it.pathItems.length>0){try{it.pathItems[0].fillColor=ck;ok=true;}catch(e1){}}if(ok){n++;}else{skipped++;}}' +
            'else if(t==="TextFrame"){try{it.textRange.characterAttributes.fillColor=ck;n++;}catch(et){try{it.fillColor=ck;n++;}catch(et2){skipped++;}}}' +
            'else if(t==="PathItem"||t==="MeshItem"){try{it.fillColor=ck;n++;}catch(e4){skipped++;}}' +
            'else{det[t]=(det[t]||0)+1;skipped++;}' +
            '}catch(e){skipped++;}}}' +
            'ap(sel);' +
            'var r="OK:"+n;if(skipped>0)r+=" skip:"+skipped;' +
            'var dk=[];for(var k in det)dk.push(k+"("+det[k]+")");' +
            'if(dk.length)r+=" types:"+dk.join(",");' +
            'return r;' +
            '}catch(e4){return "E:apply:"+e4;}' +
            '})();'

        evalAI(script, function (r) {
            if (r && r.indexOf("OK:") === 0) {
                var parts = r.split(" ");
                var n = parseInt(parts[0].slice(3), 10) || 0;
                var msg = n > 0 ? "已应用到 " + n + " 个对象" : "未应用到任何对象（可能对象被锁定或无填色）";
                var skipMatch = r.match(/skip:(\d+)/);
                if (skipMatch) msg += "，跳过 " + skipMatch[1] + " 个";
                var typesMatch = r.match(/types:(.+)/);
                if (typesMatch) msg += "（不支持: " + typesMatch[1] + "）";
                toast(msg);
            } else if (r === "E:no_doc") {
                toast("请先打开 Illustrator 文档");
            } else if (r === "E:no_sel") {
                toast("请先选中对象");
            } else if (r && r.indexOf("E:apply") === 0) {
                toast("应用失败：" + r.slice(8));
            } else if (!r) {
                toast("应用失败：无返回值");
            } else {
                toast("应用返回：" + r);
            }
        });
    }

    // ── Capture fill color from Illustrator selection ─────────────
    function captureFromAI() {
        if (!library.groups.length) {
            toast("请先新建颜色组"); return;
        }

        var script =
            '(function(){' +
            'try{' +
            'if(!app.documents.length){return "E:no_doc";}' +
            'var sel=app.activeDocument.selection;' +
            'if(!sel||!sel.length){return "E:no_sel";}' +
            'var item=sel[0];' +
            'var col;' +
            'if(item.typename==="TextFrame"){' +
            'try{col=item.textRange.characterAttributes.fillColor;}catch(e4){try{col=item.fillColor;}catch(e5){return "E:no_fill";}}' +
'}else if(item.typename==="GroupItem"){' +
'try{if(item.fillColor&&item.fillColor.typename!=="NoColor"){col=item.fillColor;}}catch(eg){col=null;}' +
'if(!col){' +
'for(var gi=0;gi<item.pageItems.length;gi++){' +
'try{var ch=item.pageItems[gi];if(ch.typename==="TextFrame"){col=ch.textRange.characterAttributes.fillColor;}else{col=ch.fillColor;}if(col&&col.typename!=="NoColor")break;}catch(eg2){col=null;}' +
'}' +
'}' +
'if(!col){' +
'try{for(var pi=0;pi<item.pathItems.length;pi++){col=item.pathItems[pi].fillColor;if(col&&col.typename!=="NoColor")break;}}catch(eg3){col=null;}' +
'}' +
'if(!col)return "E:no_fill";' +
            '}else{try{col=item.fillColor;}catch(e2){return "E:no_fill";}}' +
            'if(!col){return "E:no_fill";}' +
            'if(col.typename==="CMYKColor"){' +
            'var c=+col.cyan,m=+col.magenta,y=+col.yellow,k=+col.black;' +
            'var hex="";' +
            'try{' +
            'var rgb=app.convertSampleColor(ImageColorSpace.CMYK,[c,m,y,k],ImageColorSpace.RGB,ColorConvertPurpose.defaultpurpose);' +
            'var h=function(n){var s=Math.round(n).toString(16);return s.length<2?"0"+s:s;};' +
            'hex=h(rgb[0])+h(rgb[1])+h(rgb[2]);' +
            '}catch(e){}' +
            'return "S:"+Math.round(c)+":"+Math.round(m)+":"+Math.round(y)+":"+Math.round(k)+(hex?":"+hex:"");' +
            '}' +
            'if(col.typename==="RGBColor"){' +
            'var h=function(n){var s=Math.round(n).toString(16);return s.length<2?"0"+s:s;};' +
            'var hex=h(col.red)+h(col.green)+h(col.blue);' +
            'var r=col.red/255,g=col.green/255,b=col.blue/255;' +
            'var k=1-Math.max(r,g,b);' +
            'if(k>=1){return "S:0:0:0:100:"+hex;}' +
            'var ic=1-k;' +
            'return "S:"+Math.round((ic-r)/ic*100)+":"+Math.round((ic-g)/ic*100)+":"+Math.round((ic-b)/ic*100)+":"+Math.round(k*100)+":"+hex;' +
            '}' +
            'if(col.typename==="NoColor"){return "E:no_fill";}' +
            'if(col.typename==="SpotColor"){' +
            'var sc=col.spot.color;' +
            'if(sc.typename==="CMYKColor"){' +
            'var c=+sc.cyan,m=+sc.magenta,y=+sc.yellow,k=+sc.black;' +
            'var hex="";' +
            'try{' +
            'var rgb=app.convertSampleColor(ImageColorSpace.CMYK,[c,m,y,k],ImageColorSpace.RGB,ColorConvertPurpose.defaultpurpose);' +
            'var h=function(n){var s=Math.round(n).toString(16);return s.length<2?"0"+s:s;};' +
            'hex=h(rgb[0])+h(rgb[1])+h(rgb[2]);' +
            '}catch(e){}' +
            'return "S:"+Math.round(c)+":"+Math.round(m)+":"+Math.round(y)+":"+Math.round(k)+(hex?":"+hex:"");' +
            '}' +
            '}' +
            'return "E:type:"+col.typename;' +
            '}catch(e3){return "E:err";}' +
            '})()';

        evalAI(script, function (r) {
            if (r === undefined || r === null || r === "") {
                toast("提取失败"); return;
            }
            if (r.indexOf("E:") === 0) {
                if (r === "E:no_doc") toast("请先打开 Illustrator 文档");
                else if (r === "E:no_sel") toast("请先选中对象");
                else if (r === "E:no_fill") toast("所选对象无填色");
                else if (r.indexOf("E:type") === 0) toast("不支持的颜色类型");
                else toast("提取失败");
                return;
            }
            if (r.indexOf("S:") === 0) {
                var parts = r.slice(2).split(":");
                var c = Math.round(+parts[0]), m = Math.round(+parts[1]), y = Math.round(+parts[2]), k = Math.round(+parts[3]);
                var hex = parts.length >= 5 ? parts[4] : cmykToHex({c:c,m:m,y:y,k:k}).replace("#", "");
                editingIdx = -1;
                document.getElementById("cl-ed-name").value = "C" + c + " M" + m + " Y" + y + " K" + k;
                document.getElementById("cl-ed-hex").value = hex.toUpperCase();
                document.getElementById("cl-ed-c").value = c;
                document.getElementById("cl-ed-m").value = m;
                document.getElementById("cl-ed-y").value = y;
                document.getElementById("cl-ed-k").value = k;
                updateEditorPreview();
                document.getElementById("cl-editor").style.display = "block";
                var ni = document.getElementById("cl-ed-name");
                ni.focus(); ni.select();
            }
        });
    }

    // ── Import JSON (entire library) ──────────────────────────────
    function importJSONAll() {
        var script =
            '(function(){' +
            'var f=File.openDialog("导入颜色库 JSON","JSON文件:*.json,所有文件:*");' +
            'if(!f){return "CANCELLED";}' +
            'f.encoding="UTF-8";f.open("r");var raw=f.read();f.close();return raw;' +
            '})()';

        evalAI(script, function (r) {
            if (!r || r === "CANCELLED" || r === "undefined") return;
            var imp;
            try { imp = JSON.parse(r); } catch (e) { return; }
            if (!imp || !Array.isArray(imp.groups)) {
                return;
            }

            if (library.groups.length > 0) {
                // Default to merge (add only new groups, skip duplicates by name)
                var added = 0;
                for (var i = 0; i < imp.groups.length; i++) {
                    var ig = imp.groups[i];
                    var exists = false;
                    for (var j = 0; j < library.groups.length; j++) {
                        if (library.groups[j].name === ig.name) { exists = true; break; }
                    }
                    if (!exists) { library.groups.push(ig); added++; }
                }
                curGroup = library.groups.length - 1;
            } else {
                library = imp;
                if (!library.groups) library.groups = [];
                curGroup = 0;
            }

            saveLibrary();
            renderAll();
        });
    }

    // ── Export JSON (entire library) ──────────────────────────────
    function exportJSONAll() {
        if (!library.groups.length) { return; }

        var json = JSON.stringify(library, null, 2);
        var script =
            '(function(){' +
            'var f=File.saveDialog("导出颜色库","JSON文件:*.json");' +
            'if(!f){return "CANCELLED";}' +
            'var path=f.fsName;' +
            'if(path.slice(-5).toLowerCase()!==".json"){f=new File(path+".json");}' +
            'f.encoding="UTF-8";f.open("w");' +
            'f.write(decodeURIComponent("' + encodeURIComponent(json) + '"));' +
            'f.close();return "OK";' +
            '})()';

        evalAI(script, function (r) {
            // Silent — export dialog success/cancel handled by ExtendScript
        });
    }

    // ── Import group JSON ────────────────────────────────────────
    function importGroupJSON() {
        var script =
            '(function(){' +
            'var f=File.openDialog("导入颜色组 JSON","JSON文件:*.json,所有文件:*");' +
            'if(!f){return "CANCELLED";}' +
            'f.encoding="UTF-8";f.open("r");var raw=f.read();f.close();return raw;' +
            '})()';

        evalAI(script, function (r) {
            if (!r || r === "CANCELLED" || r === "undefined") return;
            var imp;
            try { imp = JSON.parse(r); } catch (e) { return; }
            if (!imp || !Array.isArray(imp.groups) || imp.groups.length === 0) {
                return;
            }

            // Add first group from imported file to current library
            var newGroup = imp.groups[0];
            var baseName = newGroup.name || "导入的颜色组";
            var name = baseName;
            var counter = 1;
            while (library.groups.some(function (g) { return g.name === name; })) {
                name = baseName + " " + (counter++);
            }
            newGroup.name = name;
            newGroup.id = "g" + Date.now();
            library.groups.push(newGroup);
            curGroup = library.groups.length - 1;

            saveLibrary();
            renderAll();
        });
    }

    // ── Export group JSON ────────────────────────────────────────
    function exportGroupJSON() {
        if (!library.groups.length) { return; }
        var group = library.groups[curGroup];
        if (!group) return;

        // Export only the current group as a single-group library
        var json = JSON.stringify({ version: "1.0", groups: [group] }, null, 2);
        var script =
            '(function(){' +
            'var f=File.saveDialog("导出颜色组","JSON文件:*.json");' +
            'if(!f){return "CANCELLED";}' +
            'var path=f.fsName;' +
            'if(path.slice(-5).toLowerCase()!==".json"){f=new File(path+".json");}' +
            'f.encoding="UTF-8";f.open("w");' +
            'f.write(decodeURIComponent("' + encodeURIComponent(json) + '"));' +
            'f.close();return "OK";' +
            '})()';

        evalAI(script, function (r) {
            // Silent — export dialog success/cancel handled by ExtendScript
        });
    }

    // ── Group management ─────────────────────────────────────────
    function addGroup() {
        var baseName = "新颜色组";
        var name = baseName;
        var counter = 1;
        while (library.groups.some(function (g) { return g.name === name; })) {
            name = baseName + " " + (counter++);
        }
        var newGroup = { id: "g" + Date.now(), name: name, colors: [] };
        library.groups.push(newGroup);
        sortGroups("asc");
        for (var i = 0; i < library.groups.length; i++) {
            if (library.groups[i].id === newGroup.id) { curGroup = i; break; }
        }
        saveLibraryDebounced();
        renderAll();
        showGroupRenameInput(curGroup);
    }

    function renameGroup() {
        if (!library.groups.length) return;
        showGroupRenameInput(curGroup);
    }

    function showGroupRenameInput(groupIdx) {
        var g = library.groups[groupIdx];
        if (!g) return;

        var select = document.getElementById("cl-group-select");
        var input  = document.getElementById("cl-group-rename-input");
        if (!input) {
            input = document.createElement("input");
            input.type = "text";
            input.id = "cl-group-rename-input";
            input.className = "cl-group-rename-input";
            select.parentNode.insertBefore(input, select.nextSibling);
        }

        input.value = g.name;
        select.style.display = "none";
        input.style.display = "";
        input.focus();
        input.select();

        function finishEdit(save) {
            var newName = save ? (input.value.trim() || g.name) : g.name;
            if (newName !== g.name) {
                g.name = newName;
        loadSwatches(); // includes sortGroups("asc")
                saveLibraryDebounced();
            }
            input.style.display = "none";
            select.style.display = "";
            renderAll();
        }

        input.onblur = function () { finishEdit(true); };
        input.onkeydown = function (e) {
            if (e.key === "Enter") { e.preventDefault(); finishEdit(true); }
            if (e.key === "Escape") { e.preventDefault(); finishEdit(false); }
        };
    }

    function deleteGroup() {
        if (!library.groups.length) return;
        library.groups.splice(curGroup, 1);
        curGroup = Math.max(0, Math.min(curGroup, library.groups.length - 1));
        saveLibraryDebounced(); renderAll();
    }

    function sortGroups(dir) {
        if (library.groups.length < 2) return;
        var currentId = library.groups[curGroup] ? library.groups[curGroup].id : null;
        dir = dir || sortDir;
        library.groups.sort(function (a, b) {
            var v = a.name.localeCompare(b.name, "zh-Hant");
            return dir === "desc" ? -v : v;
        });
        if (currentId) {
            for (var i = 0; i < library.groups.length; i++) {
                if (library.groups[i].id === currentId) { curGroup = i; break; }
            }
        }
        updateSortMenuText();
    }

    function toggleSortDirection() {
        sortDir = sortDir === "asc" ? "desc" : "asc";
        sortGroups(sortDir);
    }

    function updateSortMenuText() {
        var el = document.getElementById("cl-mi-sort-groups");
        if (el) el.textContent = sortDir === "asc" ? "⇅ 按名称升序" : "⇅ 按名称降序";
    }

    // ── Color delete ─────────────────────────────────────────────
    function deleteColor(idx) {
        var group = library.groups[curGroup];
        if (!group) return;
        group.colors.splice(idx, 1);
        saveLibraryDebounced(); renderSwatches();
    }

    // ── UI event bindings ─────────────────────────────────────────
    function bindUI() {
        // Group selector
        document.getElementById("cl-group-select").addEventListener("change", function () {
            var v = parseInt(this.value, 10);
            if (!isNaN(v)) { curGroup = v; closeEditor(); renderSwatches(); }
        });

        // ••• More menu
        var moreBtn  = document.getElementById("cl-btn-more");
        var moreMenu = document.getElementById("cl-more-menu");

        moreBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            var hasGroups = library.groups.length > 0;

            // Gray out items that require an existing group
            ["cl-mi-rename-group", "cl-mi-del-group", "cl-mi-export-all", "cl-mi-export-group"].forEach(function (id) {
                var el = document.getElementById(id);
                hasGroups ? el.classList.remove("cl-menu-disabled")
                          : el.classList.add("cl-menu-disabled");
            });

            // Position menu below the button, right-aligned
            var r = moreBtn.getBoundingClientRect();
            moreMenu.style.top   = (r.bottom + 3) + "px";
            moreMenu.style.right = (window.innerWidth - r.right) + "px";
            moreMenu.classList.toggle("cl-menu-open");
        });

        // Close on outside click
        document.addEventListener("click", function () {
            moreMenu.classList.remove("cl-menu-open");
        });
        // Don't close when clicking inside the menu itself
        moreMenu.addEventListener("click", function (e) { e.stopPropagation(); });

        // Menu items
        function menuAction(id, fn) {
            document.getElementById(id).addEventListener("click", function () {
                moreMenu.classList.remove("cl-menu-open");
                fn();
            });
        }
        menuAction("cl-mi-add-group",    addGroup);
        menuAction("cl-mi-rename-group", renameGroup);
        menuAction("cl-mi-sort-groups",  toggleSortDirection);
        menuAction("cl-mi-del-group",    deleteGroup);
        menuAction("cl-mi-import-all",   importJSONAll);
        menuAction("cl-mi-export-all",   exportJSONAll);
        menuAction("cl-mi-import-group", importGroupJSON);
        menuAction("cl-mi-export-group", exportGroupJSON);

        // Main action buttons
        document.getElementById("cl-btn-add-color").addEventListener("click", function () {
            if (!library.groups.length) return;
            openEditor(-1);
        });
        document.getElementById("cl-btn-capture").addEventListener("click", captureFromAI);

        // Editor: CMYK inputs → update hex via AI
        ["cl-ed-c", "cl-ed-m", "cl-ed-y", "cl-ed-k"].forEach(function (id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener("input", function () {
                // Strip non-numeric characters
                this.value = this.value.replace(/[^0-9]/g, "");
                var nc = parseInt(document.getElementById("cl-ed-c").value, 10);
                var nm = parseInt(document.getElementById("cl-ed-m").value, 10);
                var ny = parseInt(document.getElementById("cl-ed-y").value, 10);
                var nk = parseInt(document.getElementById("cl-ed-k").value, 10);
                if (isNaN(nc) || isNaN(nm) || isNaN(ny) || isNaN(nk)) return;
                var cc = Math.max(0, Math.min(100, nc));
                var mm = Math.max(0, Math.min(100, nm));
                var yy = Math.max(0, Math.min(100, ny));
                var kk = Math.max(0, Math.min(100, nk));
                // Convert CMYK to hex via AI ICC profile
                var script2 =
                    '(function(){' +
                    'try{' +
                    'var rgb=app.convertSampleColor(ImageColorSpace.CMYK,[' + cc + ',' + mm + ',' + yy + ',' + kk + '],ImageColorSpace.RGB,ColorConvertPurpose.defaultpurpose);' +
                    'var h=function(n){var s=Math.round(n).toString(16);return s.length<2?"0"+s:s;};' +
                    'return h(rgb[0])+h(rgb[1])+h(rgb[2]);' +
                    '}catch(e){return "E:err";}' +
                    '})()';
                evalAI(script2, function (res) {
                    if (res && res.indexOf("E:") !== 0 && res.length === 6) {
                        updateEditorPreview(res);
                    } else {
                        updateEditorPreview();
                    }
                });
            });
        });

        // Editor: Hex input → update preview only (no auto CMYK conversion)
        var hexInput = document.getElementById("cl-ed-hex");
        hexInput.addEventListener("input", function () {
            var raw = this.value.replace(/^#/, "").replace(/[^0-9a-fA-F]/g, "");
            this.value = raw.toUpperCase();
            updateEditorPreview();
        });
        document.getElementById("cl-ed-ok").addEventListener("click", saveEditorColor);
        document.getElementById("cl-ed-cancel").addEventListener("click", closeEditor);
        document.getElementById("cl-editor").addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); saveEditorColor(); }
            if (e.key === "Escape") closeEditor();
        });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        // One-time: clear stale localStorage from previous debugging sessions
        try {
            if (!window.localStorage.getItem("MomoTools_migrated_v16")) {
                window.localStorage.removeItem("MomoTools_ColorLibrary");
                window.localStorage.setItem("MomoTools_migrated_v16", "1");
            }
        } catch (e) {}

        curGroup = 0;
        renderAll();
        bindUI();
        initPath(function () { loadLibrary(); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
