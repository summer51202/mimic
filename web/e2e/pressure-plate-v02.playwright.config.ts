import {defineConfig} from "@playwright/test";
import previous from "./landing-warm-rest.playwright.config";
export default defineConfig({...previous,testMatch:"pressure-plate-v02-review.spec.ts"});
