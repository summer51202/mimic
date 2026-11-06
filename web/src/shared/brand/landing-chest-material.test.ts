import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it} from "vitest";
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",dir=path.join(root,prefix);
type Asset={path:string;sha256:string;width:number;height:number};
type Frame={logical:Asset;color:Asset;gray:Asset;title:Asset&{x:number;y:number}};
type Manifest={decision:string;reviewOnly:boolean;runtimePromotion:boolean;inputs:Record<string,Asset>;outputs:Record<string,Asset>;
 before:{layer:Asset;frame:Frame};frames:Record<string,Frame>;placement:{x:number;y:number;width:number;height:number};review:Asset;changedPixels:number;
 fit:{bounds:{x:number;y:number;width:number;height:number};width:number;height:number;x:number;y:number;scale:number}};
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
async function load(){
  expect(existsSync(path.join(dir,"landing-chest-material.manifest.json")),"Chest material manifest required").toBe(true);
  return JSON.parse(await readFile(path.join(dir,"landing-chest-material.manifest.json"),"utf8")) as Manifest;
}
async function image(a:Asset){
  const b=await readFile(path.join(root,a.path));expect(hash(b)).toBe(a.sha256);
  const p=PNG.sync.read(b);expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function composeModule(){
  expect(existsSync(path.join(dir,"compose-landing-chest-material.mjs")),"Chest compositor required").toBe(true);
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-chest-material.mjs");
}
async function rasterModule(){
  expect(existsSync(path.join(dir,"landing-chest-raster.mjs")),"Chest raster module required").toBe(true);
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-chest-raster.mjs") as {
    fitChest:(p:PNG)=>{png:PNG;fit:Manifest["fit"]};over:(c:PNG,p:PNG,x:number,y:number)=>void;
  };
}
it("keeps both titles, phone and chest transform exact without approving the family",async()=>{
  const m=await load(),old=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,placement:{x:105,y:284,width:78,height:66}});
  expect(m.frames["desktop-before"]).toEqual(old.frames["desktop-single"]);
  expect(m.frames["desktop-after"].title).toEqual(old.frames["desktop-single"].title);
  expect(m.frames["phone-staggered"]).toEqual(old.frames["phone-staggered"]);
  expect(m.inputs.parent.sha256).toBe("df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5");
  expect(m.inputs.oldSource.sha256).toBe("8308b9bf28f164f3b6f37b190eb6330345d6787794f9e8e1b20af899c2f96011");
  expect(m.inputs.warriorMaster.sha256).toBe("cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447");
  for(const a of [...Object.values(m.inputs),m.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  for(const f of Object.values(m.frames))for(const a of [f.logical,f.color,f.gray,f.title])await image(a);
});
it("changes real pixels only inside 105/284/78/66",async()=>{
  const m=await load(),before=await image(m.before.frame.logical),after=await image(m.outputs.logical);
  let changed=0,outside=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;
    if(before.data.subarray(i,i+4).equals(after.data.subarray(i,i+4)))continue;
    changed++;if(x<105||x>=183||y<284||y>=350)outside++;
  }
  expect(changed).toBeGreaterThan(0);expect(outside).toBe(0);expect(m.changedPixels).toBe(changed);
});
it("matches an independent background and ordered layer rebuild, not paint-over",async()=>{
  const m=await load(),parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  const a=await image(parent.sources.architectureDesktop),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const bx=Math.floor((a.width-cw)/2),by=Math.floor((a.height-ch)/2),expected=new PNG({width:960,height:540});
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const si=((by+Math.floor(y*ch/540))*a.width+bx+Math.floor(x*cw/960))*4,di=(y*960+x)*4;
    expected.data.set(a.data.subarray(si,si+3),di);expected.data[di+3]=255;
  }
  const layers=[...parent.scenes.desktop.layers,parent.frames["desktop-single"].title] as (Asset&{id?:string;x:number;y:number})[];
  for(const l of layers){
    const p=await image(l.id==="chest"?m.outputs.layer:l);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const si=(y*p.width+x)*4,di=((l.y+y)*960+l.x+x)*4,alpha=p.data[si+3]/255;
      if(!alpha)continue;
      for(let c=0;c<3;c++)expected.data[di+c]=Math.round(p.data[si+c]*alpha+expected.data[di+c]*(1-alpha));
      expected.data[di+3]=255;
    }
  }
  expect((await image(m.outputs.logical)).data.equals(expected.data)).toBe(true);
});
it("checks actual transparent RGB, sizes, true gray and integer-nearest exports",async()=>{
  const m=await load(),layer=await image(m.outputs.layer);
  expect([layer.width,layer.height]).toEqual([78,66]);
  let transparent=0;
  for(let i=0;i<layer.data.length;i+=4){
    expect([0,255]).toContain(layer.data[i+3]);
    if(!layer.data[i+3]){transparent++;expect([...layer.data.subarray(i,i+3)]).toEqual([0,0,0]);}
  }
  expect(transparent).toBeGreaterThan(0);
  const raw=await image(m.inputs.source),b=m.fit.bounds;
  const scale=Math.min(78/b.width,66/b.height);
  expect([m.fit.width,m.fit.height,m.fit.x,m.fit.y]).toEqual([Math.round(b.width*scale),Math.round(b.height*scale),Math.floor((78-Math.round(b.width*scale))/2),66-Math.round(b.height*scale)]);
  let wrong=0;
  for(let y=0;y<66;y++)for(let x=0;x<78;x++){
    const di=(y*78+x)*4,inside=x>=m.fit.x&&x<m.fit.x+m.fit.width&&y>=m.fit.y&&y<m.fit.y+m.fit.height;
    if(!inside){if(layer.data[di+3])wrong++;continue;}
    const sx=b.x+Math.floor((x-m.fit.x)*b.width/m.fit.width),sy=b.y+Math.floor((y-m.fit.y)*b.height/m.fit.height),si=(sy*raw.width+sx)*4;
    const want=raw.data[si+3]>=200?[raw.data[si],raw.data[si+1],raw.data[si+2],255]:[0,0,0,0];
    if(!layer.data.subarray(di,di+4).equals(Buffer.from(want)))wrong++;
  }
  for(const [target,source,scale] of [
    [m.outputs.beforeZoom,m.before.layer,3],[m.outputs.afterZoom,m.outputs.layer,3],[m.outputs.color,m.outputs.logical,2],
  ] as [Asset,Asset,number][]){
    const p=await image(target),s=await image(source);expect([p.width,p.height]).toEqual([s.width*scale,s.height*scale]);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const i=(y*p.width+x)*4,j=(Math.floor(y/scale)*s.width+Math.floor(x/scale))*4;
      if(!p.data.subarray(i,i+4).equals(s.data.subarray(j,j+4)))wrong++;
    }
  }
  for(const [target,source] of [[m.outputs.layerGray,m.outputs.layer],[m.outputs.oldGray,m.before.layer],[m.outputs.gray,m.outputs.color]]){
    const g=await image(target),s=await image(source);expect([g.width,g.height]).toEqual([s.width,s.height]);
    for(let i=0;i<s.data.length;i+=4){
      const v=Math.round((2126*s.data[i]+7152*s.data[i+1]+722*s.data[i+2])/10000);
      if(!g.data.subarray(i,i+4).equals(Buffer.from([v,v,v,s.data[i+3]])))wrong++;
    }
  }
  expect(wrong).toBe(0);
});
it("rejects empty, opaque, clipped or incompatible test fixtures without drawing production art",async()=>{
  const {fitChest,over}=await rasterModule(),empty=new PNG({width:16,height:16}),opaque=new PNG({width:16,height:16});
  opaque.data.fill(255);
  expect(()=>fitChest(empty)).toThrow("Empty source");expect(()=>fitChest(opaque)).toThrow("Transparent source required");
  const slim=new PNG({width:16,height:16});
  for(let y=2;y<14;y++)slim.data[(y*16+8)*4+3]=255;
  expect(()=>fitChest(slim)).toThrow("Source proportions");
  const clipped=new PNG({width:16,height:16});
  for(let y=0;y<12;y++)for(let x=0;x<14;x++)clipped.data[(y*16+x)*4+3]=255;
  expect(()=>fitChest(clipped)).toThrow("Source touches edge");
  expect(()=>over(empty,new PNG({width:2,height:2}),15,15)).toThrow("Clipped layer");
});
it("rebuilds all own artifacts byte-identically",async()=>{
  const m=await load(),files=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path));
  files.push(path.join(dir,"landing-chest-material.manifest.json"));
  const before=await Promise.all(files.map(f=>readFile(f))),{composeChestMaterial}=await composeModule();
  await composeChestMaterial();await composeChestMaterial();
  for(let i=0;i<files.length;i++)expect((await readFile(files[i])).equals(before[i])).toBe(true);
});
it("refuses changed own output without overwriting it; restores only the test mutation",async()=>{
  const m=await load(),file=path.join(root,m.outputs.layer.path),original=await readFile(file),changed=Buffer.concat([original,Buffer.from([0])]);
  const {composeChestMaterial}=await composeModule();
  try{await writeFile(file,changed);await expect(composeChestMaterial()).rejects.toThrow("Changed input");expect((await readFile(file)).equals(changed)).toBe(true);}
  finally{await writeFile(file,original);}
  expect(hash(await readFile(file))).toBe(m.outputs.layer.sha256);
});
it("rejects an incomplete prior output inventory before any writes",async()=>{
  const m=await load(),file=path.join(dir,"landing-chest-material.manifest.json"),original=await readFile(file);
  const bad=structuredClone(m);delete bad.outputs.layer;
  const altered=Buffer.from(JSON.stringify(bad,null,2)+"\n"),{composeChestMaterial}=await composeModule();
  const outputPaths=[...Object.values(m.outputs),m.review].map(a=>path.join(root,a.path));
  const before=await Promise.all(outputPaths.map(p=>readFile(p)));
  try{
    await writeFile(file,altered);
    await expect(composeChestMaterial()).rejects.toThrow("Existing chest output set differs");
    expect((await readFile(file)).equals(altered)).toBe(true);
    for(let i=0;i<outputPaths.length;i++)expect((await readFile(outputPaths[i])).equals(before[i])).toBe(true);
  }finally{await writeFile(file,original);}
});
