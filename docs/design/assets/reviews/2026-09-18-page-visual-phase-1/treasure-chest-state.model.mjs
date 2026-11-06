export const states=["closed","cracked","half-open","open"];
export function createChestStateModel({schedule,cancel,onChange,reducedMotion}){
  let current=0,busy=false,timer=null,error="";
  const ready=new Set();
  const snapshot=()=>({current:states[current],busy,error,ready:[...ready],canPlay:ready.size===4&&!busy});
  const emit=()=>onChange(snapshot());
  const stop=()=>{if(timer!==null)cancel(timer);timer=null;busy=false;};
  function available(id,ok){
    if(!states.includes(id))throw Error("Unknown state");
    if(ok)ready.add(id);else{ready.delete(id);stop();error="無法載入："+id;}
    emit();
  }
  function select(id){
    const n=states.indexOf(id);if(n<0||!ready.has(id))return false;
    stop();current=n;emit();return true;
  }
  function toggle(){
    if(busy||ready.size!==4)return false;
    const target=current===3?0:3,direction=target>current?1:-1;
    if(reducedMotion()){current=target;emit();return true;}
    busy=true;emit();
    const tick=()=>{current+=direction;timer=null;if(current===target)busy=false;else timer=schedule(tick,140);emit();};
    timer=schedule(tick,140);return true;
  }
  emit();return {snapshot,available,select,toggle,dispose:stop};
}
