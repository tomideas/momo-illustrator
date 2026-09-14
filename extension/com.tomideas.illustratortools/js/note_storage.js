// Complete snapshots keep tab names, order and content in one atomic localStorage write.
(function (root) {
    "use strict";
    var KEY = "MomoTools_Notes_v2", BACKUP = KEY + "_backup";

    function valid(s) {
        if(!s || s.version!==2 || !Array.isArray(s.tabs) || !Array.isArray(s.contents) ||
            !s.tabs.length || s.tabs.length>10 || s.tabs.length!==s.contents.length ||
            typeof s.updatedAt!=="number" || !isFinite(s.updatedAt) || typeof s.active!=="number" ||
            !isFinite(s.active) || s.active<0 || s.active>=s.tabs.length || s.active%1 ||
            typeof s.fontSize!=="number" || !(s.fontSize>=9 && s.fontSize<=32)) return false;
        for(var i=0;i<s.tabs.length;i++)if(typeof s.tabs[i]!=="string" || typeof s.contents[i]!=="string")return false;
        return true;
    }
    function parse(raw) { try { var s=JSON.parse(raw); return valid(s)?s:null; } catch(e) { return null; } }

    function create() {
        var fs=root.cep && root.cep.fs, dir=null, nextSlot=0, lastTime=0, lastDiskRaw=null;
        try {
            dir=decodeURIComponent(root.__adobe_cep__.getSystemPath("userData")).replace(/\\/g,"/").replace(/\/$/,"")+"/MomoTools";
            if(dir.indexOf("file://")===0)dir=dir.slice(7);
            if(fs && fs.stat(dir).err!==0 && fs.makedir(dir).err!==0)dir=null;
        } catch(e) { dir=null; }

        function load() {
            var best=null, failed=false, hadSnapshot=false,latestDiskTime=-1;
            function candidate(raw,slot) {
                if(!raw)return;
                hadSnapshot=true;
                var s=parse(raw);
                if(!s){failed=true;return;}
                if(slot!==null && s.updatedAt>latestDiskTime){latestDiskTime=s.updatedAt;nextSlot=1-slot;}
                if(!best || s.updatedAt>best.updatedAt)best=s;
            }
            try{candidate(root.localStorage.getItem(KEY),null);candidate(root.localStorage.getItem(BACKUP),null);}catch(e){failed=true;}
            if(fs && dir)for(var i=0;i<2;i++){
                var r=fs.readFile(dir+"/notes."+i+".json","UTF-8");
                if(r.err===0)candidate(r.data,i);else if(r.err!==3)failed=true;
            }
            if(best){lastTime=best.updatedAt;return {state:best,recovered:failed};}
            // Legacy keys remain untouched so migration can always be reversed.
            if(!hadSnapshot)try{
                var raw=root.localStorage.getItem("MomoTools_NoteTabs"),tabs=raw?JSON.parse(raw):["笔记 1"],contents=[];
                if(!Array.isArray(tabs)||!tabs.length||tabs.length>10)throw new Error("分页数据无效");
                for(var j=0;j<tabs.length;j++){
                    tabs[j]=typeof tabs[j]==="number"?"笔记 "+tabs[j]:String(tabs[j]);
                    contents.push(root.localStorage.getItem("MomoTools_NoteTab_"+j)||"");
                }
                var active=parseInt(root.localStorage.getItem("MomoTools_NoteActive"),10)||0;
                var size=parseInt(root.localStorage.getItem("MomoTools_NoteFontSize"),10)||13;
                best={version:2,updatedAt:0,tabs:tabs,contents:contents,active:Math.max(0,Math.min(tabs.length-1,active)),fontSize:Math.max(9,Math.min(32,size))};
                // Do not create an empty replacement if storage could not be read.
                if(failed && !raw)return {error:"笔记读取失败，原存档已保留"};
                return {state:best,recovered:failed};
            }catch(e){failed=true;}
            return {error:"笔记读取失败，原存档已保留"};
        }

        function snapshot(tabs,contents,active,size) {
            lastTime=Math.max(Date.now(),lastTime+1);
            return {version:2,updatedAt:lastTime,tabs:tabs.slice(),contents:contents.slice(),active:active,fontSize:size};
        }
        function saveLocal(state) {
            if(!valid(state))return false;
            try{
                var prev=root.localStorage.getItem(KEY);
                if(parse(prev))try{root.localStorage.setItem(BACKUP,prev);}catch(e){}
                root.localStorage.setItem(KEY,JSON.stringify(state));return true;
            }catch(e){return false;}
        }
        function saveFile(state) {
            if(!fs || !dir || !valid(state))return false;
            var raw=JSON.stringify(state);
            if(raw===lastDiskRaw)return true;
            // Alternate files: a failed/partial write never destroys the last good disk snapshot.
            var path=dir+"/notes."+nextSlot+".json";
            try{
                if(fs.writeFile(path,raw,"UTF-8").err!==0)return false;
                var check=fs.readFile(path,"UTF-8");
                if(check.err!==0 || check.data!==raw)return false;
                nextSlot=1-nextSlot;lastDiskRaw=raw;return true;
            }catch(e){return false;}
        }
        return {load:load,snapshot:snapshot,saveLocal:saveLocal,saveFile:saveFile};
    }
    root.MomoNoteStorage={create:create,valid:valid};
})(typeof window!=="undefined"?window:this);
