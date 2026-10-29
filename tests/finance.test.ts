import { describe, it, expect } from "vitest";
import { emptyState, validateState, type State } from "../src/model";
import { demoState } from "../src/demo";
import {
  paymentPlan,
  projection,
  estimate,
  balance,
  overview,
  addMonth,
  status,
} from "../src/finance";
function fixture(): State {
  const s = demoState("2026-10");
  s.statements = s.statements.filter((x) => x.month === "2026-10");
  s.payments = [];
  s.expenses = [];
  s.statements[0].total = 10000;
  s.statements[0].minimum = 2000;
  s.statements[0].dueDate = "2026-10-01";
  s.statements[0].rate = 4;
  s.statements[1].total = 20000;
  s.statements[1].minimum = 3000;
  s.statements[1].dueDate = "2026-10-02";
  s.statements[1].rate = 8;
  return s;
}
describe("motor financiero", () => {
  it("cubre mínimos y aplica avalancha a mayor TEM", () => {
    const p = paymentPlan(fixture(), "2026-10", 10000, "interest");
    expect(p.rows.map((r) => r.suggested)).toEqual([2000, 8000]);
    expect(p.shortfall).toBe(0);
  });
  it("bola de nieve reduce el saldo más pequeño tras mínimos", () => {
    expect(
      paymentPlan(fixture(), "2026-10", 10000, "snowball").rows.map(
        (r) => r.suggested,
      ),
    ).toEqual([7000, 3000]);
  });
  it("presupuesto insuficiente informa falta y mínimos descubiertos", () => {
    const p = paymentPlan(fixture(), "2026-10", 2500);
    expect(p.shortfall).toBe(2500);
    expect(p.rows.map((r) => r.suggested)).toEqual([2000, 500]);
  });
  it("no asigna dinero por encima de los saldos", () => {
    const p = paymentPlan(fixture(), "2026-10", 50000);
    expect(p.allocated).toBe(30000);
    expect(p.unused).toBe(20000);
  });
  it("resta pagos previos de mínimos y saldos", () => {
    const s = fixture();
    s.payments = [
      {
        id: "p",
        statementId: s.statements[0].id,
        amount: 2500,
        date: "2026-10-01",
        method: "",
      },
    ];
    const p = paymentPlan(s, "2026-10", 1000);
    expect(p.minimum).toBe(3000);
    expect(p.rows[0].minimum).toBe(0);
    expect(balance(s, s.statements[0])).toBe(7500);
  });
  it("ninguna estrategia inventa una tasa", () => {
    const s = fixture();
    s.statements[0].rate = null;
    s.cards[0].financingRate = null;
    expect(paymentPlan(s, "2026-10", 10000).rows[0].rate).toBeNull();
    expect(estimate(10000, 4000, null).interest).toBeNull();
  });
  it("prioriza costo después de cubrir obligaciones, aunque otra tarjeta venza antes", () => {
    const s = fixture();
    s.statements[1].dueDate = "2099-10-02";
    expect(paymentPlan(s, "2026-10", 10000).rows[0].suggested).toBe(2000);
  });
  it("no modifica datos reales", () => {
    const s = fixture(),
      before = structuredClone(s);
    paymentPlan(s, "2026-10", 10000);
    expect(s).toEqual(before);
  });
  it("plan conserva centavos y presupuesto en distintos escenarios", () => {
    for (let n = 0; n < 40000; n += 137) {
      for (const mode of ["recommended", "interest", "snowball"] as const) {
        const p = paymentPlan(fixture(), "2026-10", n, mode);
        expect(p.allocated + p.unused).toBe(n);
        expect(
          p.rows.every(
            (r) =>
              Number.isInteger(r.suggested) &&
              r.suggested >= 0 &&
              r.suggested <= r.remaining,
          ),
        ).toBe(true);
      }
    }
  });
  it("simula interés mensual sin deuda negativa", () => {
    expect(estimate(120000000, 40000000, 8)).toEqual({
      remaining: 80000000,
      interest: 6400000,
    });
    expect(estimate(100, 200, 0)).toEqual({ remaining: 0, interest: 0 });
  });
  it("proyecta cuota 3 de 12 y cambio de año", () => {
    const s = emptyState();
    s.purchases = [
      {
        id: "p",
        cardId: "c",
        description: "Heladera",
        month: "2026-10",
        current: 3,
        total: 12,
        amount: 4500000,
      },
    ];
    const p = projection(s, "2026-10");
    expect(p.slice(0, 9).every((x) => x.total === 4500000)).toBe(true);
    expect(p[9].total).toBe(0);
    expect(p[2].month).toBe("2027-01");
    expect(p.reduce((a, x) => a + x.total, 0)).toBe(40500000);
  });
  it("no duplica deuda de otros períodos en el panel", () => {
    const s = demoState("2026-10");
    const o = overview(s, "2026-10");
    expect(o.statements).toHaveLength(2);
    expect(o.pending).toBe(o.obligations - o.payment);
  });
  it("clasifica pagado, vencido y próximo", () => {
    expect(status("2000-01-01", 0)).toBe("Pagado");
    expect(status("2000-01-01", 1)).toBe("Vencido");
    expect(addMonth("2026-12", 1)).toBe("2027-01");
  });
});
describe("integridad de datos", () => {
  it("valida la demostración", () =>
    expect(() => validateState(demoState("2026-10"))).not.toThrow());
  it("rechaza números completos de tarjetas", () => {
    const s = fixture();
    s.cards[0].last4 = "1234567812345678";
    expect(() => validateState(s)).toThrow();
  });
  it("rechaza resúmenes duplicados y referencias inválidas", () => {
    const s = fixture();
    s.statements.push({ ...s.statements[0], id: "dup" });
    expect(() => validateState(s)).toThrow();
    const a = fixture();
    a.statements[0].cardId = "unknown";
    expect(() => validateState(a)).toThrow();
  });
  it("rechaza sobrepagos y mínimos superiores al total", () => {
    const s = fixture();
    s.statements[0].minimum = 10001;
    expect(() => validateState(s)).toThrow();
    const a = fixture();
    a.payments.push({
      id: "p",
      statementId: a.statements[0].id,
      amount: 10001,
      date: "2026-10-01",
      method: "",
    });
    expect(() => validateState(a)).toThrow();
  });
});
