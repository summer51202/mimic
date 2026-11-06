import {defineConfig} from "@playwright/test";
import previous from "./treasure-chest-states.playwright.config";
export default defineConfig({...previous,testMatch:[
  "landing-chest-material-review.spec.ts","landing-title-placement-review.spec.ts",
  "landing-title-positioning-review.spec.ts","landing-mobile-title-positioning-review.spec.ts",
  "landing-a-title-review.spec.ts","treasure-chest-states-review.spec.ts","restored-treasure-chest-review.spec.ts"
]});
