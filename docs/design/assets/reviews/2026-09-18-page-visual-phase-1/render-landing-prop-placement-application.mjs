export function renderReview(manifest,url){
  const {scenes,chestFrames}=manifest;
  const img=(asset,alt,zoom=1)=>`<img src="${url(asset)}" alt="${alt}" width="${asset.width*zoom}" height="${asset.height*zoom}">`;
  const rect=({x,y,width,height},kind)=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" class="${kind}"/>`;
  const scene=(view,label,asset)=>{
    const {frame:{width,height},guidance,crate}=scenes[view];
    const {x,y}=crate.ground;
    return `<section><h2>${label}</h2><div class="scene ${view}" style="max-width:${width}px">
      ${img(asset,label)}
      <div class="guides dialogue-preview"><div><strong>Mimiku</strong><br>先在火邊歇一會兒。下一段冒險，我陪你。</div><span>開始冒險 ↓</span></div>
      <svg class="guides" viewBox="0 0 ${width} ${height}" aria-hidden="true">
        ${rect(guidance.dialogue,"dialogue")}
        ${guidance.forbidden.map(zone=>`<g>${rect(zone,"warning")}<text x="${zone.x+2}" y="${zone.y+12}">${zone.id}</text></g>`).join("")}
        <text x="8" y="${guidance.dialogue.y+20}">對話框範圍</text>
        <circle cx="${x}" cy="${y}" r="4"/>
      </svg></div>
      ${crate.warnings.length?`<p class="guides">原擺位工具警示：${crate.warnings.join("、")}（以保守矩形判斷）</p>`:""}
    </section>`;
  };
  const comparison=(id,old,current,zoom)=>`<section><h3>${id}</h3><div class="pair">
    <figure>${img(old,id+" 原尺寸",zoom)}<figcaption>原尺寸 ${old.width} × ${old.height}</figcaption></figure>
    <figure>${img(current,id+" 套用後",zoom)}<figcaption>套用後 ${current.width} × ${current.height}</figcaption></figure>
  </div></section>`;
  return `<!doctype html>
<html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Landing 整體場景視覺審核</title>
<style>
*{box-sizing:border-box} body{margin:auto;max-width:1024px;padding:16px;color:#f6e8d0;background:#1a1411;font:16px/1.5 system-ui,sans-serif}
img{display:block;max-width:100%;height:auto;image-rendering:pixelated}
.scene{position:relative;container-type:inline-size}.scene svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.guides{display:none}body:has(#show-guides:checked) .guides{display:block}
.dialogue-preview{position:absolute;left:2%;right:2%;bottom:3%;height:19%;padding:1.4cqw 1.7cqw;border:2px solid #b79556;background:#211a18f2;font-size:1.6cqw}
body:has(#show-guides:checked) .dialogue-preview{display:flex;align-items:center;justify-content:space-between;gap:1cqw}
.dialogue-preview strong{color:#efc56c}.dialogue-preview span{background:#b68137;color:#211a18;padding:.7cqw 1.3cqw;white-space:nowrap}
.phone .dialogue-preview{bottom:2%;height:26%;font-size:3cqw}
.dialogue{fill:#59baff40;stroke:#b6ddff}.warning{fill:#ff90552a;stroke:#ffad75}
svg text{fill:#fff;stroke:#21150c;stroke-width:3;paint-order:stroke;font-size:13px}circle{fill:#caff89;stroke:#241910}
.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:end}
figure{margin:0;padding:8px;background:#2b211b;border-radius:6px}figcaption{margin-top:6px}
</style>
<body>
<h1>Landing 整體場景視覺審核</h1>
<p>Phase 1 · 待視覺審核。寶箱與木箱皆由高解析來源重新取樣。</p>
<label><input type="checkbox" id="show-guides"> 顯示對話框與警示</label>
${scene("desktop","桌機 · 關箱",chestFrames.closed.scene)}
${scene("desktop","桌機 · 開箱",chestFrames.open.scene)}
${scene("phone","手機",scenes.phone.scene)}
<h2>寶箱八格 · v04 與新尺寸（最高 2× 顯示）</h2>
${Object.entries(chestFrames).map(([id,{old,sprite}])=>comparison(id,old,sprite,2)).join("")}
<h2>地圖木箱 · 舊／新</h2>
${comparison("桌機",scenes.desktop.crate.old,scenes.desktop.crate.sprite,2)}
${comparison("手機",scenes.phone.crate.old,scenes.phone.crate.sprite,2)}
</body></html>
`;
}
