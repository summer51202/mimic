import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
type Position={x:number;y:number};
type Meta={scene:{path:string;sha256:string;width:number;height:number};title:{path:string;sha256:string;width:number;height:number;x:number;y:number}};
type Point={x:number;y:number};
type Rect={left:number;top:number;width:number;height:number};
type Anchor={position:Position;point:Point};
type Payload={schema:string;reviewOnly:boolean;frame:{id:string;width:number;height:number};scene:{path:string;sha256:string};title:Meta["title"];anchor:string;unit:string;centerPercent:Position};
type Model={initial:Position;position:(x:number,y:number)=>Position;point:(x:number,y:number,r:Rect)=>Point;begin:(p:Position,q:Point)=>Anchor;drag:(a:Anchor,q:Point)=>Position;nudge:(p:Position,dx:number,dy:number,fast?:boolean)=>Position;payload:(p:Position)=>Payload};
async function metadata():Promise<Meta>{
  const m=JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));
  const rel=(a:Meta["scene"])=>({...a,path:a.path.split("2026-09-18-page-visual-phase-1/")[1]});
  return {scene:rel(m.scenes.desktop.logical),title:{...m.frames["desktop-single"].title,path:rel(m.frames["desktop-single"].title).path}};
}
async function create(meta?:Meta):Promise<Model>{
  const mod=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs") as {createPositionModel:(m:Meta)=>Model};
  return mod.createPositionModel(meta??await metadata());
}
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");

it("uses the unchanged desktop scene and fixed title",async()=>{
  const meta=await metadata(),model=await create(meta);
  expect(model.initial).toEqual({x:385,y:84});
  expect([meta.scene.width,meta.scene.height,meta.title.width,meta.title.height]).toEqual([960,540,288,84]);
  expect(meta.scene.sha256).toBe("ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e");
  expect(meta.title.sha256).toBe("4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31");
  for(const a of [meta.scene,meta.title])expect(hash(await readFile(path.join(review,a.path)))).toBe(a.sha256);
});
it("rounds logical pixels and clamps all edges",async()=>{
  const m=await create();
  expect(m.position(10.6,20.4)).toEqual({x:11,y:20});
  expect(m.position(-9,-8)).toEqual({x:0,y:0});
  expect(m.position(900,600)).toEqual({x:672,y:456});
  expect(()=>m.position(NaN,0)).toThrow();
});
it("transforms from actual image content at different scales without rounding points",async()=>{
  const m=await create();
  for(const scale of [0.3,0.5,1,1.4]){
    const r={left:31,top:74,width:960*scale,height:540*scale};
    const p=m.point(31+401.25*scale,74+96.5*scale,r);
    expect(p.x).toBeCloseTo(401.25);expect(p.y).toBeCloseTo(96.5);
  }
  expect(()=>m.point(0,0,{left:0,top:0,width:0,height:0})).toThrow();
});
it("keeps grab offset and calculates from the starting anchor",async()=>{
  const m=await create(),a=m.begin(m.initial,{x:400,y:90});
  expect(m.drag(a,{x:425.1,y:108.2})).toEqual({x:410,y:102});
  expect(m.drag(a,{x:-50,y:-50})).toEqual({x:0,y:0});
  expect(m.drag(a,{x:1400,y:1000})).toEqual({x:672,y:456});
});
it("steps by 1 or 10 without changing dimensions",async()=>{
  const m=await create();
  expect(m.nudge(m.initial,1,0)).toEqual({x:386,y:84});
  expect(m.nudge(m.initial,0,-1,true)).toEqual({x:385,y:74});
  expect(m.nudge({x:0,y:0},-1,-1,true)).toEqual({x:0,y:0});
  expect(m.nudge({x:672,y:456},1,1,true)).toEqual({x:672,y:456});
});
it("exports reproducible identity and auxiliary center percentages",async()=>{
  const meta=await metadata(),m=await create(meta),p=m.payload(m.initial);
  expect(p).toEqual({schema:"mimic-landing-title-position/v1",reviewOnly:true,
    frame:{id:"desktop-single",width:960,height:540},
    scene:{path:meta.scene.path,sha256:meta.scene.sha256},
    title:{path:meta.title.path,sha256:meta.title.sha256,x:385,y:84,width:288,height:84},
    anchor:"top-left",unit:"logical-px",centerPercent:{x:55.1,y:23.33}});
  expect(m.payload({x:672,y:456}).title).toMatchObject({x:672,y:456,width:288,height:84});
});
it("rejects mismatched metadata and works as a serialized browser factory",async()=>{
  const mod=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs") as {createPositionModel:(m:Meta)=>Model};
  const meta=await metadata();
  expect(()=>mod.createPositionModel({...meta,title:{...meta.title,width:300}})).toThrow();
  expect(()=>mod.createPositionModel({...meta,scene:{...meta.scene,sha256:"bad"}})).toThrow();
  // This is a test of the exact self-contained factory, never eval user-provided text.
  const browserFactory=Function("return ("+mod.createPositionModel.toString()+")")() as (m:Meta)=>Model;
  expect(browserFactory(meta).payload({x:100,y:50}).title).toMatchObject({x:100,y:50});
});

it("adds exactly one tool block while preserving the original HTML and manifest bytes",async()=>{
  const html=await readFile(path.join(review,"landing-a-title-review.html"),"utf8");
  const marker=/<!--landing-title-position-tool:start-->[\s\S]*?<!--landing-title-position-tool:end-->\n/g;
  const blocks=html.match(marker)??[];
  expect(blocks).toHaveLength(1);
  expect(hash(html.replace(marker,""))).toBe("77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded");
  expect(hash(await readFile(path.join(review,"landing-a-title.manifest.json")))).toBe("ce0a48d0786e6b4762c81bd5619379e3d2ef0bffec29248d87d4364eef4374d7");
  expect(blocks[0]).toContain("scene-desktop-logical.png");
  expect(blocks[0]).toContain("wordmarks/desktop-single.png");
  expect(blocks[0]).not.toMatch(/\bfetch\s*\(|<canvas|type=["']module["']|localStorage/);
});
