import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {nearest} from "./landing-chest-raster.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const target=path.join(dir,"samples/derivations/pressure-plate-attempt-05");
const hash=b=>createHash("sha256").update(b).digest("hex");
export async function preparePressurePlateAttempt05(){
  const parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8"));
  const a=parent.sources.architectureDesktop,bytes=await readFile(path.join(repo,a.path));
  if(hash(bytes)!==a.sha256)throw Error("Architecture changed");
  const p=PNG.sync.read(bytes),ratio=960/540;
  const cw=p.width/p.height>ratio?Math.round(p.height*ratio):p.width,ch=p.width/p.height>ratio?p.height:Math.round(p.width/ratio);
  const crop={x:Math.floor((p.width-cw)/2),y:Math.floor((p.height-ch)/2),width:cw,height:ch};
  const architecture=nearest(p,960,540,crop);
  for(let i=3;i<architecture.data.length;i+=4)architecture.data[i]=255;
  // Manual, visible left upper corners of the lower three treads. These are
  // scene measurements, never selected from the generated prop or its alpha.
  const points=[[857,326],[871,312],[883,299]],meanX=points.reduce((s,p)=>s+p[0],0)/3,meanY=points.reduce((s,p)=>s+p[1],0)/3;
  const slope=-points.reduce((s,[x,y])=>s+(x-meanX)*(y-meanY),0)/points.reduce((s,[,y])=>s+(y-meanY)**2,0);
  const zoom=nearest(architecture,600,440,{x:810,y:240,width:150,height:110});
  for(const [x,y] of points){const cx=(x-810)*4,cy=(y-240)*4;for(let k=-6;k<=6;k++)for(const [dx,dy] of [[k,0],[0,k]])zoom.data.set([0,255,255,255],((cy+dy)*zoom.width+cx+dx)*4);}
  const rise=17,shift=Math.round(rise*slope),frontWidth=80,width=frontWidth+shift;
  const guide=new PNG({width,height:18});
  const line=(x0,y0,x1,y1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=n;k++){const x=Math.round(x0+(x1-x0)*k/n),y=Math.round(y0+(y1-y0)*k/n);guide.data.set([70,47,28,255],(y*width+x)*4);}};
  line(shift,0,width-1,0);line(0,rise,frontWidth-1,rise);line(shift,0,0,rise);line(width-1,0,frontWidth-1,rise);
  for(const x of [26,53])line(x+shift,0,x,rise);
  const outputs={},writes=new Map();
  for(const [name,png] of Object.entries({architecture,stairMeasurement:zoom,outline:guide,outline8x:nearest(guide,width*8,144)})){
    const data=PNG.sync.write(png),file=path.join(target,name+".png");writes.set(file,data);outputs[name]={path:path.relative(repo,file).replaceAll("\\","/"),sha256:hash(data),width:png.width,height:png.height};
  }
  const measurement={schema:"mimic-pressure-plate-stair-guide/v1",source:a,architectureCrop:crop,coordinateSpace:[960,540],method:"Manual left upper corner of each of the lowest three visible treads; least-squares x against upward y; positive means rightward on ascent. Pixel selection uncertainty approximately ±1 logical px.",points,adjacentSlopes:points.slice(1).map(([x,y],i)=>(x-points[i][0])/(points[i][1]-y)),slope,guide:{canvas:[width,18],frontWidth,depthRise:rise,rightShift:shift,slope:shift/rise,vertices:[[shift,0],[width-1,0],[frontWidth-1,rise],[0,rise]],divisions:[26,53],texture:false},outputs};
  writes.set(path.join(target,"measurement.json"),Buffer.from(JSON.stringify(measurement,null,2)+"\n"));
  for(const [file,data] of writes)try{if(!(await readFile(file)).equals(data))throw Error("Refusing changed preparation output: "+file);}catch(e){if(e.code!=="ENOENT")throw e;}
  await mkdir(target,{recursive:true});for(const [file,data] of writes)await writeFile(file,data);return measurement;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await preparePressurePlateAttempt05()));
