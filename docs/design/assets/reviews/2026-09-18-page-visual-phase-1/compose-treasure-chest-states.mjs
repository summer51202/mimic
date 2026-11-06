import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual as equal} from "node:util";
import {nearest,over,gray} from "./landing-chest-raster.mjs";
import {prepareFamily,layout} from "./treasure-chest-state.raster.mjs";
import {states} from "./treasure-chest-state.model.mjs";
import {renderTreasureChestReview} from "./render-treasure-chest-states.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function bytes(a){
  const f=path.resolve(repo,a.path);
  if(!f.startsWith(dir+path.sep))throw Error("Input outside review");
  const b=await readFile(f);if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);return b;
}
async function png(a){
  const p=PNG.sync.read(await bytes(a));
  if(p.width!==a.width||p.height!==a.height)throw Error("Changed dimensions");return p;
}
async function record(name,raster=false){
  const file=path.join(dir,name),b=await readFile(file),a={path:relative(file),sha256:hash(b)};
  if(!raster)return a;
  const p=PNG.sync.read(b);return {...a,width:p.width,height:p.height};
}
async function build(parent,replacement){
  const a=await png(parent.sources.architectureDesktop),ratio=960/540;
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width;
  const ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const out=nearest(a,960,540,{x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch});
  for(let i=3;i<out.data.length;i+=4)out.data[i]=255;
  for(const l of parent.scenes.desktop.layers){
    if(l.id!=="chest"||replacement===undefined)over(out,await png(l),l.x,l.y);
    else if(replacement!==null)over(out,replacement,...layout.sceneOrigin);
  }
  const t=parent.frames["desktop-single"].title;over(out,await png(t),t.x,t.y);return out;
}
export async function composeTreasureChestStates(){
  const parentRecord={path:prefix+"landing-title-placement.manifest.json",sha256:"df90822ccb7fdd671899f08ec70c0d1535f16393d5b0ca4007aac0642d7eb1b5"};
  const materialRecord={path:prefix+"landing-chest-material.manifest.json",sha256:"c1e905b78299a1ae9f3c8d86b477a8ed368edc2ae9fce8eff6949abaf5946b18"};
  const parent=JSON.parse((await bytes(parentRecord)).toString()),material=JSON.parse((await bytes(materialRecord)).toString());
  const before=parent.frames["desktop-single"],phone=parent.frames["phone-staggered"],chest=parent.scenes.desktop.layers.find(l=>l.id==="chest");
  if(!equal([before.title.x,before.title.y,before.title.width,before.title.height],[376,100,288,84])||
     !equal([phone.title.x,phone.title.y,phone.title.width,phone.title.height],[130,59,148,98])||
     !chest||!equal([chest.x,chest.y,chest.width,chest.height],[105,284,78,66]))throw Error("Frozen geometry mismatch");
  const sourceDir="samples/derivations/treasure-chest-states-v01/";
  const inputs={parent:parentRecord,material:materialRecord,
    source:await record(sourceDir+"family-source.png",true),prompt:await record(sourceDir+"prompt.md"),lineage:await record(sourceDir+"lineage.json"),
    closedSource:material.inputs.source,closedLayer:material.outputs.layer,
    warriorMaster:material.inputs.warriorMaster,warriorLayer:material.inputs.warriorLayer,referenceScene:material.outputs.logical,
    parentReview:await record("landing-title-placement-review.html"),
    composer:await record("compose-treasure-chest-states.mjs"),renderer:await record("render-treasure-chest-states.mjs"),
    raster:await record("treasure-chest-state.raster.mjs"),model:await record("treasure-chest-state.model.mjs"),controller:await record("treasure-chest-state.controller.mjs"),
    sharedRaster:await record("landing-chest-raster.mjs")};
  if(inputs.parentReview.sha256!=="da5a81e41a8b3f5bda76732ac6c611731d87f386819883816250b5542c515c71")throw Error("Parent review changed");
  for(const a of [inputs.closedSource,inputs.closedLayer,inputs.warriorMaster,inputs.warriorLayer,inputs.referenceScene])await png(a);
  for(const a of [phone.logical,phone.color,phone.gray,phone.title,before.title])await png(a);
  if(phone.logical.sha256!=="dae2872edddfa14d68b37c7b5475c4680381db0826dc417cb8a07ee370385ecf")throw Error("Frozen phone changed");
  const lineage=JSON.parse((await bytes(inputs.lineage)).toString());
  if(!equal(lineage,{schema:"mimic-treasure-chest-family/v1",generator:"imagegen",transparent:true,path:inputs.source.path,
    parentPath:inputs.closedSource.path,promptPath:inputs.prompt.path,references:[inputs.warriorMaster.path,inputs.warriorLayer.path,inputs.referenceScene.path],cells:states}))throw Error("Invalid ImageGen lineage");
  const attempt1=await record(sourceDir+"family-source-attempt-01.png",true),attempt2=await record(sourceDir+"family-source-attempt-02.png",true);
  const sourceHistory=[
    {source:attempt1,editTarget:inputs.closedSource,references:[inputs.warriorMaster,inputs.warriorLayer,inputs.referenceScene]},
    {source:attempt2,editTarget:attempt1,references:[]},
    {source:inputs.source,editTarget:attempt2,references:[]},
  ];
  await png(attempt1);await png(attempt2);
  const original=await build(parent),baseline=await png(before.logical);
  if(!original.data.equals(baseline.data))throw Error("Old reconstruction mismatch");
  const atlas=await png(inputs.source);
  if(!atlas.data.some((v,i)=>i%4===3&&v===0))throw Error("Transparent source required");
  const family=prepareFamily(atlas),writes=new Map(),outputs={},frames={};
  const save=(name,p)=>{
    const file=path.join(dir,"samples/treasure-chest-states-v01",name+".png"),b=PNG.sync.write(p);
    writes.set(file,b);const a={path:relative(file),sha256:hash(b),width:p.width,height:p.height};outputs[name]=a;return a;
  };
  const backdrop=save("desktop-without-chest",await build(parent,null));
  for(const [i,id] of states.entries()){
    const sprite=family.sprites[i],logical=await build(parent,sprite);let changed=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const n=(y*960+x)*4;if(logical.data.subarray(n,n+4).equals(baseline.data.subarray(n,n+4)))continue;
      if(x<92||x>=196||y<230||y>=350)throw Error("Changed pixels outside chest envelope");changed++;
    }
    if(!changed)throw Error("No visible chest change");
    const color=nearest(logical,1920,1080);
    frames[id]={source:{...inputs.source,cell:family.registration.cells[i]},canvas:[104,120],sceneOrigin:layout.sceneOrigin,
      ground:layout.ground,worldGround:layout.worldGround,hingeReference:layout.hingeReference,title:before.title,changedPixels:changed,
      sprite:save(id+"-sprite",sprite),spriteGray:save(id+"-sprite-gray",gray(sprite)),zoom:save(id+"-2x",nearest(sprite,208,240)),
      logical:save(id+"-logical",logical),color:save(id+"-color",color),gray:save(id+"-gray",gray(color))};
  }
  const m={schema:"mimic-treasure-chest-states/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,
    spec:"docs/superpowers/specs/2026-10-16-landing-treasure-chest-states-design.md",
    plan:"docs/superpowers/plans/2026-10-16-landing-treasure-chest-states.md",inputs,layout,registration:family.registration,
    backdrop,outputs,frames,parentDesktop:before,phone,sourceHistory};
  const scripts={model:(await bytes(inputs.model)).toString(),controller:(await bytes(inputs.controller)).toString()};
  const html=renderTreasureChestReview(m,(await bytes(inputs.parentReview)).toString(),scripts);
  const htmlFile=path.join(dir,"treasure-chest-states-review.html"),manifestFile=path.join(dir,"treasure-chest-states.manifest.json");
  const complete={...m,review:{path:relative(htmlFile),sha256:hash(html)}};writes.set(htmlFile,Buffer.from(html));
  let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
  if(previous){
    if(!equal(Object.keys(previous.outputs??{}).sort(),Object.keys(outputs).sort())||previous.review?.path!==relative(htmlFile))throw Error("Existing output set differs");
    const stable=v=>Object.fromEntries(Object.entries(v).filter(([k])=>!["composer","renderer","raster","model","controller"].includes(k)));
    if(!equal(stable(previous.inputs),stable(inputs)))throw Error("Existing provenance differs");
    if(previous.sourceHistory&&!equal(previous.sourceHistory,sourceHistory))throw Error("Existing source history differs");
    for(const a of [...Object.values(previous.outputs),previous.review]){
      if(!writes.has(path.resolve(repo,a.path)))throw Error("Unexpected existing target");await bytes(a);
    }
  }else{
    for(const f of writes.keys())try{await readFile(f);throw Error("Unexpected existing output");}catch(e){if(e.code!=="ENOENT")throw e;}
  }
  for(const [f,b] of writes){await mkdir(path.dirname(f),{recursive:true});await writeFile(f,b);}
  await writeFile(manifestFile,JSON.stringify(complete,null,2)+"\n");return complete;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composeTreasureChestStates(),null,2));
