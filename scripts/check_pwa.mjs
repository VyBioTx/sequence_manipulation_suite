#!/usr/bin/env node
// End-to-end static acceptance check for the PWA conversion (VYB-2640 / VYB-2645).
//
// One command, no dependencies, non-zero exit on the first failed assertion:
//
//   $ node scripts/check_pwa.mjs
//
// It covers: manifest validity, per-page manifest link + service worker
// registration (including the file:// guard), precache coverage, the two
// "SMS3 / mirror" grep gates, and the install page the footers point at.
// The behaviour of sw.js itself is exercised separately by
// scripts/pwa_sw_test.mjs (cache-first, offline, CACHE_VERSION bump).
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(repoRoot, "docs");
const swPath = path.join(docsDir, "sw.js");
const manifestPath = path.join(docsDir, "manifest.webmanifest");
const EXPECTED_PAGES = 72;
const CACHEABLE = /\.(html|js|css|png)$/i;

const failures = [];
function check(ok, message, detail) {
  if (ok) {
    console.log(`ok - ${message}`);
  } else {
    failures.push(message);
    console.error(`FAIL - ${message}${detail ? `\n       ${detail}` : ""}`);
  }
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : full;
  });
}

const allFiles = walk(docsDir);
const rel = (full) => "./" + path.relative(docsDir, full).split(path.sep).join("/");
// sw.js is always fetched fresh by the browser, so it is never precached.
const siteFiles = allFiles
  .filter((full) => CACHEABLE.test(full) && full !== swPath)
  .map(rel)
  .sort();
const pages = siteFiles.filter((file) => file.endsWith(".html"));

// ---------------------------------------------------------------- manifest ---
console.log(`# manifest ${rel(manifestPath)}`);
let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  check(true, "manifest.webmanifest is valid JSON");
} catch (error) {
  check(false, "manifest.webmanifest is valid JSON", error.message);
}

if (manifest) {
  for (const key of ["name", "short_name", "display"]) {
    check(Boolean(manifest[key]), `manifest declares ${key}`, JSON.stringify(manifest[key]));
  }
  // start_url / scope must be relative to the docs root, not absolute or escaping it.
  const relativeToDocs = (value) =>
    typeof value === "string" && !value.startsWith("/") && !value.split("/").includes("..");
  const start = manifest.start_url;
  check(
    relativeToDocs(start) && existsSync(path.join(docsDir, start)),
    "manifest start_url is a relative path that exists under docs/",
    `start_url=${JSON.stringify(start)}`
  );
  check(
    relativeToDocs(manifest.scope) && /^\.{0,2}\/?$/.test(manifest.scope),
    "manifest scope is the docs root",
    `scope=${JSON.stringify(manifest.scope)}`
  );
  const icons = manifest.icons ?? [];
  for (const size of ["192x192", "512x512"]) {
    const icon = icons.find((entry) => entry.sizes === size);
    check(Boolean(icon), `manifest has a ${size} icon`);
    if (icon) {
      check(
        relativeToDocs(icon.src) && existsSync(path.join(docsDir, icon.src)),
        `manifest ${size} icon file exists under docs/`,
        `src=${JSON.stringify(icon.src)}`
      );
    }
  }
}

// ------------------------------------------------------- pages and scripts ---
console.log("# pages");
check(
  pages.length === EXPECTED_PAGES,
  `docs/ holds ${EXPECTED_PAGES} HTML pages`,
  `found ${pages.length}: if pages were added or removed, update EXPECTED_PAGES, the precache list and this script`
);

const i18nPath = path.join(docsDir, "scripts", "i18n.js");
const i18nSource = readFileSync(i18nPath, "utf8");
const i18nRegisters = i18nSource.includes("serviceWorker.register");
check(i18nRegisters, "scripts/i18n.js contains the service worker registration");

