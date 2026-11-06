import {readFile} from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {expect,test,type Page} from "@playwright/test";
const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const origin="https://a-title-review.local";
const fileURL=pathToFileURL(path.join(review,"landing-a-title-review.html")).href;
const panel=(p:Page,id="phone-staggered")=>p.locator('[data-title-position-tool][data-frame="'+id+'"]');
const sprite=(p:Page)=>panel(p).locator("[data-position-title]");
const background=(p:Page)=>panel(p).locator("[data-position-background]");
const select=(p:Page,id:string)=>p.locator('[data-position-frame="'+id+'"]').click();
const ready=(p:Page,id="phone-staggered")=>expect(panel(p,id)).toHaveAttribute("data-ready","true");
type Payload={frame:{id:string;width:number;height:number};scene:{path:string;sha256:string};title:{x:number;y:number;width:number;height:number;path:string;sha256:string}};
async function payload(p:Page,id="phone-staggered"):Promise<Payload>{return JSON.parse(await panel(p,id).locator("[data-position-json]").inputValue());}
async function serve(p:Page,query="phone",fault?: "missing"|"wrong"|"background"){
  await p.route(origin+"/**",async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    if(fault&&pathname===(fault==="background"?"/samples/landing-a-title/scene-phone-logical.png":"/samples/landing-a-title/wordmarks/phone-staggered.png")){
      if(fault==="wrong"){await route.fulfill({contentType:"image/png",body:await readFile(path.join(review,"samples/landing-a-title/wordmarks/single.png"))});return;}
      await route.fulfill({status:404,body:"Missing test source"});return;
    }
    const target=path.resolve(review,pathname.replace(/^\/+/,""));
    if(!target.startsWith(review+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
    try{await route.fulfill({body:await readFile(target),contentType:target.endsWith(".html")?"text/html; charset=utf-8":target.endsWith(".png")?"image/png":"text/plain; charset=utf-8"});}
    catch{await route.fulfill({status:404,body:"Not found"});}
  });
  await p.goto(origin+"/landing-a-title-review.html?position="+query);
  await expect(p.locator("[data-position-family]")).toHaveCount(1,{timeout:1000});
}
type PendingWindow=Window&{pendingCopies:{text:string;resolve:()=>void}[]};
test("phone entry uses real portrait layers, readable overlays and no overflow",async({page},info)=>{
  await serve(page);await ready(page);
  await expect(panel(page)).toBeVisible();await expect(panel(page,"desktop-single")).toBeHidden();
  expect(await payload(page)).toMatchObject({frame:{id:"phone-staggered",width:390,height:600},title:{x:116,y:93,width:148,height:98}});
  await expect(background(page)).toHaveAttribute("src","samples/landing-a-title/scene-phone-logical.png");
  await expect(panel(page).locator("[data-position-sprite]")).toHaveAttribute("src","samples/landing-a-title/wordmarks/phone-staggered.png");
  expect(await panel(page).locator("img").count()).toBe(2);
  const b=(await background(page).boundingBox())!;
  expect(b.width/b.height).toBeCloseTo(390/600,2);expect(b.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for(const button of await page.locator(".position-controls button:visible").all()){
    const box=(await button.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const dialogue=panel(page).locator(".position-dialogue");
  expect(await dialogue.evaluate(e=>e.scrollHeight<=e.clientHeight)).toBe(true);
  await expect(panel(page).locator(".position-cta")).toBeVisible();
  await expect(panel(page).locator(".position-login")).toBeVisible();
  await panel(page).screenshot({path:info.outputPath("phone-position-initial.png")});
  await panel(page).getByRole("checkbox",{name:"啟用定位"}).uncheck();
  await panel(page).screenshot({path:info.outputPath("phone-position-clean.png")});
});
test("phone mouse drag maps displayed scale without losing grab offset",async({page})=>{
  await serve(page);await ready(page);await background(page).scrollIntoViewIfNeeded();
  const b=(await background(page).boundingBox())!,t=(await sprite(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/3,t.y+t.height/3);await page.mouse.down();
  await page.mouse.move(t.x+t.width/3+20*b.width/390,t.y+t.height/3+10*b.height/600);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:136,y:103});
  await page.mouse.move(t.x,t.y);expect((await payload(page)).title).toMatchObject({x:136,y:103});
});
test("phone keys, clamp, cancel and reset use phone bounds",async({page})=>{
  await serve(page);await ready(page);await sprite(page).focus();
  await page.keyboard.press("ArrowRight");await page.keyboard.press("Shift+ArrowUp");
  expect((await payload(page)).title).toMatchObject({x:117,y:83});
  for(let i=0;i<60;i++)await page.keyboard.press("Shift+ArrowRight");
  for(let i=0;i<60;i++)await page.keyboard.press("Shift+ArrowDown");
  expect((await payload(page)).title).toMatchObject({x:242,y:502});
  await panel(page).getByRole("button",{name:"還原位置"}).click();
  await background(page).scrollIntoViewIfNeeded();
  const t=(await sprite(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();
  await sprite(page).dispatchEvent("pointercancel",{pointerId:1});
  await page.mouse.move(t.x+t.width/2+20,t.y+t.height/2+20);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:116,y:93});
  const json=panel(page).locator("[data-position-json]");await json.focus();await page.keyboard.press("ArrowLeft");
  expect((await payload(page)).title.x).toBe(116);
});
test("switch preserves independent positions, preferences and reset targets",async({page})=>{
  await serve(page);await ready(page);
  await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("checkbox",{name:"顯示輔助線"}).uncheck();
  await select(page,"desktop-single");await ready(page,"desktop-single");
  const desktop=panel(page,"desktop-single");
  await desktop.getByRole("button",{name:"向下微調"}).click();
  await expect(desktop.getByRole("checkbox",{name:"顯示輔助線"})).toBeChecked();
  await select(page,"phone-staggered");
  expect((await payload(page)).title).toMatchObject({x:117,y:93});
  await expect(panel(page).getByRole("checkbox",{name:"顯示輔助線"})).not.toBeChecked();
  await expect(desktop).toBeHidden();await expect(desktop.locator("[data-position-title]")).toBeDisabled();
  await panel(page).getByRole("button",{name:"還原位置"}).click();
  await select(page,"desktop-single");
  expect((await payload(page,"desktop-single")).title).toMatchObject({x:385,y:85});
  await select(page,"phone-staggered");expect((await payload(page)).title).toMatchObject({x:116,y:93});
});
test("switch cancels an active phone drag and hidden frame stays still",async({page})=>{
  await serve(page);await ready(page);await background(page).scrollIntoViewIfNeeded();
  const t=(await sprite(page).boundingBox())!,b=(await background(page).boundingBox())!;
  await page.mouse.move(t.x+t.width/2,t.y+t.height/2);await page.mouse.down();
  await page.mouse.move(t.x+t.width/2+20*b.width/390,t.y+t.height/2+10*b.height/600);
  await page.locator('[data-position-frame="desktop-single"]').evaluate(e=>(e as HTMLElement).click());
  await page.mouse.move(t.x+t.width/2+40,t.y+t.height/2+30);await page.mouse.up();
  await select(page,"phone-staggered");expect((await payload(page)).title).toMatchObject({x:136,y:103});
  await expect(panel(page)).not.toHaveAttribute("data-dragging");
});
test("real touch drag works and the rest of the page remains scrollable",async({browser,page})=>{
  const context=await browser.newContext({viewport:page.viewportSize()!,hasTouch:true});
  try{
    const touch=await context.newPage();await serve(touch);await ready(touch);await background(touch).scrollIntoViewIfNeeded();
    const t=(await sprite(touch).boundingBox())!,b=(await background(touch).boundingBox())!;
    const session=await context.newCDPSession(touch);
    const x=t.x+t.width/2,y=t.y+t.height/2;
    await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:x+20*b.width/390,y:y+10*b.height/600}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    expect((await payload(touch)).title).toMatchObject({x:136,y:103});
    expect(await sprite(touch).evaluate(e=>getComputedStyle(e).touchAction)).toBe("none");
    expect(await background(touch).evaluate(e=>getComputedStyle(e).touchAction)).toBe("auto");
    const scrollBefore=await touch.evaluate(()=>window.scrollY);
    await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:b.x+b.width-10,y:b.y+b.height/2}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:b.x+b.width-10,y:b.y+b.height/2-60}]});
    await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await expect.poll(()=>touch.evaluate(()=>window.scrollY)).toBeGreaterThan(scrollBefore);
    expect((await payload(touch)).title).toMatchObject({x:136,y:103});
  }finally{await context.close();}
});
test("real clipboard contains exact phone JSON, not desktop metadata",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin});
  await serve(page);await ready(page);
  await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("button",{name:"複製位置"}).click();
  await expect(panel(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  const actual=await page.evaluate(()=>navigator.clipboard.readText());
  expect(actual.replaceAll("\r\n","\n")).toBe(await panel(page).locator("[data-position-json]").inputValue());
  expect(JSON.parse(actual)).toEqual(await payload(page));
  expect(JSON.parse(actual)).toMatchObject({frame:{id:"phone-staggered"},title:{x:117,y:93,width:148,height:98}});
});
test("cross-frame pending writes are serialized and never announce success on wrong frame",async({page})=>{
  await page.addInitScript(()=>{
    const w=window as unknown as PendingWindow;w.pendingCopies=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:(text:string)=>new Promise<void>(resolve=>w.pendingCopies.push({text,resolve}))}});
  });
  await serve(page);await ready(page);await select(page,"desktop-single");await ready(page,"desktop-single");
  await panel(page,"desktop-single").getByRole("button",{name:"複製位置"}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(1);
  await select(page,"phone-staggered");await panel(page).getByRole("button",{name:"向右微調"}).click();
  await panel(page).getByRole("button",{name:"複製位置"}).click();
  expect(await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(1);
  await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[0].resolve());
  await expect.poll(()=>page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies.length)).toBe(2);
  await expect(panel(page).locator("[data-position-status]")).not.toContainText("已複製");
  await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[1].resolve());
  await expect(panel(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  expect(JSON.parse(await page.evaluate(()=>(window as unknown as PendingWindow).pendingCopies[1].text))).toMatchObject({frame:{id:"phone-staggered"},title:{x:117}});
});
for(const fault of ["missing","wrong","background"] as const){
  test("phone image "+fault+" disables only phone",async({page})=>{
    await serve(page,"phone",fault);
    await expect(panel(page)).toHaveAttribute("data-ready","error");
    await expect(panel(page).getByRole("button",{name:"複製位置"})).toBeDisabled();
    await expect(panel(page).locator("[data-position-json]")).toHaveValue("");
    await select(page,"desktop-single");await ready(page,"desktop-single");
    await panel(page,"desktop-single").getByRole("button",{name:"向右微調"}).click();
    expect((await payload(page,"desktop-single")).title.x).toBe(386);
    await expect(page.locator(".scene")).toHaveCount(3);
  });
}
for(const failure of ["missing","rejected"] as const){
  test("phone clipboard "+failure+" offers current selectable JSON",async({page})=>{
    await page.addInitScript(kind=>Object.defineProperty(navigator,"clipboard",{configurable:true,value:kind==="missing"?undefined:{writeText:async()=>{throw Error("Denied test permission");}}}),failure);
    await serve(page);await ready(page);await panel(page).getByRole("button",{name:"複製位置"}).click();
    const json=panel(page).locator("[data-position-json]");
    await expect(json).toBeFocused();
    await expect(panel(page).locator("[data-position-status]")).toContainText("請選取 JSON");
    expect(await json.evaluate(e=>{const t=e as HTMLTextAreaElement;return t.selectionEnd-t.selectionStart;})).toBe((await json.inputValue()).length);
    expect((await payload(page)).frame.id).toBe("phone-staggered");
  });
}
test("unknown query falls back to desktop and resize never changes selected frame",async({page})=>{
  await serve(page,"unexpected");await ready(page,"desktop-single");await expect(panel(page,"desktop-single")).toBeVisible();
  await select(page,"phone-staggered");await ready(page);await panel(page).getByRole("button",{name:"向右微調"}).click();
  await page.setViewportSize({width:320,height:568});await expect(panel(page)).toBeVisible();
  expect((await payload(page)).title.x).toBe(117);
  await page.setViewportSize({width:1440,height:900});await expect(panel(page)).toBeVisible();
  expect((await payload(page)).title.x).toBe(117);
});
test("actual file phone URL is usable and reload resets only unsaved preview",async({page})=>{
  await page.goto(fileURL+"?position=phone");await ready(page);await expect(panel(page)).toBeVisible();
  await panel(page).getByRole("button",{name:"向右微調"}).click();expect((await payload(page)).title.x).toBe(117);
  await page.reload();await ready(page);expect((await payload(page)).title.x).toBe(116);
});
