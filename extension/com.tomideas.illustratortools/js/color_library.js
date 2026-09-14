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
    var library    = { version: "2.0", groups: [] };
    var Color = window.MomoColorSource;
    var editorSource = null, editorRevision = 0, editorPending = false, editorPreviewValid = true;
    var libraryLoaded = false, captureRequest = 0;
    var sortDir    = "asc"; // asc / desc

    var curGroup   = 0;   // current group index
    var libPath    = null; // native FS path, resolved on init
    var editingIdx = -2;  // -2=closed, -1=new color, ≥0=edit existing
    var saveTimer  = null; // debounce timer for saveLibrary

    function clearReferenceColor() {
        window.MomoToolsColorReference = null;
        var swatches = document.querySelectorAll(".cl-sw-reference");
        for (var i = 0; i < swatches.length; i++) {
            swatches[i].classList.remove("cl-sw-reference");
        }
    }

    function setReferenceColor(col, swatch) {
        clearReferenceColor();
        window.MomoToolsColorReference = { source: Color.source(col) };
        swatch.classList.add("cl-sw-reference");
    }

    window.MomoToolsClearColorReference = clearReferenceColor;

    // ── Path init (async via evalScript) ────────────────────────
    // 用 ExtendScript 建立目录（cep.fs.makedir 在部分环境不可靠，会导致目录建不出来 → 写文件全失败）。
    // Folder().create() 已在导入/导出功能验证可靠。
    function initPath(cb) {
        evalAI(
            '(function(){' +
            'var dir=Folder.userData.fsName+"/MomoTools";' +
            'var fdr=new Folder(dir);' +
            'if(!fdr.exists){fdr.create();}' +
            'return dir+"/color_library.json";' +
            '})()',
            function (p) { libPath = p || ""; if (cb) cb(); }
        );
    }

    // ExtendScript 写文件后备：cep.fs.writeFile 仍失败时改用此法（与导出相同机制，可靠）。
    function writeFileViaAI(json, cb) {
        if (!libPath) return;
        var script =
            '(function(){try{' +
            'var f=new File(decodeURIComponent("' + encodeURIComponent(libPath) + '"));' +
            'f.encoding="UTF-8";if(!f.open("w")){return "ERR";}' +
            'f.write(decodeURIComponent("' + encodeURIComponent(json) + '"));' +
            'f.close();return "OK";' +
            '}catch(e){return "ERR:"+e;}})()';
        evalAI(script, function (r) { if(cb)cb(r === "OK"); });
    }

    function validLibrary(value) {
        if(!value || !Array.isArray(value.groups))return false;
        try {
            value.groups.forEach(function(group) {
                if(!group || typeof group.name!=="string" || !Array.isArray(group.colors))throw new Error("颜色组数据无效");
                group.colors.forEach(function(col) {
                    if(!col || typeof col.name!=="string" || (col.hex!==undefined && typeof col.hex!=="string"))throw new Error("颜色数据无效");
                    Color.source(col);
                });
            });
            return true;
        }catch(e){return false;}
    }

    // ── File I/O via cep.fs ──────────────────────────────────────
    var FS_UTF8 = "UTF-8"; // CEP expects an encoding name, not a numeric constant.

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
                        if (validLibrary(parsed)) {
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
                    if (validLibrary(parsed)) {
                        library = parsed;
                        loaded = true;
                    }
                }
            } catch (e) {}
        }

        libraryLoaded = true;
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
        if (!libraryLoaded) return;
        library.version = "2.0";
        var json = JSON.stringify(library, null, 2);

        var fsErr = false;
        var fsAttempted = false;  // 是否真的尝试过写文件（libPath 有效 + cep.fs 可用）

        if (libPath) {
            var fs = getCepFs();
            if (fs) {
                fsAttempted = true;
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

        var lsErr = false;
        try {
            window.localStorage.setItem("MomoTools_ColorLibrary", json);
        } catch (e) {
            lsErr = true;
        }

        // cep.fs 写文件失败时，改用 ExtendScript 后备写入（异步，通常可靠）
        var aiFallback = false;
        if (fsErr && libPath) {
            writeFileViaAI(json, function(ok) {
                if(!ok)toast(lsErr ? "保存失败：文件与本地存储均不可用" : "已暂存本地，文件保存失败，请导出备份");
            });
            aiFallback = true;
        }

        // 警告策略：只有在「文件确实写不进 + 也没有后备 + localStorage 也失败」时才强提示。
        // 有 ExtendScript 后备时不再吓人提示（后备通常会成功，localStorage 也有副本）。
        if (fsErr && !aiFallback && lsErr) {
            toast("保存失败：文件与本地存储均不可用");
        } else if (!fsAttempted && !libPath && lsErr) {
            toast("保存失败：本地存储不可用");
        }
    }

    function saveLibraryDebounced() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveLibrary, 200);
    }

    // 立即落盘：清掉待执行的防抖计时器并同步保存。
    // 面板关闭 / Illustrator 退出时调用，避免 200ms 防抖窗口内的改动丢失（问题 #1）。
    function flushSave() {
        if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
        saveLibrary();
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

    // Preview is derived from the original color, never the other way around.
    function colorInfo(source, cb) {
        var script = '(function(){try{' + Color.prelude() +
            'return MomoColor.json(MomoColor.info(' + Color.literal(source) + '));' +
            '}catch(e){return "E:"+e;}})()';
        evalAI(script, function (r) {
            try { var result = JSON.parse(r); if (result && result.source && result.hex) { cb(result); return; } } catch (e) {}
            cb(null);
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
        try { return Color.label(Color.source(col)); } catch (e) { return "颜色数据无效"; }
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
        clearReferenceColor();
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
            + "\n\n单击设为参考色并应用填充，双击编辑，拖动排序";

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

        var edit = document.createElement("span");
        edit.className = "cl-sw-edit";
        edit.textContent = "✎";
        edit.title = "编辑颜色";
        edit.addEventListener("click", (function (i) {
            return function (e) { e.stopPropagation(); openEditor(i); };
        })(idx));
        sw.appendChild(edit);

        sw.addEventListener("click", (function (i, color, node) {
            return function () {
                setReferenceColor(color, node);
                applyColor(i);
            };
        })(idx, col, sw));

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

    function refreshHexFromAI() {
        var group = library.groups[curGroup];
        if (!group || !group.colors || !group.colors.length) return;
        var colors = group.colors.slice(), sources;
        try { sources = colors.map(function(c) { return Color.source(c); }); } catch(e) { toast(e.message); return; }
        var script = '(function(){' + Color.prelude() + 'var a=' + Color.literal(sources) + ',out=[];' +
            'for(var i=0;i<a.length;i++){try{out.push(MomoColor.info(a[i]));}catch(e){out.push(null);}}return MomoColor.json(out);})()';
        evalAI(script, function(raw) {
            var result; try { result = JSON.parse(raw); } catch(e) { return; }
            if (!Array.isArray(result)) return;
            for(var i=0;i<colors.length;i++) {
                var col=colors[i];
                // A late preview must not alter a color edited/deleted while conversion ran.
                if(result[i] && group.colors.indexOf(col)>=0 && Color.literal(Color.source(col))===Color.literal(sources[i])) {
                    col.hex=result[i].hex;
                    col.c=result[i].cmyk[0];col.m=result[i].cmyk[1];col.y=result[i].cmyk[2];col.k=result[i].cmyk[3];
                    col.source=sources[i];
                }
            }
            saveLibraryDebounced();
            if(library.groups[curGroup]===group) renderSwatches();
        });
    }

    // ── Color editor ─────────────────────────────────────────────
    function openEditor(colorIdx) {
        editorRevision++;
        editorPending = false;
        editorPreviewValid = true;
        document.getElementById("cl-ed-ok").disabled = false;
        editingIdx = colorIdx;
        var group = library.groups[curGroup];
        var col = (colorIdx >= 0 && group && group.colors[colorIdx])
                  ? group.colors[colorIdx] : null;

        var c = col ? col.c : 0;
        var m = col ? col.m : 0;
        var y = col ? col.y : 0;
        var k = col ? col.k : 0;

        editorSource = Color.source(col || {c:0,m:0,y:0,k:0});
        if(editorSource.type==="CMYK"){c=editorSource.values[0];m=editorSource.values[1];y=editorSource.values[2];k=editorSource.values[3];}
        showSource();
        document.getElementById("cl-ed-name").value = col ? col.name : "新颜色";
        var initHex = col && col.hex ? col.hex.replace("#", "") : cmykToHex({c:c,m:m,y:y,k:k}).replace("#", "");
        document.getElementById("cl-ed-hex").value = initHex;
        document.getElementById("cl-ed-c").value = c;
        document.getElementById("cl-ed-m").value = m;
        document.getElementById("cl-ed-y").value = y;
        document.getElementById("cl-ed-k").value = k;

        updateEditorPreview();
        // 删除键仅在编辑已有颜色时显示；新增颜色（-1）时隐藏
        var delBtn = document.getElementById("cl-ed-del");
        if (delBtn) delBtn.style.display = (colorIdx >= 0) ? "" : "none";
        document.getElementById("cl-editor").style.display = "block";
        var ni = document.getElementById("cl-ed-name");
        ni.focus(); ni.select();
        if(col)updateSourcePreview();
    }

    function closeEditor() {
        editorRevision++;
        editorPending = false;
        editorSource = null;
        editingIdx = -2;
        var ed = document.getElementById("cl-editor");
        if (ed) ed.style.display = "none";
    }

    function updateEditorPreview(forceHex) {
        var hexInput = document.getElementById("cl-ed-hex");
        
        if (forceHex) {
            hexInput.value = forceHex.toUpperCase();
        }

        var hexVal = hexInput.value;
        if(!/^[0-9a-fA-F]{6}$/.test(hexVal)) {
            document.getElementById("cl-ed-preview").style.background="transparent";
            ["r","g","b"].forEach(function(key){document.getElementById("cl-ed-rgb-"+key).textContent="—";});
            return;
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

    function showSource() {
        var el = document.getElementById("cl-ed-source");
        if(el && editorSource) el.textContent = Color.label(editorSource) + " · 原值保存";
    }

    function updateSourcePreview() {
        var revision = ++editorRevision;
        editorPending = true;
        editorPreviewValid = false;
        document.getElementById("cl-ed-ok").disabled = true;
        showSource();
        colorInfo(editorSource, function(info) {
            if(revision !== editorRevision || editingIdx === -2) return;
            editorPending = false;
            document.getElementById("cl-ed-ok").disabled = false;
            if(!info) { document.getElementById("cl-ed-hex").value="";updateEditorPreview();toast("预览转换失败；原始色值仍会保留");return; }
            editorPreviewValid=true;
            ["c","m","y","k"].forEach(function(key,i){document.getElementById("cl-ed-"+key).value=info.cmyk[i];});
            updateEditorPreview(info.hex);
        });
    }

    function saveEditorColor() {
        if (editorPending || !editorSource || editingIdx === -2) return;
        try { Color.validate(editorSource); } catch(e) { toast(e.message); return; }
        var name = (document.getElementById("cl-ed-name").value || "").trim() || "新颜色";
        var group = library.groups[curGroup];
        if (!group) return;
        var cmyk = ["c","m","y","k"].map(function(key){return Number(document.getElementById("cl-ed-"+key).value)||0;});
        if(editorSource.type === "CMYK") cmyk = editorSource.values.slice();
        var hex = document.getElementById("cl-ed-hex").value.replace(/^#/, "").toUpperCase();
        var entry = {id:"c"+Date.now(),name:name,source:Color.source({source:editorSource}),
            c:cmyk[0],m:cmyk[1],y:cmyk[2],k:cmyk[3]};
        if(editorPreviewValid && /^[0-9A-F]{6}$/.test(hex))entry.hex=hex;
        if (editingIdx >= 0 && group.colors[editingIdx]) {
            entry.id = group.colors[editingIdx].id;
            group.colors[editingIdx] = entry;
        } else { group.colors.push(entry); }
        closeEditor();
        saveLibraryDebounced();
        renderSwatches();
        refreshHexFromAI();
    }

    // ── Apply color to Illustrator selection ─────────────────────
    function applyColor(colorIdx) {
        var group = library.groups[curGroup];
        if (!group || !group.colors[colorIdx]) return;
        var col = group.colors[colorIdx];
        var original; try { original = Color.source(col); } catch(e) { toast(e.message); return; }
        toast("正在应用 " + Color.label(original) + "...", 800);

        var script =
            '(function(){' +
            'try{' +
            'if(!app.documents.length){return "E:no_doc";}' +
            'var sel=app.activeDocument.selection;' +
            'if(!sel||!sel.length){return "E:no_sel";}' +
            Color.prelude() +
            'var ck=MomoColor.make(' + Color.literal(original) + ',app.activeDocument);' +
            'var converted=(' + Color.literal(original.type) + '==="RGB"&&app.activeDocument.documentColorSpace===DocumentColorSpace.CMYK)||(' + Color.literal(original.type) + '==="CMYK"&&app.activeDocument.documentColorSpace===DocumentColorSpace.RGB);' +
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
            'var r="OK:"+n;if(converted)r+=" converted";if(skipped>0)r+=" skip:"+skipped;' +
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
                if(r.indexOf(" converted")>=0)msg+="（已按目标文档颜色模式转换）";
                var skipMatch = r.match(/skip:(\d+)/);
                if (skipMatch) msg += "，跳过 " + skipMatch[1] + " 个";
                var typesMatch = r.match(/types:(.+)/);
                if (typesMatch) msg += "（不支持: " + typesMatch[1] + "）";
                toast(msg);
            } else if (r === "E:no_doc") {
                toast("请先打开 Illustrator 文档");
            } else if (r === "E:no_sel") {
                toast("已设为参考色；可点击「填充颜色」或「描边色」");
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
        var captureGroup=library.groups[curGroup],captureRevision=editorRevision,request=++captureRequest;
        if (!library.groups.length) {
            toast("请先新建颜色组"); return;
        }

        var script =
            '(function(){' +
            'try{' +
            'if(!app.documents.length){return "E:no_doc";}' +
            'var sel=app.activeDocument.selection;' +
            'if(!sel||!sel.length){return "E:no_sel";}' +
            // 递归查找填色：路径/网格/文字/复合路径/嵌套群组都钻进去找第一个真实填色
            'function findFill(it){' +
            'if(!it){return null;}' +
            'try{if(it.hidden){return null;}}catch(e0){}' +
            'var tn=it.typename,c;' +
            'try{' +
            'if(tn==="TextFrame"){' +
            'try{c=it.textRange.characterAttributes.fillColor;}catch(e){c=null;}' +
            'if(c&&c.typename!=="NoColor"){return c;}' +
            'try{c=it.fillColor;}catch(e2){c=null;}' +
            'return (c&&c.typename!=="NoColor")?c:null;' +
            '}' +
            'if(tn==="PathItem"){' +
            'try{if(it.filled===false||it.clipping){return null;}c=it.fillColor;}catch(e3){c=null;}' +
            'return (c&&c.typename!=="NoColor")?c:null;' +
            '}' +
            'if(tn==="MeshItem"){' +
            'try{c=it.fillColor;}catch(e3){c=null;}' +
            'return (c&&c.typename!=="NoColor")?c:null;' +
            '}' +
            'if(tn==="CompoundPathItem"){' +
            'try{for(var i=0;i<it.pathItems.length;i++){var p=it.pathItems[i];if(p.hidden||p.filled===false||p.clipping){continue;}c=p.fillColor;if(c&&c.typename!=="NoColor"){return c;}}}catch(e4){}' +
            'return null;' +
            '}' +
            'if(tn==="GroupItem"){' +
            'try{for(var j=0;j<it.pageItems.length;j++){c=findFill(it.pageItems[j]);if(c){return c;}}}catch(e5){}' +
            'return null;' +
            '}' +
            'try{c=it.fillColor;if(c&&c.typename!=="NoColor"){return c;}}catch(e6){}' +
            '}catch(e7){}' +
            'return null;' +
            '}' +
            'var col=null;' +
            'for(var s=0;s<sel.length;s++){col=findFill(sel[s]);if(col){break;}}' +
            'if(!col){return "E:no_fill";}' +
            Color.prelude() +
            'var original=MomoColor.read(col),info;' +
            'try{info=MomoColor.info(original);}catch(ep){info={source:original};}' +
            'return "S:"+MomoColor.json(info);' +
            '}catch(e3){return "E:type:"+e3;}' +
            '})()';

        evalAI(script, function (r) {
            if(request!==captureRequest || captureRevision!==editorRevision || library.groups[curGroup]!==captureGroup)return;
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
                var info; try { info=JSON.parse(r.slice(2)); Color.validate(info.source); } catch(e) { toast("提取结果无效"); return; }
                openEditor(-1);
                editorSource=info.source;
                showSource();
                document.getElementById("cl-ed-name").value=Color.label(editorSource);
                if(info.cmyk) ["c","m","y","k"].forEach(function(key,i){document.getElementById("cl-ed-"+key).value=info.cmyk[i];});
                if(info.hex){editorPreviewValid=true;updateEditorPreview(info.hex);}
                else updateSourcePreview();
                var ni=document.getElementById("cl-ed-name");ni.focus();ni.select();
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
            if (!validLibrary(imp)) {
                toast("导入失败：颜色库数据无效");return;
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
            if (!validLibrary(imp) || imp.groups.length === 0) {
                toast("导入失败：颜色组数据无效");return;
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
        var json = JSON.stringify({ version: "2.0", groups: [group] }, null, 2);
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
                sortGroups("asc");
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
            if (!isNaN(v)) { curGroup = v; closeEditor(); renderSwatches(); refreshHexFromAI(); }
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

        // Editing CMYK explicitly creates a process CMYK source; HEX creates an RGB source.
        ["cl-ed-c", "cl-ed-m", "cl-ed-y", "cl-ed-k"].forEach(function(id) {
            document.getElementById(id).addEventListener("input", function() {
                var values=["c","m","y","k"].map(function(key){var raw=document.getElementById("cl-ed-"+key).value.trim();return raw===""?NaN:Number(raw);});
                var next={type:"CMYK",values:values};
                try { Color.validate(next); } catch(e) { editorRevision++;editorPending=true;document.getElementById("cl-ed-ok").disabled=true;return; }
                editorSource=next;
                updateSourcePreview();
            });
        });
        document.getElementById("cl-ed-hex").addEventListener("input", function() {
            var raw=this.value.replace(/^#/, "").toUpperCase();this.value=raw;
            if(!/^[0-9A-F]{6}$/.test(raw)){editorRevision++;editorPending=true;document.getElementById("cl-ed-ok").disabled=true;return;}
            var rgb=hexToRgb(raw);
            editorSource={type:"RGB",values:[rgb.r,rgb.g,rgb.b]};
            updateEditorPreview(raw);
            updateSourcePreview();
        });
        document.getElementById("cl-ed-ok").addEventListener("click", saveEditorColor);
        document.getElementById("cl-ed-cancel").addEventListener("click", closeEditor);
        document.getElementById("cl-ed-del").addEventListener("click", function () {
            if (editingIdx >= 0) { deleteColor(editingIdx); }
            closeEditor();
        });
        document.getElementById("cl-editor").addEventListener("keydown", function (e) {
            if (e.key === "Enter") { e.preventDefault(); saveEditorColor(); }
            if (e.key === "Escape") closeEditor();
        });
    }

    // ── Init ──────────────────────────────────────────────────────
    function init() {
        // 注意：旧版本曾在此清除 localStorage 颜色库（migrated_v16）。
        // 已移除 —— CEF 缓存被清时该标记也会消失，导致重启后再次清空用户数据（问题 #4）。

        curGroup = 0;
        renderAll();
        bindUI();
        initPath(function () { loadLibrary(); });

        // 面板关闭 / Illustrator 退出时立即落盘，避免 200ms 防抖窗口内的改动丢失（问题 #1）
        window.addEventListener("beforeunload", flushSave);
        window.addEventListener("pagehide", flushSave);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
