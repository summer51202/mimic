import {renderTreasureChestReview} from "./render-treasure-chest-states.mjs";
import {frames,mainFrames,timelines} from "./restored-chest.config.mjs";
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const rel=a=>a.path.slice(prefix.length);
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderRestoredChestReview(m,parentHTML,scripts){
  let html=renderTreasureChestReview(m,parentHTML,scripts);
  const swap=(from,to)=>{if(!html.includes(from))throw Error("Missing legacy boundary: "+from);html=html.replace(from,to);};
  html=html.replaceAll("Landing — 藏寶箱四態比較","Landing — 修整老箱與重量開關")
    .replaceAll('href="treasure-chest-states.manifest.json"','href="restored-treasure-chest.manifest.json"');
  swap("播放140ms一段、三段420ms","開啟750ms／關閉660ms，逐段時間不同");
  swap('</h1>','</h1><p>小隊修整過、正在使用的珍藏老箱：深暖木材、一處下角修復、有份量的鎖扣；逐步揭露堆疊金幣與青藍寶石。篝火與伙伴仍為主角。</p>');
  const picks=frames.map(id=>'<button type="button" data-frame-pick="'+id+'" aria-pressed="false" disabled>'+id+'</button>').join("");
  swap('</div><p role="status">','</div><div class="controls frame-controls">'+picks+'</div><p role="status">');
  const extra=frames.filter(id=>!Object.values(mainFrames).includes(id));
  const preload=extra.map(id=>'<img hidden data-state-asset="'+id+'" src="'+rel(m.frames[id].color)+'" alt="">').join("");
  swap('<section class="candidate" data-candidate="desktop-single">',preload+'<section class="candidate" data-candidate="desktop-single">');
  const figure=(a,label,actual=false)=>'<figure><img class="'+(actual?"actual-sprite":"")+'" src="'+esc(rel(a))+'" width="'+a.width+'" height="'+a.height+'" alt="'+esc(label)+'"><figcaption>'+esc(label)+'</figcaption></figure>';
  const card=(id,f,old=false)=>'<section class="state-card" '+(old?'data-old-state="':'data-transition="')+id+'"><h3>'+id+'</h3>'+figure(f.sprite,(old?"v01 ":"v02 ")+id+" 實際104×120",true)+(old?"":figure(f.zoom,id+" 2×")+figure(f.spriteGray,id+" 真實灰階",true))+'</section>';
  const transitions='<h2>必要過渡幀（同一物件，不是新候選）</h2><div class="state-gallery">'+extra.map(id=>card(id,m.frames[id])).join("")+'</div>';
  const old='<h2>v01原四態家族（保留、尚未核准）</h2><div class="state-gallery">'+Object.keys(mainFrames).map(id=>card(id,m.oldFrames[id],true)).join("")+'</div>';
  const timing='<h2>可重現開／關節奏</h2><pre class="timing">'+esc(JSON.stringify(timelines,null,2))+'</pre><p>after為進入該幀前的等待毫秒；state只有四個，frame共有八個。此節奏僅供review。</p>';
  swap('<h2>原閉合候選與戰士基準</h2>',transitions+old+timing+'<h2>原閉合候選與戰士基準</h2>');
  swap('</head>','<style>.timing{white-space:pre-wrap;overflow-wrap:anywhere}.frame-controls{margin-top:8px}.frame-controls button{min-width:44px}</style></head>');
  if((html.match(/data-state-asset=/g)??[]).length!==8||(html.match(/data-frame-pick=/g)??[]).length!==8||(html.match(/data-chapter/g)??[]).length!==4||html.includes("播放140ms一段"))throw Error("Incomplete v02 review");
  return html;
}
