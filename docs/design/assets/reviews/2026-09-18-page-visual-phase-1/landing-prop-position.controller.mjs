export function mountPropPositionTool(factory,container,measureCarving) {
  if(!container)return;
  const win=container.ownerDocument.defaultView,panels=[...container.querySelectorAll("[data-prop-panel]")];
  // One queue across both frames prevents a delayed old clipboard write winning.
  let queue=Promise.resolve(),request=0;
  const controllers=new Map();
  for(const root of panels){
    const q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
    const stage=q("[data-stage]"),output=q("textarea"),status=q("[data-status]"),select=q("[data-object-select]"),variant=q("[data-variant]");
    const edit=q("[data-edit-toggle]"),guideToggle=q("[data-guides-toggle]"),guides=q("[data-guides]"),x=q("[data-x]"),y=q("[data-y]");
    const props=all("[data-prop]"),controls=all("button,input,select"),warning=q("[data-warnings]"),coordinates=q("[data-coordinates]");
    const ratio=q("[data-carving-ratio]");
    let wallPixels,carvingPixels;
    let model,meta,state,ready=false,revision=0,drag=null;
    const available=()=>ready&&!root.hidden&&!root.inert;
    const editable=()=>available()&&edit.checked;
    const message=t=>{status.textContent=t;};
    function endDrag(){const old=drag;drag=null;if(old?.element.hasPointerCapture(old.pointer))old.element.releasePointerCapture(old.pointer);}
    function fail(){
      ready=false;revision++;endDrag();root.dataset.ready="error";guides.hidden=true;output.value="";
      for(const c of controls)c.disabled=true;for(const p of props)p.tabIndex=-1;
      coordinates.textContent="無有效座標";message("圖片或資料不符，已停用此畫面的擺位與 JSON。");
    }
    try{meta=JSON.parse(q("[data-config]").textContent);model=factory(meta);state=model.initial();}catch{fail();continue;}
    const segmentButtons=all("[data-viewport-x]");
    let viewportX=meta.frame.initialViewportX;
    for(const button of segmentButtons)button.addEventListener("click",()=>{
      if(!available())return;
      endDrag();
      viewportX=Number(button.dataset.viewportX);
      root.style.setProperty("--segment",String(viewportX/meta.frame.viewportWidth));
      draw();
    });
    const selected=()=>select.value;
    function draw(){
      const id=selected(),payload=model.payload(state),order=payload.layerOrder;
      for(const p of props){
        const o=meta.objects.find(o=>o.id===p.dataset.prop),s=state[o.id],r=model.rect(o.id,s);
        Object.assign(p.style,{left:r.x/meta.frame.width*100+"%",top:r.y/meta.frame.height*100+"%",width:r.width/meta.frame.width*100+"%",height:r.height/meta.frame.height*100+"%",zIndex:order.indexOf(o.id)+2});
        p.dataset.x=s.x;p.dataset.y=s.y;p.setAttribute("aria-pressed",String(o.id===id));p.classList.toggle("selected",o.id===id&&editable());
        for(const image of p.querySelectorAll("img"))image.hidden=image.dataset.spriteVariant!==s.variant;
        const visible=!segmentButtons.length||r.x+r.width>viewportX&&r.x<viewportX+meta.frame.viewportWidth;
        p.disabled=!editable()||!visible;p.tabIndex=editable()&&visible?0:-1;
      }
      for(const f of all("[data-fixed]"))f.style.zIndex=order.indexOf(f.dataset.fixed)+2;
      q("[data-sign-label]").style.zIndex=order.indexOf("sign")+2;
      for(const c of controls)if(!props.includes(c))c.disabled=!available();
      for(const button of segmentButtons)button.setAttribute("aria-pressed",String(Number(button.dataset.viewportX)===viewportX));
      for(const c of all("[data-nudge],[data-x],[data-y],[data-object-select],[data-variant]"))c.disabled=!editable();
      x.value=state[id].x;y.value=state[id].y;
      const o=meta.objects.find(o=>o.id===id),keys=Object.keys(o.variants);
      variant.parentElement.hidden=keys.length<2;
      if(variant.dataset.object!==id){variant.replaceChildren(...keys.map(key=>{const option=root.ownerDocument.createElement("option");option.value=key;option.textContent=key;return option;}));variant.dataset.object=id;}
      variant.value=state[id].variant;guides.hidden=!(available()&&guideToggle.checked&&edit.checked);
      if(ratio){
        const chest=meta.objects.find(o=>o.id==="chest");
        const r=model.rect("chest",state.chest);
        const b=chest.variants.open.bounds;
        const zone=q("[data-open-zone]");
        zone.style.left=(r.x+b.x)/meta.frame.width*100+"%";
        zone.style.top=(r.y+b.y)/meta.frame.height*100+"%";
        const p=state.carving;
        const value=measureCarving(wallPixels,carvingPixels[p.variant],p.x,p.y)?.ratio;
        const inRange=p.variant==="hidden"?value>=1.4&&value<=2.2:value>=3.5;
        ratio.textContent=value==null?"岩壁紋理比值無法量測":
          `岩壁紋理比值 · ${p.variant} ${value.toFixed(2)}（${inRange?"達標":"超出門檻"}）`;
      }
      output.value=JSON.stringify(payload,null,2);
      coordinates.textContent=o.label+"："+(o.anchor==="ground"?"腳底":"左上")+" X "+state[id].x+"／Y "+state[id].y+"；尺寸 "+o.width+"×"+o.height+"（鎖定）";
      const labels={"title-reserve":"進入標題外框四周 48 px 保留區","masonry-seams":"進入有灰縫的砌磚區，請移到單一岩面","outside-frame":"超出畫面","dialogue":"進入對話框區","outside-floor":"腳底離開地板帶","open-lid-clearance":"open 蓋子超出允許區或遮擋"};
      warning.replaceChildren(...payload.objects.flatMap(o=>o.warnings.map(w=>{const li=root.ownerDocument.createElement("li");li.textContent=o.id+"："+(labels[w]??"遮擋 "+w.slice(9));return li;})));
      if(!warning.children.length){const li=root.ownerDocument.createElement("li");li.textContent="目前無警示；仍請目視確認。";warning.append(li);}
    }
    function update(next){state=next;revision++;draw();message("預覽已變更，請重新複製 JSON。");}
    for(const element of props){
      const id=element.dataset.prop;
      element.addEventListener("pointerdown",event=>{
        if(!editable()||event.button!==0||drag)return;
        select.value=id;draw();element.focus({preventScroll:true});
        try{element.setPointerCapture(event.pointerId);}catch{return;}
        drag={pointer:event.pointerId,element,id,start:{...state[id]},point:model.point(event.clientX,event.clientY,stage.getBoundingClientRect())};event.preventDefault();
      });
      element.addEventListener("pointermove",event=>{
        if(!editable()||!drag||drag.pointer!==event.pointerId)return;
        const point=model.point(event.clientX,event.clientY,stage.getBoundingClientRect());
        update(model.set(state,drag.id,drag.start.x+point.x-drag.point.x,drag.start.y+point.y-drag.point.y));event.preventDefault();
      });
      for(const name of ["pointerup","pointercancel","lostpointercapture"])element.addEventListener(name,event=>{if(drag?.pointer===event.pointerId)endDrag();});
      element.addEventListener("focus",()=>{if(editable()){select.value=id;draw();}});
      element.addEventListener("keydown",event=>{
        const steps={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
        if(!editable()||root.ownerDocument.activeElement!==element||event.altKey||event.ctrlKey||event.metaKey||!steps[event.key])return;
        event.preventDefault();endDrag();update(model.move(state,id,...steps[event.key],event.shiftKey?10:1));
      });
    }
    for(const button of all("[data-nudge]"))button.addEventListener("click",()=>{if(editable()){endDrag();update(model.move(state,selected(),...button.dataset.nudge.split(",").map(Number)));}});
    select.addEventListener("change",()=>{if(editable()){endDrag();draw();}});
    variant.addEventListener("change",()=>{if(editable()){endDrag();const p=state[selected()];update(model.set(state,selected(),p.x,p.y,variant.value));}});
    function input(){
      if(!editable())return;
      if(!x.value.trim()||!y.value.trim()||!x.checkValidity()||!y.checkValidity()){message("請輸入有效整數座標。");return;}
      endDrag();try{update(model.set(state,selected(),Number(x.value),Number(y.value)));}catch{message("請輸入有效整數座標。");}
    }
    for(const c of [x,y]){c.addEventListener("change",input);c.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();input();}});}
    edit.addEventListener("change",()=>{endDrag();if(available())draw();});guideToggle.addEventListener("change",()=>{if(available())draw();});
    q("[data-reset]").addEventListener("click",()=>{if(available()){endDrag();update({...state,[selected()]:model.initial()[selected()]});}});
    q("[data-reset-all]").addEventListener("click",()=>{if(available()){endDrag();update(model.initial());}});
    q("[data-copy]").addEventListener("click",()=>{
      if(!available())return;
      const token=++request,version=revision,text=output.value;message("正在複製…");
      queue=queue.catch(()=>{}).then(async()=>{
        if(token!==request||!available())return;
        try{
          if(typeof win.navigator.clipboard?.writeText!=="function")throw Error("Clipboard unavailable");
          await win.navigator.clipboard.writeText(text);
          if(token!==request||!ready)return;
          message(version===revision?"已複製目前位置 JSON":"剪貼簿為先前位置，請重新複製。");
        }catch{
          if(token!==request||!ready)return;
          if(available()){output.focus();output.select();}message("無法自動複製，請選取 JSON 並按 Ctrl+C。");
        }
      });
    });
    for(const c of controls)c.disabled=true;for(const p of props)p.tabIndex=-1;
    const images=all("img");
    Promise.all(images.map(async image=>{
      await image.decode();if(image.naturalWidth!==Number(image.dataset.width)||image.naturalHeight!==Number(image.dataset.height))throw Error("Wrong image dimensions");
    })).then(()=>{
      if(ratio){
        const pixels=image=>{
          const canvas=root.ownerDocument.createElement("canvas");
          canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
          const ctx=canvas.getContext("2d");
          ctx.drawImage(image,0,0);
          return ctx.getImageData(0,0,canvas.width,canvas.height);
        };
        wallPixels=pixels(q(".background"));
        carvingPixels=Object.fromEntries(all('[data-prop="carving"] img').map(image=>[image.dataset.spriteVariant,pixels(image)]));
      }
      ready=true;root.dataset.ready="true";draw();message("僅預覽；重整會回初始位置，請先複製 JSON。");}).catch(fail);
    controllers.set(root,{deactivate(){endDrag();guides.hidden=true;for(const c of controls)c.disabled=true;for(const p of props)p.tabIndex=-1;},activate(){if(ready)draw();}});
  }
  function choose(id){
    if(!panels.some(p=>p.dataset.propPanel===id))return;
    const active=container.ownerDocument.activeElement;
    if(panels.some(p=>p.dataset.propPanel!==id&&p.contains(active)))container.querySelector('[data-frame="'+id+'"]').focus();
    for(const root of panels){controllers.get(root)?.deactivate();root.hidden=root.dataset.propPanel!==id;root.inert=root.hidden;}
    for(const root of panels)if(!root.hidden)controllers.get(root)?.activate();
    for(const button of container.querySelectorAll("[data-frame]"))button.setAttribute("aria-pressed",String(button.dataset.frame===id));
  }
  for(const button of container.querySelectorAll("[data-frame]"))button.addEventListener("click",()=>choose(button.dataset.frame));
  choose(new URLSearchParams(win.location.search).get("frame")==="phone"?"phone":"desktop");
}
