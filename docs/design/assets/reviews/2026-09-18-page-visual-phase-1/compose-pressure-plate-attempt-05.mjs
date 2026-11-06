import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {nearest,over,gray} from "./landing-chest-raster.mjs";
import {fitPlate,measureSlopes,measureFrontGap,measureColour} from "./pressure-plate-attempt-05-contracts.mjs";
import {preparePressurePlateAttempt05} from "./prepare-pressure-plate-attempt-05.mjs";
import {renderPressurePlateAttempt05} from "./render-pressure-plate-attempt-05.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",derivation=prefix+"samples/derivations/pressure-plate-attempt-05/";
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
async function record(file){const b=await readFile(file);return {path:relative(file),sha256:hash(b)};}
async function bytes(a){
  const file=path.resolve(repo,a.path);if(!file.startsWith(repo+path.sep))throw Error("Input outside repository");
  const b=await readFile(file);if(hash(b)!==a.sha256)throw Error("Changed input: "+a.path);return b;
}
async function png(a){const p=PNG.sync.read(await bytes(a));if(a.width&&(p.width!==a.width||p.height!==a.height))throw Error("Changed dimensions");return p;}
export async function composePressurePlateAttempt05(){
  const measurement=await preparePressurePlateAttempt05();
  const lineage=await record(path.join(repo,derivation,"lineage.json")),l=JSON.parse((await bytes(lineage)).toString());
  if(l.schema!=="mimic-pressure-plate-attempt-05-source/v1"||l.generator!=="imagegen"||!l.transparent||l.history.length!==3)throw Error("Invalid lineage");
  await bytes(l.measurement);await bytes(l.parentLineage);
  for(const [i,h] of l.history.entries()){
    await png(h.source);await bytes(h.prompt);await png(h.editTarget);for(const a of h.references)await png(a);
    if(h.mode!=="edit"||(i&&h.editTarget.sha256!==l.history[i-1].source.sha256))throw Error("Invalid edit chain");
    if(h.references[0].sha256!==measurement.outputs.outline8x.sha256||h.references[1].sha256!==l.inputs.referenceScene.sha256)throw Error("Wrong reference order");
  }
  if(l.history[0].editTarget.sha256!=="6186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16"||l.selected.sha256!==l.history.at(-1).source.sha256)throw Error("Incorrect attempt-04 parent / selected source");
  const spec=(await bytes(l.inputs.spec)).toString();
  if((await bytes(l.history[0].prompt)).toString().trim()!==spec.split("### ImageGen prompt（attempt-05，編修 attempt-04）")[1].split("```text")[1].split("```")[0].trim())throw Error("Prompt differs from spec");
  await bytes(l.inputs.raster);await png(l.inputs.phone);
  const parent=JSON.parse((await bytes(l.inputs.parent)).toString()),chest=JSON.parse((await bytes(l.inputs.chest)).toString());
  const previous=JSON.parse((await bytes(l.inputs.previous)).toString()),title=parent.frames["desktop-single"].title;
  const old=parent.scenes.desktop.layers.find(a=>a.id==="pressurePlate");
  if(JSON.stringify([old.x,old.y,old.width,old.height])!=="[850,339,67,14]"||JSON.stringify([title.x,title.y])!=="[376,100]")throw Error("Frozen placement changed");
  const {sprite,geometry}=fitPlate(await png(l.selected));
  const slope=measureSlopes(sprite,measurement.slope),negative=measureSlopes(await png(previous.outputs.sprite),measurement.slope);
  const rejected=[];for(const h of l.history.slice(0,-1))rejected.push({source:h.source,slopes:measureSlopes(fitPlate(await png(h.source)).sprite,measurement.slope)});
  if(!slope.passes||negative.passes||negative.left*negative.right>=0||rejected.some(c=>c.slopes.passes))throw Error("Slope contract failed");
  async function build(replacement){
    const out=await png(measurement.outputs.architecture);
    for(const layer of parent.scenes.desktop.layers){
      if(layer.id==="chest")over(out,await png(chest.frames.closed.sprite),92,230);
      else if(layer.id==="pressurePlate"&&replacement){
        const faded=nearest(replacement,96,18);for(let i=3;i<faded.data.length;i+=4)faded.data[i]=Math.round(faded.data[i]*0.85);over(out,faded,850,339);
      }else over(out,await png(layer),layer.x,layer.y);
    }
    over(out,await png(title),title.x,title.y);return out;
  }
  const baseline=await png(l.inputs.referenceScene);
  if(!baseline.data.equals((await build()).data))throw Error("Baseline reconstruction differs");
  const scene=await build(sprite);let changedPixels=0;
  for(let y=0;y<540;y++)for(let x=0;x<960;x++){
    const i=(y*960+x)*4;if(baseline.data.subarray(i,i+4).equals(scene.data.subarray(i,i+4)))continue;
    if(x<850||x>=946||y<339||y>=357)throw Error("Frozen exterior changed");changedPixels++;
  }
  const colour=measureColour(scene,measurement.slope),frontGap=measureFrontGap(sprite);
  if(colour.plate.s<0.58||colour.delta<0.02||colour.delta>0.08)throw Error("Colour contract failed: "+JSON.stringify(colour));
  if(frontGap.coverage<0.8)throw Error("Front groove contract failed");
  const writes=new Map(),outputs={};
  const save=(name,p)=>{const file=path.join(dir,"samples/pressure-plate-attempt-05",name+".png"),data=PNG.sync.write(p);writes.set(file,data);outputs[name]={path:relative(file),sha256:hash(data),width:p.width,height:p.height};};
  save("sprite",sprite);save("zoom",nearest(sprite,384,72));save("spriteGray",gray(sprite));save("zoomGray",nearest(gray(sprite),384,72));
  save("scene",scene);save("sceneGray",gray(scene));
  const crop={x:830,y:275,width:126,height:90};
  save("context",nearest(scene,126,90,crop));save("contextZoom",nearest(scene,504,360,crop));save("contextGray",gray(nearest(scene,504,360,crop)));
  save("attempt04Context",nearest(await png(previous.outputs.scene),504,360,crop));
  save("frontEdge",nearest(sprite,768,64,{x:0,y:10,width:96,height:8}));
  const overlay=nearest(sprite,96,18),guide=await png(measurement.outputs.outline);
  for(let i=0;i<guide.data.length;i+=4)if(guide.data[i+3])overlay.data.set([0,235,255,255],i);
  save("guideOverlay",nearest(overlay,768,144));
  // Show the actual fixed colour mask alongside the scene, not only its formula.
  const mask=nearest(scene,960,540);
  for(let y=343;y<=349;y++){const shift=Math.round((17-(y-339))*measurement.slope);for(let x=854+shift;x<926+shift;x++)mask.data.set([0,235,255,255],(y*960+x)*4);}
  save("colourMask",nearest(mask,504,88,{x:830,y:337,width:126,height:22}));
  const m={schema:"mimic-pressure-plate-attempt-05-review/v1",decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,stage:"C: appearance review; stop before A",lineage,measurement,
    inputs:{...l.inputs,source:l.selected,composer:await record(fileURLToPath(import.meta.url)),contracts:await record(path.join(dir,"pressure-plate-attempt-05-contracts.mjs")),preparer:await record(path.join(dir,"prepare-pressure-plate-attempt-05.mjs")),renderer:await record(path.join(dir,"render-pressure-plate-attempt-05.mjs"))},
    geometry:{origin:[850,339],canvas:[96,18],sceneOpacity:0.85,frontAnchorChange:[0,0],frontLongEdgeWidth:80,...geometry,crop},changedPixels,slopeContract:{candidate:slope,attempt04Negative:negative,rejected},
    colourContract:{method:"fixed-guide-sheared-interior-and-2px-envelope-ring/v1",mask:{localRowsInclusive:[4,10],localLeft:"4 + round((17-y)*stairSlope)",width:72,floorOuterRect:[848,337,100,22],floorExclusion:[850,339,96,18]},thresholds:{saturationMin:0.58,valueDelta:[0.02,0.08]},candidate:colour,attempt04WithSameMask:measureColour(await png(previous.outputs.scene),measurement.slope)},frontGap,outputs};
  const html=renderPressurePlateAttempt05(m,l,previous),reviewFile=path.join(dir,"pressure-plate-attempt-05-review.html");m.review={path:relative(reviewFile),sha256:hash(html)};
  writes.set(reviewFile,Buffer.from(html));writes.set(path.join(dir,"pressure-plate-attempt-05.manifest.json"),Buffer.from(JSON.stringify(m,null,2)+"\n"));
  for(const [file,data] of writes)try{if(!(await readFile(file)).equals(data))throw Error("Refusing changed existing output: "+file);}catch(e){if(e.code!=="ENOENT")throw e;}
  for(const [file,data] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,data);}return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=await composePressurePlateAttempt05();console.log(JSON.stringify({slope:m.slopeContract,colour:m.colourContract,frontGap:m.frontGap,geometry:m.geometry,changedPixels:m.changedPixels}));}
