import {createHash} from "node:crypto";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds,nearest} from "./landing-chest-raster.mjs";
import {renderPropPositionTool} from "./render-landing-prop-position-tool.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const sample="samples/props-calibration-v02";
const source="samples/derivations/props-calibration-v02";
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const rel=file=>path.relative(dir,path.resolve(repo,file)).replaceAll("\\","/");
const json=file=>JSON.parse(readFileSync(path.join(dir,file),"utf8"));
const png=file=>PNG.sync.read(readFileSync(path.join(dir,file)));
const href=file=>path.relative(repo,path.join(dir,file)).replaceAll("\\","/");
const write=(file,data)=>{
  mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});
  writeFileSync(path.join(dir,file),data);
};
const readAsset=a=>{
  const bytes=readFileSync(path.resolve(repo,a.path));
  if(sha(bytes)!==a.sha256)throw Error("Changed source "+a.path);
  return PNG.sync.read(bytes);
};
const save=(name,p)=>{
  const file=sample+"/"+name+".png", bytes=PNG.sync.write(p);
  write(file,bytes);
  return {path:href(file),sha256:sha(bytes),width:p.width,height:p.height,bounds:bounds(p)};
};
const src=name=>png(source+"/"+name+"-source.png");
const stencil=src("carving"), sheet=src("features");
const features={};
for(const [i,id] of ["personal","shared","pooled","tasks"].entries()){
  const x=i%2===0?0:634,y=i<2?0:550;
  const region=nearest(sheet,634,i<2?550:691,{x,y,width:634,height:i<2?550:691});
  for(let j=0;j<region.data.length;j+=4)
    if(region.data[j+3]<128)region.data.fill(0,j,j+4);
  const crop=bounds(region), scale=56/Math.max(crop.width,crop.height);
  const pixel=nearest(region,Math.round(crop.width*scale),Math.round(crop.height*scale),crop);
  const canvas=new PNG({width:256,height:256});
  const px=Math.floor((256-pixel.width*4)/2),py=Math.floor((256-pixel.height*4)/2);
  for(let v=0;v<pixel.height*4;v++)for(let u=0;u<pixel.width*4;u++){
    const from=((v>>2)*pixel.width+(u>>2))*4,to=((py+v)*256+px+u)*4;
    pixel.data.copy(canvas.data,to,from,from+4);
  }
  features[id]=save("feature/"+id,canvas);
}

