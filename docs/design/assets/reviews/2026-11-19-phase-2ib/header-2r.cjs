const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.resolve('web/node_modules/playwright'));
const output = path.resolve('docs/design/assets/reviews/2026-11-19-phase-2ib');
const face = (file, name) => `@font-face{font-family:"${name}";font-weight:800;src:url(data:font/ttf;base64,${fs.readFileSync(file).toString('base64')})}`;
const fonts = [{name:'Arial',css:''}, {name:'Roboto',css:face('C:/Windows/Fonts/Roboto-Black.ttf','Roboto')}, {name:'Liberation Sans',css:face('.tmp/phase-2i-LiberationSans-Bold.ttf','Liberation Sans')}];
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const results = [];
 try {
  for (const font of fonts) for (const locale of ['zh-TW','en','ja']) for (const authenticated of [false,true]) {
   const context = await browser.newContext({viewport:{width:320,height:720},deviceScaleFactor:1});
   await context.addCookies([{name:'mimic-locale',value:locale,url:'http://127.0.0.1:3269'}, ...(authenticated ? [{name:'mimic_access',value:'header.fixture.only',url:'http://127.0.0.1:3269'}] : [])]);
   const page = await context.newPage();
   await page.goto('http://127.0.0.1:3269/', {timeout:120000});
   await page.locator('header button').waitFor();
   if(font.css)await page.addStyleTag({content:font.css});
   await page.evaluate(font => {
    const nav=document.querySelector('header nav');
    nav.style.fontFamily=`"${font.name}","Microsoft JhengHei",sans-serif`;
    if(document.documentElement.lang==='ja')for(const el of nav.querySelectorAll('*'))el.style.fontFamily=`"${font.name}","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif`;
   },font);
   await page.evaluate(() => document.fonts.ready.then(() => true));
   for(const width of [320,359,360,390,543,544,545]) {
    await page.setViewportSize({width,height:width===320?720:width<390?800:844});
    const measured = await page.evaluate(() => {
     const nav=document.querySelector('header nav');const trigger=nav.querySelector('button');const actions=trigger.parentElement.parentElement;
     const brand=nav.querySelector('a');const links=[...actions.querySelectorAll(':scope > a')];
     const w=e=>e.getBoundingClientRect().width;
     const items=[brand,trigger,...links].map(el=>{
      const clone=el.cloneNode(true);Object.assign(clone.style,{position:'absolute',width:'max-content',flexShrink:'0'});el.after(clone);const natural=w(clone);clone.remove();
      const nodes=[];const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
      while(n=walker.nextNode()){
       const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
       if(rects.length)nodes.push({text:n.textContent,rects:rects.map(r=>({top:r.top,left:r.left,width:r.width,height:r.height}))});
      }
      const product=el.querySelector('.mimic-wordmark__product');const sub=el.querySelector('.mimic-wordmark__character');
      const brandWrap=!!(product&&sub&&getComputedStyle(sub).display!=='none'&&sub.getBoundingClientRect().top>=product.getBoundingClientRect().bottom);
      const wraps=brandWrap||nodes.some(n=>new Set(n.rects.map(r=>Math.round(r.top))).size>1);
      return{text:el.innerText,naturalWidth:natural,width:w(el),wraps,nodes};
     });
     const required=items.reduce((s,i)=>s+i.naturalWidth,0)+parseFloat(getComputedStyle(nav).columnGap)+2*parseFloat(getComputedStyle(actions).columnGap);
     const available=w(nav),margin=available-required;
     return{viewport:innerWidth,available,required,margin,fit:items.every(i=>!i.wraps&&i.naturalWidth<=i.width+.05),items,triggerName:trigger.getAttribute('aria-label'),htmlLang:document.documentElement.lang};
    });
    const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');
    const used={};for(const selector of ['header button', 'header nav > a .mimic-wordmark__product']){const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});used[selector]=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;}
    await cdp.detach();
    const result={locale,authenticated,font:font.name,...measured,fontsUsed:used};results.push(result);
    if(width===320||!measured.fit||measured.margin<8)await page.screenshot({path:`${output}/screenshots/header-2r-${locale}-${authenticated?'signed-in':'signed-out'}-${font.name.replaceAll(' ','-')}-${width}x${width===320?720:width<390?800:844}.png`});
   }
   await context.close();
  }
 } finally {
  fs.writeFileSync(`${output}/header-2r.json`,JSON.stringify({browser:browser.version(),method:'Actual candidate LanguageSwitch and server-rendered locale/header; fixture JWT-shaped cookie selects authenticated header only; Latin font pressure tests via CSS with CDP font records. Not a real-backend authentication test.',results},null,2)+'\n');
  await browser.close();
 }
 const failures=results.filter(r=>!r.fit||r.margin<8);
 console.log(JSON.stringify({measurements:results.length,failures:failures.map(r=>({locale:r.locale,authenticated:r.authenticated,font:r.font,width:r.viewport,margin:r.margin,fit:r.fit})),english:results.filter(r=>r.locale==='en'&&[320,359,360].includes(r.viewport)).map(r=>({font:r.font,authenticated:r.authenticated,width:r.viewport,margin:r.margin,text:r.items[1].text,name:r.triggerName}))},null,2));
 if(failures.length)process.exitCode=2;
})().catch(e=>{console.error(e);process.exitCode=1;});
