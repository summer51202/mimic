import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export function bounds(p){
  let x=p.width,y=p.height,r=-1,b=-1;
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    if(p.data[(sy*p.width+sx)*4+3]<200)continue;
    x=Math.min(x,sx);y=Math.min(y,sy);r=Math.max(r,sx);b=Math.max(b,sy);
  }
  if(r<x)throw Error("Empty source");
  return {x,y,width:r-x+1,height:b-y+1};
}
export function nearest(p,w,h,b={x:0,y:0,width:p.width,height:p.height},clean=false){
  const out=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=b.x+Math.min(b.width-1,Math.floor(x*b.width/w));
    const sy=b.y+Math.min(b.height-1,Math.floor(y*b.height/h));
    const si=(sy*p.width+sx)*4,di=(y*w+x)*4;
    if(clean&&p.data[si+3]<200)continue;
    out.data.set(p.data.subarray(si,si+4),di);
    if(clean)out.data[di+3]=255;
  }
  return out;
}
export function fitChest(p){
  if(!p.data.some((v,i)=>i%4===3&&v===0))throw Error("Transparent source required");
  const b=bounds(p),scale=Math.min(78/b.width,66/b.height);
  const w=Math.round(b.width*scale),h=Math.round(b.height*scale);
  // Up to four logical pixels of fit slack; never stretch or enlarge the layer.
  if(w<74||h<62)throw Error("Source proportions do not fit fixed chest footprint");
  if(b.x===0||b.y===0||b.x+b.width===p.width||b.y+b.height===p.height)throw Error("Source touches edge; inspect for clipping");
  const sprite=nearest(p,w,h,b,true),out=new PNG({width:78,height:66});
  const x=Math.floor((78-w)/2),y=66-h;
  for(let sy=0;sy<h;sy++)for(let sx=0;sx<w;sx++){
    const si=(sy*w+sx)*4,di=((sy+y)*78+sx+x)*4;
    out.data.set(sprite.data.subarray(si,si+4),di);
  }
  return {png:out,fit:{bounds:b,width:w,height:h,x,y,scale}};
}
export function over(canvas,p,x,y){
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x+p.width>canvas.width||y+p.height>canvas.height)throw Error("Clipped layer");
  for(let sy=0;sy<p.height;sy++)for(let sx=0;sx<p.width;sx++){
    const si=(sy*p.width+sx)*4,di=((sy+y)*canvas.width+sx+x)*4,a=p.data[si+3]/255;
    if(!a)continue;
    for(let c=0;c<3;c++)canvas.data[di+c]=Math.round(p.data[si+c]*a+canvas.data[di+c]*(1-a));
    canvas.data[di+3]=255;
  }
}
export function gray(p){
  const out=new PNG({width:p.width,height:p.height});
  for(let i=0;i<p.data.length;i+=4){
    const v=Math.round((2126*p.data[i]+7152*p.data[i+1]+722*p.data[i+2])/10000);
    out.data.set([v,v,v,p.data[i+3]],i);
  }
  return out;
}
