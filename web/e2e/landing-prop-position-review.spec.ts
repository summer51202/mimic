import {expect,test} from "@playwright/test";
import path from "node:path";
import {pathToFileURL} from "node:url";

const url=pathToFileURL(path.resolve(process.cwd(),"../docs/design/assets/reviews/2026-09-18-page-visual-phase-1/landing-prop-position-review.html")).href;
const panel=(page:import("@playwright/test").Page,id="desktop")=>page.locator(`[data-prop-panel="${id}"]`);
test.beforeEach(async({page})=>{await page.goto(url);await expect(panel(page)).toHaveAttribute("data-ready","true");});

test("free dragging, controls, depth, all chest frames and independent phone state",async({page},info)=>{
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  const desktop=panel(page),plate=desktop.locator('[data-prop="pressurePlate"]');
  await desktop.locator("[data-object-select]").selectOption("pressurePlate");
  await desktop.locator("input[data-x]").fill("250");await desktop.locator("input[data-x]").press("Enter");
  await expect(plate).toHaveAttribute("data-x","250");
  await desktop.locator("input[data-y]").fill("350");await desktop.locator("input[data-y]").press("Enter");
  await plate.focus();await page.keyboard.press("Shift+ArrowLeft");await page.keyboard.press("ArrowDown");
  await expect(plate).toHaveAttribute("data-x","240");await expect(plate).toHaveAttribute("data-y","351");
  await plate.scrollIntoViewIfNeeded();
  const stage=await desktop.locator("[data-stage]").boundingBox(),b=await plate.boundingBox();
  expect(Math.abs(b!.height-35*stage!.width/960)).toBeLessThan(.03);
  expect(Math.abs(b!.width-85*stage!.width/960)).toBeLessThan(.03);
  await page.mouse.move(b!.x+b!.width/2,b!.y+b!.height/2);await page.mouse.down();
  await page.mouse.move(b!.x+b!.width/2+stage!.width*30/960,b!.y+b!.height/2+stage!.height*20/540,{steps:4});await page.mouse.up();
  await expect(plate).toHaveAttribute("data-x","270");await expect(plate).toHaveAttribute("data-y","371");
  await desktop.locator("[data-object-select]").selectOption("chest");
  for(const name of ["closed","latch-release","unlatched","cracked","half-open","opening-wide","near-open","open"]){
    await desktop.locator("[data-variant]").selectOption(name);
    const p=JSON.parse(await desktop.locator("textarea").inputValue());expect(p.objects[0].variant).toBe(name);expect(p.objects[0].ground).toEqual({x:144,y:350});
    for(const o of p.objects){const r=(await desktop.locator(`[data-prop="${o.id}"]`).boundingBox())!;expect(Math.abs(r.width-o.width*stage!.width/960)).toBeLessThan(.03);expect(Math.abs(r.height-o.height*stage!.width/960)).toBeLessThan(.03);}
  }
  await desktop.locator("[data-guides-toggle]").uncheck();await expect(desktop.locator("[data-guides]")).toBeHidden();
  await desktop.locator("[data-edit-toggle]").uncheck();await expect(plate).toBeDisabled();
  await desktop.locator("[data-stage]").screenshot({path:info.outputPath("desktop-clean.png")});
  await page.locator('[data-frame="phone"]').click();const phone=panel(page,"phone");await expect(phone).toHaveAttribute("data-ready","true");
  await expect(phone.locator("[data-prop]")).toHaveCount(1);await expect(phone.locator("[data-variant]")).toBeHidden();
  await phone.locator('[data-nudge="10,0"]').click();
  expect(JSON.parse(await phone.locator("textarea").inputValue()).objects[0].x).toBe(30);
  const phoneStage=(await phone.locator("[data-stage]").boundingBox())!,phoneCrate=(await phone.locator("[data-prop]").boundingBox())!;
  expect(Math.abs(phoneCrate.width-79*phoneStage.width/390)).toBeLessThan(.03);expect(Math.abs(phoneCrate.height-44*phoneStage.width/390)).toBeLessThan(.03);
  await phone.locator("[data-stage]").screenshot({path:info.outputPath("phone-guides.png")});
  const old=await desktop.locator("textarea").inputValue();
  await desktop.locator('[data-prop="chest"]').dispatchEvent("keydown",{key:"ArrowRight"});
  await desktop.locator('[data-nudge="10,0"]').dispatchEvent("click");expect(await desktop.locator("textarea").inputValue()).toBe(old);
  await page.locator('[data-frame="desktop"]').click();await desktop.locator("[data-edit-toggle]").check();
  await expect(plate).toHaveAttribute("data-x","270");
  await desktop.locator("[data-reset-all]").click();await expect(plate).toHaveAttribute("data-x","856");
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);expect(errors).toEqual([]);
});

