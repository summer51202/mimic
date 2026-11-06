import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
const {chromium}=createRequire(new URL("../../../../../web/package.json",import.meta.url))("playwright");
import {pathToFileURL} from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
const dir=path.dirname(fileURLToPath(import.meta.url));
const url=name=>pathToFileURL(path.join(dir,name+".html")).href;
(async()=>{
 const browser=await chromium.launch();
 try{
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   await page.goto(url("props-calibration-v04-review"));
   assert.equal(await page.locator("[data-shot]").count(),8);
   assert(await page.locator("img").evaluateAll(images=>images.every(img=>img.naturalWidth>0)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if(width===1440)for(const view of ["desktop","phone"])for(const state of ["hidden","revealed"]){
    await page.locator(`[data-shot="${view}-v04-${state}"] .viewport`).screenshot({path:path.join(dir,"samples/props-calibration-v04",`${view}-${state}-scene.png`)});
   }
   await page.goto(url("landing-prop-position-carving-v04-review"));
   for(const view of ["desktop","phone"]){
    if(view==="phone")await page.locator('[data-frame="phone"]').click();
    const panel=page.locator(`[data-prop-panel="${view}"]`);
    await panel.locator("[data-carving-ratio]").filter({hasText:"達標"}).waitFor();
    if(view==="phone")await panel.locator('[data-viewport-x="780"]').click();
    await panel.locator("[data-object-select]").selectOption("carving");
    const previous=await panel.locator("[data-carving-ratio]").innerText();
    if(width===1440){
     const rect=await panel.locator('[data-prop="carving"]').boundingBox();
     await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
     await page.mouse.down();
     await page.mouse.move(rect.x+rect.width/2+10,rect.y+rect.height/2,{steps:3});
     await page.mouse.up();
    }else await panel.locator('[data-nudge="10,0"]').click();
    assert.notEqual(await panel.locator("[data-carving-ratio]").innerText(),previous);
    await panel.locator("[data-reset]").click();
    assert.equal(await panel.locator("[data-carving-ratio]").innerText(),previous);
    await panel.locator("[data-variant]").selectOption("revealed");
    assert.match(await panel.locator("[data-carving-ratio]").innerText(),/revealed.*達標/);
    const warnings=async()=>JSON.parse(await panel.locator("textarea").inputValue()).objects.find(o=>o.id==="carving").warnings;
    const input=async(axis,value)=>{
     const field=panel.locator("input[data-"+axis+"]");
     await field.fill(String(value));
     await field.press("Enter");
    };
    const guide=panel.getByText("標題保留區",{exact:true});
    await guide.waitFor({state:"attached"});
    const titleRight=view==="desktop"?712:716;
    await input("x",titleRight-4);
    assert((await warnings()).includes("title-reserve"));
    await panel.getByText("進入標題外框四周 48 px 保留區",{exact:false}).waitFor();
    await input("x",titleRight-3);
    assert(!(await warnings()).includes("title-reserve"));
    if(view==="desktop"){
     await input("x",240);
     await input("y",220);
     assert.deepEqual(await warnings(),["occludes:寶箱開蓋","masonry-seams"]);
    }

   }
   await page.close();
   console.log(width+" px: review and tool passed");
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

