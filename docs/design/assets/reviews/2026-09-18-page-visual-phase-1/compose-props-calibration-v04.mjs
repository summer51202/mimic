import {createHash} from "node:crypto";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds,nearest} from "./landing-chest-raster.mjs";
import {measureCarving} from "./carving-texture-metric.mjs";
import {createPropPositionModel} from "./landing-prop-position.model.mjs";
import {renderPropPositionTool} from "./render-landing-prop-position-tool.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const read=file=>readFileSync(path.join(dir,file));
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const href=file=>path.relative(repo,path.join(dir,file)).replaceAll("\\","/");
const rel=file=>path.relative(dir,path.resolve(repo,file)).replaceAll("\\","/");
const folder="samples/props-calibration-v04",lineageDir="samples/derivations/props-calibration-v03";
const tool="landing-prop-position-carving-v04-review.html",review="props-calibration-v04-review.html";
const manifestName="props-calibration-v04.manifest.json";
const prior=JSON.parse(read("props-calibration-v03.manifest.json"));
const write=(file,bytes)=>{
  mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});
  writeFileSync(path.join(dir,file),bytes);
};
const asset=(file,bytes)=>({path:href(file),sha256:sha(bytes)});
function checked(a){
  const bytes=read(rel(a.path));
  if(sha(bytes)!==a.sha256)throw Error("Changed input "+a.path);
  return bytes;
}
function save(file,pixels){
  const bytes=PNG.sync.write(pixels);
  write(file,bytes);
  return {...asset(file,bytes),width:pixels.width,height:pixels.height,bounds:bounds(pixels)};
}
const sourceFile=lineageDir+"/carving-source.png";
const stencil=PNG.sync.read(read(sourceFile));
for(let i=3;i<stencil.data.length;i+=4)if(stencil.data[i]<200)stencil.data[i]=0;
const crop=bounds(stencil);
const frames=structuredClone(prior.scenes),measurements={},inlinePixels={};
const states=["hidden","revealed"];
const box=(id,x,y,width,height)=>({id,x,y,width,height});
for(const [view,x,y,width,height] of [["desktop",860,120,72,48],["phone",948,136,54,36]]){
  const f=frames[view],o=f.objects.find(o=>o.id==="carving");
  const bytes=checked(f.scene),wall=PNG.sync.read(bytes);
  inlinePixels[f.scene.path]="data:image/png;base64,"+bytes.toString("base64");
  const oldWall=prior.scenes[view].objects.find(o=>o.id==="carving");
  const metrics={v03:{},v04:{}};
  measurements[view]=metrics;
  const phone=view==="phone";
  const stamp=nearest(stencil,phone?width-6:51,23,crop);
  const offsetY=phone?7:4;
  function line(u,v){
    const col=u-3,row=v-offsetY+(phone?Math.round((u-width/2)/7):Math.round(u/17));
    return col>=0&&col<stamp.width&&row>=0&&row<stamp.height&&stamp.data[(row*stamp.width+col)*4+3]>=200;
  }
  // Sample the same two directional banks at both states. Only paint a lit
  // pixel immediately below a cut, leaving gaps where the cut turns upward.
  function role(u,v){
    if(line(u,v))return -1;
    return line(u,v-1)&&!line(u,v+1)?1:0;
  }
  function raster(depth,light){
    const image=new PNG({width,height});
    for(let v=0;v<height;v++)for(let u=0;u<width;u++){
      const bank=role(u,v);
      if(!bank)continue;
      const from=((y+v)*wall.width+x+u)*4,to=(v*width+u)*4;
      for(let c=0;c<3;c++){
        const delta=bank<0?-depth:light*[1.16,1,.63][c];
        image.data[to+c]=Math.max(0,Math.min(255,Math.round(wall.data[from+c]+delta)));
      }
      image.data[to+3]=255;
    }
    return image;
  }
  function banks(image,median){
    const sum={cut:0,lip:0},count={cut:0,lip:0};
    const luma=(data,i)=>(2126*data[i]+7152*data[i+1]+722*data[i+2])/10000;
    for(let v=1;v<height-1;v++)for(let u=1;u<width-1;u++){
      const bank=role(u,v);
      if(!bank)continue;
      const id=bank<0?"cut":"lip",ink=luma(image.data,(v*width+u)*4);
      for(const [du,dv] of [[-1,0],[1,0],[0,-1],[0,1]]){
        if(role(u+du,v+dv))continue;
        const rock=luma(wall.data,((y+v+dv)*wall.width+x+u+du)*4);
        sum[id]+=bank*(ink-rock);
        count[id]++;
      }
    }
    return {cutRatio:sum.cut/count.cut/median,lipRatio:sum.lip/count.lip/median,bankPairs:count};
  }
  const variants={};
  for(const state of states){
    metrics.v03[state]=measureCarving(wall,PNG.sync.read(checked(oldWall.variants[state])),oldWall.x,oldWall.y);
    const median=measureCarving(wall,raster(1,1),x,y)?.median;
    if(!median)throw Error("No measurable texture at "+view);
    const revealed=state==="revealed",target=revealed?6.5:1.95;
    let best;
    for(let depth=1;depth<=120;depth++){
      const light=Math.round(depth*.57);
      const image=raster(depth,light);
      const metric=measureCarving(wall,image,x,y);
      const detail=banks(image,median);
      if(revealed&&(metric.ratio<3.5||detail.cutRatio<3||detail.lipRatio<2.5))continue;
      if(!revealed&&(metric.ratio<1.4||metric.ratio>2.2||detail.cutRatio<=0||detail.lipRatio<=0))continue;
      const error=Math.abs(metric.ratio-target);
      if(!best||error<best.error)best={image,metric,detail,error,depth,light};
    }
    if(!best)throw Error("No compliant groove for "+view+" "+state);
    metrics.v04[state]={...best.metric,...best.detail,depth:best.depth,light:best.light};
    const a=save(folder+"/wall-carving-"+state+"-"+view+".png",best.image);
    variants[state]=a;
    inlinePixels[a.path]="data:image/png;base64,"+checked(a).toString("base64");
  }
  Object.assign(o,{x,y,width,height,variants});
  const title=f.fixed.find(l=>l.id==="wordmark"),pad=48;
  f.guidance.carving.titleReserve=box("標題保留區",title.x-pad,title.y-pad,title.width+pad*2,title.height+pad*2);
  const model=createPropPositionModel(f);
  if(model.warnings("carving",model.initial().carving).length)throw Error("Default carving intersects a guide");
}
const lineage=Object.fromEntries(["carving-source.png","prompts.md"].map(name=>{
  const file=lineageDir+"/"+name;
  return [name,asset(file,read(file))];
}));
for(const a of Object.values(prior.features))checked(a);
write(manifestName,JSON.stringify({reviewOnly:true,lineage,features:prior.features,scenes:frames,measurements},null,2)+"\n");
write(tool,renderPropPositionTool({frames,calibration:true,manifestName,reviewName:review,inlinePixels}));

