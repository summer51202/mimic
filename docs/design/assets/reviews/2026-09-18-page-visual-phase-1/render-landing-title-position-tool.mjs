import { createPositionModel } from "./landing-title-position.model.mjs";
import { mountPositionTool } from "./landing-title-position.controller.mjs";
import { mountPositionFamily } from "./landing-title-position.family.mjs";

function renderPositionPanel(manifest,key) {
  const rel=a=>a.path.split("2026-09-18-page-visual-phase-1/")[1];
  const frame=manifest.frames[key],scene=manifest.scenes[frame.view].logical,title=frame.title;
  const meta={frame:{id:key,width:scene.width,height:scene.height},scene:{...scene,path:rel(scene)},title:{...title,path:rel(title)}};
  createPositionModel(meta);
  const json=JSON.stringify(meta).replaceAll("<","\\u003c").replaceAll("\u2028","\\u2028").replaceAll("\u2029","\\u2029");
  const esc=text=>String(text).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const sign=manifest.scenes[frame.view].layers.find(l=>l.id==="sign");
  if(!sign)throw Error("Missing preserved sign");
  const signStyle="left:"+(sign.x+sign.width*.16)/scene.width*100+"%;top:"+(sign.y+sign.height*.17)/scene.height*100+"%;width:"+sign.width*.7/scene.width*100+"%;height:"+sign.height*.48/scene.height*100+"%";
  return `<section class="position-tool${frame.view==="phone"?" position-phone":""}" data-title-position-tool data-frame="${key}" data-ready="loading" aria-labelledby="position-heading-${key}"${frame.view==="phone"?" hidden inert":""}>
<h2 id="position-heading-${key}">${frame.view==="phone"?"手機兩行 MI／MIC":"桌機單行 MIMIC"}：標題定位</h2>
<p>只有標題可移動，尺寸／亮度／其餘素材鎖定。目前使用${frame.view==="phone"?"手機直向構圖，不是桌機裁切":"桌機橫向構圖"}；切換版本會保留本次載入的各自位置。</p>
<div class="position-controls">
<label><input type="checkbox" data-position-mode checked disabled>啟用定位</label>
<label><input type="checkbox" data-position-guide-toggle checked disabled>顯示輔助線</label>
<button type="button" data-position-nudge="-1,0" aria-label="向左微調" disabled>←</button>
<button type="button" data-position-nudge="0,-1" aria-label="向上微調" disabled>↑</button>
<button type="button" data-position-nudge="0,1" aria-label="向下微調" disabled>↓</button>
<button type="button" data-position-nudge="1,0" aria-label="向右微調" disabled>→</button>
<button type="button" data-position-reset disabled>還原位置</button>
<button type="button" data-position-copy disabled>複製位置</button>
</div>
<p>拖動標題；聚焦後方向鍵移動 1 logical px，Shift＋方向鍵移動 10。關閉定位看乾淨預覽。重整不保存，請先複製位置。</p>
<div class="position-viewport"><div class="position-stage">
<img class="position-background" data-position-background src="${esc(meta.scene.path)}" width="${scene.width}" height="${scene.height}" alt="無法師 A ${frame.view==="phone"?"手機":"桌機"}場景，標題另層定位" draggable="false">
<button type="button" class="position-title" data-position-title aria-label="可移動的 MIMIC 標題" tabindex="-1" disabled><img data-position-sprite src="${esc(meta.title.path)}" width="${title.width}" height="${title.height}" alt="" draggable="false"></button>
<a class="position-sign" href="#journal" style="${signStyle}">開始<br>冒險</a>
<a class="position-login" href="#review-notes">登入</a>
<div class="position-dialogue"><div><span class="position-speaker">Mimiku</span><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><a class="position-cta" href="#journal">開始冒險 ↓</a></div>
<div class="position-guides" data-position-guides aria-hidden="true" hidden><span class="position-guide-box" data-position-guide-box></span><span class="position-guide-v" data-position-guide-v></span><span class="position-guide-h" data-position-guide-h></span></div>
</div></div>
<p data-position-coordinates>圖片載入中。</p><p data-position-status role="status" aria-live="polite">圖片載入中。</p>
<label for="position-json-${key}">位置 JSON（可手動選取複製）</label><textarea id="position-json-${key}" class="position-json" data-position-json readonly spellcheck="false"></textarea>
<p>只限制在場景內以防裁切；是否跨洞口／岩縫或遮住伙伴仍需目視。貼回 JSON 後才另行套用，不會自動修改檔案或核准。</p>
<script type="application/json" data-position-config>${json}</script>
<noscript>定位工具需要 JavaScript；下方原比較頁仍可閱讀。</noscript>
</section>
`;
}