const approved=json("landing-prop-placement-application.manifest.json");
const strip=json("samples/landing-phone-exploration-3r3/layout.json");
const historical=json("landing-prop-position-exploration.manifest.json");
const desktop=approved.scenes.desktop;
const old=historical.frames;
const object=(id,label,x,y,variants,variant,offset={x:0,y:0})=>({
  id,label,x,y,variants,variant,offset,anchor:offset.y?"ground":"top-left",opacity:1,
  width:variants[variant].width,height:variants[variant].height,
});
const chest=Object.fromEntries(Object.entries(approved.chestFrames).map(([id,a])=>[id,a.sprite]));
const phoneChest=strip.layers.find(l=>l.id==="chest").variants;
const props={features,carving:{},measurements:{}};
const luma=(r,g,b)=>.2126*r+.7152*g+.0722*b;
const maskCrop=bounds(stencil);
const frames={};
for(const [view,x,y,w,h] of [["desktop",205,190,72,48],["phone",945,163,54,36]]){
  const isPhone=view==="phone", scene=isPhone?strip.scene:desktop.architecture;
  const wall=readAsset(scene);
  const mask=nearest(stencil,w-4,h-6,maskCrop);
  const groove=(u,v)=>{
    const mu=u-2,mv=v-2-(isPhone?Math.round((u-w/2)/18):0);
    return mu>=0&&mu<mask.width&&mv>=0&&mv<mask.height&&mask.data[(mv*mask.width+mu)*4+3]>=128;
  };
  const variants={},measurements={};
  for(const [state,factor,edge] of [["hidden",.90,[3,2,1]],["revealed",.62,[24,15,7]]]){
    const p=new PNG({width:w,height:h});
    let reference=0,shaded=0,count=0;
    for(let v=0;v<h;v++)for(let u=0;u<w;u++){
      const line=groove(u,v),lip=groove(u,v-1);
      if(!line&&!lip)continue;
      const from=((y+v)*wall.width+x+u)*4,to=(v*w+u)*4;
      for(let c=0;c<3;c++)p.data[to+c]=Math.min(255,Math.round(line?wall.data[from+c]*factor:wall.data[from+c]+edge[c]));
      p.data[to+3]=255;
      if(line){
        reference+=luma(...wall.data.subarray(from,from+3));
        shaded+=luma(...p.data.subarray(to,to+3));
        count++;
      }
    }
    const contrast=(reference-shaded)/reference;
    if(!count||(state==="hidden"?(contrast<.06||contrast>.12):contrast<.2))throw Error("Wall contrast out of range");
    measurements[state]={contrast,count,referenceMean:reference/count,grooveMean:shaded/count};
    variants[state]=save("landing/wall-carving-"+state+"-"+view,p);
  }
  props.carving[view]=variants;
  props.measurements[view]=measurements;
  const fixed=isPhone?strip.layers.filter(l=>!["chest","torch","explorationBats"].includes(l.id)):
    desktop.fixed.filter(l=>l.id!=="carving");
  const layer=id=>strip.layers.find(l=>l.id===id);
  const lidBounds=bounds(nearest(readAsset((isPhone?phoneChest:chest).open),isPhone?110:156,isPhone?90:128,
    {x:0,y:0,width:isPhone?110:156,height:isPhone?90:128}));
  const chestObject={...object("chest","寶箱",isPhone?103:294,isPhone?316:340,
    isPhone?phoneChest:chest,"closed",{x:isPhone?55:78,y:isPhone?126:180}),lidBounds};
  const objects=[chestObject,...(isPhone?["torch","explorationBats"].map(id=>{
    const l=layer(id);
    return object(id,id==="torch"?"火把":"蝙蝠",l.x,l.y,l.variants,"default");
  }):[object("mapCrate","地圖木箱",desktop.crate.x,desktop.crate.y,{default:desktop.crate.sprite},"default")]),
    object("carving","隱藏壁畫",x,y,variants,"hidden")];
  const frame=isPhone?{id:view,width:strip.width,height:strip.height,viewportWidth:390,initialViewportX:390}:desktop.frame;
  frames[view]={...old[view],frame,scene,fixed,objects,guidance:{
    ...old[view].guidance,
    forbidden:[...old[view].guidance.forbidden,...fixed.filter(l=>["torchHigh","torchLow"].includes(l.id))],
  },signLabel:isPhone?strip.signLabel:old[view].signLabel};
}

const inventory=[];
for(const [view,meta] of Object.entries(frames)){
  for(const [id,a] of Object.entries(meta.objects[0].variants))inventory.push([view+" · chest "+id,a]);
  for(const id of ["torchHigh","torchLow","torch","bats","mapCrate","sign","fire"]){
    const a=meta.fixed.find(l=>l.id===id)??meta.objects.find(l=>l.id===id)?.variants.default;
    if(a)inventory.push([view+" · "+id,a]);
  }
  for(const [id,a] of Object.entries(props.carving[view]))inventory.push([view+" · 壁畫 "+id,a]);
}

