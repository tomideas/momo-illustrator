#target illustrator

$.evalFile(File($.fileName).parent + "/_shared.jsx");

(function () {
var SCRIPT_VERSION = "1.0.0";
function clamp(v, lo, hi) {
return Math.max(lo, Math.min(hi, v));
}
function toNum(v, d) {
var n = Number(v);
return isNaN(n) ? d : n;
}
function getAB() {
var i = doc.artboards.getActiveArtboardIndex();
var r = doc.artboards[i].artboardRect;
return {B: r[3], H: r[1] - r[3], L: r[0], R: r[2], T: r[1], W: r[2] - r[0]};
}
function getAllAB() {
var artboards = [];
for (var i = 0; i < doc.artboards.length; i += 1) { 
var r = doc.artboards[i].artboardRect;
artboards.push({bounds: {B: r[3], H: r[1] - r[3], L: r[0], R: r[2], T: r[1], W: r[2] - r[0]}, index: i, name: doc.artboards[i].name});}
return artboards;
}
function withPadSides(b, t, r, bt, l) {
t = Math.max(0, (t) || (0));
r = Math.max(0, (r) || (0));
bt = Math.max(0, (bt) || (0));
l = Math.max(0, (l) || (0));
return {B: b.B + bt, H: (b.T - b.B) - (t + bt), L: b.L + l, R: b.R - r, T: b.T - t, W: (b.R - b.L) - (l + r)};
}
function ensureLayer(name) {
for (var i = 0; i < doc.layers.length; i += 1) { 
if (doc.layers[i].name === name) { 
return doc.layers[i];
}}
var L = doc.layers.add();
L.name = name;
return L;
}
function ensureSubLayer(parent, name) {
for (var i = 0; i < parent.layers.length; i += 1) { 
if (parent.layers[i].name === name) { 
return parent.layers[i];
}}
var L = parent.layers.add();
L.name = name;
return L;
}
function clearLayer(L) {
try {
var a = L.pageItems;
for (var i = a.length - 1; i >= 0; i--) { 
a[i].remove();}
} catch (e) {
}
}
function clearLayerDeep(L) {
try {
var items = L.pageItems;
for (var i = items.length - 1; i >= 0; i--) { 
items[i].remove();}
for (var j = L.layers.length - 1; j >= 0; j--) { 
clearLayerDeep(L.layers[j]);}
} catch (e) {
}
}
function removeLayer(name) {
for (var i = doc.layers.length - 1; i >= 0; i--) { 
var L = doc.layers[i];
if (L.name === name) { 
try {
L.remove();
} catch (e) {
}
}}
}
function gray(k) {
var c = new GrayColor();
c.gray = clamp(k, 0, 100);
return c;
}
function rgb(r, g, b) {
var c = new RGBColor();
c.red = clamp(r, 0, 255);
c.green = clamp(g, 0, 255);
c.blue = clamp(b, 0, 255);
return c;
}
function snap(v, step) {
if ((!step) || (step <= 0)) { 
return v;
}
return Math.round(v / step) * step;
}
function line(L, x1, y1, x2, y2, w) {
var p = L.pathItems.add();
p.setEntirePath([[x1, y1], [x2, y2]]);
p.stroked = true;
p.filled = false;
p.strokeWidth = (w) || (0.5);
p.strokeColor = DEFAULT_STROKE_COLOR;
return p;
}
function drawPadFrameLines(L, baseB, padB) {
line(L, padB.L, baseB.T, padB.L, baseB.B, 0.75);
line(L, padB.R, baseB.T, padB.R, baseB.B, 0.75);
line(L, baseB.L, padB.T, baseB.R, padB.T, 0.75);
line(L, baseB.L, padB.B, baseB.R, padB.B, 0.75);
}
function pxToMm(px) {
return px * 0.352778;
}
function mmToPx(mm) {
return mm * 2.83465;
}
function pxToPt(px) {
return px * 0.75;
}
function ptToPx(pt) {
return pt * 1.33333;
}
function mmToPt(mm) {
return mm * 2.83465 * 0.75;
}
function ptToMm(pt) {
return pt * 1.33333 * 0.352778;
}
function convertValueByUnit(value, fromUnit, toUnit) {
if (fromUnit === toUnit) { 
return value;
}
if ((fromUnit === "px") && (toUnit === "mm")) { 
return pxToMm(value);
}
if ((fromUnit === "px") && (toUnit === "pt")) { 
return pxToPt(value);
}
if ((fromUnit === "mm") && (toUnit === "px")) { 
return mmToPx(value);
}
if ((fromUnit === "mm") && (toUnit === "pt")) { 
return mmToPt(value);
}
if ((fromUnit === "pt") && (toUnit === "px")) { 
return ptToPx(value);
}
if ((fromUnit === "pt") && (toUnit === "mm")) { 
return ptToMm(value);
}
return value;
}
function getDocumentUnit() {
var ru = doc.rulerUnits;
if (ru === RulerUnits.Pixels) { 
return "px";
}
if (ru === RulerUnits.Points) { 
return "pt";
}
if (ru === RulerUnits.Millimeters) { 
return "mm";
}
return "pt";
}
function defaultStrokeByDocUnit(unit) {
if (unit === "pt") { 
return 0.5;
}
if (unit === "mm") { 
return 0.15;
}
return 1;
}
function buildSwiss(targets, baseB, padB, cols, colGutter, rowsOn, rowsCount, rowGutter, snapOn, snapStep, drawFrame, unit) {
var Left = padB.L;
var Right = padB.R;
var Top = padB.T;
var Bot = padB.B;
var W = Right - Left;
var H = Top - Bot;
if ((W <= 0) || (H <= 0)) { 
throw Error("\u6dfb\u52a0\u5185\u8fb9\u8ddd\u540e\u533a\u57df\u65e0\u6548\u3002");
}
if (unit !== "px") { 
colGutter = convertValueByUnit(colGutter, unit, "px");
rowGutter = convertValueByUnit(rowGutter, unit, "px");
}
cols = Math.max(1, Math.floor(cols));
colGutter = Math.max(0, colGutter);
var cw = (W - (colGutter * (cols - 1))) / cols;
if (cw <= 0) { 
throw Error("\u5217\u5bbd\u4e3a\u8d1f\u503c\u3002\u8bf7\u51cf\u5c11\u95f4\u8ddd/\u5217\u6570\u6216\u5185\u8fb9\u8ddd\u3002");
}
for (var i = 1; i < cols; i += 1) { 
var lx = Left + (i * cw) + ((i - 1) * colGutter);
if (snapOn) { 
lx = snap(lx, snapStep);
}
var rx = lx + colGutter;
if (colGutter > 0) { 
line(targets.cols, lx, Top, lx, Bot, 0.5);
line(targets.cols, rx, Top, rx, Bot, 0.5);
}
else {
line(targets.cols, lx, Top, lx, Bot, 0.5);
}}
if ((rowsOn) && (rowsCount > 0)) { 
rowsCount = Math.max(1, Math.floor(rowsCount));
rowGutter = Math.max(0, rowGutter);
var rh = (H - (rowGutter * (rowsCount - 1))) / rowsCount;
if (rh <= 0) { 
throw Error("\u884c\u9ad8\u4e3a\u8d1f\u503c\u3002\u8bf7\u51cf\u5c11\u95f4\u8ddd/\u884c\u6570\u6216\u5185\u8fb9\u8ddd\u3002");
}
for (var r = 1; r < rowsCount; r += 1) { 
var ty = Top - ((r * rh) + ((r - 1) * rowGutter));
if (snapOn) { 
ty = snap(ty, snapStep);
}
var by = ty - rowGutter;
if (rowGutter > 0) { 
line(targets.rows, Left, ty, Right, ty, 0.5);
line(targets.rows, Left, by, Right, by, 0.5);
}
else {
line(targets.rows, Left, ty, Right, ty, 0.5);
}}
}
if ((drawFrame) && (targets.frame)) { 
drawPadFrameLines(targets.frame, baseB, padB);
}
}
function buildEqual(targets, baseB, padB, divs, gutter, diagsOn, drawFrame, unit) {
if (unit !== "px") { 
gutter = convertValueByUnit(gutter, unit, "px");
}
divs = Math.max(2, Math.floor(divs));
gutter = Math.max(0, gutter);
var cellW = (padB.W - (gutter * (divs - 1))) / divs;
if (cellW <= 0) { 
throw Error("\u5206\u5272\u5bbd\u5ea6\u4e3a\u8d1f\u503c\u3002\u8bf7\u8c03\u6574\u95f4\u8ddd/\u5185\u8fb9\u8ddd\u3002");
}
for (var i = 1; i < divs; i += 1) { 
var lx = padB.L + (i * cellW) + ((i - 1) * gutter);
lx = snap(lx, 0.5);
var rx = lx + gutter;
if (gutter > 0) { 
line(targets.vert, lx, padB.T, lx, padB.B, 0.5);
line(targets.vert, rx, padB.T, rx, padB.B, 0.5);
}
else {
line(targets.vert, lx, padB.T, lx, padB.B, 0.5);
}}
var cellH = (padB.H - (gutter * (divs - 1))) / divs;
if (cellH <= 0) { 
throw Error("\u5206\u5272\u9ad8\u5ea6\u4e3a\u8d1f\u503c\u3002\u8bf7\u8c03\u6574\u95f4\u8ddd/\u5185\u8fb9\u8ddd\u3002");
}
for (var r = 1; r < divs; r += 1) { 
var ty = padB.T - ((r * cellH) + ((r - 1) * gutter));
ty = snap(ty, 0.5);
var by = ty - gutter;
if (gutter > 0) { 
line(targets.horz, padB.L, ty, padB.R, ty, 0.5);
line(targets.horz, padB.L, by, padB.R, by, 0.5);
}
else {
line(targets.horz, padB.L, ty, padB.R, ty, 0.5);
}}
if ((diagsOn) && (targets.diag)) { 
line(targets.diag, padB.L, padB.T, padB.R, padB.B, 0.5);
line(targets.diag, padB.R, padB.T, padB.L, padB.B, 0.5);
}
if ((drawFrame) && (targets.frame)) { 
drawPadFrameLines(targets.frame, baseB, padB);
}
}
function fibSeq(n) {
var a = [1, 1];
if (n <= 2) { 
return a.slice(0, n);
}
for (var i = 2; i < n; i += 1) { 
a.push(a[i - 1] + a[i - 2]);}
return a;
}
function buildGolden(targets, baseB, padB, terms, bothAxes, diagsOn, dirCorner, drawFrame, unit) {
terms = Math.max(2, Math.min(20, Math.floor(terms)));
var f = fibSeq(terms);
var sum = 0;
for (var i = 0; i < f.length; i += 1) { 
sum += f[i];}
var fromLeft = (dirCorner === "\u5de6\u4e0a") || (dirCorner === "\u5de6\u4e0b");
var fromTop = (dirCorner === "\u5de6\u4e0a") || (dirCorner === "\u53f3\u4e0a");
var stepX = padB.W / sum;
var acc = 0;
for (var i2 = 0; i2 < f.length - 1; i2 += 1) { 
acc += f[i2];
var posX = fromLeft ? padB.L + (acc * stepX) : padB.R - (acc * stepX);
var px = snap(posX, 0.5);
line(targets.xpart, px, padB.T, px, padB.B, 0.5);}
if (bothAxes) { 
var stepY = padB.H / sum;
var accY = 0;
for (var j = 0; j < f.length - 1; j += 1) { 
accY += f[j];
var posY = fromTop ? padB.T - (accY * stepY) : padB.B + (accY * stepY);
var py = snap(posY, 0.5);
line(targets.ypart, padB.L, py, padB.R, py, 0.5);}
}
if ((diagsOn) && (targets.diag)) { 
line(targets.diag, padB.L, padB.T, padB.R, padB.B, 0.5);
line(targets.diag, padB.R, padB.T, padB.L, padB.B, 0.5);
}
if ((drawFrame) && (targets.frame)) { 
drawPadFrameLines(targets.frame, baseB, padB);
}
}
function itemToGuide(it) {
try {
if ((it.typename === "PathItem") || (it.typename === "CompoundPathItem")) { 
if (it.typename === "CompoundPathItem") { 
var p = it.pathItems;
for (var i = p.length - 1; i >= 0; i--) { 
try {
p[i].guides = true;
} catch (e) {
}}
}
else {
it.guides = true;
}
}
else if (it.typename === "GroupItem") {
var g = it.pageItems;
for (var j = g.length - 1; j >= 0; j--) { 
itemToGuide(g[j]);}
}
else {
if (it.typename === "Layer") { 
var ls = it.pageItems;
for (var k = ls.length - 1; k >= 0; k--) { 
itemToGuide(ls[k]);}
}
}
} catch (e) {
}
}
function layerToGuidesDeep(L) {
itemToGuide(L);
for (var i = 0; i < L.layers.length; i += 1) { 
layerToGuidesDeep(L.layers[i]);}
}
function setCardStyle(panel) {
panel.margins = SPACING.md;
panel.spacing = SPACING.sm;
}
function setPrimaryButton(btn) {
btn.fillBrush = btn.graphics.newBrush(btn.graphics.BrushType.SOLID_COLOR, COLORS.primary);
}
function setSecondaryButton(btn) {
btn.fillBrush = btn.graphics.newBrush(btn.graphics.BrushType.SOLID_COLOR, COLORS.secondary);
}
function createSectionTitle(parent, text) {
var title = parent.add("statictext", undefined, text);
title.graphics.font = ScriptUI.newFont("Arial", "BOLD", 14);
return title;
}
function createSubTitle(parent, text) {
var subtitle = parent.add("statictext", undefined, text);
subtitle.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 12);
return subtitle;
}
function switchGridType(type) {
swissParams.visible = type === "swiss";
equalParams.visible = type === "equal";
goldenParams.visible = type === "golden";
swissParams.preferredSize = swissParams.visible ? [-1, -1] : [0, 0];
equalParams.preferredSize = equalParams.visible ? [-1, -1] : [0, 0];
goldenParams.preferredSize = goldenParams.visible ? [-1, -1] : [0, 0];
try {
paramsStack.layout.layout(true);
dlg.layout.layout(true);
} catch (e) {
}
}
function updatePaddingSync() {
var isSync = paddingSyncCheck.value;
rightValue.enabled = !isSync;
bottomValue.enabled = !isSync;
leftValue.enabled = !isSync;
if (isSync) { 
rightValue.text = topValue.text;
bottomValue.text = topValue.text;
leftValue.text = topValue.text;
}
}
function updateGutterSync() {
colGutter.enabled = colGutterCheck.value;
rowGutter.enabled = rowGutterCheck.value;
if (gutterValue) {
gutterValue.enabled = equalGutterCheck.value;
if (!equalGutterCheck.value) { gutterValue.text = "0"; }
}
if (!colGutterCheck.value) { colGutter.text = "0"; }
if (!rowGutterCheck.value) { rowGutter.text = "0"; }
}
function attachSpin(edit, opts) {
function handle(evt) {
if (!edit.enabled) { 
return;
}
var name = String(((evt) && (evt.keyName)) || ("")).toLowerCase();
var isUp = (((name === "up") || (name === "arrowup")) || (name === "uparrow")) || (name === "pageup");
var isDown = (((name === "down") || (name === "arrowdown")) || (name === "downarrow")) || (name === "pagedown");
if ((!isUp) && (!isDown)) { 
return;
}
var mult = (evt) && (evt.shiftKey) ? 10 : 1;
var val = Math.round(toNum(edit.text, 0));
if (isUp) { 
val = Math.min(max, val + (step * mult));
}
if (isDown) { 
val = Math.max(min, val - (step * mult));
}
edit.text = String(val);
if (after) { 
after(val);
}
try {
if ((evt) && (typeof evt.stopPropagation === "function")) { 
evt.stopPropagation();
}
} catch (e) {
}
try {
edit.selection = [String(edit.text).length, String(edit.text).length];
} catch (e) {
}
onAnyChange();
}
if (edit.__spinBound__) { 
return;
}
edit.__spinBound__ = true;
opts = (opts) || ({});
var step = Math.max(1, (opts.step) || (1));
var min = typeof opts.min === "number" ? opts.min : -Infinity;
var max = typeof opts.max === "number" ? opts.max : Infinity;
var after = opts.onAfter;
if (typeof edit.addEventListener === "function") { 
edit.addEventListener("keydown", handle);
try {
edit.onKeyDown = null;
} catch (e) {
}
}
else {
edit.onKeyDown = handle;
}
}
function getSelectedGridType() {
if (swissRadio.value) { 
return "\u745e\u58eb\u7f51\u683c";
}
if (equalRadio.value) { 
return "\u7b49\u5206\u7f51\u683c";
}
if (goldenRadio.value) { 
return "\u9ec4\u91d1\u6bd4\u4f8b\u7f51\u683c";
}
return "\u745e\u58eb\u7f51\u683c";
}
function getSelectedUnit() {
if (pxRadio.value) { 
return "px";
}
if (mmRadio.value) { 
return "mm";
}
if (ptRadio.value) { 
return "pt";
}
return "px";
}
function getSelectedScope() {
if (currentArtboardRadio.value) {
return "\u5f53\u524d\u753b\u677f";
}
if (allArtboardsRadio.value) {
return "\u5168\u90e8\u753b\u677f";
}
if (selectionRadio.value) {
return "\u5df2\u9009\u56fe\u5f62";
}
return "\u5f53\u524d\u753b\u677f";
}
function readOpts() {
var t = getSelectedGridType();
var unit = getSelectedUnit();
var scope = getSelectedScope();
if (!paddingCheck.value) { 
pads = {bottom: 0, left: 0, right: 0, top: 0};
}
else if (paddingSyncCheck.value) {
var v = Math.max(0, Math.round(toNum(topValue.text, 30)));
pads = {bottom: v, left: v, right: v, top: v};
}
else {
pads = {bottom: Math.max(0, Math.round(toNum(bottomValue.text, 30))), left: Math.max(0, Math.round(toNum(leftValue.text, 30))), right: Math.max(0, Math.round(toNum(rightValue.text, 30))), top: Math.max(0, Math.round(toNum(topValue.text, 30)))};
}
if (unit !== "px") { 
if (unit === "mm") { 
pads.top = mmToPx(pads.top);
pads.right = mmToPx(pads.right);
pads.bottom = mmToPx(pads.bottom);
pads.left = mmToPx(pads.left);
}
else {
if (unit === "pt") { 
pads.top = ptToPx(pads.top);
pads.right = ptToPx(pads.right);
pads.bottom = ptToPx(pads.bottom);
pads.left = ptToPx(pads.left);
}
}
}
var colGutVal = colGutterCheck.value ? Math.max(0, Math.round(toNum(colGutter.text, 20))) : 0;
var rowGutVal = rowGutterCheck.value ? Math.max(0, Math.round(toNum(rowGutter.text, 20))) : 0;
return {colGutter: colGutVal, cols: Math.max(1, Math.round(toNum(colValue.text, 12))), convertToGuides: !(!toGuides.value), divisions: Math.max(2, Math.round(toNum(divValue.text, 6))), drawPadFrame: (!(!drawFrame.value)) && (!(!paddingCheck.value)), equalDiags: !(!diagCheck.value), equalGutter: equalGutterCheck.value ? Math.max(0, Math.round(toNum(gutterValue.text, 0))) : 0, fibBothAxes: !(!bothAxesCheck.value), fibTerms: Math.max(2, Math.round(toNum(termsValue.text, 8))), goldenDiags: !(!goldenDiagCheck.value), goldenDir: "\u5de6\u4e0a", keepPrevious: !(!keepPrevious.value), paddingSides: pads, rowGutter: rowGutVal, rowsCount: Math.max(1, Math.round(toNum(rowValue.text, 8))), rowsOn: true, scope: (scope) || ("\u5f53\u524d\u753b\u677f"), snapOn: false, snapStep: 0.5, stroke: defaultStrokeByDocUnit(getDocumentUnit()), type: (t) || ("\u745e\u58eb\u7f51\u683c"), unit: (unit) || ("px")};
}
function buildIntoSingleArtboard(parent, baseB, o, artboardName) {
var padB = withPadSides(baseB, o.paddingSides.top, o.paddingSides.right, o.paddingSides.bottom, o.paddingSides.left);
if ((padB.W <= 0) || (padB.H <= 0)) { 
throw Error("\u5185\u8fb9\u8ddd\u76f8\u5bf9\u4e8e\u76ee\u6807\u8fc7\u5927\u3002");
}
var abLayerName = (artboardName) || (doc.artboards[doc.artboards.getActiveArtboardIndex()].name);
var abLayer = ensureSubLayer(parent, abLayerName);
if (o.type === "\u745e\u58eb\u7f51\u683c") { 
var colsL = ensureSubLayer(abLayer, "\u5217");
clearLayer(colsL);
var colsG = colsL.groupItems.add();
colsG.name = "\u5217";
var targetsSwiss = {cols: colsG};
if (o.rowsOn) { 
var rowsL = ensureSubLayer(abLayer, "\u884c");
clearLayer(rowsL);
var rowsG = rowsL.groupItems.add();
rowsG.name = "\u884c";
targetsSwiss.rows = rowsG;
}
if (o.drawPadFrame) { 
var frameL = ensureSubLayer(abLayer, "\u8fb9\u6846");
clearLayer(frameL);
var frameG = frameL.groupItems.add();
frameG.name = "\u8fb9\u6846";
targetsSwiss.frame = frameG;
}
buildSwiss(targetsSwiss, baseB, padB, o.cols, o.colGutter, o.rowsOn, o.rowsCount, o.rowGutter, o.snapOn, 0.5, o.drawPadFrame, o.unit);
}
else if (o.type === "\u7b49\u5206\u7f51\u683c") {
var vertL = ensureSubLayer(abLayer, "\u5782\u76f4");
var horzL = ensureSubLayer(abLayer, "\u6c34\u5e73");
clearLayer(vertL);
clearLayer(horzL);
var vertG = vertL.groupItems.add();
vertG.name = "\u5782\u76f4";
var horzG = horzL.groupItems.add();
horzG.name = "\u6c34\u5e73";
var targetsEqual = {horz: horzG, vert: vertG};
if (o.equalDiags) { 
var diagL = ensureSubLayer(abLayer, "\u5bf9\u89d2\u7ebf");
clearLayer(diagL);
var diagG = diagL.groupItems.add();
diagG.name = "\u5bf9\u89d2\u7ebf";
targetsEqual.diag = diagG;
}
if (o.drawPadFrame) { 
var frameL = ensureSubLayer(abLayer, "\u8fb9\u6846");
clearLayer(frameL);
var frameG = frameL.groupItems.add();
frameG.name = "\u8fb9\u6846";
targetsEqual.frame = frameG;
}
buildEqual(targetsEqual, baseB, padB, o.divisions, o.equalGutter, o.equalDiags, o.drawPadFrame, o.unit);
}
else {
var xL = ensureSubLayer(abLayer, "X\u5206\u5272");
var yL = ensureSubLayer(abLayer, "Y\u5206\u5272");
clearLayer(xL);
clearLayer(yL);
var xG = xL.groupItems.add();
xG.name = "X\u5206\u5272";
var yG = yL.groupItems.add();
yG.name = "Y\u5206\u5272";
var targetsGolden = {xpart: xG, ypart: yG};
if (o.goldenDiags) { 
var diagL = ensureSubLayer(abLayer, "\u5bf9\u89d2\u7ebf");
clearLayer(diagL);
var diagG = diagL.groupItems.add();
diagG.name = "\u5bf9\u89d2\u7ebf";
targetsGolden.diag = diagG;
}
if (o.drawPadFrame) { 
var frameL = ensureSubLayer(abLayer, "\u8fb9\u6846");
clearLayer(frameL);
var frameG = frameL.groupItems.add();
frameG.name = "\u8fb9\u6846";
targetsGolden.frame = frameG;
}
buildGolden(targetsGolden, baseB, padB, o.fibTerms, o.fibBothAxes, o.goldenDiags, o.goldenDir, o.drawPadFrame, o.unit);
}
}
function buildIntoLayer(parent, o) {
if (o.scope === "\u5168\u90e8\u753b\u677f") {
var artboards = getAllAB();
if (artboards.length === 0) {
alert("\u6587\u6863\u4e2d\u6ca1\u6709\u753b\u677f\u3002");
return;
}
for (var i = 0; i < artboards.length; i += 1) {
var artboard = artboards[i];
buildIntoSingleArtboard(parent, artboard.bounds, o, artboard.name);}
}
else if (o.scope === "\u5df2\u9009\u56fe\u5f62") {
var sel = doc.selection;
if (!sel || sel.length === 0) {
alert("\u8bf7\u5148\u9009\u62e9\u8981\u753b\u7f51\u683c\u7684\u56fe\u5f62\u3002");
return;
}
for (var si = 0; si < sel.length; si++) {
var item = sel[si];
var bb;
try { bb = item.visibleBounds; } catch (e1) { continue; }
if (!bb) continue;
var bounds = {B: bb[3], T: bb[1], L: bb[0], R: bb[2], H: bb[1] - bb[3], W: bb[2] - bb[0]};
var lbl = item.name || ("\u5df2\u9009" + (si + 1));
buildIntoSingleArtboard(parent, bounds, o, lbl);
}
}
else {
var baseB = getAB();
var i = doc.artboards.getActiveArtboardIndex();
var activeName = doc.artboards[i].name;
buildIntoSingleArtboard(parent, baseB, o, activeName);
}
}
function ensurePreview() {
var L = ensureLayer("_\u7f51\u683c\u9884\u89c8");
L.visible = true;
L.locked = false;
return L;
}
function applyStrokeRecursive(container, strokeWidth, strokeColor) {
var items = container.pageItems;
for (var i = 0; i < items.length; i += 1) { 
var it = items[i];
if (it.typename === "PathItem") { 
try {
if (it.stroked) { 
it.strokeWidth = strokeWidth;
}
it.strokeColor = strokeColor;
} catch (e) {
}
}
else {
if (it.typename === "GroupItem") { 
applyStrokeRecursive(it, strokeWidth, strokeColor);
}
}}
if (container.layers) { 
for (var j = 0; j < container.layers.length; j += 1) { 
applyStrokeRecursive(container.layers[j], strokeWidth, strokeColor);}
}
}
function buildOnePreview(L, baseB, padB, o) {
if (o.type === "\u745e\u58eb\u7f51\u683c") { 
var colsG = L.groupItems.add();
colsG.name = "\u9884\u89c8-\u5217";
var targetsSwiss = {cols: colsG};
if (o.rowsOn) { 
var rowsG = L.groupItems.add();
rowsG.name = "\u9884\u89c8-\u884c";
targetsSwiss.rows = rowsG;
}
if (o.drawPadFrame) { 
var frameG = L.groupItems.add();
frameG.name = "\u9884\u89c8-\u8fb9\u6846";
targetsSwiss.frame = frameG;
}
buildSwiss(targetsSwiss, baseB, padB, o.cols, o.colGutter, o.rowsOn, o.rowsCount, o.rowGutter, o.snapOn, 0.5, o.drawPadFrame, o.unit);
}
else if (o.type === "\u7b49\u5206\u7f51\u683c") {
var vertG = L.groupItems.add();
vertG.name = "\u9884\u89c8-\u5782\u76f4";
var horzG = L.groupItems.add();
horzG.name = "\u9884\u89c8-\u6c34\u5e73";
var targetsEqual = {horz: horzG, vert: vertG};
if (o.equalDiags) { 
var diagG = L.groupItems.add();
diagG.name = "\u9884\u89c8-\u5bf9\u89d2\u7ebf";
targetsEqual.diag = diagG;
}
if (o.drawPadFrame) { 
var frameG = L.groupItems.add();
frameG.name = "\u9884\u89c8-\u8fb9\u6846";
targetsEqual.frame = frameG;
}
buildEqual(targetsEqual, baseB, padB, o.divisions, o.equalGutter, o.equalDiags, o.drawPadFrame, o.unit);
}
else {
var xG = L.groupItems.add();
xG.name = "\u9884\u89c8-X\u5206\u5272";
var yG = L.groupItems.add();
yG.name = "\u9884\u89c8-Y\u5206\u5272";
var targetsGolden = {xpart: xG, ypart: yG};
if (o.goldenDiags) { 
var diagG = L.groupItems.add();
diagG.name = "\u9884\u89c8-\u5bf9\u89d2\u7ebf";
targetsGolden.diag = diagG;
}
if (o.drawPadFrame) { 
var frameG = L.groupItems.add();
frameG.name = "\u9884\u89c8-\u8fb9\u6846";
targetsGolden.frame = frameG;
}
buildGolden(targetsGolden, baseB, padB, o.fibTerms, o.fibBothAxes, o.goldenDiags, o.goldenDir, o.drawPadFrame, o.unit);
}
}

function preview() {
if (_busy) {
return;
}
_busy = true;
try {
var o = readOpts();
if (!o) {
throw Error("\u5185\u90e8\u9009\u9879\u4e0d\u53ef\u7528\u3002");
}
var L = ensurePreview();
clearLayer(L);

if (o.scope === "\u5df2\u9009\u56fe\u5f62") {
var sel = doc.selection;
if (!sel || sel.length === 0) { 
alert("\u8bf7\u5148\u9009\u62e9\u8981\u753b\u7f51\u683c\u7684\u56fe\u5f62\u3002");
_busy = false;
return;
}
for (var si = 0; si < sel.length; si++) {
var item = sel[si];
var bb;
try { bb = item.visibleBounds; } catch (e1) { continue; }
if (!bb) continue;
var baseB = {B: bb[3], T: bb[1], L: bb[0], R: bb[2], H: bb[1] - bb[3], W: bb[2] - bb[0]};
var padB = withPadSides(baseB, o.paddingSides.top, o.paddingSides.right, o.paddingSides.bottom, o.paddingSides.left);
if ((padB.W <= 0) || (padB.H <= 0)) continue;
buildOnePreview(L, baseB, padB, o);
}
}
else if (o.scope === "\u5168\u90e8\u753b\u677f") {
var artboards = getAllAB();
for (var ai = 0; ai < artboards.length; ai++) {
var abB = artboards[ai].bounds;
var padB = withPadSides(abB, o.paddingSides.top, o.paddingSides.right, o.paddingSides.bottom, o.paddingSides.left);
if ((padB.W <= 0) || (padB.H <= 0)) continue;
buildOnePreview(L, abB, padB, o);
}
}
else {
var baseB = getAB();
var padB = withPadSides(baseB, o.paddingSides.top, o.paddingSides.right, o.paddingSides.bottom, o.paddingSides.left);
if ((padB.W <= 0) || (padB.H <= 0)) {
throw Error("\u5185\u8fb9\u8ddd\u76f8\u5bf9\u4e8e\u76ee\u6807\u8fc7\u5927\u3002");
}
buildOnePreview(L, baseB, padB, o);
}

applyStrokeRecursive(L, o.stroke, DEFAULT_STROKE_COLOR);
app.redraw();
} catch (e) {alert("\u9884\u89c8\u9519\u8bef\uff1a" + e.message);
} finally {
_busy = false;
}
}
function apply() {
try {
removeLayer("_\u7f51\u683c\u9884\u89c8");
var o = readOpts();
if (!o) { 
throw Error("\u5185\u90e8\u9009\u9879\u4e0d\u53ef\u7528\u3002");
}
var parentName = o.type + " (\u706b\u5c71\u5b57\u578b)";
var parent = ensureLayer(parentName);
if (!o.keepPrevious) { clearLayerDeep(parent); }
parent.visible = true;
parent.locked = false;
buildIntoLayer(parent, o);
applyStrokeRecursive(parent, o.stroke, DEFAULT_STROKE_COLOR);
if (o.convertToGuides) { 
layerToGuidesDeep(parent);
}
var b = dlg.bounds; savePrefs("grid_system_pos.json", { x: b[0], y: b[1] });
dlg.close(1);
} catch (e) {alert("\u5e94\u7528\u9519\u8bef\uff1a" + e.message);
}
}
function onAnyChange() {
updateUnitLabels();
}
function updateUnitLabels() {
var unit = getSelectedUnit();
colUnit.text = unit;
rowUnit.text = unit;
gutterUnit.text = unit;
}
if (app.documents.length === 0) { 
alert("\u8bf7\u5148\u6253\u5f00\u4e00\u4e2a\u6587\u6863\u3002");
return;
}
var doc = app.activeDocument;
var _gridColor = { r: 170, g: 170, b: 170 };
var DEFAULT_STROKE_COLOR = rgb(_gridColor.r, _gridColor.g, _gridColor.b);
var COLORS = {background: [248, 249, 250], border: [222, 226, 230], primary: [0, 120, 215], secondary: [108, 117, 125], success: [40, 167, 69], text: [33, 37, 41]};
var SPACING = {lg: 15, md: 11, sm: 7, xl: 19, xs: 4, xxl: 23};
var dlg = new Window("dialog", "\u7f51\u683c\u7cfb\u7edf v1.3.0");
dlg.orientation = "column";
dlg.alignChildren = ["fill", "top"];
dlg.spacing = SPACING.md;
dlg.margins = SPACING.lg;
dlg.preferredSize = [320, 520];
dlg.minimumSize = [300, 480];
var quickSetupCard = dlg.add("panel", undefined, "\u7f51\u683c\u7c7b\u578b");
setCardStyle(quickSetupCard);
var typeCardsGroup = quickSetupCard.add("group");
typeCardsGroup.orientation = "row";
typeCardsGroup.alignChildren = ["fill", "top"];
typeCardsGroup.spacing = SPACING.sm;
typeCardsGroup.alignment = ["fill", "top"];
var swissCard = typeCardsGroup.add("panel");
swissCard.orientation = "column";
swissCard.alignChildren = ["center", "center"];
swissCard.alignment = ["fill", "top"];
swissCard.preferredSize = [-1, 80];
swissCard.margins = SPACING.xs;
var swissIcon = swissCard.add("statictext", undefined, "\u229e");
swissIcon.graphics.font = ScriptUI.newFont("Arial", "BOLD", 24);
var swissLabel = swissCard.add("statictext", undefined, "\u745e\u58eb\u7f51\u683c");
swissLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
var swissRadio = swissCard.add("radiobutton");
swissRadio.value = true;
var equalCard = typeCardsGroup.add("panel");
equalCard.orientation = "column";
equalCard.alignChildren = ["center", "center"];
equalCard.alignment = ["fill", "top"];
equalCard.preferredSize = [-1, 80];
equalCard.margins = SPACING.xs;
var equalIcon = equalCard.add("statictext", undefined, "\u229f");
equalIcon.graphics.font = ScriptUI.newFont("Arial", "BOLD", 24);
var equalLabel = equalCard.add("statictext", undefined, "\u7b49\u5206\u7f51\u683c");
equalLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
var equalRadio = equalCard.add("radiobutton");
var goldenCard = typeCardsGroup.add("panel");
goldenCard.orientation = "column";
goldenCard.alignChildren = ["center", "center"];
goldenCard.alignment = ["fill", "top"];
goldenCard.preferredSize = [-1, 80];
goldenCard.margins = SPACING.xs;
var goldenIcon = goldenCard.add("statictext", undefined, "\u25d0");
goldenIcon.graphics.font = ScriptUI.newFont("Arial", "BOLD", 24);
var goldenLabel = goldenCard.add("statictext", undefined, "\u9ec4\u91d1\u6bd4\u4f8b");
goldenLabel.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 10);
var goldenRadio = goldenCard.add("radiobutton");
var paramsStack = quickSetupCard.add("group");
paramsStack.orientation = "stack";
paramsStack.alignChildren = ["fill", "top"];
paramsStack.alignment = ["fill", "top"];
paramsStack.preferredSize = [-1, 120];
var swissParams = paramsStack.add("panel", undefined, "\u53c2\u6570\u8bbe\u7f6e");
swissParams.orientation = "column";
swissParams.alignChildren = ["fill", "top"];
swissParams.margins = SPACING.sm;
swissParams.spacing = SPACING.sm;
var colGroup = swissParams.add("group");
colGroup.orientation = "row";
colGroup.alignChildren = ["left", "center"];
colGroup.spacing = SPACING.sm;
var colLabel = colGroup.add("statictext", undefined, "\u5217\u6570");
colLabel.preferredSize = [40, 20];
var colValue = colGroup.add("edittext", undefined, "12");
colValue.preferredSize = [50, 24];
var colSlider = colGroup.add("slider", undefined, 12, 1, 32);
colSlider.preferredSize = [100, 20];
var colGutterCheck = colGroup.add("checkbox", undefined, "\u95f4\u8ddd");
colGutterCheck.value = true;
var colGutter = colGroup.add("edittext", undefined, "20");
colGutter.preferredSize = [40, 24];
var colUnit = colGroup.add("statictext", undefined, "px");
colUnit.preferredSize = [25, 20];
var rowGroup = swissParams.add("group");
rowGroup.orientation = "row";
rowGroup.alignChildren = ["left", "center"];
rowGroup.spacing = SPACING.sm;
var rowLabel = rowGroup.add("statictext", undefined, "\u884c\u6570");
rowLabel.preferredSize = [40, 20];
var rowValue = rowGroup.add("edittext", undefined, "8");
rowValue.preferredSize = [50, 24];
var rowSlider = rowGroup.add("slider", undefined, 8, 1, 32);
rowSlider.preferredSize = [100, 20];
var rowGutterCheck = rowGroup.add("checkbox", undefined, "\u95f4\u8ddd");
rowGutterCheck.value = true;
var rowGutter = rowGroup.add("edittext", undefined, "20");
rowGutter.preferredSize = [40, 24];
var rowUnit = rowGroup.add("statictext", undefined, "px");
rowUnit.preferredSize = [25, 20];
var equalParams = paramsStack.add("panel", undefined, "\u53c2\u6570\u8bbe\u7f6e");
equalParams.orientation = "column";
equalParams.alignChildren = ["fill", "top"];
equalParams.margins = SPACING.sm;
equalParams.spacing = SPACING.sm;
equalParams.visible = false;
var divGroup = equalParams.add("group");
divGroup.orientation = "row";
divGroup.alignChildren = ["left", "center"];
divGroup.spacing = SPACING.sm;
var divLabel = divGroup.add("statictext", undefined, "\u5206\u5272\u6570");
divLabel.preferredSize = [50, 20];
var divValue = divGroup.add("edittext", undefined, "6");
divValue.preferredSize = [50, 24];
var divSlider = divGroup.add("slider", undefined, 6, 2, 32);
divSlider.preferredSize = [100, 20];
var equalGutterCheck = divGroup.add("checkbox", undefined, "\u95f4\u8ddd");
equalGutterCheck.value = true;
var gutterValue = divGroup.add("edittext", undefined, "0");
gutterValue.preferredSize = [40, 24];
var gutterUnit = divGroup.add("statictext", undefined, "px");
gutterUnit.preferredSize = [25, 20];
var diagCheck = equalParams.add("checkbox", undefined, "\u663e\u793a\u5bf9\u89d2\u7ebf");
var goldenParams = paramsStack.add("panel", undefined, "\u53c2\u6570\u8bbe\u7f6e");
goldenParams.orientation = "column";
goldenParams.alignChildren = ["fill", "top"];
goldenParams.margins = SPACING.sm;
goldenParams.spacing = SPACING.sm;
goldenParams.visible = false;
var termsGroup = goldenParams.add("group");
termsGroup.orientation = "row";
termsGroup.alignChildren = ["left", "center"];
termsGroup.spacing = SPACING.sm;
var termsLabel = termsGroup.add("statictext", undefined, "\u9879\u6570");
termsLabel.preferredSize = [50, 20];
var termsValue = termsGroup.add("edittext", undefined, "8");
termsValue.preferredSize = [50, 24];
var termsSlider = termsGroup.add("slider", undefined, 8, 2, 15);
termsSlider.preferredSize = [100, 20];
var optionsGroup = goldenParams.add("group");
optionsGroup.orientation = "row";
optionsGroup.alignChildren = ["left", "center"];
optionsGroup.spacing = SPACING.md;
var bothAxesCheck = optionsGroup.add("checkbox", undefined, "\u53cc\u8f74\u6a21\u5f0f");
bothAxesCheck.value = true;
var goldenDiagCheck = optionsGroup.add("checkbox", undefined, "\u5bf9\u89d2\u7ebf");
var advancedCard = dlg.add("panel", undefined, "\u9ad8\u7ea7\u8bbe\u7f6e");
setCardStyle(advancedCard);
var advancedContent = advancedCard.add("group");
advancedContent.orientation = "column";
advancedContent.alignChildren = ["fill", "top"];
advancedContent.spacing = SPACING.md;
var unitGroup = advancedContent.add("group");
unitGroup.orientation = "row";
unitGroup.alignChildren = ["left", "center"];
unitGroup.spacing = SPACING.sm;
var unitLabel = unitGroup.add("statictext", undefined, "\u5355\u4f4d:");
unitLabel.preferredSize = [40, 20];
var pxRadio = unitGroup.add("radiobutton", undefined, "px");
pxRadio.value = true;
var mmRadio = unitGroup.add("radiobutton", undefined, "mm");
var ptRadio = unitGroup.add("radiobutton", undefined, "pt");
var divider1 = advancedContent.add("panel");
divider1.preferredSize = [-1, 1];
var paddingGroup = advancedContent.add("group");
paddingGroup.orientation = "column";
paddingGroup.alignChildren = ["fill", "top"];
paddingGroup.spacing = SPACING.sm;
var paddingHeader = paddingGroup.add("group");
paddingHeader.orientation = "row";
paddingHeader.alignChildren = ["left", "center"];
paddingHeader.spacing = SPACING.sm;
var paddingCheck = paddingHeader.add("checkbox", undefined, "\u5185\u8fb9\u8ddd");
paddingCheck.value = true;
var paddingInputs = paddingGroup.add("group");
paddingInputs.orientation = "row";
paddingInputs.alignChildren = ["left", "center"];
paddingInputs.spacing = SPACING.sm;
var topLabel = paddingInputs.add("statictext", undefined, "\u4e0a:");
topLabel.preferredSize = [20, 20];
var topValue = paddingInputs.add("edittext", undefined, "10");
topValue.preferredSize = [40, 24];
var rightLabel = paddingInputs.add("statictext", undefined, "\u53f3:");
rightLabel.preferredSize = [20, 20];
var rightValue = paddingInputs.add("edittext", undefined, "10");
rightValue.preferredSize = [40, 24];
var bottomLabel = paddingInputs.add("statictext", undefined, "\u4e0b:");
bottomLabel.preferredSize = [20, 20];
var bottomValue = paddingInputs.add("edittext", undefined, "10");
bottomValue.preferredSize = [40, 24];
var leftLabel = paddingInputs.add("statictext", undefined, "\u5de6:");
leftLabel.preferredSize = [20, 20];
var leftValue = paddingInputs.add("edittext", undefined, "10");
leftValue.preferredSize = [40, 24];
var paddingSyncCheck = paddingInputs.add("checkbox", undefined, "");
paddingSyncCheck.value = true;
paddingSyncCheck.preferredSize = [20, 20];

