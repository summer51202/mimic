import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const review=path.resolve(process.cwd(),"..","docs/design/assets/reviews/2026-09-18-page-visual-phase-1");
const origin="https://a-title-review.local";
const fileURL=pathToFileURL(path.join(review,"landing-a-title-review.html")).href;
type PositionPayload={title:{x:number;y:number;width:number;height:number};frame:{id:string;width:number;height:number}};
type CopyWindow=Window & {pendingCopies:{text:string;resolve:()=>void}[]};
const root=(page:Page)=>page.locator('[data-title-position-tool][data-frame="desktop-single"]');
const title=(page:Page)=>root(page).locator("[data-position-title]");
const data=(page:Page)=>root(page).locator("[data-position-json]");
async function payload(page:Page):Promise<PositionPayload>{return JSON.parse(await data(page).inputValue());}
async function ready(page:Page){await expect(root(page)).toHaveAttribute("data-ready","true");}
async function serve(page:Page,fault?: "missing"|"wrong"|"background"){
  await page.route(origin+"/**",async route=>{
    const urlPath=decodeURIComponent(new URL(route.request().url()).pathname);
    const target="/samples/landing-a-title/wordmarks/desktop-single.png";
    if(fault==="background"&&urlPath==="/samples/landing-a-title/scene-desktop-logical.png"){
      await route.fulfill({status:404,body:"Missing background test image"});return;
    }
    if((fault==="missing"||fault==="wrong")&&urlPath===target){
      if(fault==="missing"){await route.fulfill({status:404,body:"Missing test image"});return;}
      await route.fulfill({contentType:"image/png",body:await readFile(path.join(review,"samples/landing-a-title/wordmarks/single.png"))});return;
    }
    const file=path.resolve(review,urlPath.replace(/^\/+/,""));
    if(!file.startsWith(review+path.sep)){await route.fulfill({status:403,body:"Forbidden"});return;}
    try{await route.fulfill({body:await readFile(file),contentType:file.endsWith(".html")?"text/html; charset=utf-8":file.endsWith(".png")?"image/png":file.endsWith(".json")?"application/json":"text/plain; charset=utf-8"});}
    catch{await route.fulfill({status:404,body:"Not found"});}
  });
  await page.goto(origin+"/landing-a-title-review.html");
  await expect(root(page)).toHaveCount(1,{timeout:1_000});
}
async function delayedClipboard(page:Page){
  await page.addInitScript(()=>{
    const w=window as unknown as CopyWindow;w.pendingCopies=[];
    Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
      writeText:(text:string)=>new Promise<void>(resolve=>w.pendingCopies.push({text,resolve})),
    }});
  });
}

test("initial tool keeps the real desktop frame, no duplicate title, no overflow",async({page},info)=>{
  await serve(page);await ready(page);
  const p=await payload(page);
  expect(p.title).toMatchObject({x:385,y:84,width:288,height:84});
  expect(p.frame).toEqual({id:"desktop-single",width:960,height:540});
  await expect(root(page).locator("[data-position-background]")).toHaveAttribute("src","samples/landing-a-title/scene-desktop-logical.png");
  await expect(root(page).locator("[data-position-sprite]")).toHaveAttribute("src","samples/landing-a-title/wordmarks/desktop-single.png");
  expect(await root(page).locator("img").count()).toBe(2);
  expect(await page.locator(".scene").count()).toBe(3);
  expect(await page.locator("[data-chapter]").count()).toBe(4);
  const box=(await root(page).locator("[data-position-background]").boundingBox())!;
  expect(box.width/box.height).toBeCloseTo(960/540,2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  for(const button of await root(page).locator(".position-controls button").all()){
    const b=(await button.boundingBox())!;expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await root(page).screenshot({path:info.outputPath("title-position-initial.png")});
});

test("drag, keyboard, clamp, reset and cancel obey logical coordinates",async({page})=>{
  await serve(page);await ready(page);
  await root(page).locator("[data-position-background]").scrollIntoViewIfNeeded();
  let image=(await root(page).locator("[data-position-background]").boundingBox())!;
  const box=(await title(page).boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+60*image.width/960,box.y+box.height/2+30*image.height/540);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:445,y:114});
  await title(page).focus();await page.keyboard.press("ArrowRight");await page.keyboard.press("Shift+ArrowUp");
  expect((await payload(page)).title).toMatchObject({x:446,y:104});
  await root(page).getByRole("button",{name:"向下微調"}).click();
  expect((await payload(page)).title.y).toBe(105);
  const saved=await payload(page);await data(page).focus();await page.keyboard.press("ArrowLeft");
  expect(await payload(page)).toEqual(saved);
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await root(page).locator("[data-position-background]").scrollIntoViewIfNeeded();
  image=(await root(page).locator("[data-position-background]").boundingBox())!;
  const restored=(await title(page).boundingBox())!;
  await page.mouse.move(restored.x+restored.width/2,restored.y+restored.height/2);await page.mouse.down();
  await page.mouse.move(image.x+image.width-1,image.y+image.height-1);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:672,y:456});
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await root(page).locator("[data-position-background]").scrollIntoViewIfNeeded();
  const again=(await title(page).boundingBox())!;
  await page.mouse.move(again.x+again.width/2,again.y+again.height/2);await page.mouse.down();
  await title(page).dispatchEvent("pointercancel",{pointerId:1});
  await page.mouse.move(again.x+again.width/2+10,again.y+again.height/2+10);await page.mouse.up();
  expect((await payload(page)).title).toMatchObject({x:385,y:84});
});