const tool="landing-prop-position-carving-review.html";
const image=(a,scale=1,alt="")=>'<img src="'+rel(a.path)+'" alt="'+alt+'" width="'+a.width*scale+'" height="'+a.height*scale+'">';
const renderScene=(meta,state)=>{
  const layers=[...meta.fixed,...meta.objects.map(o=>({
    ...o.variants[o.id==="carving"?state:o.variant],id:o.id,x:o.x-o.offset.x,y:o.y-o.offset.y,
    depth:o.id==="carving"?-100:o.y-o.offset.y+o.height,
  }))].sort((a,b)=>a.depth-b.depth||a.id.localeCompare(b.id));
  const css=l=>'left:'+l.x/meta.frame.width*100+'%;top:'+l.y/meta.frame.height*100+'%;width:'+l.width/meta.frame.width*100+'%';
  return '<div class="scene" data-state="'+state+'" '+(state==="revealed"?"hidden":"")+' style="width:'+meta.frame.width+'px">'+image(meta.scene)+layers.map(l=>'<div style="'+css(l)+'">'+image(l)+'</div>').join("")+'</div>';
};
const refIcon=id=>id==="tasks"?"samples/task-board-variants/task-board-a-adventurer-contract.png":"samples/icon-optical-evidence/masters/mode-"+id+".png";
write(tool,renderPropPositionTool({frames,calibration:true,manifestName:"props-calibration-v02.manifest.json"}));
const html=`<!doctype html>
<html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Props 校準 v02</title><style>
*{box-sizing:border-box}body{margin:0;background:#201912;color:#f4e6ce;font:16px/1.55 system-ui,sans-serif}main{margin:auto;max-width:1240px;padding:24px}a{color:#ffce88}img{image-rendering:pixelated;vertical-align:middle}h2{margin-top:2rem}figure{margin:0;padding:12px;background:#33271f;border-radius:8px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.feature img{max-width:100%;height:auto}.feature .reference{width:56px}.scroll{overflow:auto;max-width:100%;margin-block:12px;background:#17110d}.scene{position:relative}.scene img{width:100%;height:auto}.scene div{position:absolute}.swatches{display:flex;align-items:center;gap:24px;width:max-content;padding:10px}.gray{filter:grayscale(1)}button{padding:8px;color:inherit;background:#4d3727;border:1px solid #aa885f;border-radius:5px}button[aria-pressed=true]{outline:2px solid #ffd18c}@media(max-width:680px){main{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style><main><header><p>Phase 1 · 待視覺審核</p><h1>Props 家族校準 v02</h1><p><a href="${tool}">開啟壁畫擺位工具</a> · <a href="props-calibration-v02.manifest.json">素材來源與量測</a></p></header>
<h2>隱藏壁畫</h2><div role="group" aria-label="壁畫狀態"><button data-toggle="hidden" aria-pressed="true">Hidden</button> <button data-toggle="revealed" aria-pressed="false">Revealed</button></div>
${Object.entries(frames).map(([id,f])=>'<h3>'+ (id==="phone"?"手機探索條 · 右段":"桌機場景")+'</h3><div class="scroll" tabindex="0" data-view="'+id+'">'+renderScene(f,"hidden")+renderScene(f,"revealed")+'</div>').join("")}
<h2>功能章節小插圖</h2><div class="grid">${Object.entries(features).map(([id,a],i)=>'<figure class="feature">'+image(a,1,id)+'<figcaption>'+["個人支出","共同分帳","共用基金","任務中心"][i]+' · <img class="reference" src="'+refIcon(id)+'" alt="對應核准圖示"></figcaption></figure>').join("")}</div>
<h2>素材總覽</h2><p>每列依序為 1×、4×、4× 灰階。可水平捲動查看原始倍率。</p>
${[...inventory,...Object.entries(features)].map(([id,a])=>'<figure><figcaption>'+id+'</figcaption><div class="scroll" tabindex="0"><div class="swatches">'+image(a)+image(a,4)+'<span class="gray">'+image(a,4)+'</span></div></div></figure>').join("")}
</main><script>
const buttons=[...document.querySelectorAll("[data-toggle]")];
const phone=document.querySelector('[data-view="phone"]');
phone.scrollLeft=840;
for(const button of buttons)button.onclick=()=>{
  const state=button.dataset.toggle;
  for(const item of buttons)item.setAttribute("aria-pressed",String(item===button));
  for(const scene of document.querySelectorAll("[data-state]"))scene.hidden=scene.dataset.state!==state;
};
</script></html>`;
write("props-calibration-v02-review.html",html);
const lineage=Object.fromEntries(["features-source.png","carving-source.png","desktop-wall-reference.png","phone-wall-reference.png","prompts.md"].map(name=>{
  const file=source+"/"+name;
  return [name,{path:href(file),sha256:sha(readFileSync(path.join(dir,file)))}];
}));
write("props-calibration-v02.manifest.json",JSON.stringify({reviewOnly:true,lineage,...props,scenes:frames,inventory},null,2)+"\n");
