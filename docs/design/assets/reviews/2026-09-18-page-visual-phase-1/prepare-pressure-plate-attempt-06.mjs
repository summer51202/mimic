import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {nearest} from "./landing-chest-raster.mjs";
const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const {PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const target=path.join(dir,"samples/derivations/pressure-plate-attempt-06"),hash=b=>createHash("sha256").update(b).digest("hex");
export const tilePoints=[
  {id:"N1",zone:"near",vertices:[[759,407],[800,420],[758,441],[719,424]]},
  {id:"N2",zone:"near",vertices:[[842,426],[889,440],[843,457],[792,438]]},
  {id:"N3",zone:"near",vertices:[[788,376],[820,389],[789,403],[756,390]]},
  {id:"N4",zone:"near",vertices:[[878,371],[905,381],[879,395],[850,384]]},
  {id:"N5",zone:"near",vertices:[[733,369],[767,381],[734,398],[701,385]]},
  {id:"M1",zone:"middle",vertices:[[407,373],[457,384],[418,399],[374,387]]},
  {id:"M2",zone:"middle",vertices:[[452,411],[480,419],[458,432],[430,421]]},
  {id:"M3",zone:"middle",vertices:[[425,428],[475,443],[430,462],[380,444]]},
  {id:"M4",zone:"middle",vertices:[[499,431],[519,439],[502,448],[485,439]]},
  {id:"M5",zone:"middle",vertices:[[343,408],[364,418],[337,429],[314,417]]},
];
export function measureTiles(points){
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  const tiles=points.map(t=>{const [T,R,B,L]=t.vertices,edge=(a,b)=>(b[1]-a[1])/(b[0]-a[0]);const slopes={upperLeft:edge(L,T),upperRight:edge(T,R),lowerRight:edge(R,B),lowerLeft:edge(B,L)};return {...t,slopes,width:R[0]-L[0],height:B[1]-T[1],ratio:(R[0]-L[0])/(B[1]-T[1])};});
  const summarize=a=>({count:a.length,meanAbsoluteSlope:mean(a.flatMap(t=>Object.values(t.slopes).map(Math.abs))),meanRatio:mean(a.map(t=>t.ratio)),meanWidth:mean(a.map(t=>t.width)),meanHeight:mean(a.map(t=>t.height)),negativeSlope:mean(a.flatMap(t=>[t.slopes.upperLeft,t.slopes.lowerRight])),positiveSlope:mean(a.flatMap(t=>[t.slopes.upperRight,t.slopes.lowerLeft]))});
  return {tiles,aggregate:summarize(tiles),zones:{near:summarize(tiles.filter(t=>t.zone==="near")),middle:summarize(tiles.filter(t=>t.zone==="middle"))}};
}
function line(p,a,b,colour){const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]));for(let k=0;k<=n;k++){const x=Math.round(a[0]+(b[0]-a[0])*k/n),y=Math.round(a[1]+(b[1]-a[1])*k/n);if(x>=0&&x<p.width&&y>=0&&y<p.height)p.data.set(colour,(y*p.width+x)*4);}}
const font={N:"101111111111101",M:"101111111101101",0:"111101101101111",1:"010110010010111",2:"111001111100111",3:"111001111001111",4:"101101111001001",5:"111100111001111"};
function label(p,s,x,y){
  for(let j=0;j<12;j++)for(let i=0;i<s.length*8;i++)if(x+i<p.width&&y+j<p.height)p.data.set([0,0,0,255],((y+j)*p.width+x+i)*4);
  [...s].forEach((c,k)=>{for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(font[c][j*3+i]==="1")for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)p.data.set([0,235,255,255],((y+j*2+dy)*p.width+x+k*8+i*2+dx)*4);});
}
export async function preparePressurePlateAttempt06(){
  const parent=JSON.parse(await readFile(path.join(dir,"landing-title-placement.manifest.json"),"utf8")),source=parent.sources.architectureDesktop,bytes=await readFile(path.join(repo,source.path));
  if(hash(bytes)!==source.sha256)throw Error("Architecture changed");const p=PNG.sync.read(bytes),ratio=960/540;
  const cw=p.width/p.height>ratio?Math.round(p.height*ratio):p.width,ch=p.width/p.height>ratio?p.height:Math.round(p.width/ratio);
  const crop={x:Math.floor((p.width-cw)/2),y:Math.floor((p.height-ch)/2),width:cw,height:ch},architecture=nearest(p,960,540,crop);
  for(let i=3;i<architecture.data.length;i+=4)architecture.data[i]=255;
  const stats=measureTiles(tilePoints),width=85,halfWidth=42,halfHeight=Math.round(halfWidth*stats.aggregate.meanAbsoluteSlope),height=halfHeight*2+1;
  const vertices=[[halfWidth,0],[width-1,halfHeight],[halfWidth,height-1],[0,halfHeight]],guide=new PNG({width,height});
  for(let i=0;i<4;i++)line(guide,vertices[i],vertices[(i+1)%4],[70,47,28,255]);
  const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2),divisions=[[mid(vertices[0],vertices[3]),mid(vertices[1],vertices[2])],[mid(vertices[0],vertices[1]),mid(vertices[3],vertices[2])]];
  for(const [a,b] of divisions)line(guide,a,b,[70,47,28,255]);
  const prepared={architecture,outline:guide,outline8x:nearest(guide,width*8,height*8)};
  const annotations={near:{x:690,y:350,width:230,height:120},middle:{x:300,y:355,width:230,height:120}};
  for(const [zone,b] of Object.entries(annotations)){
    const zoom=nearest(architecture,b.width*4,b.height*4,b);
    for(const t of tilePoints.filter(t=>t.zone===zone)){
      for(let i=0;i<4;i++)line(zoom,t.vertices[i].map((v,k)=>(v-[b.x,b.y][k])*4),t.vertices[(i+1)%4].map((v,k)=>(v-[b.x,b.y][k])*4),[0,235,255,255]);
      const [cx,cy]=[0,1].map(k=>Math.round(t.vertices.reduce((s,p)=>s+p[k],0)/4));label(zoom,t.id,(cx-b.x)*4-8,(cy-b.y)*4-6);
    }
    prepared[zone+"Annotated"]=zoom;
  }
  // An untouched architecture-only crop of M2; no masking/recolouring.
  const tileCrop={x:426,y:407,width:59,height:30};prepared.realTile=nearest(architecture,59,30,tileCrop);prepared.realTile4x=nearest(architecture,236,120,tileCrop);
  const outputs={},writes=new Map();for(const [name,png] of Object.entries(prepared)){const file=path.join(target,name+".png"),data=PNG.sync.write(png);writes.set(file,data);outputs[name]={path:path.relative(repo,file).replaceAll("\\","/"),sha256:hash(data),width:png.width,height:png.height};}
  const measurement={schema:"mimic-pressure-plate-floor-diamond-guide/v1",source,architectureCrop:crop,coordinateSpace:[960,540],method:"Manual top/right/bottom/left endpoints of worn visible tile boundaries; straight chords, dy/dx for each edge; all 10 tiles and all 40 edges equally weighted. Approximate endpoint uncertainty ±2 logical px. No stair measurements.",...stats,annotations,tileComparison:{id:"M2",crop:tileCrop},guide:{canvas:[width,height],vertices,divisions,layout:"2x2 fitted diamonds",slope:halfHeight/halfWidth,diagonals:[width-1,height-1],ratio:(width-1)/(height-1),referenceCenter:[898,348],origin:[898-halfWidth,348-halfHeight]},outputs};
  writes.set(path.join(target,"measurement.json"),Buffer.from(JSON.stringify(measurement,null,2)+"\n"));
  for(const [file,data] of writes)try{if(!(await readFile(file)).equals(data))throw Error("Refusing changed preparation output: "+file);}catch(e){if(e.code!=="ENOENT")throw e;}
  await mkdir(target,{recursive:true});for(const [file,data] of writes)await writeFile(file,data);return measurement;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=await preparePressurePlateAttempt06();console.log(JSON.stringify({aggregate:m.aggregate,zones:m.zones,guide:m.guide}));}
