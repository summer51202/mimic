import {existsSync} from "node:fs";
import path from "node:path";
import {afterEach,expect,it,vi} from "vitest";
type Snap={frame:string;state:string;busy:boolean;error:string;ready:string[];canPlay:boolean};
type Model={snapshot:()=>Snap;available:(id:string,ok:boolean)=>void;selectFrame:(id:string)=>boolean;toggle:()=>boolean;dispose:()=>void};
type Factory=(o:{schedule:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;cancel:typeof clearTimeout;onChange:(s:Snap)=>void;reducedMotion:()=>boolean})=>Model;
const frames=["closed","latch-release","unlatched","cracked","half-open","opening-wide","near-open","open"];
const opening:[[string,number],...[string,number][]]=[["latch-release",100],["unlatched",90],["cracked",150],["half-open",90],["opening-wide",70],["near-open",110],["open",140]];
const closing:[[string,number],...[string,number][]]=[["near-open",120],["opening-wide",100],["half-open",80],["cracked",70],["unlatched",90],["latch-release",80],["closed",120]];
async function setup(reduced=false){
  const url=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.model.mjs");
  expect(existsSync(url),"Restored model required").toBe(true);
  const {createChestStateModel}=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/restored-chest.model.mjs") as {createChestStateModel:Factory};
  vi.useFakeTimers();const trace:Snap[]=[];
  const m=createChestStateModel({schedule:(f,ms)=>setTimeout(f,ms),cancel:clearTimeout,onChange:s=>trace.push(s),reducedMotion:()=>reduced});
  return {m,trace,ready:()=>frames.forEach(id=>m.available(id,true))};
}
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
it("waits for all eight decoded frames and never autoplays",async()=>{
  const {m,ready}=await setup();expect(m.toggle()).toBe(false);ready();expect(m.snapshot()).toMatchObject({frame:"closed",state:"closed",busy:false,canPlay:true});expect(vi.getTimerCount()).toBe(0);
});
it("uses the exact nonuniform opening and different closing delays",async()=>{
  const {m,ready}=await setup();ready();m.toggle();let total=0;
  for(const [id,ms] of opening){vi.advanceTimersByTime(ms-1);expect(m.snapshot().frame).not.toBe(id);vi.advanceTimersByTime(1);expect(m.snapshot().frame).toBe(id);total+=ms;}
  expect(total).toBe(750);expect(m.snapshot().busy).toBe(false);m.toggle();total=0;
  for(const [id,ms] of closing){vi.advanceTimersByTime(ms);expect(m.snapshot().frame).toBe(id);total+=ms;}
  expect(total).toBe(660);expect(vi.getTimerCount()).toBe(0);
});
it("maps transitional frames to only four semantic states",async()=>{
  const {m,ready}=await setup();ready();
  for(const [frame,state] of frames.map((id,i)=>[id,i===7?"open":i>=4?"half-open":i===3?"cracked":"closed"])){
    m.selectFrame(frame);expect(m.snapshot()).toMatchObject({frame,state});
  }
});
it("does not queue repeated toggles",async()=>{
  const {m,ready}=await setup();ready();m.toggle();expect(m.toggle()).toBe(false);expect(vi.getTimerCount()).toBe(1);vi.runAllTimers();expect(m.snapshot().frame).toBe("open");expect(vi.getTimerCount()).toBe(0);
});
it("manual frame selection cancels playback",async()=>{
  const {m,ready}=await setup();ready();m.toggle();vi.advanceTimersByTime(190);m.selectFrame("half-open");vi.runAllTimers();expect(m.snapshot()).toMatchObject({frame:"half-open",busy:false});
});
it("resumes opening after a manually selected intermediate without a backward jump",async()=>{
  const {m,ready}=await setup();ready();m.selectFrame("cracked");m.toggle();vi.advanceTimersByTime(90);expect(m.snapshot().frame).toBe("half-open");vi.runAllTimers();expect(m.snapshot().frame).toBe("open");
});
it("reduced motion switches directly to terminal frames and retains manual inspection",async()=>{
  const {m,ready}=await setup(true);ready();m.toggle();expect(m.snapshot()).toMatchObject({frame:"open",busy:false});m.toggle();expect(m.snapshot().frame).toBe("closed");
  for(const id of frames){expect(m.selectFrame(id)).toBe(true);expect(m.snapshot().frame).toBe(id);}expect(vi.getTimerCount()).toBe(0);
});
it("failed transition stops playback and invalid IDs cannot enter the model",async()=>{
  const {m,ready}=await setup();ready();m.toggle();m.available("near-open",false);vi.runAllTimers();expect(m.snapshot()).toMatchObject({frame:"closed",busy:false,canPlay:false,error:"無法載入：near-open"});
  expect(m.selectFrame("near-open")).toBe(false);expect(m.selectFrame("unknown")).toBe(false);expect(()=>m.available("unknown",true)).toThrow("Unknown frame");
});
it("reports current-frame failure and dispose cancels the only timer",async()=>{
  const {m,ready}=await setup();ready();m.selectFrame("open");m.available("open",false);expect(m.snapshot().ready).not.toContain("open");expect(m.snapshot().canPlay).toBe(false);
  m.available("open",true);m.toggle();m.dispose();expect(vi.getTimerCount()).toBe(0);expect(m.snapshot().busy).toBe(false);
});