const img=(a,alt="")=>`<img src="${rel(a.path)}" alt="${alt}" width="${a.width}" height="${a.height}">`;
function scene(f,state,view){
  const layers=[...f.fixed,...f.objects.map(o=>{
    const variant=o.id==="carving"?state:o.id==="chest"?"open":o.variant;
    return {...o.variants[variant],id:o.id,x:o.x-o.offset.x,y:o.y-o.offset.y,
      depth:o.id==="carving"?-100:o.y-o.offset.y+o.height};
  })].sort((a,b)=>a.depth-b.depth||a.id.localeCompare(b.id));
  return `<div class="viewport ${view}"><div class="scene" style="width:${f.frame.width}px">${img(f.scene)}
${layers.map(l=>`<div style="left:${l.x}px;top:${l.y}px">${img(l)}</div>`).join("")}</div></div>`;
}
write(review,`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Props 校準 · 壁畫 v04</title><style>
*{box-sizing:border-box}body{margin:0;background:#201912;color:#f4e6ce;font:16px/1.6 system-ui}main{max-width:1120px;margin:auto;padding:20px}a{color:#ffce88}h2{margin-top:2rem}figure{margin:0 0 1rem}figcaption{margin-bottom:.4rem}img{image-rendering:pixelated;vertical-align:middle}.scroll,.viewport{max-width:100%;overflow:auto;background:#17110d}.viewport.phone{width:390px}.scene{position:relative}.scene div{position:absolute}.phone .scene{margin-left:-780px}table{border-collapse:collapse;width:100%;min-width:480px}th,td{padding:8px;border:1px solid #7e6448;text-align:left}thead{background:#423022}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}.features img{max-width:100%;height:auto}
</style><main><p>Phase 1 · 待視覺審核</p><h1>Props 家族校準 · 壁畫 v04</h1>
<p><a href="${tool}">開啟 v04 擺位工具</a> · <a href="${manifestName}">素材來源與量測</a> · <a href="props-calibration-v04-verification.md">驗證紀錄</a></p>
<p>桌機畫布位於右通道上方（860, 120），72×48，實際刻線收在同一岩塊。手機刻在右段斜向岩面（948, 136），54×36，刻線依岩面斜向偏移。下方受火光的槽緣使用暖色。</p><h2>岩壁紋理量測</h2><p>刻線與緊鄰岩壁的平均亮度差，除以同範圍岩壁自然相鄰像素的亮度差中位數。另以相同分母量測 revealed 的受光下緣相對岩壁提亮及暗槽壓暗幅度。</p>
<div class="scroll" tabindex="0"><table><thead><tr><th>場景</th><th>版本</th><th>Hidden（1.4–2.2）</th><th>Revealed（≥3.5）</th><th>受光下緣（≥2.5）</th><th>暗槽（≥3）</th></tr></thead><tbody>
${Object.entries(measurements).flatMap(([view,versions])=>Object.entries(versions).map(([version,m])=>`<tr><th>${view==="phone"?"手機":"桌機"}</th><td>${version}</td><td>${m.hidden.ratio.toFixed(2)}</td><td>${m.revealed.ratio.toFixed(2)}</td><td>${m.revealed.lipRatio?.toFixed(2)??"—"}</td><td>${m.revealed.cutRatio?.toFixed(2)??"—"}</td></tr>`)).join("")}
</tbody></table></div>
${Object.entries(frames).map(([view,f])=>`<h2>${view==="phone"?"手機右段":"桌機"} · 1× 實景</h2><p>寶箱以 open 狀態呈現。窄視窗可水平捲動。</p>`+
  states.flatMap(state=>[["v04",f],["v03",prior.scenes[view]]].map(([version,meta])=>`<figure data-shot="${view}-${version}-${state}"><figcaption>${version} · ${state}</figcaption>${scene(meta,state,view)}</figure>`)).join("")).join("")}
<h2>已核准功能章節插圖</h2><div class="features">${Object.entries(prior.features).map(([id,a],i)=>`<figure><figcaption>${["個人支出","共同分帳","共用基金","任務中心"][i]}</figcaption>${img(a,id)}</figure>`).join("")}</div>
</main></html>\n`);
