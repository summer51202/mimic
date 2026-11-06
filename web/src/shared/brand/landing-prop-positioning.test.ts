import {createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {expect,it} from "vitest";

const dir=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const load=async()=>JSON.parse(await readFile(path.join(dir,"landing-prop-position.manifest.json"),"utf8"));
const factory=async()=> (await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-prop-position.model.mjs")).createPropPositionModel;

it("uses approved assets, independent mobile scope and frozen titles",async()=>{
  const m=await load();
  expect(m.frames.desktop.objects.map((o:{id:string})=>o.id)).toEqual(["chest","mapCrate","pressurePlate"]);
  expect(m.frames.phone.objects.map((o:{id:string})=>o.id)).toEqual(["mapCrate"]);
  const plate=m.frames.desktop.objects[2];
  expect([plate.width,plate.height,plate.opacity,plate.variants.default.sha256]).toEqual([85,35,.85,"e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c"]);
  expect(Object.keys(m.frames.desktop.objects[0].variants)).toHaveLength(8);
  expect(m.frames.desktop.fixed.find((o:{id:string})=>o.id==="wordmark")).toMatchObject({x:376,y:100});
  expect(m.frames.phone.fixed.find((o:{id:string})=>o.id==="wordmark")).toMatchObject({x:130,y:59});
});

it("preserves anchor offsets, free positions and scale-independent dragging",async()=>{
  const m=(await factory())((await load()).frames.desktop),s=m.initial();
  expect(s.chest).toEqual({x:144,y:350,variant:"closed"});
  expect(m.rect("chest",s.chest)).toEqual({x:92,y:230,width:104,height:120});
  expect(m.move(s,"pressurePlate",-600,40).pressurePlate).toMatchObject({x:256,y:371});
  expect(m.move(s,"mapCrate",-1000,1000).mapCrate).toMatchObject({x:-765,y:1281});
  expect(m.move(s,"chest",1,-1,10).chest).toMatchObject({x:154,y:340});
  const p=m.point(55,70,{left:5,top:10,width:480,height:270});
  expect(p).toEqual({x:100,y:120});
  expect(()=>m.move(s,"chest",NaN,0)).toThrow();
  expect(()=>m.point(0,0,{left:0,top:0,width:0,height:0})).toThrow();
});

it("warns without clamping, checks the open lid while closed and sorts fixed and movable depths",async()=>{
  const frame=(await load()).frames.desktop,m=(await factory())(frame),s=m.initial();
  s.pressurePlate={x:10,y:425,variant:"default"};
  s.chest={x:144,y:30,variant:"closed"};
  const p=m.payload(s);
  expect(p.objects.find((o:{id:string})=>o.id==="pressurePlate")!.warnings).toContain("dialogue");
  expect(p.objects.find((o:{id:string})=>o.id==="chest")!.warnings).toContain("open-lid-clearance");
  expect(p.layerOrder.indexOf("pressurePlate")).toBeGreaterThan(p.layerOrder.indexOf("mimiku"));
  s.pressurePlate={x:10,y:340,variant:"default"};
  expect(m.payload(s).objects[2].warnings).not.toContain("right-passage");
  s.chest={x:430,y:350,variant:"open"};
  expect(m.payload(s).objects[0].warnings).toContain("occludes:warrior-face");
  s.pressurePlate={x:-10,y:200,variant:"default"};
  expect(m.payload(s).objects[2].warnings).toEqual(expect.arrayContaining(["outside-frame","outside-floor"]));
});

it("exports reproducible provenance and rejects invalid frame/state metadata",async()=>{
  const frame=(await load()).frames.phone,create=await factory(),m=create(frame),s=m.initial(),p=m.payload(s);
  expect(p).toMatchObject({schema:"mimic-landing-prop-position/v1",reviewOnly:true,runtimePromotion:false,unit:"logical-px",frame:{id:"phone",width:390,height:600}});
  expect(p.objects[0]).toMatchObject({id:"mapCrate",anchor:"top-left",x:20,y:286,width:79,height:44});
  expect(()=>create({...frame,frame:{...frame.frame,id:"invalid"}})).toThrow();
  expect(()=>m.payload({...s,mapCrate:{...s.mapCrate,variant:"open"}})).toThrow();
  const serialized=Function("return ("+create.toString()+")")();
  expect(serialized(frame).payload(s)).toEqual(p);
});

it("records every source/output hash and rebuilds byte-identically",async()=>{
  // Native Node preserves the exact function source embedded in the standalone HTML;
  // Vite transforms function.toString() and would exercise a different generator.
  execFileSync(process.execPath,[path.join(dir,"compose-landing-prop-position.mjs")]);
  const before=await readFile(path.join(dir,"landing-prop-position.manifest.json"));
  execFileSync(process.execPath,[path.join(dir,"compose-landing-prop-position.mjs")]);
  const m=await load();
  expect(await readFile(path.join(dir,"landing-prop-position.manifest.json"))).toEqual(before);
  for(const a of [...Object.values(m.inputs),...Object.values(m.outputs),m.review] as {path:string;sha256:string}[]){
    expect(createHash("sha256").update(await readFile(path.resolve(dir,"../../../../..",a.path))).digest("hex")).toBe(a.sha256);
  }
},30_000);
