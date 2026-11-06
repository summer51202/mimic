export function createPositionModel(metadata) {
  const scene={...metadata.scene},title={...metadata.title};
  const id=metadata.frame?.id??"desktop-single";
  const sizes={"desktop-single":[960,540,288,84],"phone-staggered":[390,600,148,98]};
  const dimensions=sizes[id];
  if(!dimensions||[scene.width,scene.height,title.width,title.height].some((n,i)=>n!==dimensions[i])||
     (metadata.frame&&(metadata.frame.width!==scene.width||metadata.frame.height!==scene.height))||
     ![title.x,title.y].every(Number.isInteger)||
     ![scene,title].every(a=>typeof a.path==="string"&&/^[a-f0-9]{64}$/.test(a.sha256)))throw Error("Invalid positioning metadata");
  const width=scene.width,height=scene.height,tw=title.width,th=title.height;
  const finite=(...values)=>{if(!values.every(Number.isFinite))throw Error("Non-finite position");};
  const position=(x,y)=>{finite(x,y);return {x:Math.max(0,Math.min(width-tw,Math.round(x))),y:Math.max(0,Math.min(height-th,Math.round(y)))};};
  const initial=Object.freeze(position(title.x,title.y));
  return Object.freeze({
    initial,position,
    point(x,y,rect){
      finite(x,y,rect.left,rect.top,rect.width,rect.height);
      if(rect.width<=0||rect.height<=0)throw Error("Image content has no size");
      return {x:(x-rect.left)*width/rect.width,y:(y-rect.top)*height/rect.height};
    },
    begin(p,q){finite(q.x,q.y);return {position:position(p.x,p.y),point:{...q}};},
    drag(a,q){return position(a.position.x+q.x-a.point.x,a.position.y+q.y-a.point.y);},
    nudge(p,dx,dy,fast=false){finite(dx,dy);return position(p.x+dx*(fast?10:1),p.y+dy*(fast?10:1));},
    payload(p){
      const value=position(p.x,p.y);
      return {schema:"mimic-landing-title-position/v1",reviewOnly:true,
        frame:{id,width,height},
        scene:{path:scene.path,sha256:scene.sha256},
        title:{path:title.path,sha256:title.sha256,...value,width:tw,height:th},
        anchor:"top-left",unit:"logical-px",
        centerPercent:{x:Number(((value.x+tw/2)/width*100).toFixed(2)),y:Number(((value.y+th/2)/height*100).toFixed(2))}};
    },
  });
}
