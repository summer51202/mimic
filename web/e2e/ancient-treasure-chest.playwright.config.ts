import {defineConfig} from "@playwright/test";
import previous from "./restored-treasure-chest.playwright.config";
export default defineConfig({...previous,testMatch:[...previous.testMatch as string[],"ancient-treasure-chest-review.spec.ts"]});
