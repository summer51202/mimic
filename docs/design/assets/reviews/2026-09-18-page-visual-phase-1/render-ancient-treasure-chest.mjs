import {renderRestoredChestReview} from "./render-restored-treasure-chest.mjs";
const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const rel=a=>esc(a.path.slice(prefix.length));
export function renderAncientChestReview(m,parentHTML,scripts){
  // The legacy table assumes an edit target for every generation; render the
  // actual generate/edit history below instead of inventing a target.
  let html=renderRestoredChestReview({...m,sourceHistory:[]},parentHTML,scripts);
  const oldIntro="小隊修整過、正在使用的珍藏老箱：深暖木材、一處下角修復、有份量的鎖扣；逐步揭露堆疊金幣與青藍寶石。篝火與伙伴仍為主角。";
  if(!html.includes(oldIntro))throw Error("Missing introduction boundary");
  html=html.replaceAll("Landing — 修整老箱與重量開關","Landing — 修復後的古老珍藏")
    .replaceAll('href="restored-treasure-chest.manifest.json"','href="ancient-treasure-chest.manifest.json"')
    .replaceAll("v02 ","v03 ")
    .replace(oldIntro,"古老珍藏：工藝與年代，而非華麗裝飾。小隊找到並修好的圓拱木箱；暗鐵結構、克制修復、細長鎖扣。像素以戰士為基準。標題、手機與其他物件固定；本頁等待整組視覺審核。");
  const previous=Object.entries(m.previousFrames).filter(([id])=>["closed","cracked","half-open","open"].includes(id)).map(([id,f])=>'<section class="state-card" data-previous-state="'+id+'"><h3>v02 '+id+'</h3><figure><img class="actual-sprite" src="'+rel(f.sprite)+'" width="104" height="120" alt="被否決的 v02 '+id+'"><figcaption>舊 v02；美術未獲核准，保留比較</figcaption></figure></section>').join("");
  const history=m.sourceHistory.map((s,i)=>'<li>attempt-'+String(i+1).padStart(2,"0")+' · '+(s.editTarget?'編修 '+rel(s.editTarget):'新生成；沒有 edit target')+'<br><a href="'+rel(s.source)+'">'+rel(s.source)+'</a><br><code>'+esc(s.source.sha256)+'</code><br>references: '+s.references.map(rel).join(" · ")+'</li>').join("");
  const section='<section class="generation-history"><h2>上一輪 v02（已否決，僅供比較）</h2><div class="state-gallery">'+previous+'</div><h2>實際生成與編修紀錄</h2><p>01 探索未採用；02 重新以戰士參照生成；03、04 編修前一稿。選定 04，原始 bytes 不變。來源圖是美術草稿，不是 production sprites。</p><ol>'+history+'</ol></section>';
  if(!html.includes('<section class="notes"'))throw Error("Missing review boundary");
  html=html.replace('<section class="notes"',section+'<section class="notes"');
  return html.replace('</head>','<style>.generation-history{overflow-wrap:anywhere}.generation-history li{margin-bottom:16px}.generation-history code{word-break:break-all}</style></head>');
}
