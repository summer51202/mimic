import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdir, readFile, writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds, nearest} from "./landing-chest-raster.mjs";
import {prepareRestoredFamily, inLatch} from "./restored-chest.raster.mjs";
import {renderPropPositionTool} from "./render-landing-prop-position-tool.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(dir, "../../../../..");
const {PNG} = createRequire(path.join(repo, "web/package.json"))("pngjs");
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const relative = file => path.relative(repo, file).replaceAll("\\", "/");
const readJson = async name => JSON.parse(await readFile(path.join(dir, name + ".manifest.json"), "utf8"));
const output = path.join(dir, "samples/landing-phone-exploration");
await mkdir(output, {recursive:true});

async function raster(asset) {
  const bytes = await readFile(path.join(repo, asset.path));
  assert.equal(hash(bytes), asset.sha256, asset.path);
  const png = PNG.sync.read(bytes);
  assert.deepEqual([png.width, png.height], [asset.width, asset.height]);
  return png;
}
async function save(name, png) {
  const file = path.join(output, name + ".png");
  const bytes = PNG.sync.write(png);
  await writeFile(file, bytes);
  return {path:relative(file), sha256:hash(bytes), width:png.width, height:png.height};
}

const prior = await readJson("landing-prop-position");
const applied = (await readJson("landing-prop-placement-application")).scenes.phone;
assert.equal(applied.architecture.sha256, prior.frames.phone.scene.sha256);
const center = await raster(applied.architecture);
const derivations = path.join(dir, "samples/derivations/landing-phone-exploration");
const attemptFile = path.join(derivations, "attempt-01.png");
const attemptBytes = await readFile(attemptFile);
const attempt = PNG.sync.read(attemptBytes);
const strip = new PNG({width:1170, height:600});
// Register each side and taper its color correction away from the join.
// The approved center is copied verbatim.
const crops = [{x:0,y:0,width:575,height:898},{x:1180,y:0,width:571,height:898}];
const transition = 18;
const sides = crops.map(crop => nearest(attempt,390,600,crop));
for (let y=0; y<600; y++) {
  for (const [side, generated] of sides.entries()) {
    for (let x=0; x<390; x++) {
      const distance = side===0 ? 389-x : x;
      const centerEdge = side===0 ? 0 : 389;
      const generatedEdge = side===0 ? 389 : 0;
      const weight = Math.min(1,distance/transition);
      const mix = weight*weight*(3-2*weight);
      const edgeShift = Math.sin(Math.PI*y/600)*(side===0?18:10);
      const sourceRow = Math.min(599,Math.round(y+Math.max(0,1-distance/100)*edgeShift));
      const edgeRow = Math.min(599,Math.round(y+edgeShift));
      const src = (sourceRow*390+x)*4;
      const edge = (edgeRow*390+generatedEdge)*4;
      const approved = (y*390+centerEdge)*4;
      const dst = (y*1170+x+side*780)*4;
      for (let c=0;c<3;c++) {
        const value = generated.data[src+c]+(center.data[approved+c]-generated.data[edge+c])*(1-mix);
        strip.data[dst+c]=Math.max(0,Math.min(255,Math.round(value)));
      }
      strip.data[dst+3]=255;
    }
  }
  center.data.copy(strip.data,(y*1170+390)*4,y*390*4,(y+1)*390*4);
}
assert.ok(nearest(strip,390,600,{x:390,y:0,width:390,height:600}).data.equals(center.data));
const scene = await save("phone-architecture", strip);

const v04 = await readJson("ancient-treasure-chest-v04");
const atlas = await raster(v04.inputs.source);
const {sprites: referenceSprites, registration} = prepareRestoredFamily(atlas, v04.config.sourceGrid);
assert.deepEqual(registration.rawAnchor, v04.registration.rawAnchor);
assert.equal(registration.scale, v04.registration.scale);
const variants = {};
const factor = 66/bounds(referenceSprites[0]).height;
const [anchorX,anchorY] = registration.rawAnchor;
const sprites = registration.cells.map(cell=>{
  const sprite = new PNG({width:110,height:126});
  for (let y=0;y<126;y++) for (let x=0;x<110;x++) {
    const sx=Math.floor(anchorX+(x-55)/(registration.scale*factor));
    const sy=Math.floor(anchorY+(y-126)/(registration.scale*factor));
    if (sx<0||sy<0||sx>=cell.width||sy>=cell.height) continue;
    const src=((cell.y+sy)*atlas.width+cell.x+sx)*4;
    if (atlas.data[src+3]<200) continue;
    const dst=(y*110+x)*4;
    sprite.data.set(atlas.data.subarray(src,src+3),dst);
    sprite.data[dst+3]=255;
  }
  return sprite;
});
const originalX=x=>52+(x-55)/factor;
const originalY=y=>120+(y-126)/factor;
let lidBounds;
for (const [index, sprite] of sprites.entries()) {
  for (let y=0;y<126;y++) for (let x=0;x<110;x++) {
    const offset=(y*110+x)*4;
    const lx=originalX(x), ly=originalY(y);
    if (index>0 && (index<3||ly>=90) && !inLatch(lx,ly)) {
      sprite.data.set(sprites[0].data.subarray(offset,offset+4),offset);
    }
  }
}
for (const [index, id] of v04.config.frames.entries()) {
  const sprite=sprites[index];
  for (let y=0;y<126;y++) for (let x=0;x<110;x++) {
    const offset=(y*110+x)*4;
    const lx=originalX(x), ly=originalY(y);
    if (index>0 && ly>=90 && ly<103 && lx>=59 && lx<69) {
      sprite.data.set(sprites[2].data.subarray(offset,offset+4),offset);
    }
  }
  const box = bounds(sprite);
  assert.equal(box.y+box.height,126);
  assert.ok(box.x>0 && box.x+box.width<110 && box.y>0);
  variants[id] = {...await save("chest-"+id,sprite),bounds:box};
  if (id==="open") lidBounds=bounds(nearest(sprite,110,94,{x:0,y:0,width:110,height:94}));
}
assert.equal(new Set(Object.values(variants).map(a=>a.sha256)).size,8);
assert.ok(Math.abs(variants.closed.bounds.height-66)<=1);

