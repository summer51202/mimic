import {readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {PNG} from "pngjs";
import {describe,it,expect} from "vitest";
import {composePressurePlate} from "../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/compose-pressure-plate-v02.mjs";
const repo=path.resolve(process.cwd(),".."),dir="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const bytes=(p:string)=>readFile(path.join(repo,p));
const hash=(b:Buffer)=>createHash("sha256").update(b).digest("hex");
const manifest=async()=>JSON.parse((await bytes(dir+"pressure-plate-v02.manifest.json")).toString());
describe("pressure plate v02 review only",()=>{
  it("keeps exact source history and the document's first prompt",async()=>{
    const m=await manifest(),l=JSON.parse((await bytes(m.lineage.path)).toString());
    expect(l.generator).toBe("imagegen");expect(l.history).toHaveLength(3);
    const spec=(await bytes(l.inputs.spec.path)).toString(),prompt=(await bytes(l.history[0].prompt.path)).toString();
    expect(prompt.trim()).toBe(spec.split("```text\n")[1].split("\n```")[0].trim());
    expect(l.history[0].editTarget).toBeNull();expect(l.history[0].references).toHaveLength(3);
    for(const [i,h] of l.history.entries()){
      expect(hash(await bytes(h.source.path))).toBe(h.source.sha256);
      expect(hash(await bytes(h.prompt.path))).toBe(h.prompt.sha256);
      if(i)expect(h.editTarget).toEqual(l.history[i-1].source);
    }
    expect(hash(await bytes(l.selected.path))).toBe(l.history[2].source.sha256);
    expect(m.decision).toBe("awaiting-calibration");expect(m.runtimePromotion).toBe(false);expect(m.reviewOnly).toBe(true);
  });
  it("uses binary alpha, zero hidden RGB, exact 4x and real grayscale",async()=>{
    const m=await manifest(),p=PNG.sync.read(await bytes(m.outputs.sprite.path)),zoom=PNG.sync.read(await bytes(m.outputs.zoom.path)),g=PNG.sync.read(await bytes(m.outputs.spriteGray.path));
    expect([p.width,p.height]).toEqual([80,18]);expect([zoom.width,zoom.height]).toEqual([320,72]);
    let transparent=0,opaque=0;
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
      const i=(y*p.width+x)*4,a=p.data[i+3];expect([0,255]).toContain(a);
      if(!a){transparent++;expect([...p.data.subarray(i,i+3)]).toEqual([0,0,0]);}else opaque++;
      const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
      expect([...g.data.subarray(i,i+4)]).toEqual([v,v,v,a]);
      for(let dy=0;dy<4;dy++)for(let dx=0;dx<4;dx++){const j=((y*4+dy)*zoom.width+x*4+dx)*4;expect([...zoom.data.subarray(j,j+4)]).toEqual([...p.data.subarray(i,i+4)]);}
    }
    expect(transparent).toBeGreaterThan(0);expect(opaque).toBeGreaterThan(800);
  });
  it("changes only the pressure plate envelope in the approved-chest desktop",async()=>{
    const m=await manifest(),before=PNG.sync.read(await bytes(m.inputs.referenceScene.path)),after=PNG.sync.read(await bytes(m.outputs.scene.path));
    expect(m.geometry).toMatchObject({origin:[850,339],canvas:[80,18],sceneOpacity:0.85});let changed=0;
    for(let y=0;y<540;y++)for(let x=0;x<960;x++){
      const i=(y*960+x)*4;if(before.data.subarray(i,i+4).equals(after.data.subarray(i,i+4)))continue;
      expect(x>=850&&x<930&&y>=339&&y<357).toBe(true);changed++;
    }
    expect(changed).toBeGreaterThan(500);expect(changed).toBe(m.changedPixels);
    const phone=JSON.parse((await bytes(m.lineage.path)).toString()).inputs.phone;
    expect(hash(await bytes(phone.path))).toBe(phone.sha256);
    const html=(await bytes(m.review.path)).toString();expect(html).toContain('data-v01');expect(html).not.toContain('draggable=');
  });
  it("rebuilds all review outputs byte-identically",async()=>{
    const m=await manifest(),targets=[...Object.values(m.outputs) as {path:string;sha256:string}[],m.review,{path:dir+"pressure-plate-v02.manifest.json"}];
    const before=await Promise.all(targets.map(t=>bytes(t.path)));
    await composePressurePlate();
    for(const [i,t] of targets.entries())expect((await bytes(t.path)).equals(before[i])).toBe(true);
  },60000);
  it("refuses a modified output before writing any other target",async()=>{
    const m=await manifest(),file=path.join(repo,m.outputs.zoom.path),original=await readFile(file),html=await bytes(m.review.path);
    try{
      await writeFile(file,Buffer.from("modified output"));
      await expect(composePressurePlate()).rejects.toThrow("Refusing changed existing output:");
      expect((await bytes(m.review.path)).equals(html)).toBe(true);
      expect((await readFile(file)).toString()).toBe("modified output");
    }finally{await writeFile(file,original);}
  },60000);
});
