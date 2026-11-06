import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {bounds,nearest,over} from "./landing-chest-raster.mjs";
import {prepareRestoredFamily,inLatch} from "./restored-chest.raster.mjs";
import {createPropPositionModel} from "./landing-prop-position.model.mjs";
import {renderReview} from "./render-landing-prop-placement-application.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const relative=f=>path.relative(repo,f).replaceAll("\\","/");
const prefix="landing-prop-placement-application";
const writes=new Map();

async function json(name,sha256){
  const bytes=await readFile(path.join(dir,name+".json"));
  if(sha256) assert.equal(hash(bytes),sha256,name);
  return JSON.parse(bytes);
}
async function png(asset){
  const file=path.resolve(repo,asset.path);
  assert.ok(file.startsWith(dir+path.sep),asset.path);
  const bytes=await readFile(file);
  assert.equal(hash(bytes),asset.sha256,asset.path);
  const raster=PNG.sync.read(bytes);
  assert.deepEqual([raster.width,raster.height],[asset.width,asset.height],asset.path);
  return raster;
}
function save(name,raster){
  const file=path.join(dir,"samples",prefix,name+".png"),bytes=PNG.sync.write(raster);
  writes.set(file,bytes);
  return {path:relative(file),sha256:hash(bytes),width:raster.width,height:raster.height,bounds:bounds(raster)};
}

// The v04 registration computes one source anchor and scale for the entire lattice.
// Evaluate that transform at the target resolution, then repeat the v04 pixel reuse.
function sampleChest(atlas,registration,factor){
  const {cells,rawAnchor:[ax,ay],scale}=registration;
  const width=104*factor,height=120*factor;
  const sprites=cells.map(cell=>{
    const out=new PNG({width,height});
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const sx=Math.floor(ax+(x-52*factor)/(scale*factor));
      const sy=Math.floor(ay+(y-height)/(scale*factor));
      if(sx<0||sy<0||sx>=cell.width||sy>=cell.height) continue;
      const si=((cell.y+sy)*atlas.width+cell.x+sx)*4,di=(y*width+x)*4;
      if(atlas.data[si+3]<200) continue;
      out.data.set(atlas.data.subarray(si,si+3),di);
      out.data[di+3]=255;
    }
    return out;
  });
  for(const [index,sprite] of sprites.entries()){
    if(!index) continue;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const lx=x/factor,ly=y/factor,i=(y*width+x)*4;
      if((index<3||ly>=90)&&!inLatch(lx,ly)){
        sprite.data.set(sprites[0].data.subarray(i,i+4),i);
      }
    }
  }
  for(const sprite of sprites.slice(1)) for(let y=90*factor;y<103*factor;y++) for(let x=Math.ceil(59*factor);x<69*factor;x++){
    const i=(y*width+x)*4;
    sprite.data.set(sprites[2].data.subarray(i,i+4),i);
  }
  return sprites;
}

const receiptHashes={
  desktop:"620802128cd32afbd0654a146bf50c098275e08264512f6c169bde3ca4ddea6d",
  phone:"0ae862073aee3ac9bac5d75a3f0857b40b27609d9d55e8dc1499b3c4d3de845e",
};
const tool=await json("landing-prop-position.manifest");
const receipts={};
for(const [view,sha256] of Object.entries(receiptHashes)){
  const receipt=await json("samples/derivations/landing-prop-placement-receipts/"+view+"-receipt",sha256);
  const model=createPropPositionModel(tool.frames[view]);
  const state=Object.fromEntries(receipt.objects.map(({id,x,y,variant})=>[id,{x,y,variant}]));
  assert.deepEqual(receipt,model.payload(state));
  await Promise.all([receipt.scene,...receipt.fixed,...receipt.objects.flatMap(o=>[o.source,...Object.values(o.variants)])].map(png));
  receipts[view]=receipt;
}

const v04=await json("ancient-treasure-chest-v04.manifest","10125e1224a4f2ff24f92ca764e6a627ecf716c0370546422fd9d914a117061a");
const {source}=v04.inputs;
const chestOld=receipts.desktop.objects.find(o=>o.id==="chest");
const atlas=await png(source),registration=prepareRestoredFamily(atlas,v04.config.sourceGrid).registration;
for(const key of ["cells","rawAnchor","scale"]) assert.deepEqual(registration[key],v04.registration[key]);
const frameIds=v04.config.frames;
const reference=sampleChest(atlas,registration,1);
for(const [i,id] of frameIds.entries()){
  assert.ok(reference[i].data.equals((await png(chestOld.variants[id])).data),"v04 raster parity: "+id);
}

const sprites=sampleChest(atlas,registration,1.5);
assert.equal(new Set(sprites.map(p=>hash(p.data))).size,8);
const boxes=sprites.map(bounds),tops=boxes.map(b=>b.y),closedHeight=boxes[0].height;
assert.ok(Math.abs(closedHeight-93)<=1);
assert.ok(boxes.every(b=>b.y+b.height===180&&b.x>0&&b.x+b.width<156));
const steps=tops.slice(3,7).map((top,i)=>top-tops[i+4]),travel=tops[3]-tops[7];
assert.ok(travel>0&&steps.every(step=>step>=0&&step<=travel*.4));
assert.ok(steps.slice(0,2).every(step=>step>=3*1.5/2));
assert.ok(tops[2]-tops[3]>=0&&tops[2]-tops[3]<=travel*.25);
const chestOrigin={x:chestOld.ground.x-78,y:chestOld.ground.y-180};
assert.deepEqual(chestOrigin,{x:216,y:160});
const title=receipts.desktop.fixed.find(l=>l.id==="wordmark");
assert.ok(chestOrigin.y+tops[7]>=title.y+title.height);
assert.ok(Math.abs(chestOrigin.y+tops[7]-218)<=2);