const shift = layer => ({...layer,x:layer.x+390});
const {crate} = applied;
const oldPhone = prior.frames.phone;
const bats = applied.fixed.find(layer=>layer.id==="bats");
await raster(bats);
const torch = prior.frames.desktop.fixed.find(layer=>layer.id==="torchHigh");
const torchRaster = await raster(torch);
const actorScale = applied.fixed.find(layer=>layer.id==="warrior").height /
  prior.frames.desktop.fixed.find(layer=>layer.id==="warrior").height;
const phoneTorch = nearest(torchRaster,Math.round(torch.width*actorScale),Math.round(torch.height*actorScale));
const torchAsset = {...await save("torch",phoneTorch),bounds:bounds(phoneTorch)};
function prop(id,label,x,y,asset) {
  return {id,label,x,y,anchor:"top-left",offset:{x:0,y:0},width:asset.width,height:asset.height,opacity:1,variant:"default",variants:{default:asset}};
}
const phone = {
  frame:{id:"phone",width:1170,height:600,viewportWidth:390,initialViewportX:390},
  scene,
  fixed:[...applied.fixed.map(shift),shift({...crate.sprite,id:"mapCrate",x:crate.x,y:crate.y,depth:crate.ground.y})],
  objects:[
    {id:"chest",label:"手機寶箱 v04",anchor:"ground",x:200,y:402,offset:{x:55,y:126},width:110,height:126,opacity:1,variant:"closed",variants,lidBounds},
    prop("torch","探索火把",295,145,torchAsset),
    prop("explorationBats","探索蝙蝠",960,100,{...bats,bounds:{x:0,y:0,width:bats.width,height:bats.height}}),
  ],
  signLabel:shift(oldPhone.signLabel),
  guidance:{...oldPhone.guidance,floor:{...oldPhone.guidance.floor,width:1170},
    dialogue:{...oldPhone.guidance.dialogue,width:1170},
    forbidden:[...oldPhone.guidance.forbidden.map(shift),shift({id:"mapCrate",x:crate.x,y:crate.y,width:crate.sprite.width,height:crate.sprite.height})]},
};
const manifest = {
  schema:"mimic-landing-prop-position-tool/v1",reviewOnly:true,runtimePromotion:false,
  decision:"awaiting-user-position-json",positionsApplied:false,
  lineage:{generator:"ImageGen",references:[applied.architecture,prior.frames.desktop.scene],
    attempts:[{path:relative(attemptFile),sha256:hash(attemptBytes),width:attempt.width,height:attempt.height}],
    prompt:relative(path.join(derivations,"prompt.md")),crops,transition,centerX:390,centerChangedPixels:0,
    chestSource:v04.inputs.source,registration:registration.rawAnchor,chestScale:registration.scale*factor},
  frames:{desktop:prior.frames.desktop,phone},
};
const review = Buffer.from(renderPropPositionTool(manifest));
const reviewFile = path.join(dir,"landing-prop-position-exploration-review.html");
manifest.review={path:relative(reviewFile),sha256:hash(review)};
await writeFile(reviewFile,review);
await writeFile(path.join(dir,"landing-prop-position-exploration.manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await writeFile(path.join(output,"layout.json"),JSON.stringify({initialViewportX:390,viewportWidth:390,
  width:1170,height:600,fixed:phone.fixed,signLabel:phone.signLabel},null,2)+"\n");
console.log(JSON.stringify({centerChangedPixels:0,chestFrames:Object.keys(variants),closedHeight:variants.closed.bounds.height}));
