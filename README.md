# MY GYM

Aplicació de seguiment de les rutines de gimnàs.

Gestor d'entrenaments molt senzill: a cada sessió (agrupada automàticament
per dia) es van afegint exercicis a mesura que es fan, amb sèries de pes i
repeticions (o de temps) editables independentment. Totes les dades es
desen **al navegador** (IndexedDB) — no hi ha cap servidor ni compte.
Instal·lable com a PWA, funciona sense connexió després de la primera
visita, i permet exportar/importar còpies de seguretat en JSON.

Next.js 16 amb `output: 'export'`: es genera com a fitxers estàtics
(`out/`) pensats per servir-se amb Apache (o qualsevol servidor estàtic)
sota un subdomini propi.

## Requisits

Node ≥ 22.12 i [pnpm](https://pnpm.io) (el projecte fixa
`packageManager: pnpm@12.5.1` al `package.json`). Si `pnpm` no és al `PATH`,
`corepack enable` n'instal·la l'enllaç un sol cop (Node ≥ 16.9 ja porta
corepack integrat; no cal fer-ho més que la primera vegada a cada màquina).

```bash
git clone <url-del-repo> mygym
cd mygym
pnpm install
```

## Executar-la en local (desenvolupament)

```bash
pnpm dev
```

Obre <http://localhost:3000>. Recàrrega en calent de Next; és la manera més
ràpida d'iterar sobre la UI. **El service worker no es registra mai en
aquest mode** (`SwRegister` només actua amb `NODE_ENV==='production'`), així
que aquí no es pot provar la instal·lació com a PWA ni el funcionament
offline — per això cal el mode de més avall.

## Provar-la en local (com la veurà qui l'usa)

Per veure exactament el que es desplegarà (export estàtic + service worker),
cal fer un build de producció i servir `out/` tal qual:

```bash
pnpm build      # next build (output: 'export') + genera out/sw.js
pnpm preview    # serveix out/ a http://localhost:4173
```

Obre <http://localhost:4173>. Com que és `localhost`, el service worker es
registra igual que si fos HTTPS (el navegador considera `localhost` un
context segur), així que aquí sí que es pot provar tot:

- **Flux principal**: prem «＋ Nou exercici», tria o crea un exercici,
  omple sèries amb pesos diferents i desa; comprova que un segon «Nou
  exercici» acaba el primer automàticament, i que «Acaba» el fa explícit.
  Historial hauria d'agrupar-los en una sola sessió del dia.
- **Instal·labilitat / PWA**: DevTools → *Application* → *Manifest* (icones,
  `start_url`, avisos d'instal·labilitat) i → *Service Workers* (ha
  d'aparèixer `activated and is running`). A Chrome d'escriptori surt una
  icona d'instal·lar a la barra d'adreces (pot trigar uns segons a aparèixer
  després de carregar la pàgina).
- **Sense connexió**: DevTools → *Network* → casella *Offline* (o
  *Application* → *Service Workers* → *Offline*) i recarrega: l'app s'ha de
  veure i deixar registrar exercicis igual que en línia (tot viu a
  IndexedDB + el precache del service worker). Provar-ho també aturant el
  procés de `pnpm preview` i recarregant, que simula que el servidor no és
  accessible.
- **Exportar/importar còpia**: a Ajustos, «Exporta / Desa còpia» baixa un
  `.json`; «Importa còpia» l'hauria de tornar a carregar fusionant (sense
  esborrar res).
- **En un mòbil real**: com que el service worker exigeix un context segur
  i una IP de xarxa local (`http://192.168.x.x:4173`) no ho és, cal HTTPS
  real per provar-ho des del mòbil sense desplegar-ho. Dues opcions
  ràpides: (a) Android + Chrome d'escriptori amb un cable USB — activa la
  depuració USB i, a `chrome://inspect` a l'ordinador, configura un
  *port forwarding* del `4173` del mòbil cap al `4173` de l'ordinador; el
  mòbil hi accedeix llavors com a `localhost:4173`, que sí que compta com a
  context segur; o (b) un túnel HTTPS temporal (`ngrok http 4173` o similar).

### Tests automàtics

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # ESLint
pnpm test        # Vitest: tota la lògica pura de lib/ (dates, sessions, actions, backup...)
pnpm test:watch  # el mateix, en mode watch
pnpm e2e         # build de producció + Playwright (Chromium, perfil mòbil), incl. una prova offline
```

`pnpm e2e` aixeca `pnpm preview` ell mateix i hi llança els tests; si un
falla, `pnpm exec playwright show-report` obre l'informe amb captures/traça.

## Desplegament a Apache

**Pas 0 — abans de tocar res del servidor**: crea el registre DNS A/AAAA
del subdomini (p. ex. `gym.<domini>`) cap a la IP del servidor, i assegura't
que els ports 80/443 hi són oberts.

1. `pnpm build` genera `out/` (inclou `out/sw.js`, ja versionat pel
   contingut del build).
2. Configura el vhost a partir de [`deploy/apache-vhost.conf`](deploy/apache-vhost.conf)
   (`AddType` del manifest, capçaleres, `ErrorDocument 404 /index.html` —
   l'app és una sola pàgina, vegeu més avall) i emet el certificat:
   ```bash
   sudo certbot --apache -d gym.<domini>
   ```
3. Puja `out/` al servidor. Aquests mateixos passos serveixen tant per al
   primer desplegament com per a cada actualització posterior:
   - **Amb WSL o Linux** (recomanat; cal `rsync` instal·lat allà; la
     primera vegada, `chmod +x deploy/deploy.sh`):
     ```bash
     ./deploy/deploy.sh usuari@servidor:/var/www/gym https://gym.<domini>
     ```
     Fa la pujada en 3 passos (estàtics primer, comprovació amb
     `scripts/smoke.mjs`, `sw.js` al final) perquè un service worker nou
     mai arrenqui sobre un desplegament a mig fer; si el pas 2 falla,
     s'atura abans de publicar `sw.js`.
   - **Des de Windows sense WSL**: `scp -r out/. usuari@servidor:/var/www/gym/`
     (OpenSSH ja ve amb Windows 11) i després `node scripts/smoke.mjs https://gym.<domini>`
     manualment per comprovar-ho.
4. Verificació ràpida:
   ```bash
   curl -I https://gym.<domini>/sw.js               # Cache-Control: no-cache
   curl -I https://gym.<domini>/_next/static/...     # 200, servit amb gzip/deflate
   curl -I https://gym.<domini>/manifest.webmanifest # Content-Type: application/manifest+json
   ```
   I a la consola del navegador, comprova que no hi hagi cap error
   `Refused to execute inline script` (indicaria una CSP mal configurada).

## Arquitectura (resum)

- **Una sola pàgina** (`app/page.tsx`): les vistes «Avui / Historial /
  Sessió / Ajustos» es commuten per estat de React i es reflecteixen al
  fragment `#` de la URL — mai amb rutes de Next ni `useSearchParams`. Això
  evita tot un conjunt de problemes propis de l'export estàtic amb rutes
  reals (bug conegut de Windows amb segments RSC niuats, `<Suspense>`
  obligatori, normalització de barres al service worker...).
- **Dades**: Dexie (IndexedDB), una sola taula `entries`. Vegeu `lib/`.
- **Service worker** (`sw/sw.template.js` + `scripts/postbuild.mjs`):
  escrit a mà (~40 línies), precache complet generat a partir del
  contingut real de `out/` en cada build, versionat pel hash del contingut.
- **PWA**: `public/manifest.webmanifest` + icones a `public/icons/`.

## Llicència

Vegeu [LICENSE](LICENSE).
