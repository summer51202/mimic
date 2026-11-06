import { createHash } from "node:crypto";
import { readFile,writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderReview } from "./render-landing-a-title.mjs";

const dir=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(dir,"../../../../..");
const require=createRequire(path.join(repo,"web/package.json")),{PNG}=require("pngjs");
const hash=b=>createHash("sha256").update(b).digest("hex");
const m=JSON.parse(await readFile(path.join(dir,"landing-a-title.manifest.json"),"utf8"));
const expected=[
  [m.scenes.desktop.logical,"ce0d33c06d816ec5c77aa07dcbf846d6d481d83076988cf00f40ff6b42e0f48e",960,540],
  [m.frames["desktop-single"].title,"4ecc5bc6788f34854aac81a54d35b85fad9648c9f9d6499200f825246976ff31",288,84],
  [m.scenes.phone.logical,"7573dceb82c484c223164d26e4fc6514f65ee2149d65001bba0e9a2a824f693d",390,600],
  [m.frames["phone-staggered"].title,"8fd7d677df46cc77478518de2a9f68ff77b8ae4d28deb25e6b11ad5ba6ee8f1c",148,98],
];
for(const [a,digest,width,height] of expected){
  const file=path.resolve(repo,a.path);
  if(!file.startsWith(dir+path.sep))throw Error("Asset outside review");
  const bytes=await readFile(file),png=PNG.sync.read(bytes);
  if(a.sha256!==digest||hash(bytes)!==digest||a.width!==width||a.height!==height||png.width!==width||png.height!==height)throw Error("Changed positioning asset: "+a.path);
}
const previous=await readFile(path.join(dir,"landing-warm-rest-review.html"),"utf8");
const html=renderReview(m,previous);
if((html.match(/data-title-position-tool data-frame=/g)??[]).length!==2)throw Error("Expected two independent panels");
await writeFile(path.join(dir,"landing-a-title-review.html"),html);
console.log("Rendered review HTML only: "+hash(html));
