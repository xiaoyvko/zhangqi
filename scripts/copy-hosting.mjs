import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";

mkdirSync("dist/.openai", { recursive: true });
copyFileSync(".openai/hosting.json", "dist/.openai/hosting.json");

mkdirSync("dist/server", { recursive: true });
writeFileSync(
  "dist/server/index.js",
  [
    "export default {",
    "  async fetch(request, env) {",
    "    const response = await env.ASSETS.fetch(request);",
    "    if (response.status !== 404) return response;",
    "    const fallbackUrl = new URL(request.url);",
    '    fallbackUrl.pathname = "/index.html";',
    "    return env.ASSETS.fetch(new Request(fallbackUrl, request));",
    "  },",
    "};",
    "",
  ].join("\n"),
);
