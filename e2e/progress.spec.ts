import { expect, test, type Page } from "@playwright/test";

/** Sembra sessions de dies passats directament a IndexedDB (la UI només crea sessions d'avui). */
async function seed(page: Page) {
  await page.goto("/");
  await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === "mygym"));
  await page.evaluate(async () => {
    const DAY = 86_400_000;
    const key = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    let n = 0;
    const entry = (name: string, daysAgo: number, weight: number) => {
      const startedAt = Date.now() - daysAgo * DAY - 3_600_000;
      return {
        id: `e${++n}`,
        name,
        kind: "reps",
        date: key(startedAt),
        startedAt,
        endedAt: startedAt + 20 * 60_000,
        status: "done",
        sets: [1, 2, 3].map((i) => ({ id: `s${n}-${i}`, weight, reps: 5, doneAt: startedAt })),
        updatedAt: startedAt,
      };
    };
    const entries = [
      entry("Press de banca", 30, 80),
      entry("Press de banca", 23, 82.5),
      entry("Press de banca", 16, 85),
      entry("Press de banca", 9, 77.5),
      entry("Press de banca", 2, 80),
      entry("Esquats", 10, 100),
      entry("Esquats", 1, 105),
    ];
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("mygym");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    await new Promise((res, rej) => {
      const tx = db.transaction("entries", "readwrite");
      for (const e of entries) tx.objectStore("entries").put(e);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  });
  await page.reload();
}

test("Progrés mostra rècords, baixades, el detall d'un exercici i el pes corporal", async ({ page }) => {
  await seed(page);
  await page.getByRole("button", { name: "Progrés", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Progrés" })).toBeVisible();

  await expect(page.getByRole("button", { name: /^Rècord a Esquats/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Baixada a Press de banca/ })).toContainText("80 kg, abans 85 kg");

  // Detall de l'exercici: gràfica amb el resum en text.
  await page.getByRole("button", { name: /^Esquats/ }).last().click();
  await expect(page.getByRole("heading", { level: 1, name: "Esquats" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Evolució d'Esquats|^Evolució de Esquats/ })).toHaveAttribute(
    "aria-label",
    /105/,
  );
  await page.getByRole("button", { name: "Torna a Progrés" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Progrés" })).toBeVisible();

  // Pes corporal i alçada → IMC.
  await page.getByRole("button", { name: "Registra el pes" }).click();
  await page.getByRole("dialog").getByPlaceholder("78,5").fill("80");
  await page.getByRole("button", { name: "Desa el pes" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: /^Edita el pes del/ })).toContainText("80 kg");

  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await page.getByRole("textbox", { name: "Alçada" }).fill("180");
  await page.getByRole("textbox", { name: "Alçada" }).press("Enter");
  await page.getByRole("button", { name: "Progrés", exact: true }).click();
  await expect(page.getByText("24,7", { exact: true })).toBeVisible();
});
