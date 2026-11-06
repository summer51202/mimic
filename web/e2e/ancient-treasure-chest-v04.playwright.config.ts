import {defineConfig} from "@playwright/test";
import previous from "./ancient-treasure-chest.playwright.config";
export default defineConfig({...previous,testMatch:[...previous.testMatch as string[],"ancient-treasure-chest-v04-review.spec.ts"]});
