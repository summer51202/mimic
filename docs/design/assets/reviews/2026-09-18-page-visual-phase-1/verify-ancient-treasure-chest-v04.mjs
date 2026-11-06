import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {createRequire} from 'node:module';
const R='docs/design/assets/reviews/2026-09-18-page-visual-phase-1/';
const {PNG}=createRequire(path.resolve('web/package.json'))('pngjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest=R+'ancient-treasure-chest-v04.manifest.json',m=JSON.parse(fs.readFileSync(manifest));
const files=[...Object.values(m.outputs).map(a=>a.path),m.review.path,manifest];
const before=files.map(f=>sha(fs.readFileSync(f)));
if(process.argv.includes('--rebuild')){
  const {composeAncientChest}=await import('./compose-ancient-treasure-chest-v04.mjs');
  await composeAncientChest();await composeAncientChest();
}
let transparent=0,badRGB=0;
for(const a of Object.values(m.outputs)){
 const b=fs.readFileSync(a.path),p=PNG.sync.read(b);if(sha(b)!==a.sha256||p.width!==a.width||p.height!==a.height)throw Error('Asset mismatch '+a.path);
 for(let i=0;i<p.data.length;i+=4)if(!p.data[i+3]){transparent++;if(p.data[i]||p.data[i+1]||p.data[i+2])badRGB++;}
}
const changed=files.filter((f,i)=>sha(fs.readFileSync(f))!==before[i]);
const report={pngs:Object.keys(m.outputs).length,files:files.length,rebuilds:process.argv.includes('--rebuild')?2:0,changed,transparent,badRGB,openingProgress:m.openingProgress,atlas: m.inputs.source.sha256,manifest:sha(fs.readFileSync(manifest)),html:sha(fs.readFileSync(m.review.path)),sprites:Object.fromEntries(Object.entries(m.frames).map(([id,f])=>[id,f.sprite.sha256]))};
console.log(JSON.stringify(report,null,2));if(changed.length||badRGB)process.exitCode=1;
