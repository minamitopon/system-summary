import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("./preview-local.mjs", import.meta.url));
const child = spawn(process.execPath, [serverPath, "--port", "0"], {
  stdio: ["ignore", "pipe", "pipe"],
});

function waitForPreviewUrl() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Local preview did not start")), 5000);
    let output = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
      const match = output.match(/Local preview: (http:\/\/[^\s]+)/);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    });
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Local preview exited early with code ${code}`));
    });
  });
}

try {
  const previewUrl = await waitForPreviewUrl();
  const indexResponse = await fetch(previewUrl);
  const indexHtml = await indexResponse.text();
  assert.equal(indexResponse.status, 200);
  assert.equal(indexResponse.headers.get("cache-control"), "no-store");
  assert.match(indexHtml, /data-local-preview/);
  assert.match(indexHtml, /EventSource\("\/system-summary\/__preview\/events"\)/);

  const appResponse = await fetch(new URL("assets/app.js?v=test", previewUrl));
  assert.equal(appResponse.status, 200);
  assert.match(await appResponse.text(), /function parseDocument/);

  const bmlResponse = await fetch(new URL("Oklahoma/1C/index.bml", previewUrl));
  assert.equal(bmlResponse.status, 200);
  assert.match(await bmlResponse.text(), /1C Opening/);

  const forbiddenResponse = await fetch(new URL(".git/config", previewUrl));
  assert.equal(forbiddenResponse.status, 404);

  const origin = new URL(previewUrl).origin;
  const redirectResponse = await fetch(origin, { redirect: "manual" });
  assert.equal(redirectResponse.status, 302);
  assert.equal(redirectResponse.headers.get("location"), "/system-summary/");

  console.log("local-preview tests passed");
} finally {
  child.kill("SIGTERM");
}
