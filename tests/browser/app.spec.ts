import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

test("flujo real: alta, pagos, cuotas, servicios, persistencia y copia con documentos", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Mi panel del mes" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agregar mi primera tarjeta" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Banco / emisor").fill("Banco de prueba");
  await dialog.getByLabel("Nombre de la tarjeta").fill("Visa de prueba");
  await dialog.getByLabel("Últimos 4 dígitos").fill("1234");
  await dialog.getByLabel("Financiación mensual").fill("7,5");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mis tarjetas" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Visa de prueba" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cargar resumen", exact: true })
    .click();
  await dialog.getByLabel("Total del resumen").fill("100000");
  await dialog.getByLabel("Pago mínimo").fill("10000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Resúmenes", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await page.getByRole("button", { name: "Consumo", exact: true }).click();
  await dialog.getByLabel("Comercio / descripción").fill("Supermercado");
  await dialog.getByLabel("Importe", { exact: false }).fill("1500,50");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Supermercado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  await dialog.getByLabel("Importe efectivamente pagado").fill("20000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText("$ 80.000,00", { exact: true })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "resumen.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nLocal test document"),
  });
  await expect(page.getByText("resumen.pdf", { exact: true })).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Resúmenes", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await expect(page.getByText("resumen.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText("$ 80.000,00", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Cuotas futuras" })
    .click();
  await page
    .getByRole("button", { name: "Compra en cuotas", exact: true })
    .click();
  await dialog.getByLabel("Compra / descripción").fill("Heladera");
  await dialog.locator("[name=current]").fill("3");
  await dialog.getByLabel("Total de cuotas").fill("12");
  await dialog.getByLabel("Valor de cada cuota").fill("45000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$ 405.000,00", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Servicios", exact: true })
    .click();
  await page.getByRole("button", { name: "Servicio", exact: true }).click();
  await dialog
    .getByLabel("Empresa / nombre del servicio")
    .fill("Mi electricidad");
  await dialog.getByLabel("Tipo (").fill("Electricidad");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Factura", exact: true }).click();
  await dialog.getByLabel("Importe").fill("50000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".status.green").first()).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Plan de pago" })
    .click();
  await page.getByRole("button", { name: "Cambiar dinero disponible" }).click();
  await dialog.getByLabel("Ingresos del mes").fill("1000000");
  await dialog.getByLabel("Dinero disponible para tarjetas").fill("40000");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: "$ 40.000,00", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración" })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar copia de seguridad" })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  const raw = await fs.readFile(path!, "utf8");
  const backup = JSON.parse(raw);
  expect(backup.state.cards).toHaveLength(1);
  expect(backup.state.payments).toHaveLength(1);
  expect(backup.attachments).toHaveLength(1);
  await page.evaluate(async () => {
    const req = indexedDB.open("mis-cuentas-local");
    await new Promise<void>((resolve) => {
      req.onsuccess = () => {
        const db = req.result;
        const t = db.transaction(["state", "attachments"], "readwrite");
        t.objectStore("state").clear();
        t.objectStore("attachments").clear();
        t.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.locator("input[type=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(raw),
  });
  await expect(page.getByText("Copia importada correctamente.")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Resúmenes", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await expect(page.getByText("resumen.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText("$ 80.000,00", { exact: true })).toBeVisible();
  expect(failures).toEqual([]);
});

test("demostración navegable, responsive, sin solicitudes externas y eliminación", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (
      !r
        .url()
        .startsWith(
          process.env.APP_MODE === "production"
            ? "http://127.0.0.1:4173"
            : "http://127.0.0.1:5173",
        ) &&
      !r.url().startsWith("blob:")
    )
      external.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demostración" }).click();
  await expect(
    page.getByText("DEMOSTRACIÓN · Los datos son ficticios."),
  ).toBeVisible();
  for (const label of [
    "Mis tarjetas",
    "Resúmenes",
    "Plan de pago",
    "Cuotas futuras",
    "Servicios",
    "Calendario",
    "Historial",
    "Configuración",
    "Inicio",
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.screenshot({
    path: "test-results/panel-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/panel-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Eliminar datos de demostración" })
    .click();
  await expect(
    page.getByText("DEMOSTRACIÓN · Los datos son ficticios."),
  ).not.toBeVisible();
  expect(external).toEqual([]);
});

test("cuotas desde consumo, correcciones y eliminación en cascada", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demostración" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Resúmenes", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir resumen" }).first().click();
  await page.getByRole("button", { name: "Consumo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Comercio / descripción").fill("Lavarropas nuevo");
  await dialog.locator("[name=amount]").fill("25000");
  await dialog.locator("[name=installmentCurrent]").fill("3");
  await dialog.locator("[name=installmentTotal]").fill("12");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const expense = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "Lavarropas nuevo", exact: true }),
  });
  await expect(
    expense.getByRole("cell", { name: "3/12", exact: true }),
  ).toBeVisible();
  await expense.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog
    .getByLabel("Comercio / descripción")
    .fill("Lavarropas corregido");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Lavarropas corregido", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Cuotas futuras", exact: true })
    .click();
  const purchase = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "Lavarropas nuevo", exact: true }),
  });
  await expect(
    purchase.getByRole("cell", { name: "$ 225.000,00", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mis tarjetas", exact: true })
    .click();
  const card = page.locator(".card-panel").first();
  await card.getByRole("button", { name: "Editar", exact: true }).click();
  await dialog.getByLabel("Nombre de la tarjeta").fill("Tarjeta corregida");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tarjeta corregida" }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tarjeta corregida" }),
  ).not.toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Cuotas futuras", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Lavarropas nuevo", exact: true }),
  ).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mis tarjetas", exact: true })
    .click();
  await expect(page.locator(".card-panel")).toHaveCount(1);
});
