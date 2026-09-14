const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const root = process.env.MOMO_EXTENSION || path.join(__dirname, '../extension/com.tomideas.illustratortools');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const KEY = 'MomoTools_Notes_v2';

test('Notes uses an independent native palette and avoids the blank CEP compositor',()=>{
    const manifest=read('CSXS/manifest.xml'),index=read('index.html'),panel=read('js/panel.js');
    const native=read('jsx/scripts/momo_notes.jsx');
    assert.doesNotMatch(manifest,/illustratortools\.notes|<MainPath>\.\/note\.html<\/MainPath>/);
    assert.doesNotMatch(index,/notes-shell|notes_panel|<iframe/i);
    assert.match(panel,/runScript\("momo_notes\.jsx"\)/);
    assert.match(native,/#targetengine "MomoToolsNotes"/);
    assert.match(native,/new Window\("palette", "Momo Notes"/);
    assert.match(native,/add\("tabbedpanel"\)/);
    assert.match(native,/tabsPanel\.add\("tab"/);
    assert.match(native,/backgroundColor/);
    assert.doesNotMatch(native,/add\("dropdownlist"/);
    assert.match(native,/scrolling: false/);
    assert.match(native,/notes\.0\.json/);
    assert.match(native,/notes\.1\.json/);
});

function notes(options = {}) {
    let now = 0, timerId = 0;
    const timers = new Map(), events = {}, nativeEvents = {}, disk = options.disk || new Map();
    const data = options.data || new Map([
        ['MomoTools_NoteTabs', '["A","B"]'], ['MomoTools_NoteActive', '0'],
        ['MomoTools_NoteTab_0', 'saved A'], ['MomoTools_NoteTab_1', 'saved B']
    ]);
    class Element {
        constructor() { this.style = {setProperty(){}}; this.listeners = {}; this.children = []; this.attrs = {}; this._html = ''; this.classList = {add(){},remove(){}}; }
        addEventListener(n,f) { (this.listeners[n] ||= []).push(f); }
        appendChild(c) { this.children.push(c); return c; }
        setAttribute(k,v) { this.attrs[k]=v; }
        getAttribute(k) { return this.attrs[k]; }
        focus() {} select() {}
        get firstChild() { return this.children[0]; }
        get innerHTML() { return this._html; }
        set innerHTML(v) { this._html=String(v); this.children=[]; }
        get textContent() { return this._html; }
        set textContent(v) { this.innerHTML=v; }
        fire(n) { for (const f of this.listeners[n] || []) f.call(this,{stopPropagation(){},preventDefault(){}}); }
    }
    const nodes = {};
    for (const id of ['content','tab-bar','font-label','status','zoom-in','zoom-out','clear-btn','reload-btn']) nodes[id]=new Element();
    const localStorage = {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>{if(options.localFail)throw Error('quota');data.set(k,String(v));},removeItem:k=>data.delete(k)};
    const resizes=[];
    const window = {innerWidth:560,innerHeight:640,localStorage,addEventListener:(k,f)=>{events[k]=f;},
        cep:{fs:{stat:()=>({err:0}),readFile:p=>disk.has(p)?{err:0,data:disk.get(p)}:{err:3},writeFile:(p,v,encoding)=>{
            assert.equal(encoding,'UTF-8');if(options.fileFail){disk.set(p,'{');return {err:6};}disk.set(p,v);return {err:0};
        }}},
        __adobe_cep__:{getSystemPath:()=>'/fake',getHostEnvironment:()=>'{"appSkinInfo":null}',registerKeyEventsInterest(){},
            addEventListener:(n,f)=>{nativeEvents[n]=f;},dispatchEvent(){},setScaleFactorChangedHandler(){},
            resizeContent:(w,h)=>{resizes.push([w,h]);window.innerWidth=w;window.innerHeight=h;}}
    };
    const document = {documentElement:new Element(),body:new Element(),visibilityState:'visible',hasFocus:()=>false,
        getElementById:k=>nodes[k],createElement:()=>new Element(),addEventListener(){}};
    const ctx = {window,document,console:{warn(){},error(){}},setTimeout:(f,d)=>{timers.set(++timerId,{at:now+d,f});return timerId;},
        clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>f(),Date:{now:()=>100000+now}};
    vm.createContext(ctx);
    vm.runInContext(read('js/note_storage.js'),ctx);
    vm.runInContext(read('note.html').match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
    function tick(to) {
        while(true) { const t=[...timers].filter(([,v])=>v.at<=to).sort((a,b)=>a[1].at-b[1].at)[0];if(!t)break;timers.delete(t[0]);now=t[1].at;t[1].f(); }
        now=to;
    }
    return {nodes,data,disk,window,events,nativeEvents,resizes,tick,state:()=>JSON.parse(data.get(KEY)),
        input(text){nodes.content.innerHTML=text;nodes.content.fire('input');}};
}

test('typing is durable immediately, before the disk debounce or shutdown',()=>{
    const n=notes();n.input('new A');assert.equal(n.state().contents[0],'new A');
    n.events.beforeunload();assert.ok([...n.disk.values()].some(raw=>JSON.parse(raw).contents[0]==='new A'));
});
test('closing another tab cannot discard a pending edit',()=>{
    const n=notes();n.input('new A');n.nodes['tab-bar'].children[1].children[1].onclick({stopPropagation(){}});n.tick(1000);
    assert.equal(n.nodes.content.innerHTML,'new A');assert.deepEqual(n.state().contents,['new A']);
});
test('error healing and delayed repaint never reload old content',()=>{
    const n=notes();n.input('new A');n.window.onerror('unrelated failure');n.tick(1000);
    assert.equal(n.nodes.content.innerHTML,'new A');assert.equal(n.state().contents[0],'new A');
});
test('clearing just after startup is not undone by recovery timers',()=>{
    const n=notes();n.tick(50);n.nodes['clear-btn'].fire('click');n.tick(1000);
    assert.equal(n.nodes.content.innerHTML,'');assert.equal(n.state().contents[0],'');
});
test('switching, closing and reopening preserve tab/content association',()=>{
    const n=notes();n.input('A edited');n.nodes['tab-bar'].children[1].onclick();n.input('B edited');
    n.nodes['tab-bar'].children[0].children[1].onclick({stopPropagation(){}});
    const next=notes({data:n.data,disk:n.disk});assert.deepEqual(next.state().tabs,['B']);assert.equal(next.nodes.content.innerHTML,'B edited');
});
test('corrupted primary snapshot recovers from a good disk copy',()=>{
    const n=notes();n.input('disk recovery');n.events.pagehide();
    const data=new Map([[KEY,'{']]);const next=notes({data,disk:n.disk});
    assert.equal(next.nodes.content.innerHTML,'disk recovery');
});
test('a failed disk write preserves the other complete snapshot',()=>{
    const n=notes();n.input('last complete');n.events.pagehide();
    const broken=notes({data:n.data,disk:n.disk,fileFail:true});broken.input('partial next');broken.events.pagehide();
    const recovered=notes({data:new Map(),disk:n.disk});assert.equal(recovered.nodes.content.innerHTML,'last complete');
});
test('unreadable snapshots are not replaced with an empty note',()=>{
    const data=new Map([[KEY,'{']]);const n=notes({data});n.tick(1000);
    assert.equal(data.get(KEY),'{');assert.equal(n.nodes.content.contentEditable,'false');assert.equal(n.disk.size,0);
});
test('localStorage failure falls back to synchronous file persistence',()=>{
    const n=notes({localFail:true});n.input('disk only');
    const recovered=notes({data:new Map(),disk:n.disk});assert.equal(recovered.nodes.content.innerHTML,'disk only');
});
test('1x1 hidden/restored panel is resized only after an explicit open request',()=>{
    const n=notes();n.window.innerWidth=1;n.window.innerHeight=1;n.tick(1000);
    assert.equal(n.resizes.length,0);n.nativeEvents['com.tomideas.notes.recover']();
    assert.deepEqual(n.resizes,[[560,640]]);assert.equal(n.nodes.content.innerHTML,'saved A');
});

function colorContext() {
    const ctx={window:{}};vm.createContext(ctx);vm.runInContext(read('js/color_source.js'),ctx);
    return {ctx,Color:ctx.window.MomoColorSource};
}
function hostContext() {
    const ctx={console,ColorModel:{SPOT:'spot',PROCESS:'process',REGISTRATION:'registration'},
        ImageColorSpace:{CMYK:'CMYK',RGB:'RGB',GrayScale:'Gray',LAB:'Lab'},ColorConvertPurpose:{defaultpurpose:0},DocumentColorSpace:{RGB:'RGB',CMYK:'CMYK'}};
    for(const type of ['CMYK','RGB','Gray','Lab','Spot'])ctx[type+'Color']=function(){this.typename=type+'Color';};
    const spots=[];
    const doc={selection:[],spots:{getByName:name=>{const found=spots.find(s=>s.name===name);if(!found)throw Error('missing');return found;},add:()=>{const s={remove(){spots.splice(spots.indexOf(s),1);}};spots.push(s);return s;}}};
    ctx.app={documents:[doc],activeDocument:doc,convertSampleColor:(from,v,to)=>to==='RGB'?[100,120,140]:[10,20,30,40]};
    vm.createContext(ctx);return {ctx,doc,spots};
}
function captureScript(Color) {
    const src=read('js/color_library.js');let script;
    const fn=src.slice(src.indexOf('    function captureFromAI()'),src.indexOf('    // ── Import JSON (entire library)'));
    vm.runInNewContext(fn+'captureFromAI();',{library:{groups:[{}]},curGroup:0,editorRevision:0,captureRequest:0,Color,evalAI:s=>{script=s;}});return script;
}
test('legacy CMYK and typed RGB retain exact values through JSON roundtrip',()=>{
    const {Color}=colorContext();
    assert.deepEqual(JSON.parse(JSON.stringify(Color.source({c:12.4,m:34.6,y:56.7,k:7.8}))),{type:'CMYK',values:[12.4,34.6,56.7,7.8]});
    const entry={source:{type:'RGB',values:[78,156,207]}};
    assert.deepEqual(JSON.parse(JSON.stringify(Color.source(entry))),entry.source);
    assert.throws(()=>Color.source({source:{type:'RGB',values:[999,0,0]}}));
});
test('capture keeps fractional CMYK and never guesses pure K',()=>{
    const {Color}=colorContext(),h=hostContext();
    h.doc.selection=[{typename:'PathItem',filled:true,fillColor:{typename:'CMYKColor',cyan:45.0141131877899,magenta:35.9716176986694,yellow:34.9767297506332,black:1.28175783902407}}];
    const result=JSON.parse(vm.runInContext(captureScript(Color),h.ctx).slice(2));
    assert.deepEqual(result.source,{type:'CMYK',values:[45.0141131877899,35.9716176986694,34.9767297506332,1.28175783902407]});
});
test('capture and reconstruction preserve spot definition, tint, and escaped names',()=>{
    const {Color}=colorContext(),h=hostContext();
    const spot={name:'Brand "色"\n\\',colorType:'spot',color:{typename:'CMYKColor',cyan:0,magenta:100,yellow:100,black:0}};
    h.doc.selection=[{typename:'PathItem',filled:true,fillColor:{typename:'SpotColor',spot,tint:20}}];
    const result=JSON.parse(vm.runInContext(captureScript(Color),h.ctx).slice(2));
    assert.equal(result.source.tint,20);assert.equal(result.source.name,spot.name);
    h.ctx.original=result.source;
    const applied=vm.runInContext(Color.prelude()+'MomoColor.make(original,app.activeDocument)',h.ctx);
    assert.equal(applied.typename,'SpotColor');assert.equal(applied.tint,20);assert.equal(applied.spot.name,spot.name);
    assert.equal(applied.spot.color.magenta,100);
});
test('same-name spot conflicts fail without modifying the existing definition',()=>{
    const {Color}=colorContext(),h=hostContext();
    const existing={name:'Brand',colorType:'spot',color:{typename:'CMYKColor',cyan:50,magenta:0,yellow:0,black:0}};h.spots.push(existing);
    h.ctx.original={type:'Spot',name:'Brand',colorType:'SPOT',tint:20,base:{type:'CMYK',values:[0,100,100,0]}};
    assert.throws(()=>vm.runInContext(Color.prelude()+'MomoColor.make(original,app.activeDocument)',h.ctx),/同名专色/);
    assert.equal(existing.color.cyan,50);assert.equal(h.spots.length,1);
});
test('application script uses the original RGB source, not derived CMYK fields',()=>{
    const {Color}=colorContext(),h=hostContext(),src=read('js/color_library.js');let script;
    const fn=src.slice(src.indexOf('    function applyColor('),src.indexOf('    // ── Capture fill color'));
    vm.runInNewContext(fn+'applyColor(0);',{Color,curGroup:0,library:{groups:[{colors:[{source:{type:'RGB',values:[78,156,207]},c:62,m:25,y:0,k:19}]}]},toast(){},evalAI:s=>{script=s;}});
    const item={typename:'PathItem'};h.doc.selection=[item];
    assert.equal(vm.runInContext(script,h.ctx),'OK:1');
    assert.equal(item.fillColor.typename,'RGBColor');assert.deepEqual([item.fillColor.red,item.fillColor.green,item.fillColor.blue],[78,156,207]);
});

function colorPanel() {
    const requests=[],nodes={};
    function element(){return {style:{},children:[],listeners:{},_value:'',get value(){return this._value;},set value(v){this._value=String(v);},classList:{add(){},remove(){},toggle(){}},
        addEventListener(n,f){this.listeners[n]=f;},appendChild(c){this.children.push(c);},focus(){},select(){},
        fire(n){this.listeners[n].call(this,{stopPropagation(){},preventDefault(){}});}};}
    const window={__adobe_cep__:{evalScript:(script,cb)=>requests.push({script,cb})},localStorage:{getItem:()=>null,setItem(){}},innerWidth:300};
    const document={getElementById:id=>nodes[id]||(nodes[id]=element()),createElement:element,querySelectorAll:()=>[],addEventListener(){},body:element()};
    const ctx={window,document,console,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:f=>f()};vm.createContext(ctx);
    vm.runInContext(read('js/color_source.js'),ctx);
    const src=read('js/color_library.js');
    vm.runInContext(src.slice(0,src.indexOf('    // ── Init '))+`
        window.api={openEditor:openEditor,saveEditorColor:saveEditorColor,bindUI:bindUI,
        seed:function(colors){library.groups=[{id:'g',name:'group',colors:colors}];libraryLoaded=true;},
        colors:function(){return library.groups[0].colors;}};
    })();`,ctx);
    window.api.bindUI();
    return {api:window.api,nodes,requests};
}
test('late preview responses cannot overwrite a newer CMYK edit',()=>{
    const p=colorPanel();p.api.seed([{id:'a',name:'A',c:1,m:2,y:3,k:4,hex:'111111'}]);p.api.openEditor(0);
    p.nodes['cl-ed-c'].value='12.3456';p.nodes['cl-ed-c'].fire('input');
    assert.equal(p.requests.length,2);
    p.requests[1].cb(JSON.stringify({source:{type:'CMYK',values:[12.3456,2,3,4]},cmyk:[12.3456,2,3,4],hex:'ABCDEF'}));
    p.requests[0].cb(JSON.stringify({source:{type:'CMYK',values:[1,2,3,4]},cmyk:[1,2,3,4],hex:'111111'}));
    assert.equal(p.nodes['cl-ed-hex'].value,'ABCDEF');assert.equal(p.nodes['cl-ed-c'].value,'12.3456');
    p.api.saveEditorColor();assert.deepEqual(JSON.parse(JSON.stringify(p.api.colors()[0].source)),{type:'CMYK',values:[12.3456,2,3,4]});
});
test('HEX edits save the RGB source only after the matching conversion completes',()=>{
    const p=colorPanel();p.api.seed([{id:'a',name:'A',c:1,m:2,y:3,k:4,hex:'111111'}]);p.api.openEditor(0);
    p.nodes['cl-ed-hex'].value='4E9CCF';p.nodes['cl-ed-hex'].fire('input');
    p.api.saveEditorColor();assert.equal(p.api.colors()[0].source,undefined);
    p.requests[1].cb(JSON.stringify({source:{type:'RGB',values:[78,156,207]},cmyk:[66.9,26.3,3.6,0],hex:'4E9CCF'}));
    p.api.saveEditorColor();assert.deepEqual(JSON.parse(JSON.stringify(p.api.colors()[0].source)),{type:'RGB',values:[78,156,207]});
    assert.equal(p.api.colors()[0].hex,'4E9CCF');
});
test('failed preview cannot save the previous color HEX against a new source',()=>{
    const p=colorPanel();p.api.seed([{id:'a',name:'A',c:1,m:2,y:3,k:4,hex:'111111'}]);p.api.openEditor(0);
    p.nodes['cl-ed-c'].value='88';p.nodes['cl-ed-c'].fire('input');p.requests[1].cb('E:conversion');
    p.api.saveEditorColor();assert.equal(p.api.colors()[0].hex,undefined);assert.equal(p.api.colors()[0].source.values[0],88);
});
