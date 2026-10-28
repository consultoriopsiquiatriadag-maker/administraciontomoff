import { test, expect } from "@playwright/test";
import { fixture } from "../import-fixture";

test("importación revisada, monedas separadas, mínimo desconocido y pagos confirmados", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const bundle = fixture();
  const data = {
    name: "mis-cuentas-importacion.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle)),
  };
  const navigate = async (name: string) =>
    page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  await page.goto("/");
  await navigate("Configuración");
  await page.getByLabel("Seleccionar paquete de cuentas").setInputFiles(data);
  await expect(page.getByText("Revisar antes de importar")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "No informado (no es cero)", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Importar 1 cuentas seleccionadas" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resúmenes");
  await expect(
    page.getByRole("cell", { name: "$ 100,00", exact: true }).first(),
  ).toBeVisible();
  await navigate("Plan de pago");
  await expect(
    page.getByText("Plan pendiente:", { exact: false }),
  ).toBeVisible();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar pagos al día" }),
  ).toBeVisible();
  await page.getByLabel("Moneda de consulta").selectOption("USD");
  await expect(
    page.locator(".metric").filter({ hasText: "Total informado" }),
  ).toContainText("20,00");
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Moneda del pago")).toHaveValue("USD");
  await dialog.locator("[name=amount]").fill("5");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator(".metric").filter({ hasText: "Saldo pendiente" }),
  ).toContainText("15,00");
  await page.getByLabel("Moneda de consulta").selectOption("ARS");
  await expect(
    page.locator(".metric").filter({ hasText: "Saldo pendiente" }),
  ).toContainText("100,00");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Confirmar pagos al día" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar pagos al día" }),
  ).not.toBeVisible();
  // Confirming payments alone must not make an unknown minimum become zero.
  await navigate("Plan de pago");
  await expect(
    page.getByText("Plan pendiente:", { exact: false }),
  ).toBeVisible();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await page
    .getByRole("button", { name: "Editar", exact: true })
    .first()
    .click();
  await expect(dialog.locator("[name=minimum]")).toHaveValue("");
  await dialog.getByLabel("Modalidad de pago ARS").selectOption("full");
  await dialog.getByLabel("Modalidad de pago USD").selectOption("full");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await navigate("Plan de pago");
  await page.getByRole("button", { name: "Cambiar dinero disponible" }).click();
  await dialog.locator("[name=income]").fill("700");
  await dialog.locator("[name=cardBudget]").fill("100");
  await dialog.locator("[name=cardBudgetUSD]").fill("15");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Plan pendiente:", { exact: false }),
  ).not.toBeVisible();
  await page.getByLabel("Moneda de consulta").selectOption("USD");
  await expect(
    page.getByRole("cell", { name: "US$ 15,00", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resumen imprimible del mes" })
    .click();
  const income = page
    .locator(".metric")
    .filter({ hasText: "Ingresos registrados ARS" });
  await expect(income).toContainText("$ 700,00");
  await expect(income).not.toContainText("US$");
  await navigate("Configuración");
  await page.getByLabel("Seleccionar paquete de cuentas").setInputFiles(data);
  await page
    .getByRole("button", { name: "Importar 1 cuentas seleccionadas" })
    .click();
  await expect(
    page.getByText(
      "Importación completada: 0 resúmenes agregados; 1 existentes conservados. Revisa los pagos y modalidades pendientes.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).click();
  await page.getByLabel("Moneda de consulta").selectOption("USD");
  await expect(
    page.locator(".metric").filter({ hasText: "Saldo pendiente" }),
  ).toContainText("15,00");
  expect(errors).toEqual([]);
});

test("pegar código desde el chat evita archivos y exige revisión antes de importar", async ({
  page,
}) => {
  const { gzipSync } = await import("node:zlib");
  const code =
    "MCUENTAS1:" + gzipSync(JSON.stringify(fixture())).toString("base64");
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByLabel("Pegar código de tus cuentas")
    .fill("MCUENTAS1:incompleto");
  await page.getByRole("button", { name: "Revisar datos pegados" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudieron leer");
  await page.getByLabel("Pegar código de tus cuentas").fill(code);
  await page.getByRole("button", { name: "Revisar datos pegados" }).click();
  await expect(page.getByText("Revisar antes de importar")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Configuración",
  );
  await expect(page.getByLabel("Pegar código de tus cuentas")).toHaveValue("");
  await page
    .getByRole("button", { name: "Importar 1 cuentas seleccionadas" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resúmenes");
  await expect(page.getByRole("button", { name: "Abrir resumen" })).toHaveCount(
    1,
  );
});

test("prompt copiable y respuesta mensual JSON con revisión", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Preparar un resumen con mi ChatGPT" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Copiar prompt para mi ChatGPT" })
    .click();
  await expect(
    page.getByText(
      "Prompt copiado. Pégalo en tu ChatGPT y adjunta el resumen.",
    ),
  ).toBeVisible();
  const prompt = await page.evaluate(() => navigator.clipboard.readText());
  expect(prompt).toContain("mis-cuentas-extracted");
  expect(prompt).toContain("ENTERO EN CENTAVOS");
  const b = fixture();
  await page
    .getByLabel("Pegar código de tus cuentas")
    .fill("```json\n" + JSON.stringify(b) + "\n```");
  await page.getByRole("button", { name: "Revisar datos pegados" }).click();
  await page
    .getByRole("button", { name: "Importar 1 cuentas seleccionadas" })
    .click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByLabel("Cuenta para el prompt")
    .selectOption({ label: "Cuenta de prueba" });
  await page.getByText("Ver o copiar el prompt completo").click();
  await expect(
    page.getByLabel("Prompt de extracción de resúmenes"),
  ).toContainText("test-account");
  const next = structuredClone(b);
  next.accounts[0].statement.month = "2026-11";
  next.accounts[0].statement.closingDate = "2026-11-10";
  next.accounts[0].statement.dueDate = "2026-11-25";
  next.accounts[0].expenses[0].installmentCurrent = 3;
  await page
    .getByLabel("Pegar código de tus cuentas")
    .fill("```json\n" + JSON.stringify(next) + "\n```");
  await page.getByRole("button", { name: "Revisar datos pegados" }).click();
  await page
    .getByRole("button", { name: "Importar 1 cuentas seleccionadas" })
    .click();
  await expect(page.getByLabel("Mes y año")).toHaveValue("2026-11");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Mis tarjetas", exact: true })
    .click();
  await expect(page.locator(".card-panel")).toHaveCount(1);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Cuotas futuras", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Compra ficticia", exact: true }),
  ).toHaveCount(1);
});
