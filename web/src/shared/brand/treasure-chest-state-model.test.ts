import {existsSync} from "node:fs";
import path from "node:path";
import {afterEach,expect,it,vi} from "vitest";
const file=path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/treasure-chest-state.model.mjs");
type Snapshot={current:string;busy:boolean;error:string;ready:string[];canPlay:boolean};
type Model={snapshot:()=>Snapshot;available:(id:string,ok:boolean)=>void;select:(id:string)=>boolean;toggle:()=>boolean;dispose:()=>void};
type Factory=(o:{schedule:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;cancel:(id:ReturnType<typeof setTimeout>)=>void;onChange:(s:Snapshot)=>void;reducedMotion:()=>boolean})=>Model;
async function setup(reduced=false){
  expect(existsSync(file),"Chest state model required").toBe(true);
  const mod=await import("../../../../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/treasure-chest-state.model.mjs") as {createChestStateModel:Factory};
  vi.useFakeTimers();const trace:Snapshot[]=[];
  const m=mod.createChestStateModel({schedule:(f,ms)=>setTimeout(f,ms),cancel:clearTimeout,onChange:s=>trace.push(s),reducedMotion:()=>reduced});
  return {m,trace,ready:()=>["closed","cracked","half-open","open"].forEach(id=>m.available(id,true))};
}
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
it("does not autoplay or play before all frames decode",async()=>{
  const {m,ready}=await setup();expect(m.toggle()).toBe(false);ready();
  expect(m.snapshot()).toMatchObject({current:"closed",busy:false,canPlay:true});expect(vi.getTimerCount()).toBe(0);
});
it("opens and closes with three 140ms transitions without queuing",async()=>{
  const {m,ready}=await setup();ready();expect(m.toggle()).toBe(true);expect(m.toggle()).toBe(false);
  vi.advanceTimersByTime(139);expect(m.snapshot().current).toBe("closed");
  for(const id of ["cracked","half-open","open"]){vi.advanceTimersByTime(id==="cracked"?1:140);expect(m.snapshot().current).toBe(id);}
  expect(m.snapshot().busy).toBe(false);m.toggle();
  for(const id of ["half-open","cracked","closed"]){vi.advanceTimersByTime(140);expect(m.snapshot().current).toBe(id);}
  expect(vi.getTimerCount()).toBe(0);
});
it("manual frame selection cancels pending playback",async()=>{
  const {m,ready}=await setup();ready();m.toggle();vi.advanceTimersByTime(140);m.select("half-open");
  vi.advanceTimersByTime(1000);expect(m.snapshot()).toMatchObject({current:"half-open",busy:false});expect(vi.getTimerCount()).toBe(0);
});
it("reduced motion uses terminal frames but preserves manual inspection",async()=>{
  const {m,ready}=await setup(true);ready();m.toggle();expect(m.snapshot().current).toBe("open");
  expect(vi.getTimerCount()).toBe(0);m.select("cracked");expect(m.snapshot().current).toBe("cracked");
});
it("failure stops playback, rejects a failed frame and keeps other frames usable",async()=>{
  const {m,ready}=await setup();ready();m.toggle();m.available("open",false);vi.advanceTimersByTime(1000);
  expect(m.snapshot()).toMatchObject({current:"closed",busy:false,canPlay:false,error:"無法載入：open"});
  expect(m.select("open")).toBe(false);expect(m.select("half-open")).toBe(true);expect(vi.getTimerCount()).toBe(0);
  m.dispose();expect(vi.getTimerCount()).toBe(0);
});
