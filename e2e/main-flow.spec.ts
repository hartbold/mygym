import { expect, test } from "@playwright/test";

test("crea un exercici amb sèries de pesos diferents, l'acaba en prémer «Nou exercici», acaba explícitament, agrupa per dia i persisteix", async ({
  page,
}) => {
  await page.goto("/");

  // --- Primer exercici: Press banca, 2 sèries amb pesos diferents ---
  await page.getByRole("button", { name: "Nou exercici", exact: true }).click();
  await page.getByRole("button", { name: "Press de banca", exact: true }).click();

  const kgInputs = page.getByPlaceholder("kg");
  const repsInputs = page.getByPlaceholder("reps");
  await kgInputs.nth(0).fill("60,5");
  await repsInputs.nth(0).fill("10");
  await kgInputs.nth(1).fill("65");
  await repsInputs.nth(1).fill("8");
  await page.getByRole("button", { name: "Esborra la fila" }).last().click(); // treu la 3a fila buida
  await page.getByRole("button", { name: "Desa" }).click();

  const pressCard = page.locator("article", { hasText: "Press de banca" });
  await expect(pressCard).toBeVisible();
  await expect(pressCard.getByRole("button", { name: "Acaba" })).toBeVisible();
  await expect(pressCard.getByText("60,5 kg", { exact: false })).toBeVisible();
  await expect(pressCard.getByText("65 kg", { exact: false })).toBeVisible();

  // --- Segon exercici: Esquats — ha d'acabar «Press banca» automàticament ---
  await page.getByRole("button", { name: "Nou exercici", exact: true }).click();
  await page.getByRole("button", { name: "Esquats", exact: true }).click();
  await kgInputs.nth(0).fill("100");
  await repsInputs.nth(0).fill("5");
  await page.getByRole("button", { name: "Esborra la fila" }).last().click();
  await page.getByRole("button", { name: "Esborra la fila" }).last().click();
  await page.getByRole("button", { name: "Desa" }).click();

  await expect(pressCard.getByRole("button", { name: "Acaba" })).toHaveCount(0);
  const squatsCard = page.locator("article", { hasText: "Esquats" });
  await expect(squatsCard.getByRole("button", { name: "Acaba" })).toBeVisible();

  // --- «Acaba» explícit ---
  await squatsCard.getByRole("button", { name: "Acaba" }).click();
  await expect(squatsCard.getByRole("button", { name: "Acaba" })).toHaveCount(0);

  // --- Agrupació per dia a l'Historial ---
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(page.getByText("2 exercicis", { exact: false })).toBeVisible();

  // --- Persisteix en recarregar ---
  await page.reload();
  await page.getByRole("button", { name: "Avui", exact: true }).click();
  await expect(page.locator("article", { hasText: "Press de banca" })).toBeVisible();
  await expect(page.locator("article", { hasText: "Esquats" })).toBeVisible();
});
