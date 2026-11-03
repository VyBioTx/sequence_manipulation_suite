#!/usr/bin/env node
// Runs docs/sw.js in a sandbox with a Cache-API shim and a local static server,
// standing in for the "DevTools Offline" and "bump CACHE_VERSION" checks.
import { createReadStream, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = path.join(repoRoot, "docs");
const swSource = readFileSync(path.join(docsDir, "sw.js"), "utf8");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };

let tag = "";
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(docsDir, rel);
  if (!file.startsWith(docsDir)) return res.writeHead(403).end();
  res.setHeader("content-type", types[path.extname(file)] ?? "application/octet-stream");
  if (tag) res.write(tag);
  const stream = createReadStream(file);
  stream.on("error", () => res.writeHead(404).end());
  stream.pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const net = { fetch: (input, init) => fetch(new URL(input, base), init) };
const stores = new Map();
const caches = {
  keys: async () => [...stores.keys()],
  open: async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      addAll: async (urls) => {
        const bodies = await Promise.all(
          urls.map(async (u) => {
            const res = await net.fetch(u);
            if (!res.ok) throw new Error(`${u} answered ${res.status}`);
            return res.text();
          })
        );
        urls.forEach((u, i) => store.set(new URL(u, base).href, bodies[i]));
      }
    };
  },
  delete: async (name) => stores.delete(name),
  match: async (request) => {
    for (const store of stores.values()) {
      const hit = store.get(typeof request === "string" ? new URL(request, base).href : request.url);
      if (hit !== undefined) return hit;
    }
    return undefined;
  }
};

function boot(version) {
  const listeners = {};
  const state = { skipped: false, claimed: false };
  const self = {
    location: new URL("sw.js", base),
    addEventListener: (type, fn) => (listeners[type] ??= []).push(fn),
    skipWaiting: async () => (state.skipped = true),
    clients: { claim: async () => (state.claimed = true) }
  };
  vm.runInNewContext(swSource.replace('"sms-v1"', JSON.stringify(version)), {
    self,
    caches,
    fetch: (input, init) => net.fetch(input, init),
    URL,
    Promise,
    console
  });
  const wait = async (type, event) => {
    const pending = [];
    for (const fn of listeners[type] ?? []) fn({ ...event, waitUntil: (p) => pending.push(p) });
    await Promise.all(pending);
  };
  return {
    state,
    wait,
    async fetch(url, method = "GET") {
      let response;
      for (const fn of listeners.fetch ?? []) {
        fn({ request: { url, method }, respondWith: (p) => (response = p) });
      }
      return response;
    }
  };
}

function check(ok, message) {
  if (!ok) {
    console.error(`FAIL: ${message}`);
    server.close();
    process.exit(1);
  }
  console.log(`ok - ${message}`);
}

const v1 = boot("sms-v1");
await v1.wait("install");
check(stores.get("sms-v1").size > 100, `install precached ${stores.get("sms-v1").size} files`);
check(v1.state.skipped, "install calls skipWaiting");

const online = net.fetch;
net.fetch = () => Promise.reject(new Error("offline"));
for (const page of ["index.html", "dna_mw.html"]) {
  const body = await v1.fetch(base + page);
  check(typeof body === "string" && body.includes("</html>"), `offline cache-first serves ${page}`);
}
check((await v1.fetch(base + "index.html", "POST")) === undefined, "non-GET requests pass through");
check((await v1.fetch("https://example.com/x.js")) === undefined, "cross-origin requests pass through");

tag = "<!--served-by-v2-->";
net.fetch = online;
const v2 = boot("sms-v2");
await v2.wait("install");
await v2.wait("activate");
check(v2.state.claimed, "activate calls clients.claim");
check(JSON.stringify(await caches.keys()) === '["sms-v2"]', "activate dropped the old cache");
const fresh = await v2.fetch(base + "index.html");
check(fresh.includes("served-by-v2"), "after the bump pages get the new files");

server.close();
console.log("OK");
