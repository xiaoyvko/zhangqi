import { copyFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";

mkdirSync("dist/.openai", { recursive: true });
copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");

renameSync("dist/server/index.js", "dist/server/handler.js");
writeFileSync(
  "dist/server/index.js",
  [
    'import handleRequest from "./handler.js";',
    'export * from "./handler.js";',
    "export default {",
    "  fetch(request, env, context) {",
    "    return handleRequest(request, env, context);",
    "  },",
    "};",
    "",
  ].join("\n"),
);
