const {chromium}=require('../web/node_modules/playwright');
const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve('docs/design/assets/reviews/2026-11-19-phase-2ib');
const messages=Object.fromEntries(['zh-TW','en','ja'].map(locale=>[locale,JSON.parse(fs.readFileSync(locale==='ja'?'.tmp/2ib-ja-final.json':`web/src/i18n/messages/${locale}.json`,'utf8'))]));
const face=(file,name)=>`@font-face{font-family:"${name}";font-weight:800;src:url(data:font/ttf;base64,${fs.readFileSync(file).toString('base64')})}`;
const fonts=[{name:'Arial',css:''},{name:'Roboto',css:face('C:/Windows/Fonts/Roboto-Black.ttf','Roboto')},{name:'Liberation Sans',css:face('.tmp/phase-2i-LiberationSans-Bold.ttf','Liberation Sans')}];
(async()=>{
 fs.mkdirSync(`${out}/screenshots`,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
 const results=[];
 try{
 for(const font of fonts)for(const locale of ['zh-TW','en','ja'])for(const authenticated of [false,true]){
  const page=await browser.newPage({javaScriptEnabled:false,viewport:{width:320,height:720}});
  await page.goto('http://127.0.0.1:3268/',{timeout:120000});
  const msg=messages[locale];
  await page.evaluate(({font,locale,msg,authenticated})=>{
   document.documentElement.lang=locale==='zh-TW'?'zh-Hant':locale;
   const nav=document.querySelector('header nav');
   const [brand,features,account]=nav.querySelectorAll('a');
   brand.querySelector('.mimic-wordmark__character').textContent=msg.brand.speaker;
   features.textContent=msg.common.features;
   account.textContent=msg.nav.header[authenticated?'base':'login'];
   const button=nav.querySelector('button');
   button.replaceChildren();
   const name=document.createElement('span');name.lang=document.documentElement.lang;name.textContent=locale==='en'?'English':locale==='ja'?'日本語':'中文';
   const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent=' ▾';
   button.append(name,arrow);
   button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
   const style=document.createElement('style');style.textContent=font.css+':lang(ja){font-family:Arial,Helvetica,"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic",Meiryo,"Noto Sans JP",sans-serif;line-break:strict}';document.head.append(style);
   nav.style.fontFamily=`"${font.name}","Microsoft JhengHei",sans-serif`;
   // Preserve Japanese fallback while exercising each requested Latin family.
   if(locale==='ja')for(const el of nav.querySelectorAll('*'))el.style.fontFamily=`"${font.name}","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif`;
  },{font,locale,msg,authenticated});
  await page.evaluate(()=>document.fonts.ready.then(()=>true));
  const measurement=await page.evaluate(()=>{
   const nav=document.querySelector('header nav');const brand=nav.querySelector('a');const actions=nav.querySelector('button').parentElement;
   const w=e=>e.getBoundingClientRect().width;
   const items=[brand,...actions.children].map(el=>{
    const clone=el.cloneNode(true);Object.assign(clone.style,{position:'absolute',width:'max-content',flexShrink:'0'});el.after(clone);const natural=w(clone);clone.remove();
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const tops=[];let node;while(node=walker.nextNode()){if(!node.textContent.trim()||!node.parentElement.getClientRects().length)continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width>0)tops.push(Math.round(r.top));}
    return{text:el.innerText,width:w(el),naturalWidth:natural,lineTops:[...new Set(tops)],overflow:el.scrollWidth>el.clientWidth};
   });
   const required=items.reduce((s,i)=>s+i.naturalWidth,0)+parseFloat(getComputedStyle(nav).columnGap)+2*parseFloat(getComputedStyle(actions).columnGap);
   return{viewport:innerWidth,available:w(nav),required,margin:w(nav)-required,items,horizontalOverflow:document.documentElement.scrollWidth>innerWidth};
  });
  const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const{root}=await cdp.send('DOM.getDocument');
  const used={};for(const selector of ['header button','header nav > a .mimic-wordmark__product']){const{nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});used[selector]=(await cdp.send('CSS.getPlatformFontsForNode',{nodeId})).fonts;}
  const result={locale,authenticated,font:font.name,...measurement,fontsUsed:used};results.push(result);
  await page.screenshot({path:`${out}/screenshots/header-preflight-${locale}-${authenticated?'signed-in':'signed-out'}-${font.name.replaceAll(' ','-')}-320x720.png`,fullPage:false});
  console.log(JSON.stringify({locale,authenticated,font:font.name,margin:measurement.margin,required:measurement.required}));
  await page.close();
 }
 }finally{fs.writeFileSync(`${out}/header-preflight.json`,JSON.stringify({method:'7bca944 rendered header; DOM-only prototype of specified current-name plus text arrow, unchanged layout CSS. Not a completed LanguageSwitch implementation or pixel regression.',browser:browser.version(),results},null,2)+'\n');await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
