import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
import {composePressurePlateAttempt05} from "../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-05.mjs";
const repo=path.resolve(process.cwd(),".."),dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const bytes=(p:string)=>readFile(path.join(repo,p));
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const manifest=async()=>JSON.parse((await bytes(dir+"pressure-plate-attempt-05.manifest.json")).toString());
describe("attempt-05 review integrity",()=>{
  it("pins exact document prompt, raw attempt-04 target, measured guide and all three edit calls",async()=>{
    const m=await manifest(),l=JSON.parse((await bytes(m.lineage.path)).toString());
    expect(l.generator).toBe("imagegen");expect(l.tool).toBe("built-in");expect(l.history).toHaveLength(3);
    expect(l.history[0].editTarget.sha256).toBe("6186839b101bbad448f6fe22e181652a61ed3168942f3490226b413aab5fab16");
    const spec=(await bytes(l.inputs.spec.path)).toString();
    expect((await bytes(l.history[0].prompt.path)).toString().trim()).toBe(spec.split("### ImageGen prompt（attempt-05，編修 attempt-04）")[1].split("```text")[1].split("```")[0].trim());
    for(const [i,h] of l.history.entries()){
      expect(hash(await bytes(h.source.path))).toBe(h.source.sha256);expect(hash(await bytes(h.prompt.path))).toBe(h.prompt.sha256);
      expect(hash(await bytes(h.editTarget.path))).toBe(h.editTarget.sha256);
      if(i)expect(h.editTarget).toEqual(l.history[i-1].source);
      expect(h.references[0]).toEqual(m.measurement.outputs.outline8x);expect(h.references[1]).toEqual(m.inputs.referenceScene);
    }
    expect(l.selected).toEqual(l.history[2].source);
    const previousLineage=JSON.parse((await bytes(l.parentLineage.path)).toString());expect(previousLineage.history).toHaveLength(5);
    expect(hash(await bytes(l.parentLineage.path))).toBe(l.parentLineage.sha256);
    expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false});
    const points=m.measurement.points as number[][];
    expect(points).toEqual([[857,326],[871,312],[883,299]]);
    const [mx,my]=[0,1].map(k=>points.reduce((a,p)=>a+p[k],0)/points.length);
    const measured=-points.reduce((a,[x,y])=>a+(x-mx)*(y-my),0)/points.reduce((a,[,y])=>a+(y-my)**2,0);
    expect(m.measurement.slope).toBe(measured);
  });
  it("has binary alpha, zero transparent RGB, exact nearest 4x and true grayscale",async()=>{
    const m=await manifest(),p=PNG.sync.read(await bytes(m.outputs.sprite.path)),z=PNG.sync.read(await bytes(m.outputs.zoom.path)),g=PNG.sync.read(await bytes(m.outputs.spriteGray.path));
    expect([p.width,p.height,z.width,z.height]).toEqual([96,18,384,72]);let transparent=0;
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const i=(y*p.width+x)*4,a=p.data[i+3];expect([0,255]).toContain(a);
      if(!a){transparent++;expect([...p.data.subarray(i,i+3)]).toEqual([0,0,0]);}
      const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
      expect([...g.data.subarray(i,i+4)]).toEqual([v,v,v,a]);
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const j=((y*4+dy)*z.width+x*4+dx)*4;expect([...z.data.subarray(j,j+4)]).toEqual([...p.data.subarray(i,i+4)]);}
    }
    expect(transparent).toBeGreaterThan(100);
  });
  it("pins phone and all scene pixels outside the expanded plate envelope",async()=>{
    const m=await manifest(),before=PNG.sync.read(await bytes(m.inputs.referenceScene.path)),after=PNG.sync.read(await bytes(m.outputs.scene.path));
    expect(m.geometry).toMatchObject({origin:[850,339],canvas:[96,18],sceneOpacity:0.85,frontAnchorChange:[0,0]});let count=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const i=(y*960+x)*4;if(before.data.subarray(i,i+4).equals(after.data.subarray(i,i+4)))continue;
      expect(x>=850&&x<946&&y>=339&&y<357).toBe(true);count++;
    }
    expect(count).toBe(m.changedPixels);expect(count).toBeGreaterThan(1000);
    expect(hash(await bytes(m.inputs.phone.path))).toBe(m.inputs.phone.sha256);
  });
  it("rebuilds prepared guide, all PNGs, HTML and manifest byte-identically",async()=>{
    const m=await manifest(),targets=[...Object.values(m.outputs),...Object.values(m.measurement.outputs),m.review,{path:dir+"pressure-plate-attempt-05.manifest.json"},{path:dir+"samples/derivations/pressure-plate-attempt-05/measurement.json"}] as {path:string;sha256?:string}[];
    const before=await Promise.all(targets.map(t=>bytes(t.path)));await composePressurePlateAttempt05();
    for(const [i,t] of targets.entries()){expect((await bytes(t.path)).equals(before[i])).toBe(true);if(t.sha256)expect(hash(before[i])).toBe(t.sha256);}
  },60000);
  it("refuses corrupt output without overwriting review files",async()=>{
    const m=await manifest(),file=path.join(repo,m.outputs.zoom.path),original=await readFile(file),html=await bytes(m.review.path);
    try{await writeFile(file,"corrupt");await expect(composePressurePlateAttempt05()).rejects.toThrow("Refusing changed existing output:");expect((await bytes(m.review.path)).equals(html)).toBe(true);expect((await readFile(file)).toString()).toBe("corrupt");}
    finally{await writeFile(file,original);}
  },60000);
});
