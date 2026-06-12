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

// ── 1. Run vite build ────────────────────────────────────────────────────────
console.log("Building with vite...");
execSync("bun run build", { cwd: root, stdio: "inherit" });

// ── 2. Clean and create .vercel/output ──────────────────────────────────────
const out = resolve(root, ".vercel/output");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// ── 3. Vercel build output config ────────────────────────────────────────────
writeFileSync(
  resolve(out, "config.json"),
  JSON.stringify({ version: 3 }, null, 2),
);

// ── 4. Static assets → .vercel/output/static ────────────────────────────────
const staticOut = resolve(out, "static");
mkdirSync(staticOut, { recursive: true });
cpSync(resolve(root, "dist/client"), staticOut, { recursive: true });

// ── 5. Serverless function ────────────────────────────────────────────────────
const funcDir = resolve(out, "functions/index.func");
mkdirSync(funcDir, { recursive: true });

// Copy the built SSR server bundle into the function
cpSync(resolve(root, "dist/server"), resolve(funcDir, "server"), {
  recursive: true,
});

// .vc-config.json tells Vercel this is a Node.js function
writeFileSync(
  resolve(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "handler.mjs",
      launcherType: "Nodejs",
    },
    null,
    2,
  ),
);

// The function entry — converts Node req/res ↔ Web Request/Response and
// delegates to the TanStack Start fetch handler
writeFileSync(
  resolve(funcDir, "handler.mjs"),
  `
import { createServer } from "http";
import { Readable } from "stream";

// Import the built TanStack Start server bundle
import handler from "./server/server.js";

export default async function vercelHandler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const url = \`\${proto}://\${host}\${req.url}\`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val != null) {
      const v = Array.isArray(val) ? val.join(", ") : val;
      headers.set(key, v);
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

  const webRequest = new Request(url, { method: req.method, headers, body });

  let webResponse;
  try {
    webResponse = await handler.fetch(webRequest, {}, {});
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end("Internal Server Error");
    return;
  }

  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => res.setHeader(key, value));

  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  }
  res.end();
}
`.trimStart(),
);

// ── 6. Route all requests through the function ───────────────────────────────
// Static files are served directly by Vercel; everything else hits the function
writeFileSync(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Serve hashed static assets with long cache
        {
          src: "^/assets/(.*)$",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Fallback: all unmatched requests → SSR function
        { src: "/(.*)", dest: "/index" },
      ],
    },
    null,
    2,
  ),
);

console.log("✓ .vercel/output ready");
