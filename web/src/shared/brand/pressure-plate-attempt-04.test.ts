import {readFile} from "node:fs/promises";
import path from "node:path";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
const root=path.resolve(process.cwd(),".."),dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const png=async(p:string)=>PNG.sync.read(await readFile(path.join(root,dir,p)));
// Freeze scene coordinates before composing the revision: inner slabs exclude the
// raised rim; the 2px floor ring excludes the entire 80x18 prop envelope.
function measure(p:PNG){
  let s=0,v=0,n=0,fs=0,fv=0,fn=0;
  for(let y=337;y<359;y++)for(let x=848;x<932;x++){
    const inside=x>=854&&x<926&&y>=342&&y<351;
    const floor=!(x>=850&&x<930&&y>=339&&y<357);
    if(!inside&&!floor)continue;
    const i=(y*p.width+x)*4,max=Math.max(...p.data.subarray(i,i+3)),min=Math.min(...p.data.subarray(i,i+3));
    const sat=max?(max-min)/max:0,val=max/255;
    if(inside){s+=sat;v+=val;n++;}else{fs+=sat;fv+=val;fn++;}
  }
  return {plate:{s:s/n,v:v/n,n},floor:{s:fs/fn,v:fv/fn,n:fn},delta:v/n-fv/fn};
}
describe("pressure plate attempt-04 colour contract",()=>{
  it("rejects attempt-03 under the fixed saturation threshold",async()=>{
    const m=measure(await png("samples/pressure-plate-v02/scene.png"));
    expect(m.plate.s).toBeLessThan(0.58);
  });
  it("meets saturation and slightly-brighter-than-floor thresholds in the scene",async()=>{
    const m=measure(await png("samples/pressure-plate-v02-attempt-04/scene.png"));
    expect(m.plate.s).toBeGreaterThanOrEqual(0.58);
    expect(m.delta).toBeGreaterThanOrEqual(0.02);expect(m.delta).toBeLessThanOrEqual(0.08);
  });
  it("has at least 64 consecutive near-black warm pixels on one front row",async()=>{
    const p=await png("samples/pressure-plate-v02-attempt-04/sprite.png");
    let longest=0;
    for(let y=9;y<=14;y++){
      const row=Array.from({length:80},(_,x)=>{
        const [r,g,b,a]=p.data.subarray((y*80+x)*4,(y*80+x+1)*4);
        return a===255&&r<=65&&r>=g&&g>=b?"#":" ";
      }).join("");
      longest=Math.max(longest,...row.split(" ").map(run=>run.length));
    }
    expect(longest).toBeGreaterThanOrEqual(64);
  });
});
