// Post-build: escriu `out/sw.js` amb una llista de precache generada a
// partir del contingut real de `out/` (Node pur: fs/path/url/crypto, cap
// dependència — funciona igual a Windows que a Linux/CI).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "out");

/**
 * Amb una sola ruta (§Decisió d'arquitectura del pla) el router de Next no
 * fa mai una navegació de client (no hi ha `next/link`), així que els
 * payloads RSC (`__next.*.txt`, `index.txt`) i les pàgines 404/_not-found
 * no es demanen mai en temps real — s'exclouen del precache.
 */
function isExcluded(relUrl) {
  const basename = relUrl.split("/").pop() ?? "";
  if (basename.startsWith(".")) return true;
  if (basename.endsWith(".map")) return true;
  if (basename.startsWith("__next.")) return true;
  if (relUrl === "index.txt") return true;
  if (relUrl === "404.html" || relUrl.startsWith("_not-found")) return true;
  if (basename === "sw.js") return true;
  return false;
}

function toPrecacheUrl(relUrl) {
  return relUrl === "index.html" ? "/" : "/" + relUrl;
}

function walk(dir, base = "") {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(abs, rel));
    else if (entry.isFile()) files.push({ abs, rel });
  }
  return files;
}

if (!statSync(outDir, { throwIfNoEntry: false })?.isDirectory()) {
  throw new Error(`postbuild: no existeix ${outDir} — executa \`next build\` primer.`);
}

const entries = walk(outDir)
  .filter(({ rel }) => !isExcluded(rel))
  .map(({ abs, rel }) => ({
    url: toPrecacheUrl(rel),
    hash: createHash("sha256").update(readFileSync(abs)).digest("hex"),
  }))
  .sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));

for (const required of ["/", "/manifest.webmanifest"]) {
  if (!entries.some((e) => e.url === required)) {
    throw new Error(`postbuild: falta '${required}' al precache — build incomplet.`);
  }
}

const version = createHash("sha256")
  .update(JSON.stringify(entries.map((e) => [e.url, e.hash])))
  .digest("hex")
  .slice(0, 16);

const precacheUrls = entries.map((e) => e.url);
const template = readFileSync(join(root, "sw", "sw.template.js"), "utf8");
const header =
  "// Generat automàticament per scripts/postbuild.mjs — no editar a mà.\n" +
  `const VERSION = ${JSON.stringify(version)};\n` +
  `const PRECACHE = ${JSON.stringify(precacheUrls)};\n\n`;

writeFileSync(join(outDir, "sw.js"), header + template);
console.log(`sw.js escrit: ${precacheUrls.length} fitxers al precache, versió ${version}.`);