test("warnings are advisory and reset is per object",async({page})=>{
  const root=panel(page);await root.locator("[data-object-select]").selectOption("pressurePlate");
  for(const [axis,value] of [["x","-10"],["y","430"]]){await root.locator(`input[data-${axis}]`).fill(value);await root.locator(`input[data-${axis}]`).press("Enter");}
  const p=JSON.parse(await root.locator("textarea").inputValue());
  expect(p.objects[2]).toMatchObject({x:-10,y:430});expect(p.objects[2].warnings).toContain("outside-frame");expect(p.objects[2].warnings).toContain("dialogue");
  expect(p.layerOrder.indexOf("pressurePlate")).toBeGreaterThan(p.layerOrder.indexOf("mimiku"));
  expect(await root.locator("[data-sign-label]").evaluate(e=>e instanceof HTMLElement?e.style.zIndex:"")).toBe(await root.locator('[data-fixed="sign"]').evaluate(e=>e instanceof HTMLElement?e.style.zIndex:""));
  await root.locator("[data-reset]").click();await expect(root.locator('[data-prop="pressurePlate"]')).toHaveAttribute("data-x","856");
  await root.locator("[data-object-select]").selectOption("chest");await root.locator("input[data-y]").fill("30");await root.locator("input[data-y]").press("Enter");
  expect(JSON.parse(await root.locator("textarea").inputValue()).objects[0].warnings).toContain("open-lid-clearance");
});

test("clipboard receipts report stale writes, current success and rejected fallback",async({page})=>{
  await page.evaluate(()=>{
    const w=window as typeof window&{pending:{text:string;resolve:()=>void;reject:()=>void}[]};w.pending=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:(text:string)=>new Promise<void>((resolve,reject)=>w.pending.push({text,resolve,reject}))}});
  });
  const root=panel(page);await root.locator("[data-copy]").click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(1);
  await root.locator('[data-nudge="1,0"]').click();await page.evaluate(()=>(window as unknown as {pending:{resolve:()=>void}[]}).pending[0].resolve());
  await expect(root.locator("[data-status]")).toContainText("先前位置");
  await root.locator("[data-copy]").click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(2);
  await page.evaluate(()=>(window as unknown as {pending:{resolve:()=>void}[]}).pending[1].resolve());await expect(root.locator("[data-status]")).toContainText("已複製目前");
  await root.locator("[data-copy]").click();await expect.poll(()=>page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(3);
  await page.evaluate(()=>(window as unknown as {pending:{reject:()=>void}[]}).pending[2].reject());await expect(root.locator("[data-status]")).toContainText("Ctrl+C");await expect(root.locator("textarea")).toBeFocused();
});

test("failed images disable the affected frame and clear its receipt",async({page})=>{
  await page.addInitScript(()=>{const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=async function(){if(this.src.includes("open-sprite"))throw Error("image failure");await decode.call(this);};});
  await page.reload();await expect(panel(page)).toHaveAttribute("data-ready","error");
  await expect(panel(page).locator("textarea")).toHaveValue("");await expect(panel(page).locator("[data-copy]")).toBeDisabled();
  await page.locator('[data-frame="phone"]').click();await expect(panel(page,"phone")).toHaveAttribute("data-ready","true");
});

test("serializes rapid cross-frame clipboard requests and never lets an old write finish last",async({page})=>{
  await page.evaluate(()=>{
    const w=window as typeof window&{pending:{text:string;resolve:()=>void}[]};w.pending=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:(text:string)=>new Promise<void>(resolve=>w.pending.push({text,resolve}))}});
  });
  const desktop=panel(page);await desktop.locator("[data-copy]").click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(1);
  await page.locator('[data-frame="phone"]').click();const phone=panel(page,"phone");
  await phone.locator("[data-copy]").click();await phone.locator('[data-nudge="10,0"]').click();await phone.locator("[data-copy]").click();
  expect(await page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(1);
  await page.evaluate(()=>(window as unknown as {pending:{resolve:()=>void}[]}).pending[0].resolve());
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {pending:unknown[]}).pending.length)).toBe(2);
  const receipt=await page.evaluate(()=>JSON.parse((window as unknown as {pending:{text:string}[]}).pending[1].text));
  expect(receipt.frame.id).toBe("phone");expect(receipt.objects[0].x).toBe(30);
  await page.evaluate(()=>(window as unknown as {pending:{resolve:()=>void}[]}).pending[1].resolve());await expect(phone.locator("[data-status]")).toContainText("已複製目前");
});

test("cancels captured drags on frame switch and retains clean frozen overlays",async({page})=>{
  const desktop=panel(page),crate=desktop.locator('[data-prop="mapCrate"]');
  const b=(await crate.boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
  // Switching a frame ends capture, even if the physical pointer is still down.
  await page.locator('[data-frame="phone"]').dispatchEvent("click");
  const before=await desktop.locator("textarea").inputValue();await page.mouse.move(b.x+20,b.y+20);await page.mouse.up();
  expect(await desktop.locator("textarea").inputValue()).toBe(before);
  await page.locator('[data-frame="desktop"]').click();await expect(desktop.locator(".dialogue>div>strong")).toHaveText("Mimiku");
  await desktop.locator("[data-edit-toggle]").uncheck();await expect(desktop.locator(".prop.selected")).toHaveCount(0);
  await desktop.locator("[data-edit-toggle]").check();await desktop.locator("[data-object-select]").selectOption("pressurePlate");
  await desktop.locator("input[data-x]").fill("");await desktop.locator("input[data-x]").press("Enter");
  await expect(desktop.locator("[data-status]")).toContainText("有效整數");
});
