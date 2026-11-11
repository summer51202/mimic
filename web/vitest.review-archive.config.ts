import { configDefaults, defineConfig } from "vitest/config";
import mainConfig, { reviewArchiveTests } from "./vitest.config";

export default defineConfig({
  ...mainConfig,
  test: {
    ...mainConfig.test,
    exclude: configDefaults.exclude,
    include: reviewArchiveTests,
    // Review tests temporarily modify files used by other compositors.
    fileParallelism: false,
  },
});
