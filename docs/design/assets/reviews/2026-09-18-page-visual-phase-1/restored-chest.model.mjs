import {frames,timelines,stateOfFrame} from "./restored-chest.config.mjs";
export function createChestStateModel({schedule,cancel,onChange,reducedMotion}){
  let frame="closed",busy=false,timer=null,error="";const ready=new Set();
  const snapshot=()=>({frame,state:stateOfFrame(frame),busy,error,ready:[...ready],canPlay:ready.size===frames.length&&!busy});
  const emit=()=>onChange(snapshot());
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;busy=false;};
  function available(id,ok){
    if(!frames.includes(id))throw Error("Unknown frame");
    if(ok)ready.add(id);else{ready.delete(id);stop();error="無法載入："+id;}emit();
  }
  function selectFrame(id){
    if(!frames.includes(id)||!ready.has(id))return false;
    stop();frame=id;emit();return true;
  }
  function toggle(){
    if(busy||ready.size!==frames.length)return false;
    const direction=frame==="open"?"close":"open",target=direction==="open"?"open":"closed";
    if(reducedMotion()){frame=target;emit();return true;}
    const sequence=timelines[direction],start=sequence.findIndex(([id])=>id===frame),steps=sequence.slice(start+1);
    busy=true;emit();
    const next=index=>{timer=schedule(()=>{
      timer=null;frame=steps[index][0];
      if(index+1===steps.length)busy=false;else next(index+1);emit();
    },steps[index][1]);};
    next(0);return true;
  }
  emit();return {snapshot,available,selectFrame,toggle,dispose:stop};
}
