import { describe, it, expect } from "vitest";
import { demoState } from "../src/demo";
import {
  validateState,
  refinancingSchema,
  type Refinancing,
} from "../src/model";
import {
  balance,
  requiredPayment,
  paymentPlan,
  overview,
  deadlines,
  effectiveRate,
} from "../src/finance";
import { refinancingPosition } from "../src/refinancing";
import { allocateBudget } from "../src/budget";
import { stateWithPlan, confirmedPlan } from "./refinancing-fixture";
describe("saldo refinanciado y pagos", () => {
  it("separa deuda total de obligación mensual y conserva el PDF", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    expect(balance(s, st)).toBe(500000);
    expect(requiredPayment(s, st)).toBe(50000);
    expect(st.total).toBe(1000000);
    expect(st.minimum).toBe(100000);
    expect(overview(s, "2026-10").obligations).toBe(250000);
    expect(overview(s, "2026-10").debt).toBe(700000);
    expect(deadlines(s).find((d) => d.id === st.id)).toMatchObject({
      amount: 50000,
      dueDate: "2026-11-02",
      uncertain: false,
    });
  });
  it("no descuenta dos veces los pagos incluidos en el saldo del banco", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    s.payments = [
      {
        id: "before",
        statementId: st.id,
        date: "2026-10-19",
        amount: 20000,
        method: "",
      },
    ];
    st.refinancingARS!.includedPayments = [
      { id: "before", date: "2026-10-19", amount: 20000 },
    ];
    expect(balance(s, st)).toBe(500000);
    expect(requiredPayment(s, st)).toBe(50000);
    s.payments.push({
      id: "after",
      statementId: st.id,
      date: "2026-10-21",
      amount: 25000,
      method: "",
    });
    expect(balance(s, st)).toBe(475000);
    expect(requiredPayment(s, st)).toBe(25000);
  });
  it("un cambio de pagos incluidos obliga a revisar y no asigna dinero", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    s.payments = [
      {
        id: "before",
        statementId: st.id,
        date: "2026-10-19",
        amount: 21000,
        method: "",
      },
    ];
    st.refinancingARS!.includedPayments = [
      { id: "before", date: "2026-10-19", amount: 20000 },
    ];
    expect(refinancingPosition(s, st).changed).toBe(true);
    expect(requiredPayment(s, st)).toBeNull();
    expect(paymentPlan(s, "2026-10", 500000).allocated).toBe(0);
  });
  it("registrar un pago anterior al saldo confirmado pide nueva revisión", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    s.payments.push({
      id: "old",
      statementId: st.id,
      date: "2026-10-18",
      amount: 1000,
      method: "",
    });
    expect(refinancingPosition(s, st).backdated).toBe(true);
    expect(paymentPlan(s, "2026-10", 500000).blocked).toBe(true);
  });
  it("un plan pendiente no presenta el saldo original como cuota confirmada", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    st.refinancingARS = {
      ...confirmedPlan(),
      status: "pending",
      balance: null,
      monthlyDue: null,
    };
    const p = paymentPlan(s, "2026-10", 500000);
    expect(p.blocked).toBe(true);
    expect(p.rows.find((r) => r.statement.id === st.id)?.minimum).toBeNull();
    expect(overview(s, "2026-10").obligationsIncomplete).toBe(true);
    expect(deadlines(s).find((d) => d.id === st.id)?.uncertain).toBe(true);
  });
  it("no recomienda adelantos si el banco no confirmó las condiciones", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    const p = paymentPlan(s, "2026-10", 1000000);
    expect(p.rows.find((r) => r.statement.id === st.id)?.suggested).toBe(50000);
    expect(p.unused).toBe(750000);
  });
  it("adelantos confirmados respetan el límite adicional y el costo informado", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    st.refinancingARS = {
      ...confirmedPlan(),
      rate: 10,
      prepaymentMode: "confirmed",
      prepaymentCap: 20000,
      prepaymentBenefitConfirmed: true,
    };
    const p = paymentPlan(s, "2026-10", 150000);
    expect(p.rows.find((r) => r.statement.id === st.id)?.suggested).toBe(70000);
    expect(p.allocated).toBe(150000);
  });
  it("los adelantos ya registrados consumen el cupo de adelanto", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    st.refinancingARS = {
      ...confirmedPlan(),
      rate: 10,
      prepaymentMode: "confirmed",
      prepaymentCap: 20000,
      prepaymentBenefitConfirmed: true,
    };
    s.payments.push({
      id: "p",
      statementId: st.id,
      date: "2026-10-21",
      amount: 60000,
      method: "",
    });
    const p = paymentPlan(s, "2026-10", 20000);
    expect(refinancingPosition(s, st).extraCap).toBe(10000);
    expect(p.rows.find((r) => r.statement.id === st.id)?.suggested).toBe(0); // budget is entirely needed for the other card minimum
  });
  it("no hereda la tasa anterior para un plan sin TEM informada", () => {
    const s = stateWithPlan();
    s.statements[0].refinancingARS!.rate = null;
    expect(effectiveRate(s, s.statements[0])).toBeNull();
    expect(paymentPlan(s, "2026-10", 100000).costComparisonIncomplete).toBe(
      true,
    );
  });
  it("distingue las monedas y permite pagos contra el saldo refinanciado real", () => {
    const s = stateWithPlan(),
      st = s.statements[0];
    st.totalUSD = 5000;
    st.usdPaymentMode = "refinanced";
    st.refinancingUSD = {
      ...confirmedPlan(),
      balance: 10000,
      monthlyDue: 2000,
      installmentAmount: 2000,
    };
    s.payments.push({
      id: "u",
      statementId: st.id,
      date: "2026-10-21",
      amount: 7000,
      currency: "USD",
      method: "",
    });
    expect(() => validateState(s)).not.toThrow();
    expect(balance(s, st, "USD")).toBe(3000);
    expect(balance(s, st)).toBe(500000);
  });
  it("no confirma planes incompletos ni supera el saldo refinanciado con pagos", () => {
    expect(() =>
      refinancingSchema.parse({ ...confirmedPlan(), monthlyDue: null }),
    ).toThrow();
    const s = stateWithPlan(),
      st = s.statements[0];
    s.payments.push({
      id: "p",
      statementId: st.id,
      date: "2026-10-21",
      amount: 500001,
      method: "",
    });
    expect(() => validateState(s)).toThrow("refinanciado");
  });
});
describe("dinero disponible para cuentas", () => {
  function funds() {
    const s = stateWithPlan();
    s.budgets = [
      {
        id: "b",
        month: "2026-10",
        income: 0,
        other: 0,
        cardBudget: 999,
        allocationMode: "all",
        availableForBills: 200000,
        reserveOther: 30000,
        cardBudgetUSD: 5000,
      },
    ];
    const base = demoState("2026-10");
    s.services = base.services;
    s.invoices = [
      {
        ...base.invoices[0],
        id: "unpaid",
        month: "2026-10",
        serviceId: s.services[0].id,
        amount: 50000,
        paid: false,
        paidDate: "",
      },
      {
        ...base.invoices[0],
        id: "paid",
        month: "2026-10",
        serviceId: s.services[1].id,
        amount: 40000,
        paid: true,
        paidDate: "2026-10-20",
      },
    ];
    return s;
  }
  it("separa reserva y servicios no pagados antes de tarjetas", () => {
    const s = funds(),
      a = allocateBudget(s, "2026-10");
    expect(a.otherReserved).toBe(30000);
    expect(a.servicesReserved).toBe(50000);
    expect(a.cardsAvailable).toBe(120000);
    expect(a.services).toHaveLength(1);
    const p = paymentPlan(s, "2026-10", a.cardsAvailable);
    expect(a.otherReserved + a.servicesReserved + p.allocated + p.unused).toBe(
      a.total,
    );
  });
  it("si no alcanza para servicios no inventa fondos para tarjetas", () => {
    const s = funds();
    s.budgets[0].availableForBills = 60000;
    const a = allocateBudget(s, "2026-10");
    expect(a.cardsAvailable).toBe(0);
    expect(a.servicesShortfall).toBe(20000);
  });
  it("respeta el modo anterior y nunca resta servicios ARS a un presupuesto USD", () => {
    const s = funds();
    s.budgets[0].allocationMode = "cards";
    expect(allocateBudget(s, "2026-10").cardsAvailable).toBe(999);
    expect(allocateBudget(s, "2026-10", "USD").cardsAvailable).toBe(5000);
    expect(allocateBudget(s, "2026-10", "USD").servicesPending).toBe(0);
  });
});
