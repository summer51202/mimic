import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {nearest,fitChest,over,gray} from "./landing-chest-raster.mjs";
import {renderChestReview} from "./render-landing-chest-material.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function bytes(a){
  const f=path.resolve(repo,a.path);
  if(!f.startsWith(dir+path.sep))throw Error("Input outside review");
  const b=await readFile(f);
  if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);
  return b;
}
async function png(a){
  const p=PNG.sync.read(await bytes(a));
  if(p.width!==a.width||p.height!==a.height)throw Error("Changed input dimensions");
  return p;
}
async function record(name){
  const file=path.join(dir,name),b=await readFile(file);
  return {path:relative(file),sha256:hash(b)};
}
async function rasterRecord(name){
  const a=await record(name),p=PNG.sync.read(await bytes(a));
  return {...a,width:p.width,height:p.height};
}
async function buildDesktop(parent,replacement){
  const a=await png(parent.sources.architectureDesktop),w=960,h=540,ratio=w/h;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width;
  const ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const canvas=nearest(a,w,h,{x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch});
  for(let i=3;i<canvas.data.length;i+=4)canvas.data[i]=255;
  for(const l of parent.scenes.desktop.layers)over(canvas,l.id==="chest"&&replacement?replacement:await png(l),l.x,l.y);
  const title=parent.frames["desktop-single"].title;
  over(canvas,await png(title),title.x,title.y);
  return canvas;
}
export async function composeChestMaterial(){
  const parentRecord={path:prefix+"landing-title-placement.manifest.json",sha256:"df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5"};
  const parent=JSON.parse((await bytes(parentRecord)).toString());
  const before=parent.frames["desktop-single"],phone=parent.frames["phone-staggered"];
  if(!isDeepStrictEqual([before.title.x,before.title.y,before.title.width,before.title.height],[376,100,288,84])||
     !isDeepStrictEqual([phone.title.x,phone.title.y,phone.title.width,phone.title.height],[130,59,148,98]))throw Error("Frozen title mismatch");
  const chest=parent.scenes.desktop.layers.find(l=>l.id==="chest");
  if(!chest||!isDeepStrictEqual([chest.x,chest.y,chest.width,chest.height],[105,284,78,66]))throw Error("Frozen chest transform mismatch");
  const oldSource=await rasterRecord("samples/derivations/landing-war-room/sources/ordinary-chest-v01-source.png");
  const warriorLayer=parent.scenes.desktop.layers.find(l=>l.id==="warrior"),warriorMaster=parent.references.warrior;
  const pins=[
    [oldSource,"8308b9bf28f164f3b6f37b190eb6330345d6787794f9e8e1b20af899c2f96011"],
    [warriorMaster,"cad8b04c066a149a081095ea7507091fd92fa65fdfd95ca9a40366cfcdbb9447"],
    [warriorLayer,"fa155d31d7668e7d3660f89f4a90de865ca978abd725aa8bc5f591342eb252e1"],
    [chest,"c3026375ca3821478a822030dda1c8463e8750d09048f791e40449b7dda12753"],
    [before.logical,"08dca5cb9f13c0a4ede1322f4e8f93295cae7b39a36438509a1286f12f87643f"],
    [phone.logical,"dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf"],
  ];
  for(const [a,h] of pins){if(a.sha256!==h)throw Error("Reference identity changed");await png(a);}
  const inputs={
    parent:parentRecord,oldSource,warriorLayer,warriorMaster,
    source:await rasterRecord("samples/derivations/landing-chest-material-v01/ordinary-chest-source.png"),
    prompt:await record("samples/derivations/landing-chest-material-v01/prompt.md"),
    lineage:await record("samples/derivations/landing-chest-material-v01/lineage.json"),
    parentReview:await record("landing-title-placement-review.html"),
    generator:await record("compose-landing-chest-material.mjs"),
    rasterModule:await record("landing-chest-raster.mjs"),
    renderer:await record("render-landing-chest-material.mjs"),
  };
  if(inputs.parentReview.sha256!=="da5a81e41a8b3f5bda76732ac6c611731d87f386819883816250b5542c515c71")throw Error("Parent review changed");
  const lineage=JSON.parse((await bytes(inputs.lineage)).toString());
  if(!isDeepStrictEqual(lineage,{schema:"mimic-chest-material-source/v1",generator:"imagegen",transparent:true,
    path:inputs.source.path,parentPath:oldSource.path,promptPath:inputs.prompt.path,
    references:[warriorMaster.path,warriorLayer.path,before.logical.path]}))throw Error("Invalid ImageGen lineage");
  const reconstructed=await buildDesktop(parent),baseline=await png(before.logical);
  if(!reconstructed.data.equals(baseline.data))throw Error("Old scene reconstruction mismatch; stop before replacing chest");
  const fitted=fitChest(await png(inputs.source)),logical=await buildDesktop(parent,fitted.png);
  let changed=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;
    if(logical.data.subarray(i,i+4).equals(baseline.data.subarray(i,i+4)))continue;
    if(x<105||x>=183||y<284||y>=350)throw Error("Changed pixels outside frozen chest bounds");
    changed++;
  }
  if(changed===0)throw Error("No visible material change");
  const writes=new Map(),outputs={};
  const save=(name,p)=>{
    const file=path.join(dir,"samples/landing-chest-material-v01",name+".png"),b=PNG.sync.write(p);
    writes.set(file,b);return {path:relative(file),sha256:hash(b),width:p.width,height:p.height};
  };
  outputs.layer=save("ordinary-chest",fitted.png);
  outputs.layerGray=save("ordinary-chest-gray",gray(fitted.png));
  outputs.oldGray=save("old-chest-gray",gray(await png(chest)));
  outputs.beforeZoom=save("old-chest-3x",nearest(await png(chest),234,198));
  outputs.afterZoom=save("ordinary-chest-3x",nearest(fitted.png,234,198));
  outputs.logical=save("desktop-logical",logical);
  const color=nearest(logical,1920,1080);
  outputs.color=save("desktop-color",color);outputs.gray=save("desktop-gray",gray(color));
  const m={schema:"mimic-chest-material-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,
    spec:"docs/superpowers/specs/2026-10-15-landing-ordinary-chest-material-design.md",
    plan:"docs/superpowers/plans/2026-10-15-landing-ordinary-chest-material.md",
    inputs,before:{layer:chest,frame:before},fit:fitted.fit,changedPixels:changed,outputs,
    placement:{x:105,y:284,width:78,height:66},
    frames:{"desktop-before":before,"desktop-after":{...before,logical:outputs.logical,color:outputs.color,gray:outputs.gray},"phone-staggered":phone}};
  const html=renderChestReview(m,(await bytes(inputs.parentReview)).toString());
  const htmlFile=path.join(dir,"landing-chest-material-review.html"),manifestFile=path.join(dir,"landing-chest-material.manifest.json");
  m.review={path:relative(htmlFile),sha256:hash(html)};
  writes.set(htmlFile,Buffer.from(html));
  let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
  if(previous){
    if(!isDeepStrictEqual(Object.keys(previous.outputs??{}).sort(),Object.keys(outputs).sort())||previous.review?.path!==relative(htmlFile))throw Error("Existing chest output set differs");
    const stableInputs=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["generator","rasterModule","renderer"].includes(key)));
    if(!isDeepStrictEqual(stableInputs(previous.inputs),stableInputs(inputs)))throw Error("Existing chest provenance differs");
    for(const a of [...Object.values(previous.outputs),previous.review]){
      if(!writes.has(path.resolve(repo,a.path)))throw Error("Unexpected existing target");
      await bytes(a);
    }
  }else{
    for(const file of writes.keys()){
      try{await readFile(file);throw Error("Unexpected existing chest target");}catch(e){if(e.code!=="ENOENT")throw e;}
    }
  }
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}
  await writeFile(manifestFile,JSON.stringify(m,null,2)+"\n");
  return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composeChestMaterial(),null,2));
