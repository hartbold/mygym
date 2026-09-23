import { expect, test, type Page } from "@playwright/test";

async function createEntry(page: Page, name: string, fill: (page: Page) => Promise<void>) {
  await page.getByRole("button", { name: "Nou exercici", exact: true }).click();
  await page.getByRole("button", { name, exact: true }).click();
  await fill(page);
  // Treu les files buides que queden (el formulari en proposa tres).
  while ((await page.getByRole("button", { name: "Esborra la fila" }).count()) > 1) {
    await page.getByRole("button", { name: "Esborra la fila" }).last().click();
  }
  await page.getByRole("button", { name: "Desa" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

test("les sèries de la targeta es poden editar: «+ Sèrie» obre la nova en edició, i també un cop acabat", async ({
  page,
}) => {
  await page.goto("/");
  await createEntry(page, "Press de banca", async (p) => {
    await p.getByPlaceholder("kg").nth(0).fill("60");
    await p.getByPlaceholder("reps").nth(0).fill("10");
  });

  const card = page.locator("article", { hasText: "Press de banca" });
  const set = (n: number) => card.getByRole("button", { name: new RegExp(`^Edita la sèrie ${n}:`) });

  // «+ Sèrie» copia l'última i la deixa en edició per ajustar pes i reps.
  await card.getByRole("button", { name: "Sèrie", exact: true }).click();
  await expect(card.getByRole("textbox", { name: "Pes en kg, sèrie 2" })).toHaveValue("60");
  await expect(card.getByRole("textbox", { name: "Repeticions, sèrie 2" })).toHaveValue("10");
  await card.getByRole("textbox", { name: "Pes en kg, sèrie 2" }).fill("62,5");
  await card.getByRole("textbox", { name: "Repeticions, sèrie 2" }).fill("7");
  await card.getByRole("button", { name: "Fet" }).click();
  await expect(set(2)).toContainText("62,5 kg × 7 reps");

  // Tocar una sèrie existent l'edita; Enter desa.
  await set(1).click();
  await card.getByRole("textbox", { name: "Repeticions, sèrie 1" }).fill("12");
  await card.getByRole("textbox", { name: "Repeticions, sèrie 1" }).press("Enter");
  await expect(set(1)).toContainText("60 kg × 12 reps");

  // Un segon «+ Sèrie» copia els valors ja editats; Escape la deixa tal qual.
  await card.getByRole("button", { name: "Sèrie", exact: true }).click();
  await expect(card.getByRole("textbox", { name: "Pes en kg, sèrie 3" })).toHaveValue("62,5");
  await expect(card.getByRole("textbox", { name: "Repeticions, sèrie 3" })).toHaveValue("7");
  await card.getByRole("textbox", { name: "Repeticions, sèrie 3" }).press("Escape");
  await expect(set(3)).toContainText("62,5 kg × 7 reps");

  // Un valor no vàlid no es desa i s'explica; Escape descarta el canvi.
  await set(1).click();
  await card.getByRole("textbox", { name: "Repeticions, sèrie 1" }).fill("0");
  await card.getByRole("button", { name: "Fet" }).click();
  await expect(card.getByRole("alert")).toHaveText("Les repeticions han de ser un número enter ≥ 1.");
  await card.getByRole("textbox", { name: "Repeticions, sèrie 1" }).press("Escape");
  await expect(set(1)).toContainText("60 kg × 12 reps");

  // Sortir de la fila (tocar a fora) també desa.
  await set(3).click();
  await card.getByRole("textbox", { name: "Repeticions, sèrie 3" }).fill("6");
  await page.getByRole("heading", { level: 1 }).click();
  await expect(set(3)).toContainText("62,5 kg × 6 reps");

  // Un cop acabat, les sèries continuen sent editables.
  await card.getByRole("button", { name: "Acaba" }).click();
  await expect(card.getByRole("button", { name: "Acaba" })).toHaveCount(0);
  await set(2).click();
  await card.getByRole("textbox", { name: "Pes en kg, sèrie 2" }).fill("");
  await card.getByRole("button", { name: "Fet" }).click();
  await expect(set(2)).toContainText("7 reps");
  await expect(set(2)).not.toContainText("kg");

  // Tot queda desat.
  await page.reload();
  await expect(set(1)).toContainText("60 kg × 12 reps");
  await expect(set(3)).toContainText("62,5 kg × 6 reps");
});

test("el selector es pot cercar en anglès i castellà, però només mostra noms en català", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nou exercici", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Cerca un exercici" });
  const dialog = page.getByRole("dialog");

  for (const [query, catalan] of [
    ["deadlift", "Pes mort"],
    ["peso muerto", "Pes mort"],
    ["plancha", "Planxa"],
    ["bench press", "Press de banca"],
  ]) {
    await search.fill(query);
    await expect(dialog.getByRole("button", { name: catalan, exact: true })).toBeVisible();
    await expect(dialog.getByText(query, { exact: true })).toHaveCount(0);
    // Un àlies conegut sencer no proposa crear un exercici nou.
    await expect(dialog.getByRole("button", { name: "Crea i continua" })).toHaveCount(0);
  }
  // Una part d'un àlies també troba l'exercici.
  await search.fill("bench");
  await expect(dialog.getByRole("button", { name: "Press de banca", exact: true })).toBeVisible();
});

test("la durada d'un exercici de temps es pot corregir un cop fet", async ({ page }) => {
  await page.goto("/");
  await createEntry(page, "Cinta de córrer", async (p) => {
    await p.getByPlaceholder("min").nth(0).fill("20");
    await p.getByPlaceholder("s").nth(0).fill("0");
  });

  const card = page.locator("article", { hasText: "Cinta de córrer" });
  const set = card.getByRole("button", { name: /^Edita la sèrie 1:/ });
  await expect(set).toContainText("20:00");

  await card.getByRole("button", { name: "Acaba" }).click();
  await set.click();
  await expect(card.getByRole("textbox", { name: "Minuts, sèrie 1" })).toHaveValue("20");
  await expect(card.getByRole("textbox", { name: "Segons, sèrie 1" })).toHaveValue("00");
  await card.getByRole("textbox", { name: "Minuts, sèrie 1" }).fill("15");
  await card.getByRole("textbox", { name: "Segons, sèrie 1" }).fill("30");
  await card.getByRole("button", { name: "Fet" }).click();
  await expect(set).toContainText("15:30");

  await page.reload();
  await expect(set).toContainText("15:30");
});
