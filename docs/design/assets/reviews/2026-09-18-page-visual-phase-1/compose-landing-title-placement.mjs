import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {isDeepStrictEqual} from "node:util";
import {createPositionModel} from "./landing-title-position.model.mjs";
import {renderReview} from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
const relative=file=>path.relative(repo,file).replaceAll("\\","/");
const targets={"desktop-single":[376,100],"phone-staggered":[130,59]};
const parentHash="ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7";
const manifestFile=path.join(dir,"landing-title-placement.manifest.json");
const htmlFile=path.join(dir,"landing-title-placement-review.html");
const receiptFile=path.join(dir,"landing-title-placement.receipts.json");

export function validateReceipt(receipt,id,parent){
  if(!Object.hasOwn(targets,id))throw Error("Unsupported placement frame");
  const frame=parent.frames[id],scene=parent.scenes[frame.view].logical;
  const model=createPositionModel({frame:{id,width:scene.width,height:scene.height},
    scene:{...scene,path:rel(scene)},title:{...frame.title,path:rel(frame.title)}});
  if(!receipt||!Number.isInteger(receipt.title?.x)||!Number.isInteger(receipt.title?.y)||
     !isDeepStrictEqual(receipt,model.payload({x:receipt.title.x,y:receipt.title.y})))throw Error("Receipt does not match source, frame or logical coordinates");
  return {x:receipt.title.x,y:receipt.title.y};
}
async function checked(a){
  const file=path.resolve(repo,a.path);
  if(!file.startsWith(dir+path.sep))throw Error("Source outside review");
  const b=await readFile(file),p=PNG.sync.read(b);
  if(hash(b)!==a.sha256||p.width!==a.width||p.height!==a.height)throw Error("Changed positioning source: "+a.path);
  return p;
}
function overlay(base,sprite,x,y){
  const out=new PNG({width:base.width,height:base.height});out.data.set(base.data);
  if(x<0||y<0||x+sprite.width>base.width||y+sprite.height>base.height)throw Error("Clipped title");
  for(let sy=0;sy<sprite.height;sy++)for(let sx=0;sx<sprite.width;sx++){
    const si=(sy*sprite.width+sx)*4,di=((y+sy)*out.width+x+sx)*4,a=sprite.data[si+3]/255;
    if(!a)continue;
    for(let c=0;c<3;c++)out.data[di+c]=Math.round(sprite.data[si+c]*a+out.data[di+c]*(1-a));
    out.data[di+3]=255;
  }
  return out;
}
function scale2(p){
  const out=new PNG({width:p.width*2,height:p.height*2});
  for(let y=0;y<out.height;y++)for(let x=0;x<out.width;x++){
    const i=(y*out.width+x)*4,j=(Math.floor(y/2)*p.width+Math.floor(x/2))*4;
    out.data.set(p.data.subarray(j,j+4),i);
  }
  return out;
}
function grayscale(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){
    const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
    out.data.set([v,v,v,p.data[i+3]],i);
  }
  return out;
}
function renderPlaced(m,previous){
  let html=renderReview(m,previous);
  const heading="Landing — 已套用標題位置";
  html=html.replaceAll("Landing A — 無法師與標題排列",heading);
  const start=html.indexOf("<body><main>"),cards=html.indexOf('<div class="candidates">',start);
  if(start<0||cards<0)throw Error("Missing review insertion boundary");
  const intro='<h1>'+heading+'</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false</p><p>桌機單行：左上 376／100，尺寸 288×84；手機 MI／MIC：左上 130／59，尺寸 148×98。兩個版本各用自己的場景座標。</p><p>本頁彩色與灰階 PNG 已套入指定位置。只改標題落點，大小、亮度、像素、背景、人物與道具不變；本輪仍待視覺確認，不代表 Scenes 核准。</p><p><a href="landing-a-title-review.html?position=phone">原定位工具與舊稿（保留原始座標）</a> · <a href="landing-title-placement.manifest.json">本版 manifest / exact hashes</a> · <a href="landing-title-placement.receipts.json">你貼回的兩份定位 JSON</a></p>';
  html=html.slice(0,start)+"<body><main>"+intro+html.slice(cards);
  html=html.replace(/<section class="candidate" data-candidate="desktop-staggered">[\s\S]*?<\/section>/,"");
  html=html.replace(/<figure><img[^>]+alt="桌機：上左 MI／下右 MIC 灰階"[^>]*>[\s\S]*?<\/figure>/,"");
  html=html.replace("三張真實灰階輸出","兩張真實灰階輸出");
  html=html.replaceAll('<source media="(max-width:600px)" srcset="'+rel(m.frames["phone-staggered"].color)+'">',"");
  html=html.replace('class="scene responsive"','class="scene placement-desktop"');
  html=html.replace("</head>",'<style>.candidates{display:block}.candidate{max-width:960px;margin:0 auto}.raws{grid-template-columns:repeat(2,minmax(0,1fr))}.placement-desktop .desktop-overlay{display:block}.placement-desktop .mobile-overlay{display:none}.placement-desktop .login{font-size:1.6cqw;padding:.4cqw 1.2cqw}.placement-desktop .dialogue{padding:1.1cqw 1.7cqw;gap:1.2cqw;font-size:1.6cqw}.placement-desktop .speaker,.placement-desktop .dialogue p{font-size:1.6cqw}.placement-desktop .cta{font-size:1.6cqw;padding:.7cqw 1.3cqw}</style></head>');
  html=html.replace(/<section class="notes" id="review-notes">[\s\S]*?<\/section>/,'<section class="notes" id="review-notes"><h2>等待本輪視覺確認</h2><p>請確認桌機單行與手機兩行標題落點。這是 review-only 套用版本；原稿及所有來源都保留。沒有帳務、Home、產品頁面或 runtime 變更，沒有自動核准或 production export。</p></section>');
  if((html.match(/class="scene /g)??[]).length!==2||html.includes("data-title-position-tool")||(html.match(/data-chapter/g)??[]).length!==4)throw Error("Unexpected placement review structure");
  return html;
}
export async function composePlacement(){
  const parentFile=path.join(dir,"landing-a-title.manifest.json"),parentBytes=await readFile(parentFile);
  if(hash(parentBytes)!==parentHash)throw Error("Placement parent manifest changed");
  const parent=JSON.parse(parentBytes.toString()),receiptBytes=await readFile(receiptFile),receipts=JSON.parse(receiptBytes.toString());
  if(receipts.schema!=="mimic-landing-title-placement/v1"||receipts.reviewOnly!==true||receipts.runtimePromotion!==false||
     !isDeepStrictEqual(Object.keys(receipts.positions).sort(),Object.keys(targets).sort()))throw Error("Invalid application receipts");
  const m=structuredClone(parent),writes=new Map(),outputs=[];
  const save=(id,kind,p)=>{
    const file=path.join(dir,"samples/landing-title-placement-v01",id+"-"+kind+".png"),b=PNG.sync.write(p);
    writes.set(file,b);
    const a={path:relative(file),sha256:hash(b),width:p.width,height:p.height};outputs.push(a);return a;
  };
  for(const [id,[x,y]] of Object.entries(targets)){
    const receipt=receipts.positions[id],position=validateReceipt(receipt,id,parent);
    if(position.x!==x||position.y!==y)throw Error("Position differs from user's confirmed v01 receipt");
    const frame=m.frames[id],base=await checked(m.scenes[frame.view].logical),sprite=await checked(frame.title);
    const logical=overlay(base,sprite,x,y),color=frame.view==="desktop"?scale2(logical):logical;
    frame.title={...frame.title,x,y};frame.wall=[x,y,sprite.width,sprite.height];
    frame.logical=save(id,"logical",logical);frame.color=save(id,"color",color);frame.gray=save(id,"gray",grayscale(color));
  }
  m.placement={schema:"mimic-landing-title-placement/v1",authorization:"position-application-only",
    parent:{path:relative(parentFile),sha256:parentHash},receipts:{path:relative(receiptFile),sha256:hash(receiptBytes)},
    generator:{path:relative(fileURLToPath(import.meta.url)),sha256:hash(await readFile(fileURLToPath(import.meta.url)))},
    plan:"docs/superpowers/plans/2026-10-14-landing-title-placement-application.md"};
  const html=renderPlaced(m,await readFile(path.join(dir,"landing-warm-rest-review.html"),"utf8"));
  m.placement.review={path:relative(htmlFile),sha256:hash(html)};
  // An idempotent rerun may replace this task's outputs only when recorded bytes remain intact.
  let previous;
  try{previous=JSON.parse(await readFile(manifestFile,"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
  if(previous){
    if(!isDeepStrictEqual(previous.placement.parent,m.placement.parent)||!isDeepStrictEqual(previous.placement.receipts,m.placement.receipts))throw Error("Existing placement provenance differs");
    const records=Object.keys(targets).flatMap(id=>["logical","color","gray"].map(kind=>previous.frames[id][kind])).concat(previous.placement.review);
    for(const a of records){
      const file=path.resolve(repo,a.path);
      if(!(writes.has(file)||file===htmlFile)||hash(await readFile(file))!==a.sha256)throw Error("Existing placement artifact modified; refusing overwrite");
    }
  }else{
    for(const file of [...writes.keys(),htmlFile]){
      try{await readFile(file);throw Error("Unexpected existing placement target");}catch(error){if(error.code!=="ENOENT")throw error;}
    }
  }
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}
  await writeFile(htmlFile,html);await writeFile(manifestFile,JSON.stringify(m,null,2)+"\n");
  return {frames:Object.fromEntries(Object.keys(targets).map(id=>[id,{title:m.frames[id].title,color:m.frames[id].color,gray:m.frames[id].gray}])),review:m.placement.review,outputs:outputs.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await composePlacement(),null,2));
