import {createHash} from "node:crypto";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {nearest,bounds} from "./landing-chest-raster.mjs";
import {renderPropPositionTool} from "./render-landing-prop-position-tool.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../.."),{PNG}=createRequire(path.join(repo,"web/package.json"))("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex"),relative=f=>path.relative(repo,f).replaceAll("\\","/");
export async function composePropPosition(){
  const inputs={},outputs={},writes=new Map();
  async function record(id,file){const b=await readFile(file);return inputs[id]={path:relative(file),sha256:hash(b)};}
  async function json(id,name){const a=await record(id,path.join(dir,name+".manifest.json"));return JSON.parse(await readFile(path.join(repo,a.path),"utf8"));}
  async function png(a){
    const file=path.resolve(repo,a.path);if(!file.startsWith(dir+path.sep))throw Error("Source outside review");
    const b=await readFile(file);if(hash(b)!==a.sha256)throw Error("Changed source: "+a.path);
    const p=PNG.sync.read(b);if(p.width!==a.width||p.height!==a.height)throw Error("Wrong dimensions");return p;
  }
  const parent=await json("placement","landing-title-placement"),chest=await json("chest","ancient-treasure-chest-v04"),plate=await json("plate","pressure-plate-attempt-06");
  const expectedPlate="e398cd840975bd77dd2b6053476be2c1ab371107e5f6087f793052b08c883f7c";
  const expectedChest=["1d3033feec912b2a8c3e8985949cccbbeadadcd02e6500999f3d7a1558d9a2bc","3791787f5338599fc110b36c94e8b3b2534933d71c671d85ee7404b25d57cd86","8babcc508cfdd3538fc6646631ce51658a48a3a8d0f66f7475f2e3927b4c8919","d81237e032d782965d5012ea69a37ec598dad888a534d6323ab4db442f430dc2","c353a103abea643bc643e148726b911b4af03d7b73a95b4f270752f5c264ee7c","f741d661b53ef9c00d593502c8507373a2e907ea6e6b704ef90745c7e2f24ae7","cb6e51044658405ce206bba76552ddabbfb7fdd9cf9c918b0ab87b5b0d4742ea","1da4b9c752012114db7256f928598628ccd222536e9a32112e8b938869712654"];
  if(plate.outputs.sprite.sha256!==expectedPlate||Object.values(chest.frames).some((f,i)=>f.sprite.sha256!==expectedChest[i]))throw Error("Unapproved prop source");
  await record("spec",path.join(repo,"docs/superpowers/specs/2026-11-02-landing-prop-placement-and-pressure-plate-design.md"));
  await record("decisions",path.join(dir,"decision-log.md"));
  for(const name of ["compose-landing-prop-position.mjs","render-landing-prop-position-tool.mjs","landing-prop-position.model.mjs","landing-prop-position.controller.mjs","landing-chest-raster.mjs"])await record(name,path.join(dir,name));
  const save=(id,p)=>{const file=path.join(dir,"samples/landing-prop-position-v01",id+".png"),b=PNG.sync.write(p),a={path:relative(file),sha256:hash(b),width:p.width,height:p.height};outputs[id]=a;writes.set(file,b);return a;};
  async function sprite(a){return {...a,bounds:bounds(await png(a))};}
  const frames={};
  for(const view of ["desktop","phone"]){
    const f=parent.frames[view==="desktop"?"desktop-single":"phone-staggered"],scene=parent.scenes[view],size=view==="desktop"?[960,540]:[390,600];
    if(f.title.x!==(view==="desktop"?376:130)||f.title.y!==(view==="desktop"?100:59))throw Error("Frozen title changed");
    const source=parent.sources[view==="desktop"?"architectureDesktop":"architecturePhone"],raw=await png(source),ratio=size[0]/size[1];
    const cw=raw.width/raw.height>ratio?Math.round(raw.height*ratio):raw.width,ch=raw.width/raw.height>ratio?raw.height:Math.round(raw.width/ratio);
    const backdrop=nearest(raw,...size,{x:Math.floor((raw.width-cw)/2),y:Math.floor((raw.height-ch)/2),width:cw,height:ch});
    for(let i=3;i<backdrop.data.length;i+=4)backdrop.data[i]=255;
    const architecture=save(view+"-architecture",backdrop),fixed=[];
    for(const l of scene.layers)if(!["chest","mapCrate","pressurePlate"].includes(l.id)){
      await png(l);fixed.push({...l,depth:["carving","torchHigh","torchLow","bats","groundLight"].includes(l.id)?-100:l.y+l.height});
    }
    await png(f.title);fixed.push({...f.title,depth:-90});
    const crate=scene.layers.find(o=>o.id==="mapCrate"),objects=[];
    if(view==="desktop"){
      const variants={};for(const [id,entry] of Object.entries(chest.frames))variants[id]=await sprite(entry.sprite);
      const open=await png(chest.frames.open.sprite),lid=nearest(open,104,90,{x:0,y:0,width:104,height:90});
      objects.push({id:"chest",label:"寶箱 v04",anchor:"ground",x:144,y:350,offset:{x:52,y:120},width:104,height:120,opacity:1,variant:"closed",variants,lidBounds:bounds(lid)});
    }
    objects.push({id:"mapCrate",label:"地圖木箱",anchor:"top-left",x:crate.x,y:crate.y,offset:{x:0,y:0},width:crate.width,height:crate.height,opacity:1,variant:"default",variants:{default:await sprite(crate)}});
    if(view==="desktop")objects.push({id:"pressurePlate",label:"壓力板 attempt-06",anchor:"top-left",x:856,y:331,offset:{x:0,y:0},width:85,height:35,opacity:.85,variant:"default",variants:{default:await sprite(plate.outputs.sprite)}});
    const faceRects=view==="desktop"?[["warrior-face",400,224,45,50],["ranger-face",640,211,47,48]]:[["warrior-face",135,267,34,37],["ranger-face",276,219,37,40]];
    const forbidden=faceRects.map(([id,x,y,width,height])=>({id,x,y,width,height}));
    for(const id of ["fire","mimiku","sign","wordmark"]){const l=fixed.find(l=>l.id===id);forbidden.push({id,x:l.x,y:l.y,width:l.width,height:l.height});}
    const sign=scene.layers.find(o=>o.id==="sign");
    frames[view]={frame:{id:view,width:size[0],height:size[1]},scene:architecture,fixed,objects,
      signLabel:{x:sign.x+sign.width*.16,y:sign.y+sign.height*.17,width:sign.width*.7,height:sign.height*.48},
      guidance:{method:"conservative-review-rectangles/v1",floor:{x:0,y:view==="desktop"?320:290,width:size[0],height:view==="desktop"?150:210},
        dialogue:{x:0,y:size[1]*(view==="desktop"?.78:.72),width:size[0],height:size[1]*(view==="desktop"?.22:.28)},forbidden}};
  }
  const m={schema:"mimic-landing-prop-position-tool/v1",reviewOnly:true,runtimePromotion:false,decision:"awaiting-user-position-json",positionsApplied:false,inputs,outputs,frames};
  const html=Buffer.from(renderPropPositionTool(m)),htmlFile=path.join(dir,"landing-prop-position-review.html"),manifestFile=path.join(dir,"landing-prop-position.manifest.json");
  m.review={path:relative(htmlFile),sha256:hash(html)};writes.set(htmlFile,html);
  let prior;try{prior=JSON.parse(await readFile(manifestFile,"utf8"));}catch(e){if(e.code!=="ENOENT")throw e;}
  if(prior)for(const a of [...Object.values(prior.outputs),prior.review]){
    const file=path.resolve(repo,a.path);if(!writes.has(file)||hash(await readFile(file))!==a.sha256)throw Error("Modified tool output; refusing overwrite");
  }
  else for(const file of writes.keys())try{await readFile(file);throw Error("Unexpected tool output");}catch(e){if(e.code!=="ENOENT")throw e;}
  writes.set(manifestFile,Buffer.from(JSON.stringify(m,null,2)+"\n"));
  for(const [file,b] of writes){await mkdir(path.dirname(file),{recursive:true});await writeFile(file,b);}return m;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const m=await composePropPosition();console.log(JSON.stringify({frames:Object.keys(m.frames),outputs:Object.keys(m.outputs),positionsApplied:m.positionsApplied}));}
