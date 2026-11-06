import {expect,test} from "@playwright/test";
import path from "node:path";
import {pathToFileURL} from "node:url";

const url=(name:string)=>pathToFileURL(path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1",name+".html")).href;

test("review images load and both scenes switch state",async({page},info)=>{
  await page.goto(url("props-calibration-v02-review"));
  await expect(page.locator(".feature")).toHaveCount(4);
  expect(await page.locator("img").evaluateAll(images=>images.every(img=>(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.getByRole("button",{name:"Revealed"}).click();
  await expect(page.locator('[data-state="revealed"]:visible')).toHaveCount(2);
  await expect(page.locator('[data-state="hidden"]:visible')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(info.project.use.viewport?.width);
  await page.screenshot({path:info.outputPath("review.png")});
});

test("carving has independent positions and export on both views",async({page})=>{
  await page.goto(url("landing-prop-position-carving-review"));
  for(const [view,x,y] of [["desktop",205,190],["phone",945,163]] as const){
    if(view==="phone")await page.locator('[data-frame="phone"]').click();
    const panel=page.locator('[data-prop-panel="'+view+'"]');
    await expect(panel).toHaveAttribute("data-ready","true");
    if(view==="phone")await panel.locator('[data-viewport-x="780"]').click();
    await panel.locator("[data-object-select]").selectOption("carving");
    await panel.locator("[data-variant]").selectOption("revealed");
    await panel.locator('[data-nudge="10,0"]').click();
    const payload=JSON.parse(await panel.locator("textarea").inputValue());
    expect(payload.objects.find((object:{id:string})=>object.id==="carving")).toMatchObject({x:x+10,y,variant:"revealed",depth:-100});
    await panel.locator("[data-reset]").click();
    await expect(panel.locator("[data-variant]")).toHaveValue("hidden");
  }
});
