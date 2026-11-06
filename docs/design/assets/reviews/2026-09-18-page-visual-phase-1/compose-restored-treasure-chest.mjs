import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual as equal} from "node:util";
import {nearest,over,gray} from "./landing-chest-raster.mjs";
import {frames,mainFrames,timelines,layout,sourceGrid} from "./restored-chest.config.mjs";
import {prepareRestoredFamily} from "./restored-chest.raster.mjs";
import {renderRestoredChestReview} from "./render-restored-treasure-chest.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",sourceDir="samples/derivations/treasure-chest-states-v02/";
const hash=b=>createHash("sha256").update(b).digest("hex"),relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function bytes(a){
  const file=path.resolve(repo,a.path);if(!file.startsWith(dir+path.sep))throw Error("Input outside review");
  const b=await readFile(file);if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);return b;
}
async function png(a){const p=PNG.sync.read(await bytes(a));if(p.width!==a.width||p.height!==a.height)throw Error("Changed dimensions");return p;}
async function record(name,raster=false){
  const file=path.join(dir,name),b=await readFile(file),a={path:relative(file),sha256:hash(b)};
  if(!raster)return a;const p=PNG.sync.read(b);return {...a,width:p.width,height:p.height};
}
async function build(parent,replacement){
  const a=await png(parent.sources.architectureDesktop),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const out=nearest(a,960,540,{x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch});
  for(let i=3;i<out.data.length;i+=4)out.data[i]=255;
  for(const l of parent.scenes.desktop.layers){
    if(l.id!=="chest"||replacement===undefined)over(out,await png(l),l.x,l.y);
    else if(replacement!==null)over(out,replacement,...layout.sceneOrigin);
  }
  const t=parent.frames["desktop-single"].title;over(out,await png(t),t.x,t.y);return out;
}
export async function composeRestoredChest(){
  const oldRecord={path:prefix+"treasure-chest-states.manifest.json",sha256:"61f1bf4e2ec7efca3e3c80a08af1852f674868094d8912962d2c40082c636cb1"};
  const old=JSON.parse((await bytes(oldRecord)).toString()),parentRecord=old.inputs.parent;
  if(parentRecord.sha256!=="df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5")throw Error("Wrong parent");
  const parent=JSON.parse((await bytes(parentRecord)).toString()),before=parent.frames["desktop-single"],phone=parent.frames["phone-staggered"];
  const chest=parent.scenes.desktop.layers.find(l=>l.id==="chest");
  if(!chest||!equal([chest.x,chest.y,chest.width,chest.height],[105,284,78,66])||
     !equal([before.title.x,before.title.y,before.title.width,before.title.height],[376,100,288,84])||
     !equal([phone.title.x,phone.title.y,phone.title.width,phone.title.height],[130,59,148,98]))throw Error("Frozen geometry mismatch");
  const inputs={old:oldRecord,parent:parentRecord,oldSource:old.inputs.source,closedLayer:old.inputs.closedLayer,
    warriorMaster:old.inputs.warriorMaster,warriorLayer:old.inputs.warriorLayer,referenceScene:old.frames.closed.logical,
    source:await record(sourceDir+"family-source.png",true),prompt:await record(sourceDir+"prompt.md"),lineage:await record(sourceDir+"lineage.json"),
    parentReview:old.inputs.parentReview,sharedRaster:await record("landing-chest-raster.mjs"),legacyRenderer:await record("render-treasure-chest-states.mjs"),
    config:await record("restored-chest.config.mjs"),model:await record("restored-chest.model.mjs"),controller:await record("restored-chest.controller.mjs"),
    raster:await record("restored-chest.raster.mjs"),renderer:await record("render-restored-treasure-chest.mjs"),composer:await record("compose-restored-treasure-chest.mjs")};
  if(inputs.parentReview.sha256!=="da5a81e41a8b3f5bda76732ac6c611731d87f386819883816250b5542c515c71")throw Error("Parent review changed");
  if(inputs.sharedRaster.sha256!==old.inputs.sharedRaster.sha256||inputs.legacyRenderer.sha256!==old.inputs.renderer.sha256)throw Error("Legacy module changed");
  for(const a of [inputs.oldSource,inputs.closedLayer,inputs.warriorMaster,inputs.warriorLayer,inputs.referenceScene,phone.logical,phone.color,phone.gray,phone.title,before.title])await png(a);
  if(phone.logical.sha256!=="dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf")throw Error("Frozen phone changed");
  for(const f of Object.values(old.frames))for(const a of [f.sprite,f.spriteGray,f.zoom,f.logical,f.color,f.gray])await png(a);
  const lineage=JSON.parse((await bytes(inputs.lineage)).toString()),references=[inputs.warriorMaster,inputs.warriorLayer,inputs.referenceScene];
  if(lineage.schema!=="mimic-restored-chest-source/v1"||lineage.generator!=="imagegen"||lineage.transparent!==true||lineage.parentPath!==inputs.oldSource.path||lineage.selectedPath!==inputs.source.path||!equal(lineage.frames,frames)||!Array.isArray(lineage.history)||!lineage.history.length)throw Error("Invalid ImageGen lineage");
  const sourceHistory=[];
  for(const [i,entry] of lineage.history.entries()){
    const name="attempt-"+String(i+1).padStart(2,"0")+".png",target=i?sourceHistory[i-1].source:inputs.oldSource;
    if(entry.path!==prefix+sourceDir+name||entry.editTargetPath!==target.path||!equal(entry.referencePaths,i?[]:references.map(a=>a.path)))throw Error("Invalid edit history");
    const source=await record(sourceDir+name,true);await png(source);sourceHistory.push({source,editTarget:target,references:i?[]:references});
  }
  if(sourceHistory.at(-1).source.sha256!==inputs.source.sha256)throw Error("Selected source is not final ImageGen bytes");
  const baseline=await png(before.logical),rebuilt=await build(parent);
  if(!rebuilt.data.equals(baseline.data))throw Error("Old reconstruction mismatch");
  const family=prepareRestoredFamily(await png(inputs.source),sourceGrid),writes=new Map(),outputs={},reviewFrames={};
  if(new Set(family.sprites.map(p=>hash(p.data))).size!==frames.length)throw Error("Duplicate normalized frames");
  const save=(name,p)=>{
    const file=path.join(dir,"samples/treasure-chest-states-v02",name+".png"),b=PNG.sync.write(p);writes.set(file,b);
    const a={path:relative(file),sha256:hash(b),width:p.width,height:p.height};outputs[name]=a;return a;
  };
  const without=await build(parent,null);
  if(!without.data.equals((await png(old.backdrop)).data))throw Error("Old chest-free background mismatch");
  const backdrop=save("desktop-without-chest",without);
  for(const [i,id] of frames.entries()){
    const sprite=family.sprites[i],logical=await build(parent,sprite);let changed=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const n=(y*960+x)*4;if(logical.data.subarray(n,n+4).equals(baseline.data.subarray(n,n+4)))continue;
      if(x<92||x>=196||y<230||y>=350)throw Error("Outside chest envelope");changed++;
    }
    if(!changed)throw Error("No visible chest change");const color=nearest(logical,1920,1080);
    reviewFrames[id]={source:{...inputs.source,cell:family.registration.cells[i]},canvas:[104,120],sceneOrigin:layout.sceneOrigin,ground:layout.ground,worldGround:layout.worldGround,hingeReference:layout.hingeReference,title:before.title,changedPixels:changed,
      sprite:save(id+"-sprite",sprite),spriteGray:save(id+"-sprite-gray",gray(sprite)),zoom:save(id+"-2x",nearest(sprite,208,240)),
      logical:save(id+"-logical",logical),color:save(id+"-color",color),gray:save(id+"-gray",gray(color))};
  }
  const modelText=(await bytes(inputs.model)).toString(),importLine='import {frames,timelines,stateOfFrame} from "./restored-chest.config.mjs";';
  if(modelText.split(importLine).length!==2)throw Error("Model import contract changed");
  const scripts={model:(await bytes(inputs.config)).toString()+"\n"+modelText.replace(importLine,""),controller:(await bytes(inputs.controller)).toString()};
  const m={schema:"mimic-restored-chest-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,
    spec:"docs/superpowers/specs/2026-10-19-landing-restored-treasure-chest-design.md",plan:"docs/superpowers/plans/2026-10-20-landing-restored-treasure-chest.md",
    inputs,sourceHistory,config:{frames,mainFrames,timelines,layout,sourceGrid},layout,registration:family.registration,backdrop,outputs,frames:reviewFrames,oldFrames:old.frames,parentDesktop:before,phone};
  const html=renderRestoredChestReview(m,(await bytes(inputs.parentReview)).toString(),scripts),htmlFile=path.join(dir,"restored-treasure-chest-review.html"),manifestFile=path.join(dir,"restored-treasure-chest.manifest.json");
  const complete={...m,review:{path:relative(htmlFile),sha256:hash(html)}};writes.set(htmlFile,Buffer.from(html));let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
  if(previous){
    if(!equal(Object.keys(previous.outputs??{}).sort(),Object.keys(outputs).sort())||previous.review?.path!==relative(htmlFile))throw Error("Existing output set differs");
    const stable=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!["config","model","controller","raster","renderer","composer"].includes(k)));
    if(!equal(stable(previous.inputs),stable(inputs))||!equal(previous.sourceHistory,sourceHistory))throw Error("Existing provenance differs");
    for(const a of [...Object.values(previous.outputs),previous.review]){if(!writes.has(path.resolve(repo,a.path)))throw Error("Unexpected target");await bytes(a);}
  }else for(const file of writes.keys())try{await readFile(file);throw Error("Unexpected existing output");}catch(e){if(e.code!=="ENOENT")throw e;}
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}
  await writeFile(manifestFile,JSON.stringify(complete,null,2)+"\n");return complete;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composeRestoredChest(),null,2));
