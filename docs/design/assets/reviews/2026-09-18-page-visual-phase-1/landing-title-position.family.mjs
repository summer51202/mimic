export function mountPositionFamily(factory,mount,container) {
  if(!container)return;
  const panels=[...container.querySelectorAll("[data-title-position-tool]")];
  const buttons=[...container.querySelectorAll("[data-position-frame]")];
  let queue=Promise.resolve();
  const writes={enqueue(task){const result=queue.catch(()=>{}).then(task);queue=result;return result;}};
  const controllers=new Map(panels.map(panel=>[panel.dataset.frame,mount(factory,panel,writes)]));
  function select(id){
    if(!panels.some(panel=>panel.dataset.frame===id))return;
    const active=container.ownerDocument.activeElement;
    if(panels.some(panel=>panel.dataset.frame!==id&&panel.contains(active)))buttons.find(button=>button.dataset.positionFrame===id)?.focus({preventScroll:true});
    for(const panel of panels)controllers.get(panel.dataset.frame)?.deactivate();
    for(const panel of panels){
      const selected=panel.dataset.frame===id;
      panel.hidden=!selected;panel.inert=!selected;
      if(selected)controllers.get(id)?.activate();
    }
    for(const button of buttons)button.setAttribute("aria-pressed",String(button.dataset.positionFrame===id));
    container.dataset.selectedFrame=id;
  }
  for(const button of buttons)button.addEventListener("click",()=>select(button.dataset.positionFrame));
  const query=new URLSearchParams(container.ownerDocument.defaultView.location.search);
  select(query.get("position")==="phone"?"phone-staggered":"desktop-single");
}
