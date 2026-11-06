import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
import {composePressurePlateAttempt06} from "../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-attempt-06.mjs";
const repo=path.resolve(process.cwd(),".."),dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/",bytes=(p:string)=>readFile(path.join(repo,p)),hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const manifest=async()=>JSON.parse((await bytes(dir+"pressure-plate-attempt-06.manifest.json")).toString());
describe("attempt-06 existing-source appearance review",()=>{
  it("pins all five existing raw sources, prompt chain, measured guide and extra colour references",async()=>{
    const m=await manifest(),l=JSON.parse((await bytes(m.lineage.path)).toString());
    expect(l).toMatchObject({tool:"built-in",generator:"imagegen",resumedExistingOnly:true,newImageCallsOnResume:0});expect(l.history).toHaveLength(5);
    expect(l.selected).toEqual(l.history[4].source);expect(l.selected.sha256).toBe("f95a1a7b3db580c2baa1aeaf1bb7d2cd501674cb17ad7a5255e921aaf157abcc");
    expect(l.history[0].editTarget.sha256).toBe("d2902a1277831ddd88b779852949ee34c79b6c83650cf44fb3d3ceaeca36c9b4");
    const spec=(await bytes(l.inputs.spec.path)).toString();
    expect((await bytes(l.history[0].prompt.path)).toString().trim()).toBe(spec.split("### ImageGen prompt（attempt-06，編修 attempt-05）")[1].split("```text")[1].split("```")[0].trim());
    for(const [i,h] of l.history.entries()){
      expect(hash(await bytes(h.source.path))).toBe(h.source.sha256);expect(hash(await bytes(h.prompt.path))).toBe(h.prompt.sha256);expect(hash(await bytes(h.editTarget.path))).toBe(h.editTarget.sha256);
      if(i)expect(h.editTarget).toEqual(l.history[i-1].source);
      expect(h.references[0]).toEqual(m.measurement.outputs.outline8x);expect(h.references[1]).toEqual(m.inputs.referenceScene);
      for(const ref of h.references)expect(hash(await bytes(ref.path))).toBe(ref.sha256);
    }
    expect(l.history[3].references[2]).toEqual(l.history[1].source);expect(l.history[4].references[2].path).toContain("palette-guide.png");
    expect(hash(await bytes(l.parentLineage.path))).toBe(l.parentLineage.sha256);
    expect(m).toMatchObject({decision:"awaiting-calibration",reviewOnly:true,runtimePromotion:false,resumedExistingOnly:true,newImageCallsOnResume:0});
  });
  it("retains ten marked tiles and an untouched same-scale real-floor comparison",async()=>{
    const m=await manifest(),me=m.measurement;expect(me.tiles).toHaveLength(10);expect(me.zones.near.count).toBe(5);expect(me.zones.middle.count).toBe(5);
    const slopes:number[]=[],ratios:number[]=[];
    for(const t of me.tiles){const [T,R,B,L]=t.vertices as number[][];for(const [a,b] of [[L,T],[T,R],[R,B],[B,L]])slopes.push(Math.abs((b[1]-a[1])/(b[0]-a[0])));ratios.push((R[0]-L[0])/(B[1]-T[1]));}
    expect(me.aggregate.meanAbsoluteSlope).toBeCloseTo(slopes.reduce((a,b)=>a+b,0)/40,12);expect(me.aggregate.meanRatio).toBeCloseTo(ratios.reduce((a,b)=>a+b,0)/10,12);
    const a=PNG.sync.read(await bytes(me.outputs.architecture.path)),tile=PNG.sync.read(await bytes(me.outputs.realTile.path)),zoom=PNG.sync.read(await bytes(me.outputs.realTile4x.path)),crop=me.tileComparison.crop;
    for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++){
      const i=(y*tile.width+x)*4,j=((crop.y+y)*a.width+crop.x+x)*4;
      expect(tile.data.subarray(i,i+4).equals(a.data.subarray(j,j+4))).toBe(true);
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const k=((y*4+dy)*zoom.width+x*4+dx)*4;expect(tile.data.subarray(i,i+4).equals(zoom.data.subarray(k,k+4))).toBe(true);}
    }
  });
  it("has binary alpha, zero hidden RGB, exact nearest4x and true grayscale",async()=>{
    const m=await manifest(),p=PNG.sync.read(await bytes(m.outputs.sprite.path)),z=PNG.sync.read(await bytes(m.outputs.zoom.path)),g=PNG.sync.read(await bytes(m.outputs.spriteGray.path));
    expect([p.width,p.height,z.width,z.height]).toEqual([85,35,340,140]);let transparent=0;
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const i=(y*p.width+x)*4,a=p.data[i+3];expect([0,255]).toContain(a);if(!a){transparent++;expect([...p.data.subarray(i,i+3)]).toEqual([0,0,0]);}
      const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);expect([...g.data.subarray(i,i+4)]).toEqual([v,v,v,a]);
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const j=((y*4+dy)*z.width+x*4+dx)*4;expect(z.data.subarray(j,j+4).equals(p.data.subarray(i,i+4))).toBe(true);}
    }
    expect(transparent).toBeGreaterThan(1000);
  });
  it("selects retry-04 without changing the colour thresholds or hiding failed originals",async()=>{
    const m=await manifest();expect(m.selection.selected).toBe("attempt-06-retry-04");expect(m.selection.candidates).toHaveLength(5);
    expect(m.colourContract.thresholds).toEqual({saturationMin:0.58,valueDelta:[0.02,0.08]});
    for(const a of m.selection.candidates){expect(a.shape.passes).toBe(true);expect(a.colourPass).toBe(a.name==="attempt-06-retry-04");}
    expect(m.diamondContract.attempt05Negative.passes).toBe(false);expect(m.diamondContract.attempt05Negative.topHorizontalSpan).toBeGreaterThan(60);
  });
  it("changes no scene pixels outside the old/new plate union and preserves phone",async()=>{
    const m=await manifest(),base=PNG.sync.read(await bytes(m.inputs.referenceScene.path)),now=PNG.sync.read(await bytes(m.outputs.scene.path)),oldManifest=JSON.parse((await bytes(m.inputs.previous.path)).toString()),old=PNG.sync.read(await bytes(oldManifest.outputs.scene.path));
    expect(m.geometry).toMatchObject({origin:[856,331],canvas:[85,35],center:[898,348],sceneOpacity:0.85});let baseCount=0,oldCount=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const i=(y*960+x)*4,n=now.data.subarray(i,i+4),cb=!base.data.subarray(i,i+4).equals(n),co=!old.data.subarray(i,i+4).equals(n);
      if(cb||co)expect(x>=850&&x<946&&y>=331&&y<366).toBe(true);if(cb)baseCount++;if(co)oldCount++;
    }
    expect(baseCount).toBe(m.changedPixels);expect(oldCount).toBe(m.changedVsAttempt05);expect(hash(await bytes(m.inputs.phone.path))).toBe(m.inputs.phone.sha256);
  });
  it("rebuilds review outputs without rewriting existing measurement, guide or contracts",async()=>{
    const m=await manifest(),l=JSON.parse((await bytes(m.lineage.path)).toString()),targets=[...Object.values(m.outputs),...Object.values(m.measurement.outputs),m.review,l.measurement,l.inputs.contracts,l.inputs.preparationScript,{path:dir+"pressure-plate-attempt-06.manifest.json"}] as {path:string;sha256?:string}[];
    const before=await Promise.all(targets.map(t=>bytes(t.path)));await composePressurePlateAttempt06();
    for(const [i,t] of targets.entries()){expect((await bytes(t.path)).equals(before[i])).toBe(true);if(t.sha256)expect(hash(before[i])).toBe(t.sha256);}
  },60000);
  it("refuses a corrupt review output before overwriting the HTML",async()=>{
    const m=await manifest(),file=path.join(repo,m.outputs.zoom.path),original=await readFile(file),html=await bytes(m.review.path);
    try{await writeFile(file,"corrupt");await expect(composePressurePlateAttempt06()).rejects.toThrow("Refusing changed existing output:");expect((await bytes(m.review.path)).equals(html)).toBe(true);expect((await readFile(file)).toString()).toBe("corrupt");}
    finally{await writeFile(file,original);}
  },60000);
});
