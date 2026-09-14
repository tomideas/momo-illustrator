// Native color values are authoritative; CMYK/HEX previews never replace them.
(function (root) {
    "use strict";

    function source(entry) {
        var s = entry.source || { type: "CMYK", values: [entry.c, entry.m, entry.y, entry.k] };
        validate(s);
        return JSON.parse(JSON.stringify(s));
    }

    function validate(s) {
        if (!s || typeof s !== "object") throw new Error("颜色数据无效");
        if (s.type === "Spot") {
            if (typeof s.name !== "string" || !s.name || !isFinite(s.tint) || typeof s.tint !== "number" || s.tint < 0 || s.tint > 100 ||
                (s.colorType !== "SPOT" && s.colorType !== "PROCESS") || !s.base || s.base.type === "Spot") throw new Error("专色数据无效");
            validate(s.base);
            return;
        }
        var limits = { CMYK: [[0,100],[0,100],[0,100],[0,100]], RGB: [[0,255],[0,255],[0,255]], Gray: [[0,100]], Lab: [[0,100],[-128,127],[-128,127]] };
        var bounds = limits[s.type];
        if (!bounds || !Array.isArray(s.values) || s.values.length !== bounds.length) throw new Error("不支持的颜色类型");
        for (var i = 0; i < bounds.length; i++) {
            if (typeof s.values[i] !== "number" || !isFinite(s.values[i]) || s.values[i] < bounds[i][0] || s.values[i] > bounds[i][1]) throw new Error("颜色通道超出范围");
        }
    }

    function literal(value) {
        return JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }

    // This factory is also serialized into ExtendScript. Keep it ES3-compatible.
    function hostFactory() {
        function read(c) {
            if (!c) throw new Error("没有填色");
            switch (c.typename) {
                case "CMYKColor": return {type:"CMYK",values:[+c.cyan,+c.magenta,+c.yellow,+c.black]};
                case "RGBColor": return {type:"RGB",values:[+c.red,+c.green,+c.blue]};
                case "GrayColor": return {type:"Gray",values:[+c.gray]};
                case "LabColor": return {type:"Lab",values:[+c.l,+c.a,+c.b]};
                case "SpotColor":
                    if (c.spot.colorType === ColorModel.REGISTRATION) throw new Error("不支持套版色");
                    return {type:"Spot",name:c.spot.name,colorType:c.spot.colorType===ColorModel.SPOT?"SPOT":"PROCESS",tint:+c.tint,base:read(c.spot.color)};
            }
            throw new Error("不支持的填色类型：" + c.typename);
        }
        function same(a,b) {
            if (a.type !== b.type || a.values.length !== b.values.length) return false;
            for (var i=0;i<a.values.length;i++) if (Math.abs(a.values[i]-b.values[i])>0.0001) return false;
            return true;
        }
        function make(s,doc) {
            var c,v=s.values;
            if(s.type==="CMYK"){c=new CMYKColor();c.cyan=v[0];c.magenta=v[1];c.yellow=v[2];c.black=v[3];}
            else if(s.type==="RGB"){c=new RGBColor();c.red=v[0];c.green=v[1];c.blue=v[2];}
            else if(s.type==="Gray"){c=new GrayColor();c.gray=v[0];}
            else if(s.type==="Lab"){c=new LabColor();c.l=v[0];c.a=v[1];c.b=v[2];}
            else if(s.type==="Spot"){
                var spot=null;try{spot=doc.spots.getByName(s.name);}catch(e){}
                var model=s.colorType==="PROCESS"?ColorModel.PROCESS:ColorModel.SPOT;
                if(spot){
                    if(spot.colorType!==model||!same(read(spot.color),s.base)) throw new Error("同名专色定义不同："+s.name);
                }else{
                    spot=doc.spots.add();
                    try{spot.name=s.name;spot.colorType=model;spot.color=make(s.base,doc);}catch(e2){try{spot.remove();}catch(e3){}throw e2;}
                }
                c=new SpotColor();c.spot=spot;c.tint=s.tint;
            }else{throw new Error("不支持的颜色类型");}
            return c;
        }
        function convert(type,values,to) {
            var spaces={CMYK:ImageColorSpace.CMYK,RGB:ImageColorSpace.RGB,Gray:ImageColorSpace.GrayScale,Lab:ImageColorSpace.LAB};
            return app.convertSampleColor(spaces[type],values,spaces[to],ColorConvertPurpose.defaultpurpose);
        }
        function info(s) {
            var rgb,cmyk;
            if(s.type==="Spot"){
                var base=info(s.base),t=s.tint/100;
                // Screen preview only; applying a spot always uses its original definition and tint.
                if(s.base.type==="CMYK"){
                    cmyk=[];for(var i=0;i<4;i++)cmyk[i]=base.cmyk[i]*t;
                    rgb=convert("CMYK",cmyk,"RGB");
                }else{
                    rgb=[];for(var j=0;j<3;j++)rgb[j]=255+(base.rgb[j]-255)*t;
                    cmyk=convert("RGB",rgb,"CMYK");
                }
            }else{
                rgb=s.type==="RGB"?s.values:convert(s.type,s.values,"RGB");
                cmyk=s.type==="CMYK"?s.values:convert(s.type,s.values,"CMYK");
            }
            var hex="";for(var n=0;n<3;n++){var h=Math.max(0,Math.min(255,Math.round(rgb[n]))).toString(16);hex+=(h.length<2?"0":"")+h;}
            return {source:s,cmyk:cmyk,rgb:rgb,hex:hex.toUpperCase()};
        }
        // ExtendScript installations do not always provide JSON.stringify.
        function json(v) {
            if(v===null)return "null";
            if(typeof v==="string")return '"'+v.replace(/[\\"\u0000-\u001f\u2028\u2029]/g,function(c){var h=c.charCodeAt(0).toString(16);return "\\u"+("0000"+h).slice(-4);})+'"';
            if(typeof v==="number")return isFinite(v)?String(v):"null";
            if(typeof v==="boolean")return String(v);
            var a=[],i;
            if(v instanceof Array){for(i=0;i<v.length;i++)a.push(json(v[i]));return "["+a.join(",")+"]";}
            for(i in v)if(v.hasOwnProperty(i))a.push(json(i)+":"+json(v[i]));
            return "{"+a.join(",")+"}";
        }
        return {read:read,make:make,info:info,json:json};
    }

    function label(s) {
        function n(v) { return String(Math.round(v*10000)/10000); }
        if(s.type==="Spot")return (s.colorType==="PROCESS"?"全局色 ":"专色 ")+s.name+" · "+n(s.tint)+"%";
        var names={CMYK:["C","M","Y","K"],RGB:["R","G","B"],Gray:["Gray "],Lab:["L","a","b"]};
        return s.values.map(function(v,i){return names[s.type][i]+n(v);}).join(" ");
    }

    root.MomoColorSource = {source:source,validate:validate,literal:literal,label:label,hostFactory:hostFactory,
        prelude:function(){return "var MomoColor=("+hostFactory.toString()+")();";}};
})(typeof window !== "undefined" ? window : this);
