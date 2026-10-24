import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const DAV = "https://dav.test/files/pau/";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, PROPFIND, MKCOL, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Depth",
};

/** WebDAV en memòria compartit entre els dos «dispositius» (contextos). */
function fakeDav() {
  const files = new Map<string, string>();
  let folder = false;
  async function attach(context: BrowserContext) {
    await context.route("https://dav.test/**", async (route) => {
      const req = route.request();
      const url = req.url();
      const method = req.method();
      if (method === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
      if (req.headers()["authorization"] !== "Basic " + Buffer.from("pau:secret").toString("base64")) {
        return route.fulfill({ status: 401, headers: CORS });
      }
      if (method === "PROPFIND") return route.fulfill({ status: folder ? 207 : 404, headers: CORS });
      if (method === "MKCOL") {
        folder = true;
        return route.fulfill({ status: 201, headers: CORS });
      }
      if (method === "GET") {
        const body = files.get(url);
        return route.fulfill(body === undefined ? { status: 404, headers: CORS } : { status: 200, headers: CORS, body });
      }
      if (method === "PUT") {
        files.set(url, req.postData() ?? "");
        return route.fulfill({ status: 201, headers: CORS });
      }
      return route.fulfill({ status: 405, headers: CORS });
    });
  }
  return { files, attach };
}

async function configure(page: Page, password: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Ajustos", exact: true }).click();
  await page.getByRole("textbox", { name: "URL" }).fill(DAV);
  await page.getByRole("textbox", { name: "Usuari" }).fill("pau");
  await page.getByLabel("Contrasenya").fill(password);
  await page.getByRole("button", { name: "Verifica i activa" }).click();
}

test("les dades viatgen entre dos dispositius a través del WebDAV", async ({ browser }) => {
  const dav = fakeDav();

  // Dispositiu A: crea la carpeta i hi puja l'alçada.
  const a = await browser.newContext();
  await dav.attach(a);
  const pageA = await a.newPage();
  await configure(pageA, "secret");
  await pageA.getByRole("button", { name: "Crea-la" }).click();
  await expect(pageA.getByText("Servidor verificat. La sincronització és activa.")).toBeVisible();
  await pageA.getByRole("textbox", { name: "Alçada" }).fill("181");
  await pageA.getByRole("textbox", { name: "Alçada" }).press("Enter");
  await pageA.getByRole("button", { name: "Sincronitza ara" }).click();
  await expect.poll(() => dav.files.get(`${DAV}mygym/mygym.json`) ?? "").toContain('"heightCm":181');

  // Dispositiu B (buit): la carpeta ja hi és, i en activar-la ho baixa tot.
  const b = await browser.newContext();
  await dav.attach(b);
  const pageB = await b.newPage();
  await configure(pageB, "secret");
  await expect(pageB.getByText("Servidor verificat. La sincronització és activa.")).toBeVisible();
  await expect(pageB.getByRole("textbox", { name: "Alçada" })).toHaveValue("181");

  await a.close();
  await b.close();
});

test("una contrasenya incorrecta mostra l'error sense activar res", async ({ browser }) => {
  const dav = fakeDav();
  const context = await browser.newContext();
  await dav.attach(context);
  const page = await context.newPage();
  await configure(page, "dolenta");
  await expect(page.getByText("Usuari o contrasenya incorrectes.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Verifica i activa" })).toBeVisible();
  await context.close();
});
