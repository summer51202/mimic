import { config as base } from "./landing-war-room.config.mjs";
const source = "samples/derivations/landing-war-room/warm-rest/";
export const config = {
  decision: "awaiting-calibration", reviewOnly: true, runtimePromotion: false,
  stage: "rough-composition", wordmarkPlacement: base.wordmarkPlacement,
  wordmarkTone: base.wordmarkTone, references: { ...base.references, wordmark: "samples/landing-war-room/wordmark.png" },
  sources: { ...base.sources,
    architectureDesktop: source + "architecture-desktop-v01-source.png",
    architecturePhone: source + "architecture-phone-v01-source.png",
    warrior: source + "warrior-warm-v01-source.png", mage: source + "mage-warm-v01-source.png",
    ranger: source + "ranger-inward-v02-source.png", mimiku: source + "mimiku-warm-v01-source.png",
    groundLight: source + "ground-light-v01-source.png" },
  lineagePath: source + "lineage.json",
  variants: {
    A: { label: "A — 緊密火邊", description: "小隊較緊密，前側仍留一個可以加入的開口。",
      desktop: { mage: [229,187,105], ranger: [598,187,153], mapCrate: [235,281,113], warrior: [350,196,132], fire: [486,272,103], mimiku: [610,282,123], sign: [742,327,70] },
      phone: { mage: [12,213,88], ranger: [245,198,122], mapCrate: [20,286,79], warrior: [101,235,104], fire: [212,306,75], mimiku: [289,316,95], sign: [15,355,62] },
      visitor: { desktop: [409,380,190,34], phone: [120,386,155,36] } },
    B: { label: "B — 錯落迎接", description: "增加前後錯落，前側地面更寬，伙伴仍屬同一群組。",
      desktop: { mage: [207,186,105], ranger: [641,192,153], mapCrate: [215,278,113], warrior: [344,190,132], fire: [493,272,103], mimiku: [621,288,123], sign: [764,320,70] },
      phone: { mage: [5,211,88], ranger: [254,205,122], mapCrate: [14,284,79], warrior: [98,235,104], fire: [205,289,75], mimiku: [282,296,95], sign: [10,352,62] },
      visitor: { desktop: [396,380,222,35], phone: [107,368,163,54] } },
  },
  secondary: base.layers.filter(l => !["mage","ranger","mapCrate","warrior","fire","mimiku","sign"].includes(l.id)),
  layerOrder: ["mage","ranger","mapCrate","warrior","fire","mimiku","sign"],
};
