import {createHash} from "node:crypto";
import {readFile,writeFile} from "node:fs/promises";
import {existsSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,it} from "vitest";
const root=path.resolve(process.cwd(),".."),prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",review=path.join(root,prefix);
type Asset={path:string;sha256:string;width:number;height:number};
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
async function load(){
  const file=path.join(review,"landing-title-placement.manifest.json");
  expect(existsSync(file),"Applied placement manifest required").toBe(true);
  return JSON.parse(await readFile(file,"utf8"));
}
async function parent(){return JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));}
async function png(a:Asset){
  const bytes=await readFile(path.join(root,a.path));expect(hash(bytes)).toBe(a.sha256);
  const p=PNG.sync.read(bytes);expect([p.width,p.height]).toEqual([a.width,a.height]);return p;
}
async function module(){
  expect(existsSync(path.join(review,"compose-landing-title-placement.mjs")),"Placement compositor module required").toBe(true);
  return await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-landing-title-placement.mjs") as {
    validateReceipt:(r:unknown,id:string,parent:Record<string,unknown>)=>{x:number;y:number};
    composePlacement:()=>Promise<unknown>;
  };
}
const positions={"desktop-single":{x:376,y:100},"phone-staggered":{x:130,y:59}};
it("applies exactly the two user receipts without promoting assets or changing the parent",async()=>{
  const m=await load(),old=await parent();
  expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false});
  expect(m.scenes).toEqual(old.scenes);expect(m.sources).toEqual(old.sources);expect(m.references).toEqual(old.references);
  expect(m.wordmarkTone).toEqual(old.wordmarkTone);expect(m.wordmarks).toEqual(old.wordmarks);expect(m.lineage).toEqual(old.lineage);
  expect(m.frames["desktop-staggered"]).toEqual(old.frames["desktop-staggered"]);
  expect(m.placement.authorization).toBe("position-application-only");
  for(const [id,position] of Object.entries(positions)){
    expect(m.frames[id].title).toEqual({...old.frames[id].title,...position});
    expect(m.frames[id].wall).toEqual([position.x,position.y,old.frames[id].title.width,old.frames[id].title.height]);
  }
  for(const a of [m.placement.parent,m.placement.receipts,m.placement.generator,m.placement.review])expect(hash(await readFile(path.join(root,a.path)))).toBe(a.sha256);
  expect(hash(await readFile(path.join(review,"landing-a-title.manifest.json")))).toBe("ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7");
  expect(hash(await readFile(path.join(review,"landing-a-title-review.html")))).toBe("9f984049ef16e8c08c6e2bedc890c70e13c62c9d5793926a3ed79aec1ae1ca33");
});
it("logical pixels equal untouched base plus the same transparent title at the chosen position",async()=>{
  const m=await load();
  for(const [id,{x,y}] of Object.entries(positions)){
    const f=m.frames[id],base=await png(m.scenes[f.view].logical),sprite=await png(f.title),actual=await png(f.logical);
    const rebuilt=Buffer.from(base.data);let dirty=0,partial=0,transparent=0;
    for(let i=0;i<sprite.data.length;i+=4){
      if(!sprite.data[i+3]){transparent++;if(sprite.data[i]||sprite.data[i+1]||sprite.data[i+2])dirty++;}
      if(sprite.data[i+3]!==0&&sprite.data[i+3]!==255)partial++;
    }
    expect(transparent).toBeGreaterThan(0);expect(dirty).toBe(0);expect(partial).toBe(0);
    for(let sy=0;sy<sprite.height;sy++)for(let sx=0;sx<sprite.width;sx++){
      const si=(sy*sprite.width+sx)*4,di=((y+sy)*base.width+x+sx)*4,a=sprite.data[si+3]/255;
      if(!a)continue;
      for(let c=0;c<3;c++)rebuilt[di+c]=Math.round(sprite.data[si+c]*a+rebuilt[di+c]*(1-a));
      rebuilt[di+3]=255;
    }
    expect(actual.data.equals(rebuilt)).toBe(true);
  }
});
it("six actual exports have exact sizes, nearest-neighbor scale, genuine gray and hashes",async()=>{
  const m=await load();
  for(const id of Object.keys(positions)){
    const f=m.frames[id],logical=await png(f.logical),color=await png(f.color),gray=await png(f.gray),scale=f.view==="desktop"?2:1;
    expect([color.width,color.height]).toEqual(f.view==="desktop"?[1920,1080]:[390,600]);
    expect([gray.width,gray.height]).toEqual([color.width,color.height]);
    let wrong=0;
    for(let y=0;y<color.height;y++)for(let x=0;x<color.width;x++){
      const i=(y*color.width+x)*4,j=(Math.floor(y/scale)*logical.width+Math.floor(x/scale))*4;
      if(!color.data.subarray(i,i+4).equals(logical.data.subarray(j,j+4)))wrong++;
      const v=Math.round((2126*color.data[i]+7152*color.data[i+1]+722*color.data[i+2])/10000);
      if(gray.data[i]!==v||gray.data[i+1]!==v||gray.data[i+2]!==v||gray.data[i+3]!==color.data[i+3])wrong++;
    }
    expect(wrong).toBe(0);
    expect(f.logical.path).toContain("/samples/landing-title-placement-v01/");
  }
});
it("validates full receipt identity, units, dimensions, bounds and center before writing",async()=>{
  const m=await parent(),receipts=JSON.parse(await readFile(path.join(review,"landing-title-placement.receipts.json"),"utf8"));
  const {validateReceipt}=await module();
  for(const [id,position] of Object.entries(positions))expect(validateReceipt(receipts.positions[id],id,m)).toEqual(position);
  const r=receipts.positions["phone-staggered"];
  for(const bad of [
    {...r,frame:{...r.frame,id:"desktop-single"}},{...r,frame:{...r.frame,width:960}},
    {...r,title:{...r.title,x:243}},{...r,title:{...r.title,y:-1}},{...r,title:{...r.title,x:NaN}},
    {...r,title:{...r.title,width:149}},{...r,centerPercent:{x:52.31,y:19}},
    {...r,scene:{...r.scene,sha256:"0".repeat(64)}},{...r,title:{...r.title,path:"reference/unknown.png"}},
    {...r,unit:"viewport-px"},{...r,runtimePromotion:true},
  ])expect(()=>validateReceipt(bad,"phone-staggered",m)).toThrow();
  expect(()=>validateReceipt(r,"desktop-staggered",m)).toThrow();
});
it("refuses to overwrite a modified task artifact and leaves it intact until test restoration",async()=>{
  const m=await load(),target=path.join(root,m.frames["phone-staggered"].color.path);
  const original=await readFile(target),tampered=Buffer.concat([original,Buffer.from([0])]);
  const {composePlacement}=await module();
  try{
    await writeFile(target,tampered);
    await expect(composePlacement()).rejects.toThrow("Existing placement artifact modified");
    expect((await readFile(target)).equals(tampered)).toBe(true);
  }finally{await writeFile(target,original);}
  expect(hash(await readFile(target))).toBe(m.frames["phone-staggered"].color.sha256);
});
