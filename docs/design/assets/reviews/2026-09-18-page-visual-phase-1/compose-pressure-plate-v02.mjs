import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {bounds,nearest,over,gray} from "./landing-chest-raster.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",derivation=prefix+"samples/derivations/pressure-plate-v02/";
const hash=b=>createHash("sha256").update(b).digest("hex");
async function bytes(a){
  const file=path.resolve(repo,a.path);if(!file.startsWith(repo+path.sep))throw Error("Input outside repository");
  const b=await readFile(file);if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);return b;
}
async function png(a){const p=PNG.sync.read(await bytes(a));if(a.width&&(p.width!==a.width||p.height!==a.height))throw Error("Changed dimensions");return p;}
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function record(file){const b=await readFile(file);return {path:relative(file),sha256:hash(b)};}
export async function composePressurePlate(){
  const lineage=await record(path.join(repo,derivation,"lineage.json")),l=JSON.parse((await bytes(lineage)).toString());
  if(l.schema!=="mimic-pressure-plate-v02-source/v1"||l.generator!=="imagegen"||!l.transparent||l.history.length!==3)throw Error("Invalid lineage");
  for(const [i,h] of l.history.entries()){
    await png(h.source);await bytes(h.prompt);for(const a of h.references)await png(a);
    if(i){if(h.mode!=="edit"||h.editTarget.sha256!==l.history[i-1].source.sha256)throw Error("Invalid edit target");await png(h.editTarget);}
    else if(h.mode!=="generate"||h.editTarget!==null||h.references.length!==3)throw Error("Invalid generation references");
  }
  if(l.selected.sha256!==l.history.at(-1).source.sha256)throw Error("Source not raw selected bytes");
  const spec=(await bytes(l.inputs.spec)).toString(),prompt=(await bytes(l.history[0].prompt)).toString();
  if(prompt.trim()!==spec.split("```text\n")[1].split("\n```")[0].trim())throw Error("First prompt differs from spec");
  const parent=JSON.parse((await bytes(l.inputs.parent)).toString()),chest=JSON.parse((await bytes(l.inputs.chest)).toString());await bytes(l.inputs.raster);await png(l.inputs.phone);
  const plate=parent.scenes.desktop.layers.find(a=>a.id==="pressurePlate"),title=parent.frames["desktop-single"].title;
  if(JSON.stringify([plate.x,plate.y,plate.width,plate.height])!=="[850,339,67,14]"||JSON.stringify([title.x,title.y])!=="[376,100]")throw Error("Frozen placement changed");
  const source=await png(l.selected),b=bounds(source),scale=80/b.width,height=Math.ceil(b.height*scale);
  if(height>18||height<15||b.x===0||b.y===0||b.x+b.width>=source.width||b.y+b.height>=source.height)throw Error("Source does not fit / clipped");
  // One uniform nearest-neighbor scale. Canvas slack is transparent, bottom aligned.
  const sprite=new PNG({width:80,height:18}),offset=18-height;
  for(let y=0;y<height;y++)for(let x=0;x<80;x++){
    const sx=b.x+Math.floor(x/scale),sy=b.y+Math.floor(y/scale);
    if(sx>=b.x+b.width||sy>=b.y+b.height)continue;
    const si=(sy*source.width+sx)*4,di=((y+offset)*80+x)*4;
    if(source.data[si+3]<200)continue;sprite.data.set(source.data.subarray(si,si+3),di);sprite.data[di+3]=255;
  }
  async function build(replacement){
    const a=await png(parent.sources.architectureDesktop),ratio=960/540;
    const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width,ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
    const out=nearest(a,960,540,{x:Math.floor((a.width-cw)/2),y:Math.floor((a.height-ch)/2),width:cw,height:ch});
    for(let i=3;i<out.data.length;i+=4)out.data[i]=255;
    for(const layer of parent.scenes.desktop.layers){
      if(layer.id==="chest")over(out,await png(chest.frames.closed.sprite),92,230);
      else if(layer.id==="pressurePlate"&&replacement){
        const faded=nearest(replacement,80,18);for(let i=3;i<faded.data.length;i+=4)faded.data[i]=Math.round(faded.data[i]*0.85);over(out,faded,850,339);
      }else over(out,await png(layer),layer.x,layer.y);
    }
    over(out,await png(title),title.x,title.y);return out;
  }
  const before=await png(chest.frames.closed.logical),reconstructed=await build();
  if(!before.data.equals(reconstructed.data))throw Error("Baseline reconstruction differs");
  const scene=await build(sprite);let changedPixels=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;if(before.data.subarray(i,i+4).equals(scene.data.subarray(i,i+4)))continue;
    if(x<850||x>=930||y<339||y>=357)throw Error("Frozen scene changed outside plate");changedPixels++;
  }
  const writes=new Map(),outputs={};
  const save=(name,p)=>{const file=path.join(dir,"samples/pressure-plate-v02",name+".png"),data=PNG.sync.write(p);writes.set(file,data);return outputs[name]={path:relative(file),sha256:hash(data),width:p.width,height:p.height};};
  save("sprite",sprite);save("zoom",nearest(sprite,320,72));save("spriteGray",gray(sprite));save("zoomGray",nearest(gray(sprite),320,72));
  const old=await png(l.inputs.v01);save("v01Zoom",nearest(old,268,56));save("v01Gray",gray(old));
  save("scene",scene);save("sceneGray",gray(scene));
  const crop={x:832,y:323,width:110,height:46};
  save("context",nearest(scene,110,46,crop));save("contextZoom",nearest(scene,440,184,crop));save("contextGray",gray(nearest(scene,440,184,crop)));
  save("v01Context",nearest(before,440,184,crop));
  const m={schema:"mimic-pressure-plate-v02-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,stage:"C: pressure plate appearance only; stop before A",lineage,
    inputs:{...l.inputs,source:l.selected,referenceScene:chest.frames.closed.logical,composer:await record(fileURLToPath(import.meta.url))},
    geometry:{origin:[850,339],canvas:[80,18],sceneOpacity:0.85,sourceBounds:b,uniformScale:scale,sampledHeight:height,canvasOffset:[0,offset],alphaThreshold:200,crop},changedPixels,outputs};
  const src=a=>a.path.slice(prefix.length),esc=s=>s.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;");
  const img=(a,alt,attrs="")=>`<img src="${esc(src(a))}" width="${a.width}" height="${a.height}" alt="${esc(alt)}" ${attrs}>`;
  const panel=(label,a,attrs="")=>`<figure ${attrs}><figcaption>${label}</figcaption><div class="scroll checker">${img(a,label)}</div></figure>`;
  const html=`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing 壓力板 v02 外觀審核</title>
<style>*{box-sizing:border-box}body{margin:0;background:#171511;color:#ede2cd;font:16px/1.65 system-ui,sans-serif}main{max-width:1060px;margin:auto;padding:24px 16px}h1{font-size:clamp(24px,4vw,36px);line-height:1.25}h2{margin-top:36px;font-size:22px}p{max-width:75ch}.status{color:#e8bc75}figure{margin:16px 0;border:1px solid #66533b;border-radius:6px;overflow:hidden}figcaption{padding:8px 12px;background:#2d261d}.scroll{overflow-x:auto;padding:12px;max-width:100%}.checker{background-color:#302a22;background-image:linear-gradient(45deg,#3c342a 25%,transparent 25%,transparent 75%,#3c342a 75%),linear-gradient(45deg,#3c342a 25%,transparent 25%,transparent 75%,#3c342a 75%);background-size:16px 16px;background-position:0 0,8px 8px}img{image-rendering:pixelated;display:block;max-width:none}.scene img{width:100%;height:auto}.scene{background:#302a22}a{color:#ffd397;overflow-wrap:anywhere}details{margin:20px 0}summary{cursor:pointer}code{overflow-wrap:anywhere}footer{border-top:1px solid #66533b;margin-top:32px;padding-top:16px;color:#c7b99f}</style>
<main><h1>Landing — 壓力板 v02</h1><p class="status">awaiting-calibration · 僅審外觀 · C</p><p>暖灰褐石材、三塊內板與固定外框；以周邊接縫、磨亮邊與前緣暗槽表達無害的舊機關。以下是待選候選，尚未核准。</p><p>本輪只比較外觀。座標維持 (850,339)，場景透明度維持 0.85；候選畫布 80×18。寶箱 v04、人物、標題及其他場景內容保持原樣。</p>
<h2>實際尺寸與像素細節</h2>${panel("v02 · 1× · 80×18",outputs.sprite,'data-v02="1"')}${panel("v02 · 4× · 最近鄰放大",outputs.zoom,'data-v02="4"')}${panel("v02 · 真實灰階 1×",outputs.spriteGray,'data-gray="1"')}${panel("v02 · 真實灰階 4×",outputs.zoomGray,'data-gray="4"')}
<h2>v01 外觀對照</h2>${panel("v01 · 原始 1× · 67×14（原透明度）",l.inputs.v01,'data-v01="1"')}${panel("v01 · 4×",outputs.v01Zoom,'data-v01="4"')}${panel("v01 · 真實灰階 1×",outputs.v01Gray)}
<h2>原位置桌機場景</h2><p>全景隨視窗縮放；下方另附 960×540 的 1× 全景供實際大小審閱。這裡不判斷擺位。</p><figure class="scene" data-scene="v02"><figcaption>v02 · 寶箱 v04 保留</figcaption>${img(outputs.scene,"v02 原位置桌機全景")}</figure>
<details><summary>v01 桌機全景對照</summary><figure class="scene" data-scene="v01">${img(chest.frames.closed.logical,"v01 壓力板桌機全景")}</figure></details>
<details><summary>960×540 實際 1× 全景（可水平捲動）</summary>${panel("v02 · 960×540 · 1×",outputs.scene,'data-scene-actual')}</details>
${panel("原位置局部 · v02 · 1×",outputs.context)}${panel("原位置局部 · v02 · 4×",outputs.contextZoom,'data-context="v02"')}${panel("同範圍 · v01 · 4×",outputs.v01Context,'data-context="v01"')}${panel("原位置局部 · 真實灰階 4×",outputs.contextGray)}
<details><summary>真實灰階全景</summary><figure class="scene">${img(outputs.sceneGray,"v02 真實灰階全景")}</figure></details>
<details><summary>來源、原始嘗試與 prompt</summary><p>Built-in ImageGen：首次依設計文件原文生成，接續兩次修改；所有原始 PNG 保留。只有 alpha 門檻、透明 RGB 歸零與等比最近鄰取樣，無手繪補圖。</p><ul>${l.history.map((h,i)=>`<li>Attempt ${i+1} · ${h.mode} · <a href="${src(h.source)}">原始 PNG</a> · <a href="${src(h.prompt)}">實際 prompt</a></li>`).join("")}</ul><p><a href="${src(lineage)}">完整 lineage</a> · <a href="pressure-plate-v02.manifest.json">尺寸與 SHA-256 manifest</a></p></details>
<footer>停在壓力板外觀審核，等待使用者選定或提出修正。未開始 A；無 runtime／production exports／Phase 2 變更。</footer></main></html>\n`;
  const reviewFile=path.join(dir,"pressure-plate-v02-review.html"),manifestFile=path.join(dir,"pressure-plate-v02.manifest.json");m.review={path:relative(reviewFile),sha256:hash(html)};
  writes.set(reviewFile,Buffer.from(html));writes.set(manifestFile,Buffer.from(JSON.stringify(m,null,2)+"\n"));
  // Existing output files may only be replaced by their identical deterministic rebuild.
  for(const [file,data] of writes)try{const old=await readFile(file);if(!old.equals(data))throw Error("Refusing changed existing output: "+file);}catch(e){if(e.code!=="ENOENT")throw e;}
  for(const [file,data] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);}return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=await composePressurePlate();console.log(JSON.stringify({outputs:Object.keys(m.outputs).length,geometry:m.geometry,changedPixels:m.changedPixels}));}
