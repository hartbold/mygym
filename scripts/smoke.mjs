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

// La icona de la pantalla d'inici d'iOS: si no arriba com a PNG (p. ex. el
// servidor torna index.html o demana contrasenya), l'iPhone hi posa la inicial.
for (const [path, type] of [
  ["/icons/apple-touch-icon.png", "image/png"],
  ["/apple-touch-icon.png", "image/png"],
  ["/manifest.webmanifest", "application/manifest+json"],
]) {
  const url = new URL(path, baseUrl).toString();
  try {
    const res = await fetch(url, { redirect: "manual" });
    const got = res.headers.get("content-type") ?? "";
    if (res.status !== 200 || !got.startsWith(type)) {
      failed++;
      console.error(`✗ ${url}: ${res.status} ${got || "(sense content-type)"}, s'esperava ${type}`);
    }
  } catch (err) {
    failed++;
    console.error(`✗ (xarxa) ${url}: ${err.message}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} de ${urls.length} URL han fallat. NO publiquis sw.js encara.`);
  process.exit(1);
}
console.log(`✓ ${urls.length} URL del precache responen 200 sense redirecció, i les icones i el manifest amb el tipus correcte.`);
