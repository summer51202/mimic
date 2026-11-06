import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { config } from "./landing-a-title.config.mjs";
import { renderReview } from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=file=>path.relative(repo,file).replaceAll("\\","/");
async function fileRecord(file){const b=await readFile(file);return {path:relative(file),sha256:hash(b)};}
async function record(file){const a=await fileRecord(file),p=PNG.sync.read(await readFile(file));return {...a,width:p.width,height:p.height};}
async function checked(a){
  const b=await readFile(path.join(repo,a.path));
  if(hash(b)!==a.sha256)throw Error("Changed reference: "+a.path);
  const p=PNG.sync.read(b);
  if(p.width!==a.width||p.height!==a.height)throw Error("Wrong reference dimensions: "+a.path);
  return p;
}
async function save(name,p){
  const file=path.join(dir,"samples/landing-a-title",name);
  await mkdir(path.dirname(file),{recursive:true});await writeFile(file,PNG.sync.write(p));return record(file);
}
function crop(p){
  let x=p.width,y=p.height,r=-1,b=-1;
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++)if(p.data[(sy*p.width+sx)*4+3]>=200){
    x=Math.min(x,sx);y=Math.min(y,sy);r=Math.max(r,sx);b=Math.max(b,sy);
  }
  if(r<x)throw Error("Empty opaque title");
  return {x,y,width:r-x+1,height:b-y+1};
}
function nearest(p,w,h,b={x:0,y:0,width:p.width,height:p.height},clean=false){
  const out=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=b.x+Math.min(b.width-1,Math.floor(x*b.width/w)),sy=b.y+Math.min(b.height-1,Math.floor(y*b.height/h));
    const si=(sy*p.width+sx)*4,di=(y*w+x)*4;
    if(clean&&p.data[si+3]<200)continue;
    out.data.set(p.data.subarray(si,si+4),di);if(clean)out.data[di+3]=255;
  }
  return out;
}
function over(canvas,p,x,y){
  if(x<0||y<0||x+p.width>canvas.width||y+p.height>canvas.height)throw Error("Clipped layer");
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    const si=(sy*p.width+sx)*4,di=((y+sy)*canvas.width+x+sx)*4,a=p.data[si+3]/255;if(!a)continue;
    for(let c=0;c<3;c++)canvas.data[di+c]=Math.round(p.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
function tone(p,t){
  for(let i=0;i<p.data.length;i+=4)if(p.data[i+3]){
    const r=p.data[i]*t.brightness,g=p.data[i+1]*t.brightness,b=p.data[i+2]*t.brightness,l=.213*r+.715*g+.072*b;
    p.data[i]=Math.round(l+(r-l)*t.saturation);p.data[i+1]=Math.round(l+(g-l)*t.saturation);p.data[i+2]=Math.round(l+(b-l)*t.saturation);
  }
  return p;
}
function gray(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);out.data.set([v,v,v,p.data[i+3]],i);}
  return out;
}
const baseFile=path.join(dir,config.basePath),base=JSON.parse(await readFile(baseFile,"utf8"));
const sources=Object.fromEntries(Object.entries(base.sources).filter(([id])=>id!=="mage"));
for(const a of Object.values(sources))await checked(a);
const lineageFile=path.join(dir,config.lineagePath),entry=JSON.parse(await readFile(lineageFile,"utf8"));
const original=base.references.wordmark,rawStaggered=await record(path.join(dir,config.rawStaggered));
if(entry.generator!=="imagegen"||entry.transparent!==true||entry.path!==rawStaggered.path||entry.parentPath!==original.path)throw Error("Invalid title lineage");
const lineage={record:await fileRecord(lineageFile),parent:original,prompt:await fileRecord(path.join(repo,entry.promptPath)),generator:entry.generator,transparent:entry.transparent};
const wordmarks={},titleRasters={};
for(const [id,a] of Object.entries({single:original,staggered:rawStaggered})){
  const raw=await checked(a),b=id==="single"?{x:0,y:0,width:raw.width,height:raw.height}:crop(raw);
  const p=tone(nearest(raw,256,Math.round(256*b.height/b.width),b,true),base.wordmarkTone);
  titleRasters[id]=p;
  wordmarks[id]={source:a,master:await save("wordmarks/"+id+".png",p),lines:id==="single"?["MIMIC"]:["MI","MIC"]};
}
const scenes={},sceneRasters={};
for(const view of ["desktop","phone"]){
  const previous=base.frames["A-"+view],size=view==="desktop"?[960,540]:[390,600];
  const a=await checked(sources[view==="desktop"?"architectureDesktop":"architecturePhone"]),ratio=size[0]/size[1];
  const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
  const b={x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch};
  const canvas=nearest(a,...size,b);for(let i=3;i<canvas.data.length;i+=4)canvas.data[i]=255;
  const layers=previous.layers.filter(l=>l.id!=="mage");
  for(const l of layers)over(canvas,await checked(l),l.x,l.y);
  sceneRasters[view]=canvas;
  scenes[view]={logical:await save("scene-"+view+"-logical.png",canvas),layers,visitor:previous.visitor};
}
const frames={};
for(const [key,f] of Object.entries(config.frames)){
  const source=sceneRasters[f.view],canvas=new PNG({width:source.width,height:source.height});canvas.data.set(source.data);
  const p=titleRasters[f.wordmark],[wx,wy,ww,wh]=f.wall,scale=Math.min(ww/p.width,wh/p.height);
  const w=Math.max(1,Math.round(p.width*scale)),h=Math.max(1,Math.round(p.height*scale));
  if(w>ww||h>wh)throw Error("Title does not fit wall");
  const sprite=nearest(p,w,h,undefined,true),x=wx+Math.floor((ww-w)/2),y=wy+Math.floor((wh-h)/2);
  over(canvas,sprite,x,y);
  const color=f.view==="desktop"?nearest(canvas,1920,1080):canvas;
  frames[key]={...f,title:{id:"wordmark",x,y,...await save("wordmarks/"+key+".png",sprite)},
    logical:await save(key+"-logical.png",canvas),color:await save(key+".png",color),gray:await save(key+"-gray.png",gray(color))};
}
const references=Object.fromEntries(["warrior","ranger","mimiku"].map(id=>[id,base.references[id]]));
const manifest={decision:config.decision,reviewOnly:config.reviewOnly,runtimePromotion:config.runtimePromotion,baseVariant:config.baseVariant,
  spec:config.spec,base:await fileRecord(baseFile),wordmarkTone:base.wordmarkTone,sources,references,lineage,wordmarks,scenes,frames};
await writeFile(path.join(dir,"landing-a-title.manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(dir,"landing-a-title-review.html"),renderReview(manifest,await readFile(path.join(dir,config.previousPage),"utf8")));
console.log(JSON.stringify(Object.fromEntries(Object.entries(frames).map(([key,f])=>[key,{color:f.color,gray:f.gray}])),null,2));
