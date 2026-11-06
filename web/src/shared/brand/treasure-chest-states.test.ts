import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it,vi} from "vitest";
vi.setConfig({testTimeout:30_000});
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",dir=path.join(root,prefix);
const ids=["closed","cracked","half-open","open"];
type Asset={path:string;sha256:string;width:number;height:number};
type Frame={sprite:Asset;spriteGray:Asset;zoom:Asset;logical:Asset;color:Asset;gray:Asset;title:Asset;canvas:number[];sceneOrigin:number[];ground:number[];worldGround:number[];source:Asset&{cell:{x:number;y:number;width:number;height:number}}};
type Manifest={inputs:Record<string,Asset>;outputs:Record<string,Asset>;frames:Record<string,Frame>;phone:{logical:Asset;color:Asset;gray:Asset;title:Asset};parentDesktop:{logical:Asset;title:Asset};review:Asset;decision:string;reviewOnly:boolean;runtimePromotion:boolean;registration:{scale:number;rawAnchor:number[]};sourceHistory:{source:Asset;editTarget:Asset;references:Asset[]}[]};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function load(){
  expect(existsSync(path.join(dir,"treasure-chest-states.manifest.json")),"Treasure chest manifest required").toBe(true);
  return JSON.parse(await readFile(path.join(dir,"treasure-chest-states.manifest.json"),"utf8")) as Manifest;
}
async function image(a:Asset){
  const b=await readFile(path.join(root,a.path));expect(hash(b)).toBe(a.sha256);
  const p=PNG.sync.read(b);expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function composer(){
  expect(existsSync(path.join(dir,"compose-treasure-chest-states.mjs")),"Treasure compositor required").toBe(true);
  return import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-treasure-chest-states.mjs");
}
it("pins actual provenance, old phone and titles without approving the family",async()=>{
  const m=await load(),parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false});
  expect(m.phone).toEqual(parent.frames["phone-staggered"]);expect(m.parentDesktop).toEqual(parent.frames["desktop-single"]);
  expect(m.inputs.parent.sha256).toBe("df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5");
  expect(m.inputs.material.sha256).toBe("c1e905b78299a1ae9f3c8d86b477a8ed368edc2ae9fce8eff6949abaf5946b18");
  expect(m.inputs.closedSource.sha256).toBe("b82139f77cb2cd10426caa1831f374eb9b65f85c0c5bb59deecdf9dd41ae1de9");
  expect(m.inputs.closedLayer.sha256).toBe("fc2a8eb5b6337658e3056cc4cfc014328a4ec0c2920d800f9daa37451aef729b");
  expect(m.inputs.warriorMaster.sha256).toBe("cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447");
  expect(m.inputs.warriorLayer.sha256).toBe("fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1");
  expect(m.phone.logical.sha256).toBe("dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf");
  for(const a of [...Object.values(m.inputs),m.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  for(const a of [m.phone.logical,m.phone.color,m.phone.gray,m.phone.title])await image(a);
  for(const id of ids)expect(m.frames[id].title).toEqual(parent.frames["desktop-single"].title);
  const lineage=JSON.parse(await readFile(path.join(root,m.inputs.lineage.path),"utf8"));
  expect(lineage).toMatchObject({generator:"imagegen",transparent:true,path:m.inputs.source.path,cells:ids});
  expect(lineage.references).toEqual([m.inputs.warriorMaster.path,m.inputs.warriorLayer.path,m.inputs.referenceScene.path]);
  expect((await readFile(path.join(root,m.inputs.prompt.path),"utf8")).length).toBeGreaterThan(400);
});
it("common envelope, body and source transforms",async()=>{
  const m=await load(),raw=await image(m.inputs.source),closed=await image(m.frames.closed.sprite);
  let wrong=0;
  for(const [index,id] of ids.entries()){
    const f=m.frames[id],p=await image(f.sprite);
    expect(f.canvas).toEqual([104,120]);expect(f.sceneOrigin).toEqual([92,230]);expect(f.ground).toEqual([52,120]);expect(f.worldGround).toEqual([144,350]);
    const c=f.source.cell;expect(c).toEqual({x:(index%2)*raw.width/2,y:Math.floor(index/2)*raw.height/2,width:raw.width/2,height:raw.height/2});
    expect(f.source.sha256).toBe(m.inputs.source.sha256);
    expect(p.data.subarray(90*104*4).equals(closed.data.subarray(90*104*4))).toBe(true);
    for(let y=0;y<90;y++)for(let x=0;x<104;x++){
      const sx=Math.floor(m.registration.rawAnchor[0]+(x-52)/m.registration.scale),sy=Math.floor(m.registration.rawAnchor[1]+(y-120)/m.registration.scale),di=(y*104+x)*4;
      let want=Buffer.from([0,0,0,0]);
      if(sx>=0&&sy>=0&&sx<c.width&&sy<c.height){
        const si=((c.y+sy)*raw.width+c.x+sx)*4;
        if(raw.data[si+3]>=200)want=Buffer.from([raw.data[si],raw.data[si+1],raw.data[si+2],255]);
      }
      if(!p.data.subarray(di,di+4).equals(want))wrong++;
    }
    let transparent=0;
    for(let i=0;i<p.data.length;i+=4){
      if(![0,255].includes(p.data[i+3]))wrong++;
      if(!p.data[i+3]){transparent++;if(p.data[i]||p.data[i+1]||p.data[i+2])wrong++;}
    }
    expect(transparent).toBeGreaterThan(0);
  }
  expect(wrong).toBe(0);
});
it("records exact hashes and edit-target lineage for all three ImageGen calls",async()=>{
  const m=await load();expect(m.sourceHistory).toHaveLength(3);
  for(const [i,step] of m.sourceHistory.entries()){
    await image(step.source);await image(step.editTarget);
    expect(step.editTarget).toEqual(i===0?m.inputs.closedSource:m.sourceHistory[i-1].source);
    for(const a of step.references)await image(a);
  }
  expect(m.sourceHistory[0].references).toEqual([m.inputs.warriorMaster,m.inputs.warriorLayer,m.inputs.referenceScene]);
  expect(m.sourceHistory[2].source).toEqual(m.inputs.source);
});
it("verifies all 25 output hashes, exact nearest sizes and true grayscale pixels",async()=>{
  const m=await load();expect(Object.keys(m.outputs)).toHaveLength(25);let wrong=0;
  for(const a of Object.values(m.outputs))await image(a);
  for(const id of ids){
    const f=m.frames[id];
    for(const [target,source,k] of [[f.zoom,f.sprite,2],[f.color,f.logical,2]] as [Asset,Asset,number][]){
      const p=await image(target),s=await image(source);expect([p.width,p.height]).toEqual([s.width*k,s.height*k]);
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
        const i=(y*p.width+x)*4,j=(Math.floor(y/k)*s.width+Math.floor(x/k))*4;
        if(!p.data.subarray(i,i+4).equals(s.data.subarray(j,j+4)))wrong++;
      }
    }
    for(const [target,source] of [[f.spriteGray,f.sprite],[f.gray,f.color]]){
      const p=await image(target),s=await image(source);expect([p.width,p.height]).toEqual([s.width,s.height]);
      for(let i=0;i<s.data.length;i+=4){const v=Math.round((2126*s.data[i]+7152*s.data[i+1]+722*s.data[i+2])/10000);
        if(!p.data.subarray(i,i+4).equals(Buffer.from([v,v,v,s.data[i+3]])))wrong++;}
    }
  }
  expect(wrong).toBe(0);
});
it("independently reconstructs ordered scenes and allows differences only inside the new envelope",async()=>{
  const m=await load(),parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  const a=await image(parent.sources.architectureDesktop),old=await image(m.parentDesktop.logical),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const bx=Math.floor((a.width-cw)/2),by=Math.floor((a.height-ch)/2);
  for(const id of ids){
    const expected=new PNG({width:960,height:540}),f=m.frames[id],actual=await image(f.logical);let changed=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const si=((by+Math.floor(y*ch/540))*a.width+bx+Math.floor(x*cw/960))*4,di=(y*960+x)*4;
      expected.data.set(a.data.subarray(si,si+3),di);expected.data[di+3]=255;
    }
    const layers=[...parent.scenes.desktop.layers,parent.frames["desktop-single"].title] as (Asset&{id?:string;x:number;y:number})[];
    for(const l of layers){
      const chest=l.id==="chest",p=await image(chest?f.sprite:l),ox=chest?92:l.x,oy=chest?230:l.y;
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
        const si=(y*p.width+x)*4,di=((y+oy)*960+x+ox)*4,alpha=p.data[si+3]/255;
        if(!alpha)continue;
        for(let k=0;k<3;k++)expected.data[di+k]=Math.round(p.data[si+k]*alpha+expected.data[di+k]*(1-alpha));
        expected.data[di+3]=255;
      }
    }
    expect(actual.data.equals(expected.data)).toBe(true);
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const i=(y*960+x)*4;if(actual.data.subarray(i,i+4).equals(old.data.subarray(i,i+4)))continue;
      changed++;expect(x>=92&&x<196&&y>=230&&y<350).toBe(true);
    }
    expect(changed).toBeGreaterThan(0);
  }
});
it("rebuilds all own PNG, HTML and manifest bytes identically twice",async()=>{
  const m=await load(),files=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path));
  files.push(path.join(dir,"treasure-chest-states.manifest.json"));
  const before=await Promise.all(files.map(f=>readFile(f))),mod=await composer();
  await mod.composeTreasureChestStates();await mod.composeTreasureChestStates();
  for(let i=0;i<files.length;i++)expect((await readFile(files[i])).equals(before[i])).toBe(true);
});
it("refuses changed own output before overwrite and restores only this test mutation",async()=>{
  const m=await load(),f=path.join(root,m.frames.open.sprite.path),before=await readFile(f),bad=Buffer.concat([before,Buffer.from([0])]),mod=await composer();
  try{await writeFile(f,bad);await expect(mod.composeTreasureChestStates()).rejects.toThrow("Changed input");expect((await readFile(f)).equals(bad)).toBe(true);}
  finally{await writeFile(f,before);}
});
it("rejects an incomplete prior output inventory without writing outputs",async()=>{
  const m=await load(),f=path.join(dir,"treasure-chest-states.manifest.json"),before=await readFile(f),bad=structuredClone(m),mod=await composer();
  delete bad.outputs["open-sprite"];
  const paths=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path)),old=await Promise.all(paths.map(p=>readFile(p)));
  try{await writeFile(f,JSON.stringify(bad));await expect(mod.composeTreasureChestStates()).rejects.toThrow("Existing output set differs");
    for(let i=0;i<paths.length;i++)expect((await readFile(paths[i])).equals(old[i])).toBe(true);}
  finally{await writeFile(f,before);}
});
it("rejects odd, empty, clipped and misregistered numerical fixtures",async()=>{
  const url=path.join(dir,"treasure-chest-state.raster.mjs");
  expect(existsSync(url),"Treasure raster required").toBe(true);
  const {prepareFamily}=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/treasure-chest-state.raster.mjs");
  expect(()=>prepareFamily(new PNG({width:191,height:192}))).toThrow("Even 2x2");
  expect(()=>prepareFamily(new PNG({width:192,height:192}))).toThrow("Empty source");
  const fixture=(shift=0,edge=false)=>{
    const p=new PNG({width:192,height:192});
    for(let i=0;i<4;i++)for(let y=20;y<80;y++)for(let x=0;x<70;x++){
      const ox=(i%2)*96+(edge?0:10)+(i===1?shift:0),oy=Math.floor(i/2)*96;
      p.data[((oy+y)*192+ox+x)*4+3]=255;
    }
    return p;
  };
  expect(()=>prepareFamily(fixture())).not.toThrow();
  expect(()=>prepareFamily(fixture(0,true))).toThrow("Source touches cell edge");
  expect(()=>prepareFamily(fixture(8))).toThrow("Body registration mismatch");
});
