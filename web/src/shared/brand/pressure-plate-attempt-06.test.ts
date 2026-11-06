import {readFile} from "node:fs/promises";
import path from "node:path";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
import {fitDiamond,measureDiamond,measureLowerGaps,measureColour} from "../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/pressure-plate-attempt-06-contracts.mjs";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1"),slope=0.40927605776434434;
const png=async(p:string)=>PNG.sync.read(await readFile(path.join(dir,p)));
describe("attempt-06 floor diamond contracts",()=>{
  it("rejects attempt-05's long horizontal upper edge",async()=>{
    const m=measureDiamond(await png("samples/pressure-plate-attempt-05/sprite.png"),slope);
    expect(m.passes).toBe(false);expect(m.topHorizontalSpan).toBeGreaterThan(60);
  });
  it("meets all four measured slopes, opposite-pair parallelism and apex symmetry",async()=>{
    const p=await png("samples/pressure-plate-attempt-06/sprite.png"),m=measureDiamond(p,slope);
    expect(m.passes).toBe(true);expect(m.apexHorizontalDifference).toBeLessThanOrEqual(2);
    expect(m.parallelDifferences.every((v:number)=>v<=0.15)).toBe(true);
    for(const s of Object.values(m.slopes) as number[]){expect(Math.abs(s)).toBeGreaterThanOrEqual(slope*0.8);expect(Math.abs(s)).toBeLessThanOrEqual(slope*1.2);}
  });
  it("has a continuous dark recessed seam on both lower edges",async()=>{
    const m=measureLowerGaps(await png("samples/pressure-plate-attempt-06/sprite.png"));
    expect(m.left.coverage).toBeGreaterThanOrEqual(0.8);expect(m.right.coverage).toBeGreaterThanOrEqual(0.8);
  });
  it("keeps fixed-mask scene colour saturated and slightly brighter than floor",async()=>{
    const m=measureColour(await png("samples/pressure-plate-attempt-06/scene.png"));
    expect(m.plate.s).toBeGreaterThanOrEqual(0.58);expect(m.delta).toBeGreaterThanOrEqual(0.02);expect(m.delta).toBeLessThanOrEqual(0.08);
  });
  it("rejects clipping and empty raw sources instead of inventing missing image data",async()=>{
    expect(()=>fitDiamond(new PNG({width:100,height:100}))).toThrow("Empty");
    const p=new PNG({width:100,height:100});p.data.fill(255);expect(()=>fitDiamond(p)).toThrow("Clipped");
  });
});
