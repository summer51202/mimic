const {chromium}=require('../web/node_modules/playwright');
const {PNG}=require('../web/node_modules/pngjs');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 await page.context().addCookies([{name:'mimic-locale',value:'ja',url:'http://127.0.0.1:3873'}]);
 await page.goto('http://127.0.0.1:3873/login',{timeout:120000});
 await page.evaluate(()=>{const root=document.createElement('div');root.style.cssText='position:fixed;top:0;left:0;z-index:2147483647;background:white;color:black';for(const [id,lang]of [['ja-probe','ja'],['zh-probe','zh-Hant']]){const el=document.createElement('div');el.id=id;el.lang=lang;el.textContent='直角骨';el.style.cssText='width:360px;height:90px;font-size:64px;line-height:90px;background:white;color:black';if(lang!=='ja')el.style.fontFamily='Arial,Helvetica,sans-serif';root.append(el);}document.body.append(root);});
 await page.evaluate(()=>document.fonts.ready.then(()=>true));
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const{root}=await cdp.send('DOM.getDocument');
 const results={};const buffers=[];
 for(const id of ['ja-probe','zh-probe']){const{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});results[id]={fonts:(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts,computed:await page.locator('#'+id).evaluate(e=>getComputedStyle(e).fontFamily)};buffers.push(await page.locator('#'+id).screenshot());}
 const images=buffers.map(b=>PNG.sync.read(b));let differences=0;for(let i=0;i<images[0].data.length;i++)if(images[0].data[i]!==images[1].data[i])differences++;
 results.rgbaDifferences=differences;
 const out='docs/design/assets/reviews/2026-11-19-phase-2ib';await page.screenshot({path:out+'/screenshots/japanese-kanji-font-probe-390x844.png'});fs.writeFileSync(out+'/kanji-font-probe.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
