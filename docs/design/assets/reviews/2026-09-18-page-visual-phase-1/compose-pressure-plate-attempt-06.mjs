import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {nearest,over,gray} from "./landing-chest-raster.mjs";
import {geometry,fitDiamond,measureDiamond,measureLowerGaps,measureColour} from "./pressure-plate-attempt-06-contracts.mjs";
import {renderPressurePlateAttempt06} from "./render-pressure-plate-attempt-06.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../.."),{PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",derivation=prefix+"samples/derivations/pressure-plate-attempt-06/",hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function record(file){const b=await readFile(file);return {path:relative(file),sha256:hash(b)};}
async function bytes(a){const file=path.resolve(repo,a.path);if(!file.startsWith(repo+path.sep))throw Error("Input outside repository");const b=await readFile(file);if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);return b;}
async function png(a){const p=PNG.sync.read(await bytes(a));if(a.width&&(p.width!==a.width||p.height!==a.height))throw Error("Changed dimensions");return p;}
export async function composePressurePlateAttempt06(){
  // The existing preparation and contracts are inputs only. Never rerun their
  // generation, rewrite their files, or request new ImageGen images here.
  const lineage=await record(path.join(repo,derivation,"lineage.json")),l=JSON.parse((await bytes(lineage)).toString());
  if(l.schema!=="mimic-pressure-plate-attempt-06-source/v1"||l.tool!=="built-in"||l.generator!=="imagegen"||!l.transparent||!l.resumedExistingOnly||l.newImageCallsOnResume!==0||l.history.length!==5)throw Error("Invalid existing-source lineage");
  await bytes(l.parentLineage);for(const a of Object.values(l.inputs))await bytes(a);
  const measurement=JSON.parse((await bytes(l.measurement)).toString());for(const a of Object.values(measurement.outputs))await png(a);
  if(measurement.schema!=="mimic-pressure-plate-floor-diamond-guide/v1"||measurement.tiles.length!==10||measurement.zones.near.count!==5||measurement.zones.middle.count!==5)throw Error("Missing existing floor measurement");
  const spec=(await bytes(l.inputs.spec)).toString();
  if((await bytes(l.history[0].prompt)).toString().trim()!==spec.split("### ImageGen prompt（attempt-06，編修 attempt-05）")[1].split("```text")[1].split("```")[0].trim())throw Error("First prompt differs from spec");
  for(const [i,h] of l.history.entries()){
    await png(h.source);await bytes(h.prompt);await png(h.editTarget);for(const a of h.references)await png(a);
    if(h.mode!=="edit"||(i&&h.editTarget.sha256!==l.history[i-1].source.sha256))throw Error("Invalid historical edit chain");
    if(h.references[0].sha256!==measurement.outputs.outline8x.sha256||h.references[1].sha256!==l.inputs.referenceScene.sha256)throw Error("Wrong guide / scene reference order");
  }
  if(l.history[0].editTarget.sha256!=="d2902a1277831ddd88b779852949ee34c79b6c83650cf44fb3d3ceaeca36c9b4"||l.selected.sha256!==l.history[4].source.sha256)throw Error("Wrong existing selected source");
  const parent=JSON.parse((await bytes(l.inputs.parent)).toString()),chest=JSON.parse((await bytes(l.inputs.chest)).toString()),previous=JSON.parse((await bytes(l.inputs.previous)).toString());
  const title=parent.frames["desktop-single"].title,plate=parent.scenes.desktop.layers.find(a=>a.id==="pressurePlate");
  if(JSON.stringify([title.x,title.y,plate.x,plate.y])!=="[376,100,850,339]")throw Error("Frozen placement changed");
  await png(l.inputs.phone);
  async function build(replacement){
    const out=await png(measurement.outputs.architecture);
    for(const layer of parent.scenes.desktop.layers){
      if(layer.id==="chest")over(out,await png(chest.frames.closed.sprite),92,230);
      else if(layer.id==="pressurePlate"&&replacement){const faded=nearest(replacement,85,35);for(let i=3;i<faded.data.length;i+=4)faded.data[i]=Math.round(faded.data[i]*geometry.opacity);over(out,faded,...geometry.origin);}
      else over(out,await png(layer),layer.x,layer.y);
    }
    over(out,await png(title),title.x,title.y);return out;
  }
  const baseline=await png(l.inputs.referenceScene);if(!baseline.data.equals((await build()).data))throw Error("Frozen baseline reconstruction differs");
  const candidates=[];let selectedSprite,selectedScene,selectedFit;
  for(const h of l.history){
    const {sprite,fit}=fitDiamond(await png(h.source)),scene=await build(sprite),shape=measureDiamond(sprite,measurement.aggregate.meanAbsoluteSlope),colour=measureColour(scene),gaps=measureLowerGaps(sprite);
    const colourPass=colour.plate.s>=0.58&&colour.delta>=0.02&&colour.delta<=0.08,passes=shape.passes&&colourPass&&gaps.left.coverage>=0.8&&gaps.right.coverage>=0.8;
    candidates.push({name:h.name,source:h.source,fit,shape,colour,gaps,colourPass,passes});
    if(h.source.sha256===l.selected.sha256){selectedSprite=sprite;selectedScene=scene;selectedFit=fit;}
  }
  const selected=candidates.find(c=>c.source.sha256===l.selected.sha256);
  if(!selected?.passes||candidates.slice(0,-1).some(c=>c.colourPass))throw Error("Existing-source selection contract failed");
  const negative=measureDiamond(await png(previous.outputs.sprite),measurement.aggregate.meanAbsoluteSlope);if(negative.passes||negative.topHorizontalSpan<60)throw Error("Attempt-05 horizontal-edge negative control failed");
  const scene=selectedScene,sprite=selectedSprite,oldScene=await png(previous.outputs.scene);let changedPixels=0,changedVsAttempt05=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4,now=scene.data.subarray(i,i+4),changed=!baseline.data.subarray(i,i+4).equals(now),oldChanged=!oldScene.data.subarray(i,i+4).equals(now);
    if((changed||oldChanged)&&(x<850||x>=946||y<331||y>=366))throw Error("Frozen exterior changed");if(changed)changedPixels++;if(oldChanged)changedVsAttempt05++;
  }
  const outputs={},writes=new Map(),save=(name,p)=>{const file=path.join(dir,"samples/pressure-plate-attempt-06",name+".png"),data=PNG.sync.write(p);writes.set(file,data);outputs[name]={path:relative(file),sha256:hash(data),width:p.width,height:p.height};};
  save("sprite",sprite);save("zoom",nearest(sprite,340,140));save("spriteGray",gray(sprite));save("zoomGray",nearest(gray(sprite),340,140));save("scene",scene);save("sceneGray",gray(scene));
  const crop={x:824,y:300,width:128,height:80};save("context",nearest(scene,128,80,crop));save("contextZoom",nearest(scene,512,320,crop));save("contextGray",gray(nearest(scene,512,320,crop)));save("attempt05Context",nearest(oldScene,512,320,crop));
  const overlay=nearest(sprite,85,35),guide=await png(measurement.outputs.outline);for(let i=0;i<guide.data.length;i+=4)if(guide.data[i+3])overlay.data.set([0,235,255,255],i);save("guideOverlay",nearest(overlay,680,280));
  const groove=nearest(sprite,85,35);for(const e of [selected.gaps.left,selected.gaps.right])for(const [x,y] of e.points)groove.data.set([0,235,255,255],(y*85+x)*4);save("gapEvidence",nearest(groove,680,280));
  const mask=nearest(scene,960,540);for(let y=329;y<368;y++)for(let x=854;x<943;x++)if(Math.abs(x-898)/42+Math.abs(y-348)/17<=0.64)mask.data.set([0,235,255,255],(y*960+x)*4);save("colourMask",nearest(mask,512,192,{x:824,y:325,width:128,height:48}));
  const m={schema:"mimic-pressure-plate-attempt-06-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,stage:"C: appearance review; stop before A",completionDate:"2026-11-03",resumedExistingOnly:true,newImageCallsOnResume:0,lineage,measurement,
    inputs:{...l.inputs,source:l.selected,composer:await record(fileURLToPath(import.meta.url)),renderer:await record(path.join(dir,"render-pressure-plate-attempt-06.mjs"))},
    geometry:{...geometry,sceneOpacity:geometry.opacity,...selectedFit,previousCanvasCenter:[898,348],allowedChangeRect:[850,331,96,35],crop},changedPixels,changedVsAttempt05,
    selection:{priority:["attempt-06-retry-04","attempt-06-retry-03","attempt-06-retry-02","attempt-06-retry-01","attempt-06"],selected:selected.name,candidates},diamondContract:{candidate:selected.shape,attempt05Negative:negative},
    colourContract:{method:"fixed-diamond-interior-and-2px-envelope-ring/v1",mask:{plate:"abs(x-898)/42 + abs(y-348)/17 <= 0.64",floorOuterRect:[854,329,89,39],floorExclusion:[856,331,85,35]},thresholds:{saturationMin:0.58,valueDelta:[0.02,0.08]},candidate:selected.colour},lowerGaps:selected.gaps,outputs};
  const html=renderPressurePlateAttempt06(m,l,previous),reviewFile=path.join(dir,"pressure-plate-attempt-06-review.html");m.review={path:relative(reviewFile),sha256:hash(html)};
  writes.set(reviewFile,Buffer.from(html));writes.set(path.join(dir,"pressure-plate-attempt-06.manifest.json"),Buffer.from(JSON.stringify(m,null,2)+"\n"));
  const pending=[];for(const [file,data] of writes)try{if(!(await readFile(file)).equals(data))throw Error("Refusing changed existing output: "+file);}catch(e){if(e.code!=="ENOENT")throw e;pending.push([file,data]);}
  for(const [file,data] of pending){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);}return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=await composePressurePlateAttempt06();console.log(JSON.stringify({selected:m.selection.selected,outputs:Object.keys(m.outputs).length,geometry:m.geometry,changedPixels:m.changedPixels,changedVsAttempt05:m.changedVsAttempt05}));}