var colorGroup = advancedContent.add("group");
colorGroup.orientation = "column";
colorGroup.alignChildren = ["fill", "top"];
colorGroup.spacing = SPACING.xs;
var colorLabel = colorGroup.add("statictext", undefined, "\u7f51\u683c\u7ebf\u989c\u8272:");
colorLabel.preferredSize = [-1, 18];

var PALETTE = [
    { name: "\u6d45\u84dd", r: 144, g: 202, b: 249 },
    { name: "\u6d45\u7eff", r: 165, g: 214, b: 167 },
    { name: "\u6d45\u7ea2", r: 239, g: 154, b: 154 },
    { name: "\u6d45\u9ec4", r: 255, g: 213, b: 79 },
    { name: "\u6d45\u7070", r: 189, g: 189, b: 189 },
    { name: "\u6d45\u6a59", r: 255, g: 204, b: 128 }
];

var _swatchRow = colorGroup.add("group");
_swatchRow.orientation = "row";
_swatchRow.alignChildren = ["left", "center"];
_swatchRow.spacing = SPACING.xs;

for (var ci = 0; ci < PALETTE.length; ci += 1) {
    (function (entry, idx) {
        var rb = _swatchRow.add("radiobutton", undefined, entry.name);
        rb.graphics.font = ScriptUI.newFont("Arial", "BOLD", 10);
        rb.helpTip = "RGB(" + entry.r + "," + entry.g + "," + entry.b + ")";
        if (idx === 0) rb.value = true;
        rb.onClick = function () {
            _gridColor.r = entry.r;
            _gridColor.g = entry.g;
            _gridColor.b = entry.b;
            DEFAULT_STROKE_COLOR = rgb(_gridColor.r, _gridColor.g, _gridColor.b);
        };
    })(PALETTE[ci], ci);
}