const noManifestLink = [];
const noRegistration = [];
for (const page of pages) {
  const html = readFileSync(path.join(docsDir, page), "utf8");
  if (!/<link[^>]+rel=["']manifest["']/i.test(html)) noManifestLink.push(page);
  const registers =
    (i18nRegisters && html.includes("scripts/i18n.js")) ||
    html.includes("serviceWorker.register");
  if (!registers) noRegistration.push(page);
}
check(
  noManifestLink.length === 0,
  `all ${pages.length} pages link the manifest`,
  noManifestLink.join(", ")
);
check(
  noRegistration.length === 0,
  `all ${pages.length} pages load the registration logic`,
  noRegistration.join(", ")
);
console.log(`   pages: ${pages.length}, with <link rel="manifest">: ${pages.length - noManifestLink.length}, with registration: ${pages.length - noRegistration.length}`);

// Runs i18n.js the way a page would, to pin down where a registration happens.
function registeredAt(protocol, hostname) {
  let url;
  vm.runInNewContext(i18nSource, {
    window: {},
    document: { body: null, title: "" },
    location: { protocol, hostname },
    navigator: { serviceWorker: { register: (target) => ((url = target), Promise.resolve()) } }
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
  check(
    actual === expected,
    `${protocol}//${hostname || "(empty)"} ${expected ? "registers ./sw.js" : "does not register"}`,
    `got ${actual}`
  );
}

// ---------------------------------------------------------------- precache ---
console.log(`# precache ${rel(swPath)}`);
const swSource = readFileSync(swPath, "utf8");
const swContext = {
  self: {
    addEventListener() {},
    location: { origin: "http://localhost" },
    skipWaiting() {},
    clients: { claim() {} }
  },
  caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [], delete: async () => {}, match: async () => undefined },
  fetch: async () => new Response(""),
  URL,
  Promise,
  console
};
vm.runInNewContext(swSource, swContext);
const precache = swContext.PRECACHE;
const cacheVersion = swContext.CACHE_VERSION;
check(Array.isArray(precache) && precache.length > 0, "sw.js exposes a non-empty PRECACHE list");
check(
  typeof cacheVersion === "string" && cacheVersion.length > 0,
  "sw.js declares CACHE_VERSION",
  `CACHE_VERSION=${JSON.stringify(cacheVersion)}`
);

if (Array.isArray(precache)) {
  const precached = new Set(precache);
  const missing = siteFiles.filter((file) => !precached.has(file));
  const stale = precache.filter((file) => !siteFiles.includes(file));
  check(
    missing.length === 0,
    `every docs/ HTML/JS/CSS/icon is precached (${siteFiles.length} files)`,
    `missing: ${missing.join(", ")}`
  );
  check(
    stale.length === 0,
    "the precache list has no entries that are gone from docs/",
    `stale: ${stale.join(", ")}`
  );
  console.log(`   precached files: ${precache.length} / site files: ${siteFiles.length}`);
}

// -------------------------------------------------------------- grep gates ---
console.log("# legacy content");
const textFiles = allFiles.filter((full) => !/\.(png|ico|jpg|jpeg|gif|webp)$/i.test(full));
const grepTargets = [
  ...textFiles,
  ...walk(path.join(repoRoot, "scripts")).filter((full) => full !== fileURLToPath(import.meta.url) && /\.(mjs|js|sh|py)$/i.test(full)),
  path.join(repoRoot, "README.md")
];
function grep(pattern, roots) {
  const hits = [];
  for (const file of roots) {
    if (!existsSync(file) || statSync(file).isDirectory()) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        if (pattern.test(line)) hits.push(`${path.relative(repoRoot, file)}:${index + 1}: ${line.trim()}`);
      });
  }
  return hits;
}
const sms3 = grep(/sms3/i, grepTargets);
check(sms3.length === 0, "no SMS3 reference in docs/ scripts/ README.md", sms3.slice(0, 10).join("\n       "));
const mirrorWording = grep(/use it off-line|mirror this page/i, textFiles);
check(
  mirrorWording.length === 0,
  'no "use it off-line" / "mirror this page" wording in docs/',
  mirrorWording.slice(0, 10).join("\n       ")
);

// -------------------------------------------------------------- install page ---
// The program pages carry a shared footer that points at the install page.
// Group pages (index, about, license, ...) have no footer, so the gate is:
// every page that does carry the footer must link to an existing page.
console.log("# install page");
const FOOTER_MARKER = /install this suite as an app/i;
const installTargets = new Map();
let footerPages = 0;
for (const page of pages) {
  // The footer is wrapped across source lines, so match on flattened whitespace.
  const html = readFileSync(path.join(docsDir, page), "utf8").replace(/\s+/g, " ");
  if (!FOOTER_MARKER.test(html)) continue;
  footerPages += 1;
  const links = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>\s*install this suite as an app\s*<\/a>/gi)].map(
    (match) => match[1]
  );
  if (!links.length) {
    failures.push(`footer mentions the install page but links nothing: ${page}`);
    console.error(`FAIL - footer mentions the install page but links nothing: ${page}`);
  }
  links.forEach((href) => installTargets.set(href, [...(installTargets.get(href) ?? []), page]));
}
check(
  footerPages >= 60,
  "the shared install footer is present on the program pages",
  `found on ${footerPages} / ${pages.length} pages (index/about/license pages have no footer)`
);
for (const [href, from] of installTargets) {
  check(
    !href.includes("..") && !href.startsWith("/") && !/^[a-z]+:/i.test(href) && existsSync(path.join(docsDir, href)),
    `footer install link resolves under docs/: ${href} (${from.length} pages)`
  );
}
check(installTargets.size > 0, "at least one footer install link target was found");
const installText = [...installTargets.keys()]
  .map((href) => readFileSync(path.join(docsDir, href), "utf8"))
  .join("\n")
  .replace(/\s+/g, " ");
check(
  /chrome/i.test(installText) && /edge/i.test(installText) && /install icon/i.test(installText),
  "install page explains the Chrome/Edge install icon"
);
check(/share button/i.test(installText) && /add to home screen/i.test(installText), "install page explains iOS Add to Home Screen");
check(/https:\/\//.test(installText) && /localhost/.test(installText), "install page states the https / localhost requirement");
check(/file:\/\//.test(installText), "install page states the file:// limitation");

// ----------------------------------------------------------------- summary ---
if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nOK - all PWA acceptance checks passed");
