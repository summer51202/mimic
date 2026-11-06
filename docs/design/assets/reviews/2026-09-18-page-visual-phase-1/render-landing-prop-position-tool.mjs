import {measureCarving} from "./carving-texture-metric.mjs";
import {createPropPositionModel} from "./landing-prop-position.model.mjs";
import {mountPropPositionTool} from "./landing-prop-position.controller.mjs";

export function renderPropPositionTool(manifest) {
  const esc=t=>String(t).replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const rel=p=>p.split("2026-09-18-page-visual-phase-1/")[1];
  const style=(r,f)=>`left:${r.x/f.width*100}%;top:${r.y/f.height*100}%;width:${r.width/f.width*100}%;height:${r.height/f.height*100}%`;
  const img=(a,extra="")=>`<img src="${esc(manifest.inlinePixels?.[a.path]??rel(a.path))}" width="${a.width}" height="${a.height}" data-width="${a.width}" data-height="${a.height}" alt="" draggable="false" ${extra}>`;
  function panel(meta){
    createPropPositionModel(meta);
    const f=meta.frame,phone=f.id==="phone",json=JSON.stringify(meta).replaceAll("<","\\u003c");
    const exploration=phone&&f.viewportWidth;
    const zones=[{...meta.guidance.floor,id:"地板帶",kind:"floor"},{...meta.guidance.dialogue,id:"對話框區",kind:"dialogue"},
      ...meta.fixed.filter(o=>["warrior","ranger","fire","mimiku","sign","wordmark"].includes(o.id)).map(o=>({...o,kind:"outline"})),
      ...meta.guidance.forbidden.map(o=>({...o,kind:"forbidden"})),
      ...(meta.guidance.carving?[{...meta.guidance.carving.open,kind:"forbidden",dynamic:true}]:[]),
      ...(meta.guidance.carving?.titleReserve?[{...meta.guidance.carving.titleReserve,kind:"forbidden"}]:[]),
      ...(meta.guidance.carving?.masonry??[]).map(o=>({...o,kind:"outline"}))];
    return `<section data-prop-panel="${f.id}" data-ready="loading" class="panel ${f.id}${exploration?" exploration":""}" ${phone?"hidden inert":""} aria-labelledby="heading-${f.id}">
<h2 id="heading-${f.id}">${manifest.calibration?(phone?"手機 · 探索條":"桌機 · 壁畫擺位"):exploration?"手機 · 探索條":phone?"手機 · 地圖木箱":"桌機 · 三件道具"}</h2>
<p>${manifest.calibration?"選擇壁畫後可切換狀態、拖曳或輸入座標。":exploration?"1170×600 探索條，預設顯示中段。座標以全寬畫布為準，左段寶箱的初始位置供試擺。":phone?"390×600 獨立構圖，初始畫面只有地圖木箱可移動。":"960×540 場景；壓力板可自由擺放，不限右側通道。寶箱使用 ground 腳底錨點。"}</p>
<div class="controls">
<label>道具 <select data-object-select disabled>${meta.objects.map(o=>`<option value="${o.id}">${o.label}</option>`).join("")}</select></label>
<label><input type="checkbox" data-edit-toggle checked disabled>啟用擺位</label>
<label><input type="checkbox" data-guides-toggle checked disabled>顯示導引</label>
<label ${phone&&!exploration?"hidden":""}>${manifest.calibration?"道具狀態":"寶箱預覽"} <select data-variant disabled>${Object.keys(meta.objects[0].variants).map(v=>`<option>${v}</option>`).join("")}</select></label>
</div>
<div class="controls"><label>X <input data-x type="number" step="1" disabled></label><label>Y <input data-y type="number" step="1" disabled></label>
${[1,10].map(step=>`<div role="group" aria-label="${step} px 微調">${[["←",-step,0,"左"],["↑",0,-step,"上"],["↓",0,step,"下"],["→",step,0,"右"]].map(([label,x,y,direction])=>`<button type="button" data-nudge="${x},${y}" aria-label="向${direction} ${step} px" disabled>${label} ${step}</button>`).join("")}</div>`).join("")}
<button type="button" data-reset disabled>重設此道具</button><button type="button" data-reset-all disabled>重設此畫面</button><button type="button" data-copy disabled>複製此畫面 JSON</button></div>
<p>拖曳道具，或選擇道具後用按鈕／X、Y 輸入微調。道具聚焦時：方向鍵 1 px，Shift＋方向鍵 10 px。關閉擺位可看乾淨預覽。</p>
${exploration?`<div class="controls" role="group" aria-label="探索視窗">${["左段","中段","右段"].map((label,i)=>`<button type="button" data-viewport-x="${i*390}" aria-pressed="${i===1}" disabled>${label}</button>`).join("")}</div>`:""}
<div class="viewport"><div class="stage" data-stage>
${img(meta.scene,'class="background"')}
${meta.fixed.map(o=>`<div class="fixed" data-fixed="${o.id}" style="${style(o,f)}">${img(o)}</div>`).join("")}
${meta.objects.map(o=>`<button type="button" class="prop" data-prop="${o.id}" aria-label="可移動的${o.label}" aria-pressed="false" disabled tabindex="-1" style="opacity:${o.opacity}">${Object.entries(o.variants).map(([v,a])=>img(a,`data-sprite-variant="${v}" ${v===o.variant?"":"hidden"}`)).join("")}</button>`).join("")}
<div class="dialogue"><div><strong>Mimiku</strong><p>先在火邊歇一會兒。下一段冒險，我陪你。</p></div><span>開始冒險 ↓</span></div>
<span class="sign-text" data-sign-label style="${style(meta.signLabel,f)}">開始<br>冒險</span><span class="login">登入</span>
<div class="guides" data-guides hidden aria-hidden="true">${zones.map(z=>`<div class="zone ${z.kind}" ${z.dynamic?"data-open-zone":""} style="${style(z,f)}"><span>${esc(z.id)}</span></div>`).join("")}</div>
</div></div>
${meta.guidance.carving?'<p data-carving-ratio></p>':""}
<p data-coordinates>圖片載入中。</p><p data-status role="status" aria-live="polite">圖片載入中。</p>
<details open><summary>即時警示（只提示，不阻擋）</summary><ul data-warnings></ul></details>
<label for="json-${f.id}">此畫面座標回執 JSON</label><textarea id="json-${f.id}" readonly spellcheck="false"></textarea>
<script type="application/json" data-config>${json}</script></section>`;
  }
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Landing 道具擺位工具</title><style>
*{box-sizing:border-box}body{margin:0;background:#201b17;color:#efdfc5;font:16px/1.5 system-ui,sans-serif}main{max-width:1240px;margin:auto;padding:24px}h1{font-size:28px;margin:0 0 8px}h2{font-size:22px}p{margin:8px 0 16px}a{color:#f3c97b}.note{padding:12px 16px;border-left:3px solid #ddb15f;background:#30271f}.controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0}.controls>div{display:flex;gap:4px}.controls label{display:flex;align-items:center;gap:8px;min-height:44px}.controls input[type=checkbox]{width:20px;height:20px;accent-color:#d8b36e}button,select,input,textarea{font:inherit;color:inherit;background:#30271f;border:1px solid #aa8956;border-radius:3px}button,select,input{min-height:44px;padding:8px}button{cursor:pointer}button:disabled,select:disabled,input:disabled{opacity:.5;cursor:default}button:active{background:#624627}button[aria-pressed=true]{border-color:#ffe2a0;background:#684b2c}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:3px solid #ffe2a0;outline-offset:2px}input[type=number]{width:100px}.panel{padding:16px;border:1px solid #806644;background:#29211b;margin-top:16px}[hidden]{display:none!important}.viewport{max-width:960px;margin:16px auto;outline:1px solid #9f7c4d}.phone .viewport{max-width:390px}.stage{position:relative;container-type:inline-size;overflow:hidden}.background{display:block;width:100%;height:auto;image-rendering:pixelated}.fixed,.prop{position:absolute;padding:0;border:0;margin:0;background:transparent;line-height:0}.fixed{pointer-events:none}.fixed img,.prop img{display:block;width:100%;height:100%;image-rendering:pixelated;pointer-events:none}.prop{min-height:0;min-width:0;touch-action:none;cursor:grab}.prop:active{cursor:grabbing;background:transparent}.prop:disabled{opacity:1;pointer-events:none}.prop.selected{outline:1px dashed #ffe2a0;outline-offset:2px;background:transparent}.prop[aria-pressed=true]{background:transparent;border:0}.prop:focus-visible{outline:2px solid #ffe2a0;outline-offset:2px}.panel:not([data-ready=true]) .prop{visibility:hidden}.guides{position:absolute;inset:0;pointer-events:none;z-index:100}.zone{position:absolute;border:1px dashed #e9d8b0}.zone span{position:absolute;left:0;top:0;font:10px/1.2 system-ui;background:#211a18d9;color:#fff;white-space:nowrap}.zone.floor{background:#87c77b12;border-color:#a0d58b}.zone.dialogue{background:#cd87562a;border-color:#ffc18c}.zone.forbidden{border-color:#ff9b91;background:#e8736317}.zone.outline{border-color:#99ccec}.dialogue{position:absolute;z-index:90;left:2%;right:2%;bottom:3%;height:19%;border:2px solid #b79556;background:#211a18f2;padding:1.1cqw 1.7cqw;font-size:1.6cqw;display:flex;align-items:center;gap:1.2cqw}.dialogue strong{color:#efc56c}.dialogue>div{flex:1}.dialogue p{margin:.3cqw 0}.dialogue span{padding:.7cqw 1.3cqw;background:#b68137;color:#211a18;font-weight:700;border:2px solid #f0ce80}.sign-text{position:absolute;z-index:80;display:flex;align-items:center;justify-content:center;text-align:center;font-size:1.12cqw;font-weight:800;line-height:1.15;color:#ffe8ac;text-shadow:1px 1px #3e2316;pointer-events:none}.login{position:absolute;z-index:90;right:3%;top:4%;font-size:1.6cqw;border:1px solid #a78953;padding:.4cqw 1.2cqw;background:#211a17d9}.phone .dialogue{bottom:2%;height:26%;padding:8px;display:block;font-size:12px}.phone .dialogue p{margin:3px 0}.phone .dialogue strong{font-size:11px}.phone .dialogue span{display:inline-block;font-size:12px;padding:4px 10px;margin-top:4px}.phone .login{font-size:12px;padding:3px 10px}.phone .sign-text{font-size:3.3cqw}textarea{display:block;width:100%;height:240px;resize:vertical;padding:12px;font:12px/1.5 ui-monospace,monospace;white-space:pre;overflow:auto}details{margin:16px 0}summary{cursor:pointer;min-height:44px;padding:8px 0}ul{padding-left:24px}[data-status]{min-height:24px;color:#f3cf8c}footer{margin-top:24px;color:#d1bea3}@media(max-width:600px){main{padding:12px}.panel{padding:10px}h1{font-size:24px}.controls>div{flex-wrap:wrap}}
${manifest.frames.phone.frame.viewportWidth?`.exploration{--segment:1}.exploration .viewport{overflow:clip;container-type:inline-size}.exploration .stage{width:300%;margin-left:calc(var(--segment) * -100%);container-type:normal}.exploration .dialogue{left:calc((var(--segment) + .02)*100%/3);right:auto;width:32%}.exploration .login{right:calc((2 - var(--segment) + .03)*100%/3)}`:""}
</style></head><body><main><h1>Landing 道具擺位工具</h1>
<p class="note">Review only · 等待座標 JSON。拖放只改本次預覽；重整會重設，不會寫入位置或核准場景。請分別複製桌機與手機 JSON 貼回聊天。</p>
<p>${manifest.calibration?"壁畫與其他道具可試擺。刻痕色彩依預設岩壁取樣，移到其他位置時請重新確認明暗。":"寶箱：已核准 v04／八格。壓力板：已核准 attempt-06／85×35／opacity 0.85。尺寸與旋轉鎖定。"}</p>
<div data-prop-family><div class="controls" role="group" aria-label="選擇擺位畫面"><button type="button" data-frame="desktop" aria-pressed="true">桌機</button><button type="button" data-frame="phone" aria-pressed="false">手機</button></div>
${Object.values(manifest.frames).map(panel).join("\n")}</div>
<details><summary>導引與 JSON 說明</summary><p>桌機對話框保守區為底部 22%；手機沿用底部 28% 區。綠框是地板帶，藍框是固定人物與物件外框，紅框是臉／篝火／Mimiku／木牌／標題禁止遮擋區。這些為保守矩形導引，非像素級碰撞；仍需目視確認。</p><p>超出畫面與地板帶皆只警示。寶箱即使顯示 closed，也檢查 open 蓋子的空間。所有可移動物件與固定人物依腳底 y 排序；相同 y 依 id 穩定排序。標題與裝飾維持背景層。JSON 記錄各來源完整 SHA-256、當前座標、origin、ground、preview、圖層順序與警示。</p></details>
<p><a href="${manifest.manifestName??(manifest.frames.phone.frame.viewportWidth?"landing-prop-position-exploration":"landing-prop-position")+".manifest.json"}">工具 manifest</a> · <a href="landing-a-title-review.html">原標題定位工具（唯讀保留）</a>${manifest.calibration?`<span> · <a href="${manifest.reviewName??"props-calibration-v02-review.html"}">回 Props 校準</a></span>`:` · <a href="pressure-plate-attempt-06-review.html">壓力板外觀</a>`} · <a href="ancient-treasure-chest-v04-review.html">寶箱 v04</a></p>
<footer>本輪只交付擺位工具。等你拖放並回傳 JSON，才在另一輪套用位置；未核准整體場景，未修改 runtime 或 production exports。</footer><noscript>工具需要 JavaScript 才能拖放與匯出。</noscript>
</main><script>(${mountPropPositionTool.toString()})(${createPropPositionModel.toString()},document.querySelector("[data-prop-family]"),${manifest.inlinePixels?measureCarving.toString():"null"});</script></body></html>\n`;
}
