import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds,nearest} from "./landing-chest-raster.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export const layout={width:104,height:120,sceneOrigin:[92,230],ground:[52,120],worldGround:[144,350],closedFootprint:[13,54,78,66],bodyStart:90,hingeReference:{kind:"review-guide",point:[52,84]}};
export function prepareFamily(atlas){
  if(atlas.width%2||atlas.height%2)throw Error("Even 2x2 atlas required");
  const cw=atlas.width/2,ch=atlas.height/2;
  const cells=[0,1,2,3].map(i=>({x:(i%2)*cw,y:Math.floor(i/2)*ch,width:cw,height:ch}));
  const raw=cells.map(c=>nearest(atlas,cw,ch,c));
  const boxes=raw.map(p=>bounds(p));
  for(const b of boxes)if(b.x===0||b.y===0||b.x+b.width===cw||b.y+b.height===ch)throw Error("Source touches cell edge");
  const b=boxes[0],scale=Math.min(78/b.width,66/b.height),anchor=[b.x+b.width/2,b.y+b.height];
  if(Math.round(b.width*scale)<74||Math.round(b.height*scale)<62)throw Error("Closed proportions mismatch");
  const sprites=raw.map(p=>{
    const out=new PNG({width:104,height:120});
    for(let y=0;y<120;y++)for(let x=0;x<104;x++){
      const sx=Math.floor(anchor[0]+(x-52)/scale),sy=Math.floor(anchor[1]+(y-120)/scale);
      if(sx<0||sy<0||sx>=cw||sy>=ch)continue;
      const si=(sy*cw+sx)*4,di=(y*104+x)*4;
      if(p.data[si+3]<200)continue;
      out.data.set(p.data.subarray(si,si+3),di);out.data[di+3]=255;
    }
    return out;
  });
  for(const box of boxes){
    const left=52+(box.x-anchor[0])*scale,top=120+(box.y-anchor[1])*scale;
    if(left<1||top<1||left+box.width*scale>103||top+box.height*scale>120.5)throw Error("Family exceeds common envelope");
  }
  const bands=sprites.map(p=>bounds(nearest(p,104,30,{x:0,y:90,width:104,height:30})));
  for(const q of bands){
    const p=bands[0];
    if(Math.abs(q.x-p.x)>2||Math.abs(q.width-p.width)>4||Math.abs(q.y+q.height-p.y-p.height)>2)throw Error("Body registration mismatch: revise ImageGen family");
  }
  for(const p of sprites.slice(1))sprites[0].data.copy(p.data,90*104*4,90*104*4);
  return {sprites,registration:{cells,boxes,scale,rawAnchor:anchor,rawBodyBands:bands,bodyReuse:{from:"closed",startRow:90}}};
}
