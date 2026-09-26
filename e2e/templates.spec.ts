import { expect, test } from "@playwright/test";

test("plantilla: s'afegeix, s'edita, es carrega a Avui, es marquen sèries i en acabar s'actualitza", async ({ page }) => {
  await page.goto("/");

  // --- Ajustos: plantilla de mostra i editor ---
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await page.getByRole("button", { name: "Afegeix la plantilla de mostra Pit, espatlles i tríceps" }).click();
  await page.getByRole("button", { name: /^Pit, espatlles i tríceps/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pit, espatlles i tríceps" })).toBeVisible();

  const weight1 = page.getByRole("textbox", { name: "Pes en kg, Press de banca, sèrie 1" });
  await weight1.fill("62,5");
  await weight1.press("Enter");
  await expect(weight1).toHaveValue("62,5");

  // --- Carregar-la: no comença fins a la primera marca, i sense cronòmetre ---
  await page.getByRole("button", { name: "Comença-la ara" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Avui" })).toBeVisible();
  await expect(page.getByText(/^No començat/)).toBeVisible();
  await expect(page.getByText(/En curs:/)).toHaveCount(0);

  await page.getByRole("button", { name: "Marca la sèrie 1 de Press de banca", exact: true }).click();
  await expect(page.getByText(/^Començat a les/)).toBeVisible();

  const weight2 = page.getByRole("textbox", { name: "Pes en kg, Press de banca, sèrie 2" });
  await weight2.fill("65");
  await page.getByRole("button", { name: "Marca la sèrie 2 de Press de banca", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desmarca la sèrie 2 de Press de banca", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marca la sèrie 1 de Press d'espatlles" }).click();

  // Desmarcar i tornar a marcar funciona.
  await page.getByRole("button", { name: "Desmarca la sèrie 1 de Press d'espatlles" }).click();
  await page.getByRole("button", { name: "Marca la sèrie 1 de Press d'espatlles" }).click();

  // --- Acabar i actualitzar la plantilla ---
  await page.getByRole("button", { name: "Acaba l'entrenament" }).click();
  const finish = page.getByRole("dialog", { name: /Acabar/ });
  await expect(finish).toContainText("3");
  await finish.getByRole("checkbox").check();
  await finish.getByRole("button", { name: "Fet" }).click();
  await expect(page.getByText(/^Començat a les/)).toHaveCount(0);
  await expect(page.locator("article", { hasText: "Press de banca" })).toContainText("65 kg × 6 reps");
  await expect(page.locator("article", { hasText: "Press d'espatlles" })).toBeVisible();

  // La plantilla té els pesos nous.
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await page.getByRole("button", { name: /^Pit, espatlles i tríceps/ }).click();
  await expect(page.getByRole("textbox", { name: "Pes en kg, Press de banca, sèrie 1" })).toHaveValue("62,5");
  await expect(page.getByRole("textbox", { name: "Pes en kg, Press de banca, sèrie 2" })).toHaveValue("65");

  // L'historial en té la sessió.
  await page.getByRole("button", { name: "Historial", exact: true }).click();
  await expect(page.getByText("2 exercicis", { exact: false })).toBeVisible();
});

test("les plantilles s'importen d'un fitxer JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  const file = {
    app: "mygym",
    type: "templates",
    formatVersion: 1,
    templates: [
      {
        name: "Rutina de l'entrenador",
        exercises: [
          { name: "Peso mort", sets: [{ weight: 100, reps: 5 }] },
          { name: "Plancha", sets: [{ durationSec: 60 }] },
        ],
      },
    ],
  };
  await page.getByLabel("Fitxer de plantilles", { exact: true }).setInputFiles({
    name: "plantilles.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByText("S'ha importat 1 plantilla.")).toBeVisible();
  // Al costat del botó, l'enllaç a la documentació dels camps.
  await expect(page.getByRole("link", { name: /quins camps ha de tenir un fitxer de plantilles/ })).toHaveAttribute(
    "href",
    /docs\/importacio\.md$/,
  );
  await page.getByRole("button", { name: /^Rutina de l'entrenador/ }).click();
  // Noms antics normalitzats als noms actuals.
  await expect(page.getByRole("heading", { level: 3, name: "Pes mort" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Planxa" })).toBeVisible();
});

test("editor: els kg es conserven encara que les reps estiguin buides; les mostres no desapareixen; esborrar funciona", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await page.getByRole("button", { name: "Nova plantilla" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Nova plantilla" })).toBeVisible();

  // Un exercici nou comença buit, i els kg es desen abans que les reps.
  await page.getByRole("button", { name: "Afegeix exercici" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Esquat", exact: true }).click();
  const kg = page.getByRole("textbox", { name: "Pes en kg, Esquat, sèrie 1" });
  await expect(kg).toHaveValue("");
  await kg.fill("100");
  await kg.press("Tab");
  await expect(kg).toHaveValue("100");
  const reps = page.getByRole("textbox", { name: "Repeticions, Esquat, sèrie 1" });
  await reps.fill("5");
  await reps.press("Tab");
  await expect(kg).toHaveValue("100");
  await expect(reps).toHaveValue("5");

  // Un segon exercici també comença buit.
  await page.getByRole("button", { name: "Afegeix exercici" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Pes mort", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Pes en kg, Pes mort, sèrie 1" })).toHaveValue("");

  // Amb una plantilla pròpia, les de mostra continuen disponibles.
  await page.getByRole("button", { name: "Torna a Ajustos" }).click();
  await expect(page.getByRole("button", { name: /^Nova plantilla 2 exercicis/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Afegeix la plantilla de mostra Pit, espatlles i tríceps" })).toBeVisible();

  // Esborrar-la la treu de la llista (confirmació pròpia, no el confirm() del navegador).
  await page.getByRole("button", { name: /^Nova plantilla 2 exercicis/ }).click();
  await page.getByRole("button", { name: "Esborra la plantilla" }).click();
  const alert = page.getByRole("alertdialog", { name: /Esborrar «Nova plantilla»/ });
  await expect(alert).toBeVisible();
  await alert.getByRole("button", { name: "Esborra" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Ajustos" })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Nova plantilla 2 exercicis/ })).toHaveCount(0);
});
