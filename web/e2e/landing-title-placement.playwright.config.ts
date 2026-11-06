import {defineConfig} from "@playwright/test";
export default defineConfig({
  testDir:".",testMatch:["landing-title-placement-review.spec.ts","landing-title-positioning-review.spec.ts","landing-mobile-title-positioning-review.spec.ts","landing-a-title-review.spec.ts"],
  workers:1,timeout:60_000,
  projects:[
    {name:"phone-small",use:{viewport:{width:320,height:568}}},
    {name:"phone",use:{viewport:{width:390,height:844}}},
    {name:"tablet",use:{viewport:{width:768,height:1024}}},
    {name:"desktop",use:{viewport:{width:1440,height:900}}},
  ],
});
