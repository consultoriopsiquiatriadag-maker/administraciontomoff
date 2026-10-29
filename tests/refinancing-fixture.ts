import { demoState } from "../src/demo";
import type { Refinancing } from "../src/model";
export function stateWithPlan() {
  const s = demoState("2026-10");
  s.demo = false;
  s.payments = [];
  s.expenses = [];
  s.purchases = [];
  s.invoices = [];
  s.budgets = [];
  s.statements = s.statements.filter((st) => st.month === "2026-10");
  s.statements[0].total = 1000000;
  s.statements[0].minimum = 100000;
  s.statements[1].total = 200000;
  s.statements[1].minimum = 20000;
  s.statements[1].rate = 8;
  s.statements[0].paymentMode = "refinanced";
  s.statements[0].refinancingARS = confirmedPlan();
  return s;
}
export function confirmedPlan(): Refinancing {
  return {
    status: "confirmed",
    startDate: "2026-10-10",
    asOfDate: "2026-10-20",
    dueDate: "2026-11-02",
    balance: 500000,
    monthlyDue: 50000,
    installmentAmount: 50000,
    current: 2,
    total: 12,
    rate: 3,
    prepaymentMode: "unknown",
    prepaymentCap: null,
    prepaymentBenefitConfirmed: false,
    includedPayments: [],
    notes: "Plan ficticio",
  };
}
