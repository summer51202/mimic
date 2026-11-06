import {defineConfig} from "@playwright/test";

// This review tool opens file URLs and has no dependency on the product server.
export default defineConfig({
  testDir:"./e2e",
  testMatch:"props-calibration-v02-review.spec.ts",
  outputDir:"test-results/props-calibration-v02",
  timeout:30_000,
  workers:1,
  projects:[
    {name:"phone-small",use:{viewport:{width:320,height:568}}},
    {name:"phone",use:{viewport:{width:390,height:844}}},
    {name:"tablet",use:{viewport:{width:768,height:1024}}},
    {name:"desktop",use:{viewport:{width:1440,height:900}}},
  ],
});

