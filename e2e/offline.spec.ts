import { expect, test } from "@playwright/test";

test("l'app shell i les dades funcionen fora de línia després de la primera visita", async ({
  page,
  context,
}) => {
  await page.goto("/");

  // Espera que el SW estigui actiu I controlant la pàgina (no només registrat).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });

  // Espera que el precache s'hagi omplert (evita una condició de cursa amb 'install').
  await expect
    .poll(
      () =>
        page.evaluate(async () => {
          const names = await caches.keys();
          if (names.length === 0) return 0;
          const cache = await caches.open(names[0]);
          return (await cache.keys()).length;
        }),
      { timeout: 10_000 },
    )
    .toBeGreaterThan(5);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("button", { name: "Nou exercici", exact: true })).toBeVisible();

  // Navegar entre vistes: només canvis de hash, cap petició de xarxa.
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Historial" })).toBeVisible();
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ajustos" })).toBeVisible();
  await page.getByRole("button", { name: "Avui", exact: true }).click();

  // Registrar un exercici sense xarxa (tot és local, IndexedDB).
  await page.getByRole("button", { name: "Nou exercici", exact: true }).click();
  await page.getByRole("button", { name: "Plancha", exact: true }).click();
  await page.getByPlaceholder("min").first().fill("1");
  await page.getByPlaceholder("s").first().fill("0");
  await page.getByRole("button", { name: "Esborra la fila" }).last().click();
  await page.getByRole("button", { name: "Esborra la fila" }).last().click();
  await page.getByRole("button", { name: "Desa" }).click();

  await expect(page.locator("article", { hasText: "Plancha" })).toBeVisible();

  await context.setOffline(false);
});