var divider2 = advancedContent.add("panel");
divider2.preferredSize = [-1, 1];
var scopeGroup = advancedContent.add("group");
scopeGroup.orientation = "row";
scopeGroup.alignChildren = ["left", "center"];
scopeGroup.spacing = SPACING.sm;
var scopeLabel = scopeGroup.add("statictext", undefined, "\u4f5c\u7528\u8303\u56f4:");
scopeLabel.preferredSize = [65, 20];
var currentArtboardRadio = scopeGroup.add("radiobutton", undefined, "\u5f53\u524d\u753b\u677f");
currentArtboardRadio.value = true;
var allArtboardsRadio = scopeGroup.add("radiobutton", undefined, "\u5168\u90e8\u753b\u677f");
var selectionRadio = scopeGroup.add("radiobutton", undefined, "\u5df2\u9009\u56fe\u5f62");
var previewCard = dlg.add("panel", undefined, "\u9884\u89c8\u4e0e\u5bfc\u51fa");
setCardStyle(previewCard);
var previewGroup = previewCard.add("group");
previewGroup.orientation = "row";
previewGroup.alignChildren = ["fill", "center"];
previewGroup.spacing = SPACING.md;
var exportGroup = previewGroup.add("group");
exportGroup.orientation = "row";
exportGroup.alignment = ["right", "center"];
exportGroup.spacing = SPACING.sm;
var drawFrame = exportGroup.add("checkbox", undefined, "\u7ed8\u5236\u8fb9\u6846");
drawFrame.value = true;
var toGuides = exportGroup.add("checkbox", undefined, "\u8f6c\u4e3a\u53c2\u8003\u7ebf");
toGuides.value = false;
var keepPrevious = exportGroup.add("checkbox", undefined, "\u4fdd\u7559\u4e0a\u6b21\u7f51\u683c");
keepPrevious.value = false;
var actionBar = dlg.add("group");
actionBar.orientation = "row";
actionBar.alignChildren = ["fill", "center"];
actionBar.spacing = SPACING.sm;
actionBar.margins = [0, SPACING.sm, 0, 0];
var statusGroup = actionBar.add("group");
statusGroup.alignment = ["left", "center"];
statusGroup.spacing = SPACING.sm;
var previewBtn = statusGroup.add("button", undefined, "\u9884\u89c8");
previewBtn.preferredSize = [70, 32];
var buttonGroup = actionBar.add("group");
buttonGroup.orientation = "row";
buttonGroup.alignment = ["right", "center"];
buttonGroup.spacing = SPACING.sm;
var cancelBtn = buttonGroup.add("button", undefined, "\u53d6\u6d88");
cancelBtn.preferredSize = [70, 32];
var applyBtn = buttonGroup.add("button", undefined, "\u5e94\u7528");
applyBtn.preferredSize = [70, 32];
previewBtn.onClick = function () {
preview();
};
applyBtn.onClick = function () {
apply();
};
cancelBtn.onClick = function () {
removeLayer("_\u7f51\u683c\u9884\u89c8");
var b = dlg.bounds; savePrefs("grid_system_pos.json", { x: b[0], y: b[1] });
dlg.close(0);
};
var pos = loadPos("grid_system_pos.json");
try { dlg.location = [pos.x, pos.y]; } catch (e) { dlg.center(); }
switchGridType("swiss");
updatePaddingSync();
attachSpin(colValue, {max: 20, min: 1, onAfter: function (v) {
colSlider.value = v;
}, step: 1});
attachSpin(rowValue, {max: 20, min: 1, onAfter: function (v) {
rowSlider.value = v;
}, step: 1});
attachSpin(divValue, {max: 20, min: 2, onAfter: function (v) {
divSlider.value = v;
}, step: 1});
attachSpin(termsValue, {max: 15, min: 2, onAfter: function (v) {
termsSlider.value = v;
}, step: 1});
attachSpin(colGutter, {min: 0, step: 1});
attachSpin(rowGutter, {min: 0, step: 1});
attachSpin(gutterValue, {min: 0, step: 1});
attachSpin(topValue, {min: 0, onAfter: function (v) {
if (paddingSyncCheck.value) { 
rightValue.text = String(v);
bottomValue.text = String(v);
leftValue.text = String(v);
}
}, step: 1});
attachSpin(rightValue, {min: 0, step: 1});
attachSpin(bottomValue, {min: 0, step: 1});
attachSpin(leftValue, {min: 0, step: 1});
swissRadio.onClick = function () {
equalRadio.value = false;
goldenRadio.value = false;
switchGridType("swiss");
onAnyChange();
};
equalRadio.onClick = function () {
swissRadio.value = false;
goldenRadio.value = false;
switchGridType("equal");
onAnyChange();
};
goldenRadio.onClick = function () {
swissRadio.value = false;
equalRadio.value = false;
switchGridType("golden");
onAnyChange();
};
pxRadio.onClick = onAnyChange;
mmRadio.onClick = onAnyChange;
ptRadio.onClick = onAnyChange;
currentArtboardRadio.onClick = onAnyChange;
allArtboardsRadio.onClick = onAnyChange;
selectionRadio.onClick = onAnyChange;
paddingCheck.onClick = onAnyChange;
paddingSyncCheck.onClick = function () {
updatePaddingSync();
onAnyChange();
};
topValue.onChanging = function () {
if (paddingSyncCheck.value) { 
rightValue.text = topValue.text;
bottomValue.text = topValue.text;
leftValue.text = topValue.text;
}
onAnyChange();
};
rightValue.onChanging = onAnyChange;
bottomValue.onChanging = onAnyChange;
leftValue.onChanging = onAnyChange;
colValue.onChanging = function () {
var v = Math.max(1, Math.round(toNum(colValue.text, 12)));
colValue.text = String(v);
colSlider.value = v;
onAnyChange();
};
colSlider.onChanging = function () {
colValue.text = String(Math.round(colSlider.value));
onAnyChange();
};
colSlider.onChange = function () {
colValue.text = String(Math.round(colSlider.value));
onAnyChange();
};
rowValue.onChanging = function () {
var v = Math.max(1, Math.round(toNum(rowValue.text, 8)));
rowValue.text = String(v);
rowSlider.value = v;
onAnyChange();
};
rowSlider.onChanging = function () {
rowValue.text = String(Math.round(rowSlider.value));
onAnyChange();
};
rowSlider.onChange = function () {
rowValue.text = String(Math.round(rowSlider.value));
onAnyChange();
};
colGutter.onChanging = onAnyChange;
rowGutter.onChanging = onAnyChange;
colGutterCheck.onClick = function () {
updateGutterSync();
onAnyChange();
};
rowGutterCheck.onClick = function () {
updateGutterSync();
onAnyChange();
};
equalGutterCheck.onClick = function () {
updateGutterSync();
onAnyChange();
};
divValue.onChanging = function () {
var v = Math.max(2, Math.round(toNum(divValue.text, 6)));
divValue.text = String(v);
divSlider.value = v;
onAnyChange();
};
divSlider.onChanging = function () {
divValue.text = String(Math.round(divSlider.value));
onAnyChange();
};
divSlider.onChange = function () {
divValue.text = String(Math.round(divSlider.value));
onAnyChange();
};
gutterValue.onChanging = onAnyChange;
diagCheck.onClick = onAnyChange;
termsValue.onChanging = function () {
var v = Math.max(2, Math.round(toNum(termsValue.text, 8)));
termsValue.text = String(v);
termsSlider.value = v;
onAnyChange();
};
termsSlider.onChanging = function () {
termsValue.text = String(Math.round(termsSlider.value));
onAnyChange();
};
termsSlider.onChange = function () {
termsValue.text = String(Math.round(termsSlider.value));
onAnyChange();
};
bothAxesCheck.onClick = onAnyChange;
goldenDiagCheck.onClick = onAnyChange;
drawFrame.onClick = onAnyChange;
toGuides.onClick = onAnyChange;

updateUnitLabels();
var _busy = false;
var _ts = 0;
dlg.show();
})();
