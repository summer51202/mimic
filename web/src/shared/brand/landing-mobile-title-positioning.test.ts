import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {expect,it} from "vitest";
const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
type Position={x:number;y:number};
type Asset={path:string;sha256:string;width:number;height:number};
type Metadata={frame:{id:string;width:number;height:number};scene:Asset;title:Asset&Position};
type Model={initial:Position;position:(x:number,y:number)=>Position;point:(x:number,y:number,r:{left:number;top:number;width:number;height:number})=>Position;begin:(p:Position,q:Position)=>{position:Position;point:Position};drag:(a:{position:Position;point:Position},q:Position)=>Position;nudge:(p:Position,dx:number,dy:number,fast?:boolean)=>Position;payload:(p:Position)=>{frame:Metadata["frame"];title:Metadata["title"];centerPercent:Position}};
async function meta(id="phone-staggered"):Promise<Metadata>{
  const m=JSON.parse(await readFile(path.join(review,"landing-a-title.manifest.json"),"utf8"));
  const frame=m.frames[id],scene=m.scenes[frame.view].logical;
  const rel=(a:Asset)=>({...a,path:a.path.split("2026-09-18-page-visual-phase-1/")[1]});
  return {frame:{id,width:scene.width,height:scene.height},scene:rel(scene),title:{...rel(frame.title),x:frame.title.x,y:frame.title.y}};
}
async function factory(){
  return (await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-title-position.model.mjs") as {createPositionModel:(m:Metadata)=>Model}).createPositionModel;
}
const hash=(b:Buffer|string)=>createHash("sha256").update(b).digest("hex");
it("phone uses its own immutable sources and initial coordinates",async()=>{
  const metadata=await meta(),m=(await factory())(metadata);
  expect(m.initial).toEqual({x:116,y:93});
  expect(m.payload(m.initial)).toMatchObject({frame:{id:"phone-staggered",width:390,height:600},title:{x:116,y:93,width:148,height:98},centerPercent:{x:48.72,y:23.67}});
  for(const a of [metadata.scene,metadata.title])expect(hash(await readFile(path.join(review,a.path)))).toBe(a.sha256);
});
it("phone rounding, clamp, grab offset and scale never use desktop denominators",async()=>{
  const m=(await factory())(await meta());
  expect(m.position(-1,-1)).toEqual({x:0,y:0});
  expect(m.position(999,999)).toEqual({x:242,y:502});
  expect(m.position(120.6,99.4)).toEqual({x:121,y:99});
  for(const scale of [.3,.5,1,1.4]){
    const p=m.point(10+140.25*scale,30+120.5*scale,{left:10,top:30,width:390*scale,height:600*scale});
    expect(p.x).toBeCloseTo(140.25);expect(p.y).toBeCloseTo(120.5);
  }
  expect(m.drag(m.begin(m.initial,{x:140,y:120}),{x:160,y:130})).toEqual({x:136,y:103});
  expect(m.nudge(m.initial,1,-1,true)).toEqual({x:126,y:83});
  expect(m.nudge({x:242,y:502},1,1)).toEqual({x:242,y:502});
});
it("rejects unsupported frames, mixed dimensions and missing phone identity",async()=>{
  const create=await factory(),metadata=await meta();
  for(const bad of [
    {...metadata,frame:{...metadata.frame,id:"unknown"}},
    {...metadata,frame:{...metadata.frame,id:"desktop-single"}},
    {...metadata,frame:{...metadata.frame,width:960}},
    {...metadata,title:{...metadata.title,width:288}},
    {...metadata,title:{...metadata.title,x:NaN}},
  ])expect(()=>create(bad)).toThrow();
  const missing={...metadata};Reflect.deleteProperty(missing,"frame");expect(()=>create(missing)).toThrow();
});
it("desktop remains compatible and received user position is not automatically applied",async()=>{
  const create=await factory(),desktop=create(await meta("desktop-single")),phone=create(await meta());
  expect(desktop.initial).toEqual({x:385,y:84});
  expect(desktop.payload({x:376,y:100})).toMatchObject({frame:{id:"desktop-single"},centerPercent:{x:54.17,y:26.3}});
  expect(phone.initial).toEqual({x:116,y:93});
  const serialized=Function("return ("+create.toString()+")")() as typeof create;
  expect(serialized(await meta()).payload({x:242,y:502}).title).toMatchObject({x:242,y:502});
});
it("one marked tool block contains both independent frames and preserves historical HTML",async()=>{
  const html=await readFile(path.join(review,"landing-a-title-review.html"),"utf8");
  const marker=/<!--landing-title-position-tool:start-->[\s\S]*?<!--landing-title-position-tool:end-->\n/g;
  expect(html.match(marker)).toHaveLength(1);
  expect(hash(html.replace(marker,""))).toBe("77ce26bc38fc2d3231edd7ae97b010efa368bf92cf1d9b8630c88ad4e4b6dded");
  expect(html).toContain('data-frame="phone-staggered"');
  expect(html).toContain("samples/landing-a-title/scene-phone-logical.png");
  expect(html.match(/data-title-position-tool data-frame=/g)).toHaveLength(2);
});
