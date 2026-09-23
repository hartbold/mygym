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
      entry("Pressió sobre banc", 30, 80),
      entry("Pressió sobre banc", 23, 82.5),
      entry("Pressió sobre banc", 16, 85),
      entry("Pressió sobre banc", 9, 77.5),
      entry("Pressió sobre banc", 2, 80),
      entry("Esquat", 10, 100),
      entry("Esquat", 1, 105),
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

  await expect(page.getByRole("button", { name: /^Rècord a Esquat/ })).toBeVisible();

  // Calendari mensual: els dies entrenats són botons que obren la sessió.
  const days = page.getByRole("grid").getByRole("button");
  await expect(days.first()).toHaveAttribute("aria-label", /exercici/);
  const count = await days.count();
  expect(count).toBeGreaterThan(0);
  await days.last().click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("Progrés");
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Progrés" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Baixada a Pressió sobre banc/ })).toContainText("80 kg, abans 85 kg");

  // Detall de l'exercici: gràfica amb el resum en text.
  await page.getByRole("button", { name: /^Esquat / }).last().click();
  await expect(page.getByRole("heading", { level: 1, name: "Esquat" })).toBeVisible();
  await expect(page.getByRole("img", { name: /^Evolució d'Esquat/ })).toHaveAttribute(
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
