import {readFile} from "node:fs/promises";
import path from "node:path";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
import {measureSlopes,fitPlate,measureFrontGap,measureColour} from "../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/pressure-plate-attempt-05-contracts.mjs";
const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const png=async(p:string)=>PNG.sync.read(await readFile(path.join(dir,p)));
const slope=0.9634369287020111;
describe("attempt-05 physical contracts",()=>{
  it("rejects attempt-04 because the alpha short sides lean in opposite directions",async()=>{
    const m=measureSlopes(await png("samples/pressure-plate-v02-attempt-04/sprite.png"),slope);
    expect(m.left).toBeGreaterThan(0);expect(m.right).toBeLessThan(0);expect(m.passes).toBe(false);
  });
  it("rejects both early attempt-05 outputs because right lean is too small",async()=>{
    for(const name of ["attempt-05","attempt-05-retry-01"]){
      const {sprite}=fitPlate(await png(`samples/derivations/pressure-plate-attempt-05/${name}.png`));
      const m=measureSlopes(sprite,slope);expect(m.passes).toBe(false);expect(m.right).toBeLessThan(slope*0.75);
    }
  });
  it("matches the stair slope on both sides with at most 20% relative difference",async()=>{
    const {sprite}=fitPlate(await png("samples/derivations/pressure-plate-attempt-05/attempt-05-retry-02.png"));
    const m=measureSlopes(sprite,slope);expect(m.passes).toBe(true);
    for(const s of [m.left,m.right]){expect(s).toBeGreaterThanOrEqual(slope*0.75);expect(s).toBeLessThanOrEqual(slope*1.25);}
    expect(m.relativeDifference).toBeLessThanOrEqual(0.2);
    expect(measureFrontGap(sprite).coverage).toBeGreaterThanOrEqual(0.8);
  });
  it("preserves the fixed shape-mask colour thresholds in the actual scene",async()=>{
    const m=measureColour(await png("samples/pressure-plate-attempt-05/scene.png"),slope);
    expect(m.plate.s).toBeGreaterThanOrEqual(0.58);expect(m.delta).toBeGreaterThanOrEqual(0.02);expect(m.delta).toBeLessThanOrEqual(0.08);
  });
});
