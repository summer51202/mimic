import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it,vi} from "vitest";
vi.setConfig({testTimeout:60_000});
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",dir=path.join(root,prefix);
const ids=["closed","latch-release","unlatched","cracked","half-open","opening-wide","near-open","open"];
type Asset={path:string;sha256:string;width?:number;height?:number};
type Frame={sprite:Asset;spriteGray:Asset;zoom:Asset;logical:Asset;color:Asset;gray:Asset;title:Asset;canvas:number[];ground:number[];worldGround:number[];sceneOrigin:number[];source:Asset&{cell:{x:number;y:number;width:number;height:number}}};
type Manifest={inputs:Record<string,Asset>;outputs:Record<string,Asset>;frames:Record<string,Frame>;oldFrames:Record<string,Frame>;phone:{logical:Asset;color:Asset;gray:Asset;title:Asset};parentDesktop:{logical:Asset;title:Asset};review:Asset;sourceHistory:{source:Asset;editTarget:Asset;references:Asset[]}[];registration:{scale:number;rawAnchor:number[]};decision:string;reviewOnly:boolean;runtimePromotion:boolean;config:{frames:string[];mainFrames:Record<string,string>;timelines:Record<string,[string,number][]>}};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function load(){
  expect(existsSync(path.join(dir,"restored-treasure-chest.manifest.json")),"Restored manifest required").toBe(true);
  return JSON.parse(await readFile(path.join(dir,"restored-treasure-chest.manifest.json"),"utf8")) as Manifest;
}
async function image(a:Asset){
  const b=await readFile(path.join(root,a.path));expect(hash(b)).toBe(a.sha256);const p=PNG.sync.read(b);
  expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function composer(){
  const url=path.join(dir,"compose-restored-treasure-chest.mjs");
  expect(existsSync(url),"Restored compositor required").toBe(true);
  return import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-restored-treasure-chest.mjs");
}
it("pins old history, phone, titles, source history and exact frame/time metadata without approving art",async()=>{
  const m=await load(),old=JSON.parse(await readFile(path.join(dir,"treasure-chest-states.manifest.json"),"utf8"));
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false});
  expect(m.inputs.old.sha256).toBe("61f1bf4e2ec7efca3e3c80a08af1852f674868094d8912962d2c40082c636cb1");
  expect(m.phone).toEqual(old.phone);expect(m.parentDesktop).toEqual(old.parentDesktop);expect(m.oldFrames).toEqual(old.frames);
  expect(m.config.frames).toEqual(ids);expect(Object.keys(m.config.mainFrames)).toEqual(["closed","cracked","half-open","open"]);
  expect(new Set(ids.map(id=>m.frames[id].sprite.sha256)).size).toBe(8);
  expect(m.config.timelines.open).toEqual([["latch-release",100],["unlatched",90],["cracked",150],["half-open",90],["opening-wide",70],["near-open",110],["open",140]]);
  expect(m.config.timelines.close).toEqual([["near-open",120],["opening-wide",100],["half-open",80],["cracked",70],["unlatched",90],["latch-release",80],["closed",120]]);
  for(const a of [...Object.values(m.inputs),m.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  expect(m.sourceHistory.length).toBeGreaterThan(0);
  for(const [i,s] of m.sourceHistory.entries()){
    await image(s.source);await image(s.editTarget);for(const a of s.references)await image(a);
    expect(s.editTarget).toEqual(i?m.sourceHistory[i-1].source:m.inputs.oldSource);
  }
  expect(m.sourceHistory.at(-1)!.source.sha256).toBe(m.inputs.source.sha256);
  for(const a of [m.phone.logical,m.phone.color,m.phone.gray,m.phone.title])await image(a);
  for(const id of ids)expect(m.frames[id].title).toEqual(old.parentDesktop.title);
});
it("samples a single raw transform, preserves moving latch pixels and freezes static lower body",async()=>{
  const m=await load(),source=await image(m.inputs.source),closed=await image(m.frames.closed.sprite);let wrong=0;
  for(const [index,id] of ids.entries()){
    const f=m.frames[id],p=await image(f.sprite),c=f.source.cell;expect(f.canvas).toEqual([104,120]);
    expect(f.sceneOrigin).toEqual([92,230]);expect(f.ground).toEqual([52,120]);expect(f.worldGround).toEqual([144,350]);
    expect(c).toEqual({x:20+(index%4)*432,y:Math.floor(index/4)*430,width:432,height:430});
    let transparent=0;
    for(let y=0;y<120;y++)for(let x=0;x<104;x++){
      const i=(y*104+x)*4,latch=x>=44&&x<80&&y>=68&&y<108;
      let expected:Buffer;
      if(id!=="closed"&&y>=90&&!latch)expected=closed.data.subarray(i,i+4);
      else{
        const sx=Math.floor(m.registration.rawAnchor[0]+(x-52)/m.registration.scale),sy=Math.floor(m.registration.rawAnchor[1]+(y-120)/m.registration.scale);
        expected=Buffer.from([0,0,0,0]);
        if(sx>=0&&sy>=0&&sx<c.width&&sy<c.height){const j=((c.y+sy)*source.width+c.x+sx)*4;if(source.data[j+3]>=200)expected=Buffer.from([source.data[j],source.data[j+1],source.data[j+2],255]);}
      }
      if(!p.data.subarray(i,i+4).equals(expected))wrong++;
      if(![0,255].includes(p.data[i+3]))wrong++;if(!p.data[i+3]){transparent++;if(p.data[i]||p.data[i+1]||p.data[i+2])wrong++;}
    }
    expect(transparent).toBeGreaterThan(0);
  }
  expect(wrong).toBe(0);
});
it("checks all49 actual hashes, true grayscale and integer-nearest outputs",async()=>{
  const m=await load();expect(Object.keys(m.outputs)).toHaveLength(49);let wrong=0;
  for(const a of Object.values(m.outputs))await image(a);
  for(const id of ids){const f=m.frames[id];
    for(const [a,b] of [[f.zoom,f.sprite],[f.color,f.logical]]){
      const p=await image(a),s=await image(b);expect([p.width,p.height]).toEqual([s.width*2,s.height*2]);
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const i=(y*p.width+x)*4,j=(Math.floor(y/2)*s.width+Math.floor(x/2))*4;if(!p.data.subarray(i,i+4).equals(s.data.subarray(j,j+4)))wrong++;}
    }
    for(const [a,b] of [[f.spriteGray,f.sprite],[f.gray,f.color]]){
      const p=await image(a),s=await image(b);expect([p.width,p.height]).toEqual([s.width,s.height]);
      for(let i=0;i<s.data.length;i+=4){const v=Math.round((2126*s.data[i]+7152*s.data[i+1]+722*s.data[i+2])/10000);if(!p.data.subarray(i,i+4).equals(Buffer.from([v,v,v,s.data[i+3]])))wrong++;}
    }
  }expect(wrong).toBe(0);
});
it("independently rebuilds each ordered scene and freezes pixels outside the envelope",async()=>{
  const m=await load(),parent=JSON.parse(await readFile(path.join(root,m.inputs.parent.path),"utf8")),a=await image(parent.sources.architectureDesktop),old=await image(m.parentDesktop.logical),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio),bx=Math.floor((a.width-cw)/2),by=Math.floor((a.height-ch)/2);
  for(const id of ids){const expected=new PNG({width:960,height:540}),actual=await image(m.frames[id].logical);let changes=0,outside=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){const si=((by+Math.floor(y*ch/540))*a.width+bx+Math.floor(x*cw/960))*4,di=(y*960+x)*4;expected.data.set(a.data.subarray(si,si+3),di);expected.data[di+3]=255;}
    const layers=[...parent.scenes.desktop.layers,parent.frames["desktop-single"].title] as (Asset&{id?:string;x:number;y:number})[];
    for(const l of layers){const chest=l.id==="chest",p=await image(chest?m.frames[id].sprite:l),ox=chest?92:l.x,oy=chest?230:l.y;
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){const si=(y*p.width+x)*4,di=((y+oy)*960+x+ox)*4,alpha=p.data[si+3]/255;if(!alpha)continue;for(let k=0;k<3;k++)expected.data[di+k]=Math.round(p.data[si+k]*alpha+expected.data[di+k]*(1-alpha));expected.data[di+3]=255;}
    }
    expect(actual.data.equals(expected.data)).toBe(true);
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){const i=(y*960+x)*4;if(actual.data.subarray(i,i+4).equals(old.data.subarray(i,i+4)))continue;changes++;if(x<92||x>=196||y<230||y>=350)outside++;}
    expect(changes).toBeGreaterThan(0);expect(outside).toBe(0);
  }
});
it("accepts only transparent unused gutters and never pastes the closed latch over moving art",async()=>{
  const url=path.join(dir,"restored-chest.raster.mjs");
expect(existsSync(url),"Restored raster required").toBe(true);
const {prepareRestoredFamily}=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.raster.mjs");
  const fixture=(width=384)=>{
    const p=new PNG({width,height:192});
    for(let i=0;i<8;i++){const ox=Math.round((i%4)*width/4),oy=Math.floor(i/4)*96;
      for(let y=20;y<80;y++)for(let x=10;x<80;x++)p.data.set([60+i,30,10,255],((oy+y)*width+ox+x)*4);
      if(i===1)p.data.set([200,20,10,255],((oy+58)*width+ox+48)*4);
    }return p;
  };
  const f=prepareRestoredFamily(fixture());expect(f.sprites).toHaveLength(8);
  expect(f.sprites[1].data[(96*104+56)*4]).toBe(200);
  expect(f.sprites[1].data[(110*104+20)*4]).toBe(f.sprites[0].data[(110*104+20)*4]);
  expect(()=>prepareRestoredFamily(fixture(385))).not.toThrow();const bad=fixture(385);bad.data[(50*385+192)*4+3]=255;
  expect(()=>prepareRestoredFamily(bad)).toThrow("Opaque atlas gutter");
  expect(()=>prepareRestoredFamily(new PNG({width:384,height:192}))).toThrow("Empty source");
  const opaque=new PNG({width:384,height:192});opaque.data.fill(255);expect(()=>prepareRestoredFamily(opaque)).toThrow("Transparent source required");
});
it("uses one explicit regular atlas lattice without per-frame fitting",async()=>{
  const {prepareRestoredFamily}=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.raster.mjs");
  const atlas=new PNG({width:400,height:200});
  for(let i=0;i<8;i++)for(let y=20;y<80;y++)for(let x=10;x<80;x++)atlas.data.set([60+i,30,10,255],(((4+Math.floor(i/4)*96+y)*400)+8+(i%4)*96+x)*4);
  const family=prepareRestoredFamily(atlas,{origin:[8,4],cell:[96,96],stride:[96,96]});
  expect(family.registration.cells).toEqual(ids.map((_,i)=>({x:8+(i%4)*96,y:4+Math.floor(i/4)*96,width:96,height:96})));
});
it("regenerates all51 PNG/HTML/manifest files byte-identically twice",async()=>{
  const m=await load(),files=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path));files.push(path.join(dir,"restored-treasure-chest.manifest.json"));
  const before=await Promise.all(files.map(f=>readFile(f))),mod=await composer();await mod.composeRestoredChest();await mod.composeRestoredChest();
  for(let i=0;i<files.length;i++)expect((await readFile(files[i])).equals(before[i]),files[i]).toBe(true);
});
it("refuses a changed own output and restores only its own test mutation",async()=>{
  const m=await load(),file=path.join(root,m.frames.open.sprite.path),original=await readFile(file),bad=Buffer.concat([original,Buffer.from([0])]),mod=await composer();
  try{await writeFile(file,bad);await expect(mod.composeRestoredChest()).rejects.toThrow("Changed input");expect((await readFile(file)).equals(bad)).toBe(true);}finally{await writeFile(file,original);}
});
it("rejects an incomplete output inventory before writing any output",async()=>{
  const m=await load(),file=path.join(dir,"restored-treasure-chest.manifest.json"),original=await readFile(file),bad=structuredClone(m),mod=await composer();delete bad.outputs["open-sprite"];
  const files=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path)),before=await Promise.all(files.map(f=>readFile(f)));
  try{await writeFile(file,JSON.stringify(bad));await expect(mod.composeRestoredChest()).rejects.toThrow("Existing output set differs");for(let i=0;i<files.length;i++)expect((await readFile(files[i])).equals(before[i])).toBe(true);}finally{await writeFile(file,original);}
});
