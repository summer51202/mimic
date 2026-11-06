const prefix="docs/design/assets/reviews/2026-09-18-page-visual-phase-1/";
const rel=a=>a.path.slice(prefix.length);
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderChestReview(m,parentHTML){
  const title="Landing — 普通寶箱材質比較";
  let html=parentHTML.replaceAll("Landing — 已套用標題位置",title);
  const start=html.indexOf("<body><main>"),cards=html.indexOf('<div class="candidates">',start);
  if(start<0||cards<0)throw Error("Missing review boundaries");
  const figure=(a,label,cls="")=>'<figure><img class="'+cls+'" src="'+rel(a)+'" width="'+a.width+'" height="'+a.height+'" alt="'+esc(label)+'"><figcaption>'+esc(label)+'</figcaption></figure>';
  const intro='<h1>'+title+'</h1><p class="status">awaiting-calibration · reviewOnly: true · runtimePromotion: false</p><p>只比較普通寶箱材質與像素表現。圓拱蓋、朝向、105／284 落點與 78×66 圖層不變；兩版標題、手機、人物與其他道具保持原樣。</p><p>先看實際小圖，再看放大與整個場景。不是寶箱位置或完整 Scenes 核准。</p><p><a href="'+rel(m.inputs.prompt)+'">實際 ImageGen prompt</a> · <a href="'+rel(m.inputs.source)+'">透明新來源</a> · <a href="landing-chest-material.manifest.json">manifest</a></p><section class="material-comparison"><h2>78×66 實際輸出</h2><div class="chest-pair">'+figure(m.before.layer,"原稿 78×66","actual-chest")+figure(m.outputs.layer,"戰士基準新稿 78×66","actual-chest")+'</div><h2>同倍率放大</h2><div class="chest-pair">'+figure(m.outputs.beforeZoom,"原稿 3×")+figure(m.outputs.afterZoom,"新稿 3×")+'</div><h2>真實灰階小圖</h2><div class="chest-pair">'+figure(m.outputs.oldGray,"原稿灰階 78×66","actual-chest")+figure(m.outputs.layerGray,"新稿灰階 78×66","actual-chest")+'</div><h2>戰士顆粒參照</h2><div class="chest-pair">'+figure(m.inputs.warriorLayer,"場景戰士 132×149")+figure(m.inputs.warriorMaster,"戰士 master","warrior-master")+'</div></section>';
  html=html.slice(0,start)+"<body><main>"+intro+html.slice(cards);
  const original=html.match(/<section class="candidate" data-candidate="desktop-single">[\s\S]*?<\/section>/)?.[0];
  if(!original)throw Error("Missing desktop card");
  const before=original.replace('data-candidate="desktop-single"','data-candidate="desktop-before"').replaceAll('data-key="desktop-single"','data-key="desktop-before"').replace("桌機：單行 MIMIC","桌機原稿");
  const after=original.replace('data-candidate="desktop-single"','data-candidate="desktop-after"').replaceAll('data-key="desktop-single"','data-key="desktop-after"').replaceAll(rel(m.before.frame.color),rel(m.frames["desktop-after"].color)).replace("桌機：單行 MIMIC","桌機：戰士基準新稿");
  html=html.replace(original,before+after);
  html=html.replace("手機：共用交錯兩行版","手機：維持現狀");
  const grayFrames=Object.entries(m.frames).map(([id,f])=>figure(f.gray,id+" 場景灰階")).join("");
  html=html.replace(/<details><summary>兩張真實灰階輸出<\/summary>[\s\S]*?<\/details>/,'<details class="scene-grays"><summary>三張真實灰階場景輸出</summary><div class="raws">'+grayFrames+'</div></details>');
  html=html.replace(/<section class="notes" id="review-notes">[\s\S]*?<\/section>/,'<section class="notes" id="review-notes"><h2>等待寶箱素材視覺審核</h2><p>請確認小圖的木板／鐵帶分區、像素顆粒與暖光是否融入戰士與房間。標題位置已核准且固定；本輪新素材尚未核准。登入、木牌及 CTA 僅使用原 review 錨點，不連接認證、互動或帳務。</p></section>');
  const records=[...Object.values(m.inputs),m.before.layer,...Object.values(m.outputs),...Object.values(m.frames).flatMap(f=>[f.logical,f.color,f.gray,f.title])];
  const rows=records.map(a=>'<tr><td><code>'+esc(rel(a))+'</code>'+(a.width?'<br>'+a.width+'×'+a.height:"")+'</td><td><code>'+a.sha256+'</code></td></tr>').join("");
  html=html.replace(/<details><summary>exact SHA-256 與實際尺寸<\/summary>[\s\S]*?<\/details>/,'<details><summary>exact SHA-256 與實際尺寸</summary><table><tbody>'+rows+'</tbody></table></details>');
  html=html.replace("</head>",'<style>.chest-pair{display:flex;flex-wrap:wrap;gap:24px}.chest-pair figure{margin:0;max-width:100%;min-width:0}.chest-pair img{display:block;max-width:100%;height:auto;image-rendering:pixelated}.chest-pair .actual-chest{width:78px;height:66px}.chest-pair .warrior-master{width:256px}.material-comparison{padding:16px;background:#30271f}.material-comparison figcaption{overflow-wrap:anywhere}.candidates .candidate{margin-bottom:24px}</style></head>');
  if((html.match(/class="scene /g)??[]).length!==3||(html.match(/data-chapter/g)??[]).length!==4||html.includes("data-title-position-tool"))throw Error("Unexpected review structure");
  return html;
}
