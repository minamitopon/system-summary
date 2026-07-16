#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function normalizeDiffPath(value) {
  const pathValue = value.trim().split("\t", 1)[0];
  if (pathValue === "/dev/null") return "";
  return pathValue.startsWith("b/") ? pathValue.slice(2) : pathValue;
}

export function parseUnifiedDiff(diff) {
  const changedLines = new Map();
  let currentPath = "";

  for (const line of diff.replace(/\r\n/g, "\n").split("\n")) {
    if (line.startsWith("+++ ")) {
      const candidate = normalizeDiffPath(line.slice(4));
      currentPath = /^Oklahoma\/.+\/index\.bml$/.test(candidate) ? candidate : "";
      if (currentPath && !changedLines.has(currentPath)) changedLines.set(currentPath, new Set());
      continue;
    }

    if (!currentPath || !line.startsWith("@@")) continue;
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!match) continue;

    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    const visibleCount = Math.max(1, count);
    for (let offset = 0; offset < visibleCount; offset += 1) {
      changedLines.get(currentPath).add(start + offset);
    }
  }

  return Object.fromEntries(
    [...changedLines.entries()]
      .filter(([, lines]) => lines.size)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([file, lines]) => [file, [...lines].sort((left, right) => left - right)]),
  );
}

function main() {
  const [baseRef, headRef, outputPath] = process.argv.slice(2);
  if (!baseRef || !headRef || !outputPath) {
    console.error("Usage: generate-preview-changes.mjs <base-ref> <head-ref> <output-path>");
    process.exitCode = 1;
    return;
  }

  const diff = execFileSync(
    "git",
    ["diff", "--unified=0", "--no-color", "--diff-filter=AMDR", baseRef, headRef, "--", "Oklahoma"],
    { encoding: "utf8" },
  );
  const manifest = {
    version: 1,
    base: baseRef,
    head: headRef,
    files: parseUnifiedDiff(diff),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Recorded PR changes in ${Object.keys(manifest.files).length} system document(s).`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) main();
