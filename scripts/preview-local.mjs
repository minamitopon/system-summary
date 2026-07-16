#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_PREFIX = "/system-summary";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 8000;
const RELOAD_INTERVAL_MS = 600;

function readOption(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

if (process.argv.includes("--help")) {
  console.log(`Usage: node scripts/preview-local.mjs [--host HOST] [--port PORT]

Starts a local GitHub Pages preview at ${URL_PREFIX}/.
Use --host 0.0.0.0 to make it reachable from another device on the same network.`);
  process.exit(0);
}

const host = readOption("--host", process.env.HOST || DEFAULT_HOST);
const port = Number(readOption("--port", process.env.PORT || DEFAULT_PORT));

if (!host || !Number.isInteger(port) || port < 0 || port > 65535) {
  console.error("Host or port is invalid. Run with --help for usage.");
  process.exit(1);
}

const contentTypes = new Map([
  [".bml", "text/plain; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
]);

const reloadClients = new Set();

function isAllowedFile(relativePath) {
  return (
    relativePath === "index.html" ||
    relativePath === "assets/app.js" ||
    relativePath === "assets/styles.css" ||
    relativePath === "Oklahoma/README.md" ||
    /^Oklahoma\/[^/]+\/index\.bml$/.test(relativePath)
  );
}

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  });
  response.end(body);
}

function sendFile(response, relativePath, method) {
  if (!isAllowedFile(relativePath)) {
    send(response, 404, "Not found");
    return;
  }

  const absolutePath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    send(response, 404, "Not found");
    return;
  }

  let body = fs.readFileSync(absolutePath);
  if (relativePath === "index.html") {
    const reloadClient = `
      <script data-local-preview>
        (() => {
          const events = new EventSource("${URL_PREFIX}/__preview/events");
          events.addEventListener("reload", () => window.location.reload());
        })();
      </script>`;
    body = Buffer.from(body.toString("utf8").replace("</body>", `${reloadClient}\n  </body>`));
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": body.length,
    "Content-Type": contentTypes.get(path.extname(relativePath)) || "application/octet-stream",
  });
  response.end(method === "HEAD" ? undefined : body);
}

function handleReloadEvents(request, response) {
  response.writeHead(200, {
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
  });
  response.write("retry: 500\n\n");
  reloadClients.add(response);
  request.on("close", () => reloadClients.delete(response));
}

const server = http.createServer((request, response) => {
  const method = request.method || "GET";
  if (!new Set(["GET", "HEAD"]).has(method)) {
    send(response, 405, "Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
  } catch {
    send(response, 400, "Bad request");
    return;
  }

  if (pathname === "/" || pathname === URL_PREFIX) {
    response.writeHead(302, { Location: `${URL_PREFIX}/` });
    response.end();
    return;
  }
  if (pathname === `${URL_PREFIX}/__preview/events`) {
    handleReloadEvents(request, response);
    return;
  }
  if (!pathname.startsWith(`${URL_PREFIX}/`)) {
    send(response, 404, "Not found");
    return;
  }

  const relativePath = pathname.slice(URL_PREFIX.length + 1) || "index.html";
  sendFile(response, relativePath, method);
});

function collectWatchedFiles(directory, files = []) {
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectWatchedFiles(absolutePath, files);
    if (entry.isFile()) {
      const relativePath = path.relative(ROOT_DIR, absolutePath).split(path.sep).join("/");
      if (isAllowedFile(relativePath)) files.push(relativePath);
    }
  }
  return files;
}

function getSourceSignature() {
  const files = ["index.html", ...collectWatchedFiles(path.join(ROOT_DIR, "assets")), ...collectWatchedFiles(path.join(ROOT_DIR, "Oklahoma"))];
  return [...new Set(files)]
    .sort()
    .map((relativePath) => {
      const stats = fs.statSync(path.join(ROOT_DIR, relativePath));
      return `${relativePath}:${stats.mtimeMs}:${stats.size}`;
    })
    .join("|");
}

let sourceSignature = getSourceSignature();
setInterval(() => {
  try {
    const nextSignature = getSourceSignature();
    if (nextSignature === sourceSignature) return;
    sourceSignature = nextSignature;
    for (const client of reloadClients) client.write("event: reload\ndata: changed\n\n");
  } catch {
    // Editors may briefly replace a file while saving. The next scan retries it.
  }
}, RELOAD_INTERVAL_MS).unref();

server.on("error", (error) => {
  console.error(`Local preview could not start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`Local preview: http://${displayHost}:${actualPort}${URL_PREFIX}/`);
  console.log("Saving HTML, CSS, JavaScript, or index.bml reloads the page automatically.");
});