const {sources:{mapCrate:crateSource}}=await json("landing-warm-rest.manifest");
assert.equal(crateSource.sha256,"d05d03c0dfeb2b449ef4e78140ff50a44a02cf9acefed9eb3b47a09f613cb993");
const crateRaw=await png(crateSource),crop=bounds(crateRaw);
const desktopCrateHeight=Math.round(closedHeight/2);
const desktopCrate=receipts.desktop.objects.find(o=>o.id==="mapCrate");
const crateScale=desktopCrateHeight/desktopCrate.height;
const scenes={},chestFrames={};
for(const [view,receipt] of Object.entries(receipts)){
  const oldCrate=receipt.objects.find(o=>o.id==="mapCrate");
  const height=Math.round(oldCrate.height*crateScale);
  // Odd widths retain the half-pixel ground center on the integer raster.
  const width=2*Math.round((height*crop.width/crop.height-1)/2)+1;
  assert.ok(nearest(crateRaw,oldCrate.width,oldCrate.height,crop,true).data.equals((await png(oldCrate.source)).data),"Wood crate raster parity");
  const crate=nearest(crateRaw,width,height,crop,true),visible=bounds(crate);
  assert.deepEqual(visible,{x:0,y:0,width,height});
  if(view==="desktop") assert.ok(Math.abs(visible.height-closedHeight/2)<=1);
  assert.ok(Math.abs((visible.height/oldCrate.height)/crateScale-1)<=.02);
  assert.ok(Math.abs((visible.width/oldCrate.width)/crateScale-1)<=.02);
  const crateLayer={id:"mapCrate",x:oldCrate.ground.x-width/2,y:oldCrate.ground.y-height,depth:oldCrate.ground.y,raster:crate};
  const backdrop=await png(receipt.scene);
  const fixed=await Promise.all(receipt.fixed.map(async l=>({...l,raster:await png(l)})));
  const layers=[...fixed,crateLayer];
  const order=(a,b)=>a.depth-b.depth||a.id.localeCompare(b.id);
  function compose(extra){
    const stack=extra?[...layers,extra]:[...layers];
    stack.sort(order);
    assert.deepEqual(stack.map(l=>l.id),receipt.layerOrder.filter(id=>id!=="pressurePlate"&&(extra||id!=="chest")));
    const canvas=new PNG({width:backdrop.width,height:backdrop.height});
    backdrop.data.copy(canvas.data);
    for(const l of stack) over(canvas,l.raster,l.x,l.y);
    return canvas;
  }
  const withoutChest=compose();
  if(view==="desktop") for(const [i,id] of frameIds.entries()){
    const raster=sprites[i],composite=compose({id:"chest",...chestOrigin,depth:chestOld.ground.y,raster});
    let changes=0;
    for(let y=0;y<composite.height;y++) for(let x=0;x<composite.width;x++){
      const p=(y*composite.width+x)*4;
      if(composite.data.readUInt32LE(p)===withoutChest.data.readUInt32LE(p)) continue;
      assert.ok(x>=chestOrigin.x&&x<chestOrigin.x+156&&y>=chestOrigin.y&&y<chestOrigin.y+180);
      changes++;
    }
    assert.ok(changes>0);
    chestFrames[id]={old:chestOld.variants[id],sprite:save("chest-"+id,raster),scene:save("desktop-"+id,composite),changes};
  }
  scenes[view]={fixed:receipt.fixed,architecture:receipt.scene,frame:receipt.frame,guidance:receipt.guidance,
    order:receipt.layerOrder.filter(id=>id!=="pressurePlate"),
    crate:{old:oldCrate.source,sprite:save(view+"-crate",crate),x:crateLayer.x,y:crateLayer.y,ground:oldCrate.ground,warnings:oldCrate.warnings},
    ...(view==="phone"?{scene:save("phone",withoutChest)}:{})};
}
const manifest={decision:"awaiting-scene-visual-review",reviewOnly:true,runtimePromotion:false,
  receiptHashes,source,crateSource,crop,crateScale,chestOrigin,closedHeight,tops,steps,scenes,chestFrames};
const html=Buffer.from(renderReview(manifest,asset=>path.relative(dir,path.resolve(repo,asset.path)).replaceAll("\\","/")));
writes.set(path.join(dir,prefix+"-review.html"),html);
writes.set(path.join(dir,prefix+".manifest.json"),Buffer.from(JSON.stringify({...manifest,reviewHash:hash(html)},null,2)+"\n"));
for(const [file,bytes] of writes){
  if(process.argv.includes("--check")) assert.ok((await readFile(file)).equals(bytes),"Rebuild differs: "+file);
  else {await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}
}
console.log(JSON.stringify({closedHeight,tops,steps,outputs:writes.size,byteIdentical:process.argv.includes("--check")}));
