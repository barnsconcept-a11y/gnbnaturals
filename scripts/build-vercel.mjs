#!/usr/bin/env node
/**
 * Vercel build script — produces a .vercel/output directory that Vercel
 * can deploy without any framework-specific plugin.
 *
 * Output layout:
 *   .vercel/output/config.json          — Vercel build output spec
 *   .vercel/output/static/**            — client assets served as-is
 *   .vercel/output/functions/index.func — Node.js serverless function (SSR)
 */

import { execSync } from "child_process";
import { cpSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── 1. Run vite build (produces dist/client + dist/server) ───────────────────
console.log("→ Building with vite...");
execSync("bun run build", { cwd: root, stdio: "inherit" });

// ── 2. Re-bundle the server entry with all deps inlined for serverless ────────
console.log("→ Bundling server for Node.js serverless...");
execSync(
  `npx esbuild dist/server/server.js --bundle --platform=node --target=node20 --format=esm --outfile=dist/server-bundled.mjs --external:sharp --external:lightningcss --external:@img/sharp-darwin-arm64 --external:@img/sharp-linux-x64-gnu --banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);"`,
  { cwd: root, stdio: "inherit" },
);

// ── 3. Clean and create .vercel/output ──────────────────────────────────────
const out = resolve(root, ".vercel/output");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ── 4. Static assets → .vercel/output/static ────────────────────────────────
const staticOut = resolve(out, "static");
mkdirSync(staticOut, { recursive: true });
cpSync(resolve(root, "dist/client"), staticOut, { recursive: true });

// ── 5. Serverless function ────────────────────────────────────────────────────
const funcDir = resolve(out, "functions/index.func");
mkdirSync(funcDir, { recursive: true });

// Copy the fully-bundled server file
cpSync(resolve(root, "dist/server-bundled.mjs"), resolve(funcDir, "index.mjs"));

// package.json to mark as ESM
writeFileSync(
  resolve(funcDir, "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

// .vc-config.json tells Vercel this is a Node.js function
writeFileSync(
  resolve(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
    },
    null,
    2,
  ),
);

// The function entry wraps the TanStack Start fetch handler for Vercel's
// (req, res) interface. We prepend it to the bundled file.
const handlerWrapper = `
let _handler;
async function _getHandler() {
  if (!_handler) _handler = serverDefault;
  return _handler;
}

export default async function handler(req, res) {
  const h = await _getHandler();
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = \`\${proto}://\${host}\${req.url}\`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val != null) {
      headers.set(key, Array.isArray(val) ? val.join(", ") : val);
    }
  }

  let body = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    body = Buffer.concat(chunks);
  }

  const webReq = new Request(url, { method: req.method, headers, body });
  let webRes;
  try {
    webRes = await h.fetch(webReq, {}, {});
  } catch (err) {
    console.error("SSR error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
    return;
  }

  res.statusCode = webRes.status;
  webRes.headers.forEach((v, k) => {
    if (k.toLowerCase() !== "content-encoding") res.setHeader(k, v);
  });

  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    } catch (e) { console.error("Stream error:", e); }
  }
  res.end();
}
`;

// Read the bundled file, find the default export, and create a combined file
import { readFileSync } from "fs";
let bundled = readFileSync(resolve(funcDir, "index.mjs"), "utf-8");

// The esbuild output exports default as the server object.
// Rename it so we can add our own default export (the Vercel handler)
bundled = bundled.replace(
  /export\s*\{\s*(\w+)\s+as\s+default\b/,
  "var serverDefault = $1;\nexport {",
);
// If it uses `export default`, handle that too
bundled = bundled.replace(
  /export\s+default\s+/,
  "var serverDefault = ",
);

writeFileSync(resolve(funcDir, "index.mjs"), bundled + "\n" + handlerWrapper);

// ── 6. Vercel routing config ─────────────────────────────────────────────────
writeFileSync(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Long cache for hashed assets
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Serve static files first
        { handle: "filesystem" },
        // Everything else → SSR function
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("✓ .vercel/output ready");
