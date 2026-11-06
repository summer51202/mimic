import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {bounds,nearest} from "./landing-chest-raster.mjs";
import {layout,frames} from "./restored-chest.config.mjs";
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
export function inLatch(x,y){const a=layout.latchArea;return x>=a.x&&x<a.x+a.width&&y>=a.y&&y<a.y+a.height;}
export function prepareRestoredFamily(atlas,grid){
  const [cw,ch]=grid?.cell??[Math.floor(atlas.width/4),Math.floor(atlas.height/2)],[ox,oy]=grid?.origin??[0,0],[dx,dy]=grid?.stride??[cw,ch];
  if(![cw,ch,ox,oy,dx,dy].every(Number.isInteger)||ox<0||oy<0||dx<cw||dy<ch||ox+3*dx+cw>atlas.width||oy+dy+ch>atlas.height)throw Error("Invalid regular atlas grid");
  if(cw<2||ch<2)throw Error("Atlas too small");
  if(!atlas.data.some((v,i)=>i%4===3&&v===0))throw Error("Transparent source required");
  const cells=frames.map((id,i)=>({x:grid?ox+(i%4)*dx:Math.round((i%4)*atlas.width/4),y:grid?oy+Math.floor(i/4)*dy:Math.round(Math.floor(i/4)*atlas.height/2),width:cw,height:ch}));
  const covered=new Uint8Array(atlas.width*atlas.height);
  for(const c of cells)for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)covered[(c.y+y)*atlas.width+c.x+x]=1;
  for(let i=0;i<covered.length;i++)if(!covered[i]&&atlas.data[i*4+3]>=200)throw Error("Opaque atlas gutter");
  const raw=cells.map(c=>nearest(atlas,cw,ch,c)),boxes=raw.map(p=>bounds(p));
  for(const b of boxes)if(b.x===0||b.y===0||b.x+b.width===cw||b.y+b.height===ch)throw Error("Source touches cell edge");
  const b=boxes[0],scale=Math.min(78/b.width,66/b.height),anchor=[b.x+b.width/2,b.y+b.height];
  if(Math.round(b.width*scale)<74||Math.round(b.height*scale)<62)throw Error("Closed proportions mismatch");
  for(const box of boxes){
    const left=52+(box.x-anchor[0])*scale,top=120+(box.y-anchor[1])*scale;
    if(left<1||top<1||left+box.width*scale>103||top+box.height*scale>120.5)throw Error("Common envelope exceeded");
  }
  const sprites=raw.map(p=>{
    const out=new PNG({width:104,height:120});
    for(let y=0;y<120;y++)for(let x=0;x<104;x++){
      const sx=Math.floor(anchor[0]+(x-52)/scale),sy=Math.floor(anchor[1]+(y-120)/scale),di=(y*104+x)*4;
      if(sx<0||sy<0||sx>=cw||sy>=ch)continue;
      const si=(sy*cw+sx)*4;if(p.data[si+3]<200)continue;
      out.data.set(p.data.subarray(si,si+3),di);out.data[di+3]=255;
    }
    return out;
  });
  const bands=sprites.map(p=>bounds(nearest(p,104,30,{x:0,y:90,width:104,height:30})));
  for(const q of bands){const a=bands[0];if(Math.abs(q.x-a.x)>2||Math.abs(q.width-a.width)>4||Math.abs(q.y+q.height-a.y-a.height)>2)throw Error("Body registration mismatch");}
  for(const p of sprites.slice(1))for(let y=90;y<120;y++)for(let x=0;x<104;x++){
    if(inLatch(x,y))continue;const i=(y*104+x)*4;p.data.set(sprites[0].data.subarray(i,i+4),i);
  }
  return {sprites,registration:{cells,boxes,scale,rawAnchor:anchor,rawBodyBands:bands,bodyReuse:{from:"closed",startRow:90,except:layout.latchArea}}};
}
