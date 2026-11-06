const fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process');
const R='docs/design/assets/reviews/2026-09-18-page-visual-phase-1/',D=R+'samples/derivations/treasure-chest-states-v04/';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),b=JSON.parse(fs.readFileSync(D+'baseline.json'));
const changed=Object.entries(b.files).filter(([f,h])=>!fs.existsSync(f)||sha(fs.readFileSync(f))!==h).map(([f])=>f);
const prefix=Buffer.from(b.devlogPrefix,'base64'),devlog=fs.readFileSync('.agents/devlog.md');
const report={baselineFiles:Object.keys(b.files).length,changed,indexUnchanged:sha(cp.execFileSync('git',['diff','--cached','--binary'],{maxBuffer:30e6}))===b.stagedBinaryDiff,devlogPrefix:devlog.subarray(0,prefix.length).equals(prefix),devlogPrefixBytes:prefix.length};
console.log(JSON.stringify(report,null,2));if(changed.length||!report.indexUnchanged||!report.devlogPrefix)process.exitCode=1;
