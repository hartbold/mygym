#!/usr/bin/env node
// Comprovació post-desplegament: cada URL del precache ha de respondre 200
// sense redirecció, o el service worker nou no arrencarà mai (l'atomicitat
// de `cache.addAll` fa fallar tota la instal·lació per una sola URL). Es fa
// servir ABANS de publicar sw.js (vegeu deploy/deploy.sh).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error("Ús: node scripts/smoke.mjs https://gym.example.com");
  process.exit(1);
}

const root = fileURLToPath(new URL("..", import.meta.url));
const swSource = readFileSync(join(root, "out", "sw.js"), "utf8");
const match = swSource.match(/const PRECACHE = (\[.*?\]);/s);
if (!match) {
  console.error("smoke: no s'ha pogut llegir PRECACHE de out/sw.js — executa `pnpm build` primer.");
  process.exit(1);
}
const urls = JSON.parse(match[1]);

let failed = 0;
for (const path of urls) {
  const url = new URL(path, baseUrl).toString();
  let res;
  try {
    res = await fetch(url, { redirect: "manual" });
  } catch (err) {
    failed++;
    console.error(`✗ (xarxa) ${url}: ${err.message}`);
    continue;
  }
  if (res.status !== 200) {
    failed++;
    console.error(`✗ ${res.status} ${url}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} de ${urls.length} URL han fallat. NO publiquis sw.js encara.`);
  process.exit(1);
}
console.log(`✓ ${urls.length} URL del precache responen 200 sense redirecció.`);