test("guides, clean preview, focus and reset retain separate preferences",async({page},info)=>{
  await serve(page);await ready(page);
  const mode=root(page).getByRole("checkbox",{name:"啟用定位"}),guides=root(page).getByRole("checkbox",{name:"顯示輔助線"});
  await guides.uncheck();await mode.uncheck();
  await expect(title(page)).toBeDisabled();await expect(root(page).locator("[data-position-guides]")).toBeHidden();
  await expect(root(page).getByRole("button",{name:"向右微調"})).toBeDisabled();
  await expect(root(page).getByRole("button",{name:"複製位置"})).toBeEnabled();
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await mode.check();await expect(guides).not.toBeChecked();
  await guides.check();await expect(root(page).locator("[data-position-guides]")).toBeVisible();
  await title(page).focus();
  expect(await title(page).evaluate(e=>getComputedStyle(e).outlineWidth)).toBe("3px");
  // Trigger the mode change without clicking away first, to exercise focus transfer.
  await mode.evaluate(e=>{(e as HTMLInputElement).checked=false;e.dispatchEvent(new Event("change",{bubbles:true}));});
  await expect(mode).toBeFocused();
  await root(page).screenshot({path:info.outputPath("title-position-clean.png")});
});

test("reset, mode change and lost capture end an active drag",async({page})=>{
  await serve(page);await ready(page);
  const mode=root(page).getByRole("checkbox",{name:"啟用定位"});
  for(const ending of ["reset","mode","lost"] as const){
    await mode.check();await root(page).getByRole("button",{name:"還原位置"}).click();
    const image=(await root(page).locator("[data-position-background]").boundingBox())!,b=(await title(page).boundingBox())!;
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
    await page.mouse.move(b.x+b.width/2+20*image.width/960,b.y+b.height/2+10*image.height/540);
    if(ending==="reset")await root(page).getByRole("button",{name:"還原位置"}).evaluate(e=>(e as HTMLElement).click());
    if(ending==="mode")await mode.evaluate(e=>{(e as HTMLInputElement).checked=false;e.dispatchEvent(new Event("change",{bubbles:true}));});
    if(ending==="lost")await title(page).evaluate(e=>e.releasePointerCapture(1));
    await page.mouse.move(b.x+b.width/2+40*image.width/960,b.y+b.height/2+20*image.height/540);await page.mouse.up();
    expect((await payload(page)).title).toMatchObject(ending==="reset"?{x:385,y:84}:{x:405,y:94});
  }
});

test("real clipboard contains the current JSON and moving invalidates success",async({page,context})=>{
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin});
  await serve(page);await ready(page);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await root(page).getByRole("button",{name:"複製位置"}).click();
  await expect(root(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  const actual=await page.evaluate(()=>navigator.clipboard.readText());
  // Windows clipboard uses CRLF; require identical content after newline normalization.
  expect(actual.replaceAll("\r\n","\n")).toBe(await data(page).inputValue());
  expect(JSON.parse(actual)).toEqual(JSON.parse(await data(page).inputValue()));
  expect(JSON.parse(actual).title.x).toBe(386);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await expect(root(page).locator("[data-position-status]")).not.toContainText("已複製");
});

for(const failure of ["missing","rejected"] as const){
  test("clipboard "+failure+" retains selectable current JSON",async({page})=>{
    await page.addInitScript(kind=>{
      Object.defineProperty(navigator,"clipboard",{configurable:true,value:kind==="missing"?undefined:{writeText:async()=>{throw Error("denied by test");}}});
    },failure);
    await serve(page);await ready(page);
    await root(page).getByRole("button",{name:"複製位置"}).click();
    await expect(root(page).locator("[data-position-status]")).toContainText("請選取 JSON");
    await expect(data(page)).toBeFocused();
    expect(await data(page).evaluate(e=>{const t=e as HTMLTextAreaElement;return t.selectionEnd-t.selectionStart;})).toBe((await data(page).inputValue()).length);
    expect((await payload(page)).title.x).toBe(385);
  });
}

test("delayed copy is stale after movement; queued copies never claim the wrong position",async({page})=>{
  await delayedClipboard(page);await serve(page);await ready(page);
  const copy=root(page).getByRole("button",{name:"複製位置"});
  await copy.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(1);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  await root(page).getByRole("button",{name:"還原位置"}).click();
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[0].resolve());
  await expect(root(page).locator("[data-position-status]")).toContainText("剪貼簿為先前位置");
  await copy.click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(2);
  await root(page).getByRole("button",{name:"向右微調"}).click();await copy.click();
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[1].resolve());
  await expect.poll(()=>page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies.length)).toBe(3);
  await expect(root(page).locator("[data-position-status]")).not.toContainText("已複製");
  await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[2].resolve());
  await expect(root(page).locator("[data-position-status]")).toHaveText("已複製目前位置");
  expect(JSON.parse(await page.evaluate(()=>(window as unknown as CopyWindow).pendingCopies[2].text)).title.x).toBe(386);
});

for(const fault of ["missing","wrong","background"] as const){
  test("image "+fault+" stops tool, not the historical review",async({page})=>{
    await serve(page,fault);
    await expect(root(page)).toHaveAttribute("data-ready","error");
    await expect(root(page).locator("[data-position-status]")).toContainText("無法使用定位");
    await expect(title(page)).toBeDisabled();await expect(root(page).getByRole("button",{name:"複製位置"})).toBeDisabled();
    await expect(data(page)).toHaveValue("");
    await expect(page.locator("[data-candidate]")).toHaveCount(2);
    await expect(page.locator("[data-chapter]")).toHaveCount(4);
  });
}

test("the actual file URL runs without fetch, network or file-module imports",async({page})=>{
  await page.goto(fileURL);await ready(page);
  await root(page).getByRole("button",{name:"向右微調"}).click();
  expect((await payload(page)).title.x).toBe(386);
  await page.reload();await ready(page);
  expect((await payload(page)).title.x).toBe(385);
});
