import { test, expect } from "@playwright/test";
import { stateWithPlan } from "../refinancing-fixture";
import { demoState } from "../../src/demo";

test("refinanciación pendiente, confirmación y reparto del efectivo con servicios", async ({
  page,
}) => {
  const s = stateWithPlan(),
    st = s.statements[0];
  delete st.refinancingARS;
  st.paymentMode = "minimum";
  const base = demoState("2026-10");
  s.services = base.services;
  s.invoices = [
    {
      ...base.invoices[0],
      id: "bill-a",
      month: "2026-10",
      serviceId: base.services[0].id,
      paid: false,
      paidDate: "",
      amount: 30000,
    },
    {
      ...base.invoices[0],
      id: "bill-b",
      month: "2026-10",
      serviceId: base.services[1].id,
      paid: true,
      paidDate: "2026-10-20",
      amount: 20000,
    },
  ];
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async (data) => {
    const request = indexedDB.open("mis-cuentas-local");
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const db = request.result,
          t = db.transaction("state", "readwrite");
        t.objectStore("state").put(data, "data");
        t.oncomplete = () => {
          db.close();
          resolve();
        };
        t.onerror = () => reject(t.error);
      };
    });
  }, s);
  await page.reload();
  await page.getByLabel("Mes y año").fill("2026-10");
  const navigate = async (name: string) => {
    const menu = page.getByRole("button", { name: "Abrir menú", exact: true });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("navigation")
      .getByRole("button", { name, exact: true })
      .click();
  };
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).first().click();
  await page.getByRole("button", { name: "Registrar refinanciación" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText(
      "Falta confirmar saldo, cuota y vencimiento de la refinanciación.",
      { exact: false },
    ),
  ).toBeVisible();
  await navigate("Plan de pago");
  await expect(
    page.getByText("Plan pendiente:", { exact: false }),
  ).toBeVisible();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).first().click();
  await page.getByRole("button", { name: "Revisar refinanciación" }).click();
  await dialog
    .getByLabel("Estado de los datos del plan")
    .selectOption("confirmed");
  await dialog.locator("[name=startDate]").fill("2026-10-10");
  await dialog.locator("[name=asOfDate]").fill("2026-10-20");
  await dialog.locator("[name=dueDate]").fill("2026-11-02");
  await dialog.locator("[name=balance]").fill("5000");
  await dialog.locator("[name=monthlyDue]").fill("500");
  await dialog.locator("[name=installmentAmount]").fill("500");
  await dialog.locator("[name=current]").fill("2");
  await dialog.locator("[name=total]").fill("12");
  await dialog.locator("[name=rate]").fill("3");
  await dialog.locator("[name=evidence]").check();
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText(
      "Plan confirmado: se distingue la deuda total de lo exigible este período.",
      { exact: true },
    ),
  ).toBeVisible();
  await navigate("Plan de pago");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Dinero disponible ahora ARS").fill("4000");
  await page
    .getByLabel("Reservar para otros pagos pendientes (ARS)")
    .fill("100");
  await page
    .getByRole("button", { name: "Guardar y calcular estrategia" })
    .click();
  await expect(
    page
      .locator(".metric")
      .filter({ hasText: "Dinero disponible para tarjetas" }),
  ).toContainText("$ 3.600,00");
  // Locate by row text because the summary includes an issuer image as well.
  const suggested = page
    .getByRole("row")
    .filter({ hasText: "Visa · Nación" })
    .first();
  await expect(suggested).toContainText("$ 500,00");
  await expect(suggested.locator(".teal")).toHaveText("$ 500,00");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByText("Plan pendiente:", { exact: false }),
  ).not.toBeVisible();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).first().click();
  await page
    .getByRole("button", { name: "Registrar pago", exact: true })
    .click();
  await expect(dialog.locator("[name=amount]")).toHaveValue("500.00");
  await dialog.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.locator(".metric").filter({ hasText: "Saldo pendiente" }),
  ).toContainText("$ 4.500,00");
  await page.reload();
  await navigate("Resúmenes");
  await page.getByRole("button", { name: "Abrir resumen" }).first().click();
  await expect(
    page.locator(".metric").filter({ hasText: "Saldo pendiente" }),
  ).toContainText("$ 4.500,00");
});
