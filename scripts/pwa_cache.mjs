#!/usr/bin/env node
// Checks the PWA wiring, or rewrites the sw.js precache list with --write.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(repoRoot, "docs");
const swPath = path.join(docsDir, "sw.js");
const cacheable = /\.(html|js|css|png)$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return full;
  });
}

// sw.js itself is never precached: the browser always fetches it fresh.
const siteFiles = walk(docsDir)
  .filter((full) => cacheable.test(full) && full !== swPath)
  .map((full) => "./" + path.relative(docsDir, full).split(path.sep).join("/"))
  .sort();

const sw = readFileSync(swPath, "utf8");
const listPattern = /var PRECACHE = \[[\s\S]*?\];/;

if (process.argv.includes("--write")) {
  const body = siteFiles.map((f) => `  ${JSON.stringify(f)}`).join(",\n");
  writeFileSync(swPath, sw.replace(listPattern, `var PRECACHE = [\n${body}\n];`));
  console.log(`wrote ${siteFiles.length} entries to docs/sw.js`);
  process.exit(0);
}

const failures = [];
const precache = JSON.parse(
  (sw.match(listPattern)?.[0] ?? "[]").replace(/^var PRECACHE = /, "").replace(/;$/, "")
);
const precached = new Set(precache);
const missing = siteFiles.filter((f) => !precached.has(f));
const stale = precache.filter((f) => !siteFiles.includes(f));
if (missing.length) failures.push(`missing from precache: ${missing.join(", ")}`);
if (stale.length) failures.push(`precached but not on disk: ${stale.join(", ")}`);

const manifest = JSON.parse(readFileSync(path.join(docsDir, "manifest.webmanifest"), "utf8"));
for (const key of ["name", "short_name", "start_url", "scope", "display"]) {
  if (!manifest[key]) failures.push(`manifest.webmanifest lacks ${key}`);
}
if (manifest.start_url !== "./index.html") failures.push("manifest start_url must be ./index.html");
if (manifest.scope !== "./") failures.push("manifest scope must be ./");
const sizes = (manifest.icons ?? []).map((icon) => icon.sizes);
for (const size of ["192x192", "512x512"]) {
  if (!sizes.includes(size)) failures.push(`manifest lacks a ${size} icon`);
}
for (const icon of manifest.icons ?? []) {
  if (!siteFiles.includes("./" + icon.src)) failures.push(`manifest icon missing: ${icon.src}`);
}

const pages = siteFiles.filter((f) => f.endsWith(".html"));
const i18nRegisters = readFileSync(path.join(docsDir, "scripts", "i18n.js"), "utf8").includes(
  "serviceWorker.register"
);
const noManifest = [];
const noRegister = [];
for (const page of pages) {
  const html = readFileSync(path.join(docsDir, page), "utf8");
  if (!html.includes('rel="manifest"')) noManifest.push(page);
  const registers =
    (i18nRegisters && html.includes("scripts/i18n.js")) || html.includes("serviceWorker.register");
  if (!registers) noRegister.push(page);
}
if (noManifest.length) failures.push(`no manifest link: ${noManifest.join(", ")}`);
if (noRegister.length) failures.push(`no service worker registration: ${noRegister.join(", ")}`);

// Loads i18n.js the way a page would, so the file:// guard is exercised too.
const i18nSource = readFileSync(path.join(docsDir, "scripts", "i18n.js"), "utf8");
function registeredAt(protocol, hostname) {
  let url;
  vm.runInNewContext(i18nSource, {
    window: {},
    document: { body: null, title: "" },
    location: { protocol, hostname },
    navigator: { serviceWorker: { register: (u) => ((url = u), Promise.resolve()) } }
  });
  return url;
}
for (const [protocol, hostname, expected] of [
  ["file:", "", undefined],
  ["http:", "example.com", undefined],
  ["http:", "localhost", "./sw.js"],
  ["http:", "127.0.0.1", "./sw.js"],
  ["https:", "example.com", "./sw.js"]
]) {
  let actual;
  try {
    actual = registeredAt(protocol, hostname);
  } catch (error) {
    actual = `threw ${error.message}`;
  }
  if (actual !== expected) {
    failures.push(`registration at ${protocol}//${hostname}: expected ${expected}, got ${actual}`);
  }
}

console.log(`html pages: ${pages.length}`);
console.log(`with manifest link: ${pages.length - noManifest.length}`);
console.log(`with registration: ${pages.length - noRegister.length}`);
console.log(`precached files: ${precache.length} / site files: ${siteFiles.length}`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("OK");
