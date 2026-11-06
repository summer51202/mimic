import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds} from "./landing-chest-raster.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../.."),{PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export const geometry={canvas:[85,35],origin:[856,331],center:[898,348],opacity:0.85};
export function fitDiamond(p){
  const b=bounds(p);
  if(b.x===0||b.y===0||b.x+b.width>=p.width||b.y+b.height>=p.height)throw Error("Clipped raw source");
  const scale=Math.min(85/b.width,35/b.height),width=Math.ceil(b.width*scale),height=Math.ceil(b.height*scale);
  if(width<80||height<31)throw Error("Wrong raw diamond proportions");
  const offset=[Math.floor((85-width)/2),Math.floor((35-height)/2)],sprite=new PNG({width:85,height:35});
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const sx=b.x+Math.floor(x/scale),sy=b.y+Math.floor(y/scale);if(sx>=b.x+b.width||sy>=b.y+b.height)continue;
    const si=(sy*p.width+sx)*4,di=((y+offset[1])*85+x+offset[0])*4;
    if(p.data[si+3]<200)continue;sprite.data.set(p.data.subarray(si,si+3),di);sprite.data[di+3]=255;
  }
  return {sprite,fit:{sourceBounds:b,uniformScale:scale,sampledSize:[width,height],canvasOffset:offset,alphaThreshold:200}};
}
function silhouette(p){
  const b=bounds(p),columns=[];let top=[],bottom=[];
  for(let x=b.x;x<b.x+b.width;x++){
    let upper=p.height,lower=-1;for(let y=0;y<p.height;y++)if(p.data[(y*p.width+x)*4+3]>=200){upper=Math.min(upper,y);lower=Math.max(lower,y);}
    if(lower<upper)throw Error("Empty silhouette column");columns.push({x,upper,lower});
    if(upper===b.y)top.push(x);if(lower===b.y+b.height-1)bottom.push(x);
  }
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  return {bounds:b,columns,top:{x:mean(top),y:b.y,span:top.at(-1)-top[0]+1},bottom:{x:mean(bottom),y:b.y+b.height-1,span:bottom.at(-1)-bottom[0]+1}};
}
export function measureDiamond(p,target){
  const a=silhouette(p),left=a.bounds.x,right=left+a.bounds.width-1;
  const fit=(key,start,end)=>{
    const rows=a.columns.filter(c=>c.x>=start+(end-start)*0.2&&c.x<=start+(end-start)*0.8),n=rows.length;
    const mx=rows.reduce((s,c)=>s+c.x,0)/n,my=rows.reduce((s,c)=>s+c[key],0)/n;
    const slope=rows.reduce((s,c)=>s+(c.x-mx)*(c[key]-my),0)/rows.reduce((s,c)=>s+(c.x-mx)**2,0);
    return {slope,samples:rows.map(c=>[c.x,c[key]])};
  };
  const fits={upperLeft:fit("upper",left,a.top.x),upperRight:fit("upper",a.top.x,right),lowerLeft:fit("lower",left,a.bottom.x),lowerRight:fit("lower",a.bottom.x,right)};
  const slopes=Object.fromEntries(Object.entries(fits).map(([k,v])=>[k,v.slope]));
  const diff=(x,y)=>Math.abs(x-y)/Math.max(Math.abs(x),Math.abs(y));
  const parallelDifferences=[diff(slopes.upperLeft,slopes.lowerRight),diff(slopes.upperRight,slopes.lowerLeft)];
  const apexHorizontalDifference=Math.abs(a.top.x-a.bottom.x),leftColumn=a.columns[0],rightColumn=a.columns.at(-1),diagonalVerticalDifference=Math.abs((leftColumn.upper+leftColumn.lower-rightColumn.upper-rightColumn.lower)/2);
  const signs=slopes.upperLeft<0&&slopes.upperRight>0&&slopes.lowerLeft>0&&slopes.lowerRight<0;
  const passes=signs&&Object.values(slopes).every(s=>Math.abs(s)>=target*0.8&&Math.abs(s)<=target*1.2)&&parallelDifferences.every(d=>d<=0.15)&&apexHorizontalDifference<=2&&diagonalVerticalDifference<=2;
  return {slopes,parallelDifferences,apexHorizontalDifference,diagonalVerticalDifference,passes,target,vertices:{top:a.top,bottom:a.bottom,left:[left,(leftColumn.upper+leftColumn.lower)/2],right:[right,(rightColumn.upper+rightColumn.lower)/2]},topHorizontalSpan:a.top.span,fits,method:"alpha>=200 column extrema; least-squares dy/dx over central20–80% of each half-edge; opposite pairs compared relative to larger absolute slope",thresholds:{relativeSlopeTolerance:0.2,parallelDifference:0.15,apexHorizontalDifference:2,diagonalVerticalDifference:2}};
}
export function measureLowerGaps(p){
  const a=silhouette(p),middle=Math.round(a.bottom.x),edge=(start,end)=>{
    let longest=0,length=0,bestStart=-1,runStart=-1,points=[],bestPoints=[];
    for(let x=start;x<=end;x++){
      const column=a.columns.find(c=>c.x===x);let point=null;
      for(let offset=2;offset<=5;offset++){
        const y=column.lower-offset;if(y<column.upper)continue;const [r,g,b,alpha]=p.data.subarray((y*p.width+x)*4,(y*p.width+x+1)*4);
        if(alpha===255&&r<=65&&r>=g&&g>=b){point=[x,y];break;}
      }
      if(point){if(!length){runStart=x;points=[];}length++;points.push(point);if(length>longest){longest=length;bestStart=runStart;bestPoints=[...points];}}else length=0;
    }
    // Straight-edge arc length and x projection have the same fraction. Count
    // adjacent column intervals, including no unmeasured endpoint padding.
    return {start,end,longestColumns:longest,runStart:bestStart,coverage:Math.max(0,longest-1)/(end-start),points:bestPoints};
  };
  return {left:edge(a.bounds.x,middle),right:edge(middle,a.bounds.x+a.bounds.width-1),criteria:{innerOffsets:[2,5],maxRed:65,warmOrder:"r>=g>=b",coverage:0.8,method:"longest continuous x-interval with a warm opaque near-black pixel2–5px above lower alpha edge; same fraction as straight chord length"}};
}
export function measureColour(p){
  if(p.width!==960||p.height!==540)throw Error("Expected scene size");
  let s=0,v=0,n=0,fs=0,fv=0,fn=0;
  for(let y=329;y<368;y++)for(let x=854;x<943;x++){
    const inside=Math.abs(x-898)/42+Math.abs(y-348)/17<=0.64;
    const floor=!(x>=856&&x<941&&y>=331&&y<366);if(!inside&&!floor)continue;
    const i=(y*960+x)*4,max=Math.max(...p.data.subarray(i,i+3)),min=Math.min(...p.data.subarray(i,i+3)),sat=max?(max-min)/max:0,val=max/255;
    if(inside){s+=sat;v+=val;n++;}else{fs+=sat;fv+=val;fn++;}
  }
  return {plate:{s:s/n,v:v/n,n},floor:{s:fs/fn,v:fv/fn,n:fn},delta:v/n-fv/fn};
}
