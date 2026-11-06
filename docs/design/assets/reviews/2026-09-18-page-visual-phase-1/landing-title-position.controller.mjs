export function mountPositionTool(factory,root,sharedWrites) {
  if(!root)return;
  const q=selector=>root.querySelector(selector),win=root.ownerDocument.defaultView;
  const background=q("[data-position-background]"),sprite=q("[data-position-sprite]");
  const title=q("[data-position-title]"),mode=q("[data-position-mode]"),guideToggle=q("[data-position-guide-toggle]");
  const guides=q("[data-position-guides]"),box=q("[data-position-guide-box]"),vertical=q("[data-position-guide-v]"),horizontal=q("[data-position-guide-h]");
  const output=q("[data-position-json]"),coordinates=q("[data-position-coordinates]"),status=q("[data-position-status]");
  const reset=q("[data-position-reset]"),copy=q("[data-position-copy]"),nudges=[...root.querySelectorAll("[data-position-nudge]")];
  const message=text=>{status.textContent=text;};
  let model,meta,position,ready=false,drag=null,revision=0,request=0;
  let queue=Promise.resolve();
  const writes=sharedWrites??{enqueue(task){const result=queue.catch(()=>{}).then(task);queue=result;return result;}};
  const available=()=>ready&&!root.hidden;
  function endDrag(){
    const old=drag;drag=null;
    if(old&&title.hasPointerCapture(old.id))title.releasePointerCapture(old.id);
    root.removeAttribute("data-dragging");
  }
  function fail(){
    ready=false;endDrag();root.dataset.ready="error";guides.hidden=true;output.value="";
    coordinates.textContent="無有效座標";
    for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
    title.tabIndex=-1;message("圖片或資料不符，無法使用定位；原比較頁仍可閱讀。");
  }
  try{meta=JSON.parse(q("[data-position-config]").textContent);model=factory(meta);position={...model.initial};}
  catch{fail();return;}
  function draw(){
    const payload=model.payload(position),cx=payload.centerPercent.x,cy=payload.centerPercent.y;
    const sw=meta.scene.width,sh=meta.scene.height,tw=meta.title.width,th=meta.title.height;
    const rect={left:position.x/sw*100+"%",top:position.y/sh*100+"%",width:tw/sw*100+"%",height:th/sh*100+"%"};
    Object.assign(title.style,rect);Object.assign(box.style,rect);
    vertical.style.left=(position.x+tw/2)/sw*100+"%";horizontal.style.top=(position.y+th/2)/sh*100+"%";
    guides.hidden=!(available()&&mode.checked&&guideToggle.checked);
    title.disabled=!(available()&&mode.checked);title.tabIndex=available()&&mode.checked?0:-1;
    for(const button of nudges)button.disabled=!(available()&&mode.checked);
    mode.disabled=!available();guideToggle.disabled=!available();reset.disabled=!available();copy.disabled=!available();
    output.value=JSON.stringify(payload,null,2);
    coordinates.textContent="左上 X "+position.x+"／Y "+position.y+" logical px；中心 "+cx.toFixed(2)+"%／"+cy.toFixed(2)+"%；尺寸 "+tw+"×"+th+"（鎖定）";
  }
  function update(next,force=false){
    if(!force&&next.x===position.x&&next.y===position.y)return;
    position=next;revision++;draw();message("位置已變更，請重新複製。");
  }
  title.addEventListener("pointerdown",event=>{
    if(!available()||!mode.checked||event.button!==0||drag)return;
    const point=model.point(event.clientX,event.clientY,background.getBoundingClientRect());
    title.focus({preventScroll:true});
    try{title.setPointerCapture(event.pointerId);}catch{return;}
    drag={id:event.pointerId,anchor:model.begin(position,point)};
    root.dataset.dragging="true";event.preventDefault();
  });
  title.addEventListener("pointermove",event=>{
    if(!drag||drag.id!==event.pointerId||!available()||!mode.checked)return;
    update(model.drag(drag.anchor,model.point(event.clientX,event.clientY,background.getBoundingClientRect())));
    event.preventDefault();
  });
  for(const name of ["pointerup","pointercancel","lostpointercapture"])title.addEventListener(name,event=>{
    if(drag&&drag.id===event.pointerId)endDrag();
  });
  const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  title.addEventListener("keydown",event=>{
    if(!available()||!mode.checked||root.ownerDocument.activeElement!==title||event.altKey||event.ctrlKey||event.metaKey||!steps[event.key])return;
    event.preventDefault();const [dx,dy]=steps[event.key];
    update(model.nudge(position,dx,dy,event.shiftKey));
  });
  for(const button of nudges)button.addEventListener("click",()=>{
    if(!available()||!mode.checked)return;endDrag();
    const [dx,dy]=button.dataset.positionNudge.split(",").map(Number);
    update(model.nudge(position,dx,dy));
  });
  mode.addEventListener("change",()=>{
    endDrag();if(!mode.checked&&root.ownerDocument.activeElement===title)mode.focus({preventScroll:true});
    draw();
  });
  guideToggle.addEventListener("change",draw);
  reset.addEventListener("click",()=>{if(!available())return;endDrag();update({...model.initial},true);});
  copy.addEventListener("click",()=>{
    if(!available())return;
    const token=++request,version=revision,text=output.value;
    message("正在複製位置…");
    // Serializing writes keeps an older delayed write from overwriting the newest clipboard content.
    writes.enqueue(async()=>{
      if(token!==request||!ready)return;
      try{
        if(typeof win.navigator.clipboard?.writeText!=="function")throw Error("Clipboard unavailable");
        await win.navigator.clipboard.writeText(text);
        if(token!==request||!ready)return;
        message(version===revision?"已複製目前位置":"剪貼簿為先前位置，請重新複製。");
      }catch{
        if(token!==request||!ready)return;
        if(!root.hidden){output.focus();output.select();}
        message("無法自動複製，請選取 JSON 並按 Ctrl+C。");
      }
    });
  });
  for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
  title.tabIndex=-1;guides.hidden=true;
  Promise.all([background.decode(),sprite.decode()]).then(()=>{
    if(background.naturalWidth!==meta.scene.width||background.naturalHeight!==meta.scene.height||
       sprite.naturalWidth!==meta.title.width||sprite.naturalHeight!==meta.title.height)throw Error("Wrong image dimensions");
    ready=true;root.dataset.ready="true";draw();message("位置預覽，尚未套用；重整會回初始位置。");
  }).catch(fail);
  return {deactivate(){
    endDrag();guides.hidden=true;title.tabIndex=-1;
    for(const element of [title,mode,guideToggle,reset,copy,...nudges])element.disabled=true;
  },activate(){if(ready)draw();}};
}
