export async function mountChestStates(factory,root=document){
  const host=root.querySelector("[data-chest-preview]"),img=host?.querySelector(".scene picture img");
  if(!host||!img)return;
  const picks=[...host.querySelectorAll("[data-pick]")],plays=[...host.querySelectorAll("[data-toggle]")];
  const assets=[...host.querySelectorAll("[data-state-asset]")];
  const status=host.querySelector("[data-current]"),error=host.querySelector("[data-error]");
  const model=factory({schedule:(fn,ms)=>setTimeout(fn,ms),cancel:id=>clearTimeout(id),
    reducedMotion:()=>matchMedia("(prefers-reduced-motion: reduce)").matches,
    onChange:s=>{
      host.dataset.state=s.current;host.dataset.busy=String(s.busy);status.textContent=s.current;error.textContent=s.error;
      const a=assets.find(a=>a.dataset.stateAsset===s.current);
      if(a&&s.ready.includes(s.current))img.src=a.src;
      for(const b of picks){b.disabled=!s.ready.includes(b.dataset.pick);b.setAttribute("aria-pressed",String(b.dataset.pick===s.current));}
      for(const b of plays){b.disabled=!s.canPlay;b.setAttribute("aria-label",s.current==="open"?"關閉藏寶箱":"開啟藏寶箱");}
    }});
  for(const b of picks)b.addEventListener("click",()=>model.select(b.dataset.pick));
  for(const b of plays)b.addEventListener("click",()=>model.toggle());
  await Promise.all(assets.map(async a=>{
    let failed=false;const fail=()=>{failed=true;model.available(a.dataset.stateAsset,false);};
    a.addEventListener("error",fail);
    try{await a.decode();if(!failed)model.available(a.dataset.stateAsset,true);}catch{fail();}
  }));
  host.dataset.loaded="true";return model;
}
