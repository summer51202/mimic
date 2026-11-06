export async function mountChestStates(factory,root=document){
  const host=root.querySelector("[data-chest-preview]"),img=host?.querySelector(".scene picture img");if(!host||!img)return;
  const stateButtons=[...host.querySelectorAll("[data-pick]")],frameButtons=[...host.querySelectorAll("[data-frame-pick]")];
  const plays=[...host.querySelectorAll("[data-toggle]")],assets=[...host.querySelectorAll("[data-state-asset]")];
  const status=host.querySelector("[data-current]"),error=host.querySelector("[data-error]");
  const model=factory({schedule:(fn,ms)=>setTimeout(fn,ms),cancel:id=>clearTimeout(id),reducedMotion:()=>matchMedia("(prefers-reduced-motion: reduce)").matches,
    onChange:s=>{
      host.dataset.frame=s.frame;host.dataset.state=s.state;host.dataset.busy=String(s.busy);status.textContent=s.state+" / "+s.frame;error.textContent=s.error;
      const a=assets.find(a=>a.dataset.stateAsset===s.frame),valid=s.ready.includes(s.frame);
      img.style.visibility=valid?"visible":"hidden";if(a&&valid)img.src=a.src;
      for(const b of stateButtons){b.disabled=!s.ready.includes(b.dataset.pick);b.setAttribute("aria-pressed",String(b.dataset.pick===s.state));}
      for(const b of frameButtons){b.disabled=!s.ready.includes(b.dataset.framePick);b.setAttribute("aria-pressed",String(b.dataset.framePick===s.frame));}
      for(const b of plays){b.disabled=!s.canPlay;b.setAttribute("aria-label",s.frame==="open"?"關閉藏寶箱":"開啟藏寶箱");}
    }});
  for(const b of stateButtons)b.addEventListener("click",()=>model.selectFrame(b.dataset.pick));
  for(const b of frameButtons)b.addEventListener("click",()=>model.selectFrame(b.dataset.framePick));
  for(const b of plays)b.addEventListener("click",()=>model.toggle());
  await Promise.all(assets.map(async a=>{let failed=false;const fail=()=>{failed=true;model.available(a.dataset.stateAsset,false);};a.addEventListener("error",fail);try{await a.decode();if(!failed)model.available(a.dataset.stateAsset,true);}catch{fail();}}));
  host.dataset.loaded="true";return model;
}
