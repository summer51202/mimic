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
   await page.goto(url("props-calibration-v03-review"));
   assert.equal(await page.locator("[data-shot]").count(),8);
   assert(await page.locator("img").evaluateAll(images=>images.every(img=>img.naturalWidth>0)));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
   if(width===1440)for(const view of ["desktop","phone"])for(const state of ["hidden","revealed"]){
    await page.locator(`[data-shot="${view}-v03-${state}"] .viewport`).screenshot({path:path.join(dir,"samples/props-calibration-v03",`${view}-${state}-scene.png`)});
   }
   await page.goto(url("landing-prop-position-carving-v03-review"));
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
    if(view==="desktop"){
     for(const [axis,value] of [["x","240"],["y","220"]]){
      await panel.locator("input[data-"+axis+"]").fill(value);
      await panel.locator("input[data-"+axis+"]").press("Enter");
     }
     const payload=JSON.parse(await panel.locator("textarea").inputValue());
     assert.deepEqual(payload.objects.find(o=>o.id==="carving").warnings,["occludes:寶箱開蓋","masonry-seams"]);
    }
   }
   await page.close();
   console.log(width+" px: review and tool passed");
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});