export function renderPositionTool(manifest) {
  return `<!--landing-title-position-tool:start-->
<style>
.position-tool{margin:24px 0;padding:16px;background:#30271f;border:1px solid #806644}
.position-tool h2{margin:0 0 8px}.position-tool p{margin:8px 0}
.position-controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.position-controls button,.position-controls label{min-width:44px;min-height:44px;padding:8px 12px;border:1px solid #aa8956;background:#241d18;color:#ecd9b7;display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit}
.position-controls button:disabled{opacity:.55}.position-controls input{accent-color:#d7aa56}
.position-viewport{max-width:960px;margin:auto;outline:2px solid #6c5036}
.position-stage{position:relative;container-type:inline-size;margin:0;padding:0;border:0;overflow:hidden;background:#30231b}
.position-background{display:block;width:100%;height:auto;image-rendering:pixelated;user-select:none}
.position-title{position:absolute;z-index:2;padding:0;margin:0;border:0;background:transparent;line-height:0;cursor:grab;touch-action:none;opacity:1}
.position-title img{display:block;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}
.position-title:disabled{cursor:default;pointer-events:none;opacity:1}
.position-title:focus-visible{outline:3px solid #eabc62;outline-offset:-3px}
.position-controls button:focus-visible,.position-controls input:focus-visible,.position-json:focus-visible{outline:3px solid #eabc62;outline-offset:2px}
.position-tool[data-dragging] .position-title{cursor:grabbing}
.position-tool:not([data-ready="true"]) .position-title{visibility:hidden}
.position-guides{position:absolute;inset:0;z-index:6;pointer-events:none}
.position-guides[hidden]{display:none}.position-guide-box{position:absolute;border:1px dashed #ffe3a0}
.position-guide-v{position:absolute;top:0;bottom:0;border-left:1px dashed #ffe3a0}
.position-guide-h{position:absolute;left:0;right:0;border-top:1px dashed #ffe3a0}
.position-sign{position:absolute;z-index:3;display:flex;align-items:center;justify-content:center;text-align:center;text-decoration:none;font-weight:800;font-size:1.12cqw;line-height:1.15;color:#ffe8ac;text-shadow:1px 1px #3e2316}
.position-login{position:absolute;z-index:4;right:3%;top:4%;padding:.4cqw 1.2cqw;background:#211a17d9;border:1px solid #a78953;text-decoration:none;font-size:1.6cqw}
.position-dialogue{position:absolute;z-index:4;left:2%;right:2%;bottom:3%;height:19%;padding:1.1cqw 1.7cqw;border:2px solid #b79556;background:#211a18f2;display:flex;align-items:center;justify-content:space-between;gap:1.2cqw;font-size:1.6cqw;line-height:1.35}
.position-dialogue .position-speaker{color:#efc56c;font-weight:700}.position-dialogue p{margin:.3cqw 0;font-size:1.6cqw}
.position-cta{white-space:nowrap;padding:.7cqw 1.3cqw;border:2px solid #f0ce80;background:#b68137;color:#211a18;font-weight:800;text-decoration:none}
.position-json{display:block;width:100%;height:220px;margin-top:8px;padding:10px;resize:vertical;background:#211a18;color:#ecd9b7;border:1px solid #aa8956;font:12px/1.5 ui-monospace,monospace;white-space:pre;overflow:auto}
.position-tool [data-position-status]{min-height:24px}
@media(max-width:600px){.position-tool{padding:10px}.position-controls{gap:6px}.position-controls button,.position-controls label{padding:8px}.position-json{font-size:11px}}

.position-family-controls button[aria-pressed="true"]{background:#80603a;border-color:#efc56c}
.position-family-controls button:focus-visible{outline:3px solid #eabc62;outline-offset:2px}
.position-phone .position-viewport{max-width:390px}
.position-phone .position-sign{font-size:3.3cqw}
.position-phone .position-login{font-size:12px;padding:3px 10px}
.position-phone .position-dialogue{bottom:2%;height:26%;padding:8px;display:block}
.position-phone .position-speaker{font-size:11px;line-height:1.3}
.position-phone .position-dialogue p{font-size:12px;margin:3px 0}
.position-phone .position-cta{display:inline-block;margin-top:4px;font-size:12px;padding:4px 10px}
</style>
<div data-position-family>
<div class="position-controls position-family-controls" role="group" aria-label="選擇定位版本">
<button type="button" data-position-frame="desktop-single" aria-controls="position-heading-desktop-single" aria-pressed="true">桌機單行</button>
<button type="button" data-position-frame="phone-staggered" aria-controls="position-heading-phone-staggered" aria-pressed="false">手機兩行</button>
</div>
${["desktop-single","phone-staggered"].map(key=>renderPositionPanel(manifest,key)).join("")}
</div>
<script>(${mountPositionFamily.toString()})(${createPositionModel.toString()},${mountPositionTool.toString()},document.querySelector("[data-position-family]"));</script>
<!--landing-title-position-tool:end-->
`;
}
