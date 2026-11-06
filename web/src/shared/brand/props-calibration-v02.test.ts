import {readFileSync} from "node:fs";
import path from "node:path";
import {PNG} from "pngjs";
import {expect,test} from "vitest";

const root=path.resolve(process.cwd(),"..");
const folder="docs/design/assets/reviews/2026-09-18-page-visual-phase-1";
const read=(file:string)=>readFileSync(path.join(root,file));
const manifest=JSON.parse(read(folder+"/props-calibration-v02.manifest.json").toString());
const png=(asset:{path:string})=>PNG.sync.read(read(asset.path));

test("feature sprites have a 256px transparent canvas and clean invisible pixels",()=>{
  for(const asset of Object.values(manifest.features) as {path:string}[]){
    const {width,height,data}=png(asset);
    expect([width,height]).toEqual([256,256]);
    let transparent=0;
    for(let i=0;i<data.length;i+=4)if(data[i+3]===0){
      transparent++;
      if(data[i]||data[i+1]||data[i+2])throw Error("Invisible RGB");
    }
    expect(transparent).toBeGreaterThan(0);
    expect(transparent).toBeLessThan(width*height);
  }
});

test("both carving sprites share a footprint and satisfy groove contrast",()=>{
  for(const view of ["desktop","phone"]){
    const frame=manifest.scenes[view],carving=frame.objects.find((object:{id:string})=>object.id==="carving");
    const wall=png(frame.scene),hidden=png(carving.variants.hidden),revealed=png(carving.variants.revealed);
    expect([hidden.width,hidden.height]).toEqual(view==="desktop"?[72,48]:[54,36]);
    expect([hidden.width,hidden.height]).toEqual([revealed.width,revealed.height]);
    let reference=0,dark=0,deep=0;
    const luma=(data:Buffer,i:number)=>.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
    for(let i=0;i<hidden.data.length;i+=4){
      if(hidden.data[i+3]!==revealed.data[i+3])throw Error("Changed footprint");
      if(!hidden.data[i+3])continue;
      const x=carving.x+(i/4)%hidden.width,y=carving.y+Math.floor(i/4/hidden.width);
      const source=luma(wall.data,(y*wall.width+x)*4),h=luma(hidden.data,i),r=luma(revealed.data,i);
      if(r>=source)continue;
      reference+=source;dark+=h;deep+=r;
    }
    expect(1-dark/reference).toBeGreaterThanOrEqual(.06);
    expect(1-dark/reference).toBeLessThanOrEqual(.12);
    expect(1-deep/reference).toBeGreaterThanOrEqual(.2);
  }
});
