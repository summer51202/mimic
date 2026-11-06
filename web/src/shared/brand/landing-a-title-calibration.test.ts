import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";

const root = path.resolve(process.cwd(), "..");
const prefix = "docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const review = path.join(root, prefix);
type FileAsset = { path: string; sha256: string };
type Asset = FileAsset & { width: number; height: number };
type Layer = Asset & { id: string; x: number; y: number };
type Scene = { logical: Asset; layers: Layer[]; visitor: number[] };
type Frame = { view: "desktop" | "phone"; logical: Asset; color: Asset; gray: Asset; title: Layer; wall: number[] };
type Manifest = {
  decision: string; reviewOnly: boolean; runtimePromotion: boolean; baseVariant: string;
  base: FileAsset; sources: Record<string, Asset>; scenes: Record<string, Scene>;
  frames: Record<string, Frame>; wordmarkTone: { brightness: number; saturation: number };
  wordmarks: Record<string, { source: Asset; master: Asset; lines: string[] }>;
  lineage: { record: FileAsset; parent: Asset; prompt: FileAsset; generator: string; transparent: boolean };
};
const digest = (b: Buffer) => createHash("sha256").update(b).digest("hex");
async function bytes(a: FileAsset) {
  const b = await readFile(path.join(root, a.path)); expect(digest(b)).toBe(a.sha256); return b;
}
async function png(a: Asset) {
  const p = PNG.sync.read(await bytes(a)); expect([p.width,p.height]).toEqual([a.width,a.height]); return p;
}
async function load() {
  const file = path.join(review,"landing-a-title.manifest.json");
  expect(existsSync(file),"new title manifest is required").toBe(true);
  return JSON.parse(await readFile(file,"utf8")) as Manifest;
}
function overlay(canvas: PNG, sprite: PNG, x: number, y: number) {
  for (let sy=0;sy<sprite.height;sy++) for (let sx=0;sx<sprite.width;sx++) {
    const si=(sy*sprite.width+sx)*4, di=((y+sy)*canvas.width+x+sx)*4, a=sprite.data[si+3]/255;
    if (!a) continue;
    for (let c=0;c<3;c++) canvas.data[di+c]=Math.round(sprite.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
function countOverlap(a: Layer, ap: PNG, b: Layer, bp: PNG) {
  let n=0;
  for (let y=0;y<ap.height;y++) for (let x=0;x<ap.width;x++) {
    const bx=a.x+x-b.x,by=a.y+y-b.y;
    if (bx>=0&&by>=0&&bx<bp.width&&by<bp.height&&ap.data[(y*ap.width+x)*4+3]&&bp.data[(by*bp.width+bx)*4+3]) n++;
  }
  return n;
}

it("keeps A unchanged except mage removal, with genuine ImageGen title lineage", async () => {
  const m=await load();
  expect(m).toMatchObject({ decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,baseVariant:"A" });
  expect(Object.keys(m.frames)).toEqual(["desktop-single","desktop-staggered","phone-staggered"]);
  const old=JSON.parse((await bytes(m.base)).toString());
  for (const [id,a] of Object.entries(m.sources)) { expect(id).not.toBe("mage"); expect(a).toEqual(old.sources[id]); await png(a); }
  expect(Object.keys(m.sources).sort()).toEqual(Object.keys(old.sources).filter(id=>id!=="mage").sort());
  for (const view of ["desktop","phone"]) {
    expect(m.scenes[view].layers).toEqual(old.frames["A-"+view].layers.filter((l:Layer)=>l.id!=="mage"));
    expect(m.scenes[view].visitor).toEqual(old.frames["A-"+view].visitor);
    for (const layer of m.scenes[view].layers) await png(layer);
  }
  expect(m.wordmarks.single.source.sha256).toBe("5a1cfc2a7d96c15a467c8fa2f3c869d23a3811a096edd121a76a9f952b59760c");
  expect(m.wordmarkTone).toEqual(old.wordmarkTone);
  expect(m.wordmarks.single.lines).toEqual(["MIMIC"]); expect(m.wordmarks.staggered.lines).toEqual(["MI","MIC"]);
  expect(m.lineage).toMatchObject({generator:"imagegen",transparent:true});
  const entry=JSON.parse((await bytes(m.lineage.record)).toString());
  expect(entry.inputs).toHaveLength(2);
  expect(entry.inputs[0]).toEqual({role:"identity/edit-target",path:m.lineage.parent.path,sha256:m.lineage.parent.sha256});
  expect(entry.inputs[1]).toMatchObject({role:"layout-only-reference",path:prefix+"samples/derivations/landing-a-title/wordmark-staggered-v01-source.png"});
  for(const input of entry.inputs)await bytes(input);
  expect(entry.path).toBe(m.wordmarks.staggered.source.path); expect(entry.parentPath).toBe(m.lineage.parent.path);
  expect(entry.promptPath).toBe(m.lineage.prompt.path); expect(m.lineage.parent).toEqual(m.wordmarks.single.source);
  await bytes(m.lineage.prompt); await png(m.lineage.parent);
  const raw=await png(m.wordmarks.staggered.source);
  // ImageGen keeps near-opaque source alpha (254); never rewrite the original bytes.
  let zero=0,nearOpaque=0;
  for(let i=3;i<raw.data.length;i+=4){if(!raw.data[i])zero++;if(raw.data[i]>=200)nearOpaque++;}
  expect(zero).toBeGreaterThan(0);expect(nearOpaque).toBeGreaterThan(0);
});

it("reconstructs the original architecture and every retained layer without mage", async () => {
  const m=await load();
  for (const view of ["desktop","phone"]) {
    const scene=m.scenes[view], actual=await png(scene.logical);
    expect([actual.width,actual.height]).toEqual(view==="desktop"?[960,540]:[390,600]);
    const a=await png(m.sources[view==="desktop"?"architectureDesktop":"architecturePhone"]);
    const ratio=actual.width/actual.height;
    const cw=a.width/a.height>ratio?Math.round(a.height*ratio):a.width;
    const ch=a.width/a.height>ratio?a.height:Math.round(a.width/ratio);
    const ox=Math.floor((a.width-cw)/2),oy=Math.floor((a.height-ch)/2);
    const rebuilt=new PNG({width:actual.width,height:actual.height});
    for(let y=0;y<actual.height;y++)for(let x=0;x<actual.width;x++){
      const sx=ox+Math.min(cw-1,Math.floor(x*cw/actual.width)),sy=oy+Math.min(ch-1,Math.floor(y*ch/actual.height));
      const i=(y*actual.width+x)*4,j=(sy*a.width+sx)*4;
      rebuilt.data.set(a.data.subarray(j,j+3),i);rebuilt.data[i+3]=255;
    }
    for(const layer of scene.layers)overlay(rebuilt,await png(layer),layer.x,layer.y);
    expect(actual.data.equals(rebuilt.data)).toBe(true);
    expect(scene.layers.find(l=>l.id==="mapCrate")!.width).toBe(view==="desktop"?113:79);
  }
});

it("adds only a clean title inside the wall, never touching physical objects or visitor ground", async () => {
  const m=await load();
  for(const frame of Object.values(m.frames)){
    const scene=m.scenes[frame.view],base=await png(scene.logical),title=await png(frame.title),actual=await png(frame.logical);
    const [wx,wy,ww,wh]=frame.wall;
    expect(frame.title.x).toBeGreaterThanOrEqual(wx);expect(frame.title.y).toBeGreaterThanOrEqual(wy);
    expect(frame.title.x+title.width).toBeLessThanOrEqual(wx+ww);expect(frame.title.y+title.height).toBeLessThanOrEqual(wy+wh);
    for(const l of scene.layers.filter(l=>l.id!=="groundLight"))expect(countOverlap(frame.title,title,l,await png(l))).toBe(0);
    const [vx,vy,vw,vh]=scene.visitor;
    expect(frame.title.x+title.width<=vx||frame.title.x>=vx+vw||frame.title.y+title.height<=vy||frame.title.y>=vy+vh).toBe(true);
    const rebuilt=new PNG({width:base.width,height:base.height});rebuilt.data.set(base.data);overlay(rebuilt,title,frame.title.x,frame.title.y);
    expect(rebuilt.data.equals(actual.data)).toBe(true);
  }
  for(const a of [...Object.values(m.wordmarks).map(w=>w.master),...Object.values(m.frames).map(f=>f.title)]){
    const p=await png(a);let dirty=0,transparent=0,partial=0;
    for(let i=0;i<p.data.length;i+=4)if(!p.data[i+3]){transparent++;if(p.data[i]||p.data[i+1]||p.data[i+2])dirty++;}
    for(let i=3;i<p.data.length;i+=4)if(p.data[i]!==0&&p.data[i]!==255)partial++;
    expect(transparent).toBeGreaterThan(0);expect(dirty).toBe(0);expect(partial).toBe(0);
  }
});

it("exports real logical, exact 2x color and genuine grayscale with all hashes checked", async () => {
  const m=await load();
  for(const frame of Object.values(m.frames)){
    const logical=await png(frame.logical),color=await png(frame.color),gray=await png(frame.gray),scale=frame.view==="desktop"?2:1;
    expect([color.width,color.height]).toEqual(frame.view==="desktop"?[1920,1080]:[390,600]);
    expect([gray.width,gray.height]).toEqual([color.width,color.height]);
    let wrong=0,notGray=0,alpha=0,wrongLuma=0;
    for(let y=0;y<color.height;y++)for(let x=0;x<color.width;x++){
      const i=(y*color.width+x)*4,j=(Math.floor(y/scale)*logical.width+Math.floor(x/scale))*4;
      if(!color.data.subarray(i,i+4).equals(logical.data.subarray(j,j+4)))wrong++;
      if(gray.data[i]!==gray.data[i+1]||gray.data[i]!==gray.data[i+2])notGray++;
      const luma=Math.round((2126*color.data[i]+7152*color.data[i+1]+722*color.data[i+2])/10000);
      if(gray.data[i]!==luma)wrongLuma++;
      if(gray.data[i+3]!==color.data[i+3])alpha++;
    }
    expect(wrong).toBe(0);expect(notGray).toBe(0);expect(alpha).toBe(0);expect(wrongLuma).toBe(0);
  }
});
