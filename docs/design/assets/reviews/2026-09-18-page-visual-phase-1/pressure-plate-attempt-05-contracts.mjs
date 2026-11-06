import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds} from "./landing-chest-raster.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export function fitPlate(p){
  const b=bounds(p),scale=Math.min(96/b.width,18/b.height),width=Math.ceil(b.width*scale),height=Math.ceil(b.height*scale);
  if(b.x===0||b.y===0||b.x+b.width>=p.width||b.y+b.height>=p.height)throw Error("Clipped raw source");
  if(width<85||height<16)throw Error("Source proportions do not fit guide");
  const sprite=new PNG({width:96,height:18}),offset=18-height;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const sx=b.x+Math.floor(x/scale),sy=b.y+Math.floor(y/scale);
    if(sx>=b.x+b.width||sy>=b.y+b.height)continue;
    const si=(sy*p.width+sx)*4,di=((y+offset)*96+x)*4;
    if(p.data[si+3]<200)continue;sprite.data.set(p.data.subarray(si,si+3),di);sprite.data[di+3]=255;
  }
  return {sprite,geometry:{sourceBounds:b,uniformScale:scale,sampledSize:[width,height],canvasOffset:[0,offset],alphaThreshold:200}};
}
export function measureSlopes(p,target){
  const b=bounds(p),rows=[];
  // Fixed central 20–70% of opaque height excludes rounded back corners and
  // vertical front fascia. Both sides and every control use the same rule.
  const first=b.y+Math.floor((b.height-1)*0.2),last=b.y+Math.floor((b.height-1)*0.7);
  for(let y=first;y<=last;y++){
    let left=p.width,right=-1;
    for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>=200){left=Math.min(left,x);right=Math.max(right,x);}
    if(right<left)throw Error("Empty silhouette row");rows.push({y,left,right});
  }
  const fit=key=>{const my=rows.reduce((s,p)=>s+p.y,0)/rows.length,mx=rows.reduce((s,p)=>s+p[key],0)/rows.length;return -rows.reduce((s,p)=>s+(p.y-my)*(p[key]-mx),0)/rows.reduce((s,p)=>s+(p.y-my)**2,0);};
  const left=fit("left"),right=fit("right"),relativeDifference=Math.abs(left-right)/Math.max(Math.abs(left),Math.abs(right));
  const passes=[left,right].every(v=>v>0&&v>=target*0.75&&v<=target*1.25)&&relativeDifference<=0.2;
  return {left,right,target,relativeDifference,passes,rows,method:"alpha>=200; central 20–70% opaque height; least-squares x against upward y",thresholds:{relativeTolerance:0.25,maxRelativeDifference:0.2}};
}
export function measureFrontGap(p){
  let best={row:-1,start:0,length:0,coverage:0};
  for(let y=9;y<=15;y++){
    let start=0,length=0;
    for(let x=0;x<p.width;x++){
      const [r,g,b,a]=p.data.subarray((y*p.width+x)*4,(y*p.width+x+1)*4);
      if(a===255&&r<=65&&r>=g&&g>=b){if(!length)start=x;length++;if(length>best.length)best={row:y,start,length,coverage:length/80};}else length=0;
    }
  }
  return {...best,criteria:{rows:[9,15],maxRed:65,warmOrder:"r>=g>=b",frontLongEdgeWidth:80,minCoverage:0.8}};
}
export function measureColour(p,slope){
  if(p.width!==960||p.height!==540)throw Error("Expected scene size");
  let s=0,v=0,n=0,fs=0,fv=0,fn=0;
  // Fixed analytical parallelogram inset, established from the guide before
  // scene generation. Never inferred from brightness or passing pixels.
  for(let y=337;y<359;y++)for(let x=848;x<948;x++){
    const ly=y-339,lx=x-850,shift=Math.round((17-ly)*slope);
    const inside=ly>=4&&ly<=10&&lx>=4+shift&&lx<76+shift;
    const floor=!(x>=850&&x<946&&y>=339&&y<357);
    if(!inside&&!floor)continue;
    const i=(y*960+x)*4,max=Math.max(...p.data.subarray(i,i+3)),min=Math.min(...p.data.subarray(i,i+3));
    const sat=max?(max-min)/max:0,val=max/255;
    if(inside){s+=sat;v+=val;n++;}else{fs+=sat;fv+=val;fn++;}
  }
  return {plate:{s:s/n,v:v/n,n},floor:{s:fs/fn,v:fv/fn,n:fn},delta:v/n-fv/fn};
}
