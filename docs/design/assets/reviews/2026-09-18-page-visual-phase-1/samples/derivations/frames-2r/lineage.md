# Frames 2R 來源

使用內建 ImageGen 生成一張五格材質圖集。保留唯一一次嘗試 [attempt-01.png](attempt-01.png)。右下格留空。輸入是風格參考。

- [寶箱 v04](../../treasure-chest-states-v04/closed-sprite.png)
- [木牌](../../landing-warm-rest/layers/A-desktop/sign.png)
- [地圖木箱](../../landing-prop-placement-application/desktop-crate.png)
- [Landing 左側石牆](../../landing-prop-placement-application/desktop-closed.png)
- [戰士](../../landing-warm-rest/layers/A-desktop/warrior.png)

## 原始提示詞

> Create the NEW raw pixel-art material atlas for five Mimic RPG UI nine-slice borders. This is one atlas deliverable, comprising 5 DISTINCT MATERIALS laid out in a strict 3 columns × 2 rows grid on a landscape canvas. The attached project artwork is for style/material reference only: chest for iron and muted brass, sign and crate for wood, cave for ochre-brown masonry, warrior for pixel granularity. Do not copy their subjects. Hard, square-edged retro 16-bit pixel clusters at a clear chunky logical pixel scale, front-on orthographic, flat 2D UI assets. Strong silhouettes and readable small material forms. NO glow, NO photorealistic rendering, no text, no numerals, no symbols, no badges, no UI content, no dramatic highlights. Dark warm iron and subdued aged brass; lighter cream for parchment only. Canvas and holes both pure flat bright chroma-key magenta #ff00ff (not used anywhere in the art), no shadow outside the art. Each cell has exactly one square frame, centered, the same size and thickness, safely separated by generous magenta gutters. Each frame must have a square rectangular outer envelope, small clipped pixel corners permitted, and a truly empty magenta square hole taking roughly 43 percent of its outer width. Border thickness roughly 28 percent of outer width, each straight edge parallel and continuous with constant thickness. Put interesting details in the four corners and keep the straight central edge sections straight and tileable. Top-left: warm aged parchment with tattered gently curled paper rims, tiny understated aged-brass protective corners. Top-middle: two laminated warm oak planks, obvious flowing pixel woodgrain, dark iron L-shaped corner braces with two visible tiny rivets. Top-right: ochre warm cave masonry, one row of individually readable stagger-colored rectangular stone blocks separated by dark brown mortar, slightly larger keyed corner stones. Bottom-left: warm very dark brown lacquer with delicate subdued aged-brass inner rails and restrained shaped bronze corner ornaments, subtle rivets, narrow brass. Bottom-middle: rich oxblood-brown saddle leather book-cover edging, clearly visible low-contrast ochre stitches and an inset binding strap along left border, fully outside empty opening. Bottom-right cell must remain completely blank magenta. Each frame differs strongly in material silhouette and treatment. All five are designed to read at 48×48 logical pixels. Keep the whole artwork centered and preserve equally sized gutters. Only the atlas.

## 衍生方式

合成器按圖集 3 × 2 格定位，將洋紅鍵色及輪廓上的深洋紅殘色轉為透明，並以各格非鍵色像素的外框取樣。每格採最近鄰取樣至 52 × 52，以 14 邏輯 px 切成四角與四邊，中央 24 × 24 清成透明。邊條各自將首尾兩列或欄的 RGB 逐級收斂，透明輪廓維持硬邊。最後一個內緣像素在有需要時補上中心色，讓圖像內緣接上 CSS 純色。羊皮紙角件與對話框黃銅壓低亮度與飽和度，筆記本縫線與鉚釘一併收斂。取樣位置和每張輸出雜湊見 [frames.json](../../frames-2r/frames.json)。
