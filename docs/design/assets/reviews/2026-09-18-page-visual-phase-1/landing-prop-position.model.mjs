// Self-contained for the local-file review page, like the title positioning model.
export function createPropPositionModel(meta) {
  const {frame,scene,objects,fixed,guidance}=meta??{};
  const finite=(...v)=>{if(!v.every(Number.isFinite))throw Error("Non-finite coordinate");};
  const asset=a=>a&&typeof a.path==="string"&&/^[a-f0-9]{64}$/.test(a.sha256)&&a.width>0&&a.height>0;
  const exploration=frame?.id==="phone"&&frame.width===1170;
  const dims=frame?.id==="desktop"?[960,540]:frame?.id==="phone"?[exploration?1170:390,600]:[];
  const legacyIds=frame?.id==="desktop"?"chest,mapCrate,pressurePlate":exploration?"chest,torch,explorationBats":"mapCrate";
  const ids=objects?.some(o=>o.id==="carving")?(exploration?"chest,torch,explorationBats,carving":"chest,mapCrate,carving"):legacyIds;
  if(exploration&&(frame.viewportWidth!==390||frame.initialViewportX!==390))throw Error("Invalid exploration viewport");
  if(frame?.width!==dims[0]||frame?.height!==dims[1]||!asset(scene)||scene.width!==frame.width||scene.height!==frame.height||
    !Array.isArray(objects)||objects.map(o=>o.id).join(",")!==ids||
    !Array.isArray(fixed)||!guidance?.forbidden?.length)throw Error("Invalid frame metadata");
  for(const o of objects){
    finite(o.x,o.y,o.offset.x,o.offset.y,o.width,o.height,o.opacity);
    if(!Object.hasOwn(o.variants,o.variant)||!Object.values(o.variants).every(a=>asset(a)&&a.width===o.width&&a.height===o.height))throw Error("Invalid prop source");
  }
  for(const f of fixed)if(!asset(f))throw Error("Invalid fixed source");
  const byId=id=>{const o=objects.find(o=>o.id===id);if(!o)throw Error("Unknown prop");return o;};
  const initial=()=>Object.fromEntries(objects.map(o=>[o.id,{x:o.x,y:o.y,variant:o.variant}]));
  function rect(id,p,variant=p.variant){
    const o=byId(id);finite(p.x,p.y);
    if(!Object.hasOwn(o.variants,variant))throw Error("Invalid sprite preview");
    return {x:Math.round(p.x)-o.offset.x,y:Math.round(p.y)-o.offset.y,width:o.width,height:o.height};
  }
  const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const outside=r=>r.x<0||r.y<0||r.x+r.width>frame.width||r.y+r.height>frame.height;
  function visible(id,p,variant=p.variant,lid=false){
    const o=byId(id),r=rect(id,p,variant),b=lid?o.lidBounds:o.variants[variant].bounds;
    return {x:r.x+b.x,y:r.y+b.y,width:b.width,height:b.height};
  }
  function warnings(id,p,state=initial()){
    const o=byId(id),r=visible(id,p),full=rect(id,p),floor=guidance.floor;
    const foot={x:full.x+o.width/2,y:full.y+o.height},out=[];
    if(outside(r))out.push("outside-frame");
    if(intersects(r,guidance.dialogue))out.push("dialogue");
    if(!["torch","explorationBats","carving"].includes(id)&&(foot.x<floor.x||foot.x>floor.x+floor.width||foot.y<floor.y||foot.y>floor.y+floor.height))out.push("outside-floor");
    for(const zone of guidance.forbidden)if(intersects(r,zone))out.push("occludes:"+zone.id);
    if(id==="carving"&&guidance.carving){
      const {obstacles,masonry,titleReserve}=guidance.carving;
      for(const zone of obstacles)if(intersects(r,zone))out.push("occludes:"+zone.id);
      const chest=visible("chest",state.chest,"open");
      if(intersects(r,chest))out.push("occludes:寶箱開蓋");
      if(titleReserve&&intersects(r,titleReserve))out.push("title-reserve");
      if(masonry.some(zone=>intersects(r,zone)))out.push("masonry-seams");
    }
    if(id==="chest"){
      const lid=visible(id,p,"open",true);
      if(outside(lid)||intersects(lid,guidance.dialogue)||guidance.forbidden.some(z=>intersects(lid,z)))out.push("open-lid-clearance");
    }
    return out;
  }
  const idDepth=(id,depth)=>id==="carving"?-100:depth;
  function layerOrder(state){
    return [...fixed.map(f=>({id:f.id,depth:f.depth})),...objects.map(o=>({id:o.id,depth:idDepth(o.id,rect(o.id,state[o.id]).y+o.height)}))]
      .sort((a,b)=>a.depth-b.depth||a.id.localeCompare(b.id)).map(a=>a.id);
  }
  return {
    initial,rect,warnings,layerOrder,
    set(state,id,x,y,variant=state[id]?.variant){
      finite(x,y);rect(id,{x,y,variant});return {...state,[id]:{x:Math.round(x),y:Math.round(y),variant}};
    },
    move(state,id,dx,dy,step=1){finite(dx,dy,step);return this.set(state,id,state[id].x+dx*step,state[id].y+dy*step);},
    point(x,y,r){
      finite(x,y,r.left,r.top,r.width,r.height);if(r.width<=0||r.height<=0)throw Error("Empty image content");
      return {x:(x-r.left)*frame.width/r.width,y:(y-r.top)*frame.height/r.height};
    },
    payload(state){
      if(Object.keys(state).sort().join(",")!==objects.map(o=>o.id).sort().join(","))throw Error("Unexpected state objects");
      const order=layerOrder(state);
      return {schema:"mimic-landing-prop-position/v1",reviewOnly:true,runtimePromotion:false,unit:"logical-px",frame:{...frame},scene:{...scene},
        guidance:structuredClone(guidance),fixed:structuredClone(fixed),layerOrder:order,
        objects:objects.map(o=>{
          const p=state[o.id],r=rect(o.id,p),source=o.variants[p.variant];
          return {id:o.id,anchor:o.anchor,x:Math.round(p.x),y:Math.round(p.y),origin:{x:r.x,y:r.y},ground:{x:r.x+o.width/2,y:r.y+o.height},
            width:o.width,height:o.height,opacity:o.opacity,variant:p.variant,source:{...source},variants:structuredClone(o.variants),
            depth:idDepth(o.id,r.y+o.height),layerIndex:order.indexOf(o.id),warnings:warnings(o.id,p,state)};
        })};
    },
  };
}
