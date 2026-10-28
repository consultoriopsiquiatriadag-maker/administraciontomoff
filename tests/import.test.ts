import { describe, it, expect } from "vitest";
import { emptyState, validateState } from "../src/model";
import { demoState } from "../src/demo";
import {
  parseExtracted,
  defaultChoices,
  mergeExtracted,
  type ExtractedBundle,
} from "../src/importAccounts";
import {
  overview,
  paymentPlan,
  balance,
  paid,
  requiredPayment,
  projection,
} from "../src/finance";
import { fixture } from "./import-fixture";
describe("importación aditiva", () => {
  it("importa sin inventar pagos, mínimos ni números de tarjeta", () => {
    const b = fixture(),
      s = emptyState();
    const result = mergeExtracted(s, b, defaultChoices(s, b));
    expect(result.added).toBe(1);
    expect(result.state.cards[0].last4).toBe("");
    expect(result.state.cards[0].referenceLast4).toBe("9001");
    expect(result.state.statements[0].minimum).toBeNull();
    expect(result.state.statements[0].paymentsConfirmed).toBe(false);
    expect(result.state.payments).toEqual([]);
    expect(result.state.purchases[0].current).toBe(2);
    expect(result.state.expenses).toHaveLength(1);
  });
  it("repetir una importación no duplica ni reemplaza pagos o registros", () => {
    const b = fixture(),
      s = emptyState();
    const first = mergeExtracted(s, b, defaultChoices(s, b)).state;
    first.payments.push({
      id: "p",
      statementId: first.statements[0].id,
      date: "2026-10-20",
      amount: 1000,
      method: "Prueba",
    });
    first.statements[0].notes = "Nota personal";
    const again = mergeExtracted(first, b, defaultChoices(first, b));
    expect(again.added).toBe(0);
    expect(again.skipped).toBe(1);
    expect(again.state).toEqual(first);
  });
  it("vincula explícitamente una tarjeta existente conservando su nombre", () => {
    const s = emptyState();
    s.cards = [
      {
        ...demoState("2026-10").cards[0],
        id: "local-card",
        name: "Nombre elegido",
      },
    ];
    const b = fixture();
    const merged = mergeExtracted(s, b, [
      { key: b.accounts[0].key, targetCardId: "local-card", selected: true },
    ]);
    expect(merged.state.cards).toHaveLength(1);
    expect(merged.state.cards[0].name).toBe("Nombre elegido");
    expect(merged.state.statements[0].cardId).toBe("local-card");
  });
  it("rechaza estructura inválida y tarjetas destino eliminadas", () => {
    expect(() => parseExtracted('{"format":"other"}')).toThrow();
    expect(() =>
      mergeExtracted(emptyState(), fixture(), [
        { key: "test-account", targetCardId: "missing", selected: true },
      ]),
    ).toThrow();
  });
  it("no mezcla demostración y datos reales", () => {
    const b = fixture(),
      s = demoState("2026-10");
    expect(() => mergeExtracted(s, b, defaultChoices(s, b))).toThrow(
      "demostración",
    );
  });
  it("detecta dos cuentas asignadas a la misma tarjeta y período", () => {
    const s = emptyState();
    s.cards = [demoState("2026-10").cards[0]];
    const b = fixture();
    b.accounts.push({ ...b.accounts[0], key: "other-account" });
    expect(() =>
      mergeExtracted(
        s,
        b,
        b.accounts.map((a) => ({
          key: a.key,
          targetCardId: s.cards[0].id,
          selected: true,
        })),
      ),
    ).toThrow("misma tarjeta");
  });
});
describe("monedas y obligaciones desconocidas", () => {
  const state = () => {
    const b = fixture(),
      s = emptyState();
    return mergeExtracted(s, b, defaultChoices(s, b)).state;
  };
  it("no transforma un mínimo desconocido en cero ni distribuye dinero", () => {
    const s = state();
    s.statements[0].paymentsConfirmed = true;
    expect(requiredPayment(s, s.statements[0])).toBeNull();
    const p = paymentPlan(s, "2026-10", 10000);
    expect(p.blocked).toBe(true);
    expect(p.rows[0].minimum).toBeNull();
    expect(p.allocated).toBe(0);
    expect(p.unused).toBe(10000);
  });
  it("pago total requiere modalidad explícita y revisión de pagos", () => {
    const s = state();
    s.statements[0].paymentMode = "full";
    expect(paymentPlan(s, "2026-10", 10000).blocked).toBe(true);
    s.statements[0].paymentsConfirmed = true;
    const p = paymentPlan(s, "2026-10", 10000);
    expect(p.blocked).toBe(false);
    expect(p.allocated).toBe(10000);
    expect(p.minimum).toBe(10000);
    expect(s.statements[0].minimum).toBeNull();
  });
  it("pagos USD no reducen deuda ARS y cada moneda tiene su límite", () => {
    const s = state(),
      st = s.statements[0];
    s.payments.push({
      id: "usd",
      statementId: st.id,
      date: "2026-10-20",
      amount: 1000,
      currency: "USD",
      method: "",
    });
    expect(balance(s, st)).toBe(10000);
    expect(balance(s, st, "USD")).toBe(1000);
    expect(paid(s, st.id)).toBe(0);
    expect(overview(s, "2026-10", "USD").payment).toBe(1000);
    s.payments[0].amount = 2001;
    expect(() => validateState(s)).toThrow("USD");
  });
  it("USD excluye servicios ARS y proyecciones de compras en otra moneda", () => {
    const s = state();
    const demo = demoState("2026-10");
    s.services = demo.services;
    s.invoices = demo.invoices;
    expect(overview(s, "2026-10", "USD").services).toBe(0);
    expect(overview(s, "2026-10", "USD").total).toBe(2000);
    expect(projection(s, "2026-10", 2, "USD").map((p) => p.total)).toEqual([
      0, 0,
    ]);
    expect(projection(s, "2026-10", 2).map((p) => p.total)).toEqual([500, 500]);
  });
  it("un plan USD confirmado usa solo saldo y presupuesto USD", () => {
    const s = state(),
      st = s.statements[0];
    st.paymentsConfirmed = true;
    st.usdPaymentMode = "full";
    const p = paymentPlan(s, "2026-10", 2500, "interest", "USD");
    expect(p.blocked).toBe(false);
    expect(p.allocated).toBe(2000);
    expect(p.unused).toBe(500);
    expect(st.minimum).toBeNull();
  });
  it("migra versión 1 sin cambiar importes ni perder referencias", () => {
    const original = demoState("2026-10");
    const legacy = { ...original, version: 1 };
    const migrated = validateState(legacy);
    expect(migrated).toEqual(original);
    expect(migrated.version).toBe(2);
  });
});
