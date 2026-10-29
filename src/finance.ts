import {
  refinancingMode,
  refinancingPosition,
  effectiveDueDate,
} from "./refinancing";
import type { State, Statement, Currency } from "./model";
import { today } from "./model";
export const currency = (cents: number, unit: Currency = "ARS") =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: unit,
    minimumFractionDigits: 2,
  }).format(cents / 100);
export const monthLabel = (m: string) =>
  new Date(`${m}-15T12:00:00`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
export const dateLabel = (d: string) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("es-AR") : "—";
export const addMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1 + n, 15)).toISOString().slice(0, 7);
};
export const daysUntil = (d: string, now = today()) =>
  Math.round((Date.parse(d) - Date.parse(now)) / 86400000);
export const status = (due: string, pending: number) =>
  pending <= 0
    ? "Pagado"
    : daysUntil(due) < 0
      ? "Vencido"
      : daysUntil(due) <= 7
        ? "Próximo a vencer"
        : "Pendiente";
export type StatementAmount =
  | "total"
  | "previous"
  | "consumption"
  | "interest"
  | "taxes"
  | "other"
  | "previousPayments";
export const statementValue = (
  st: Statement,
  key: StatementAmount,
  unit: Currency = "ARS",
): number =>
  unit === "ARS"
    ? st[key]
    : ((st[`${key}USD` as keyof Statement] as number | undefined) ?? 0);
export const paid = (s: State, id: string, unit: Currency = "ARS") =>
  s.payments
    .filter((p) => p.statementId === id && (p.currency ?? "ARS") === unit)
    .reduce((a, p) => a + p.amount, 0);
export const balance = (s: State, st: Statement, unit: Currency = "ARS") =>
  refinancingPosition(s, st, unit).debt ??
  Math.max(0, statementValue(st, "total", unit) - paid(s, st.id, unit));
export const amountDue = (s: State, st: Statement, unit: Currency = "ARS") =>
  refinancingMode(st, unit)
    ? (refinancingPosition(s, st, unit).due ?? 0)
    : balance(s, st, unit);
export function monthlyTotal(s: State, st: Statement, unit: Currency = "ARS") {
  const pos = refinancingPosition(s, st, unit);
  return pos.valid
    ? pos.r!.monthlyDue! + pos.beforePaid
    : refinancingMode(st, unit)
      ? 0
      : statementValue(st, "total", unit);
}

export const effectiveRate = (
  s: State,
  st: Statement,
  unit: Currency = "ARS",
) =>
  refinancingMode(st, unit)
    ? refinancingPosition(s, st, unit).valid
      ? refinancingPosition(s, st, unit).r!.rate
      : null
    : unit === "ARS"
      ? (st.rate ??
        s.cards.find((c) => c.id === st.cardId)?.financingRate ??
        null)
      : (st.rateUSD ??
        s.cards.find((c) => c.id === st.cardId)?.financingRateUSD ??
        null);
export function requiredPayment(
  s: State,
  st: Statement,
  unit: Currency = "ARS",
): number | null {
  if (refinancingMode(st, unit)) return refinancingPosition(s, st, unit).due;
  const remaining = balance(s, st, unit);
  if (!remaining) return 0;
  const mode =
    unit === "ARS"
      ? (st.paymentMode ?? (st.minimum === null ? "unknown" : "minimum"))
      : (st.usdPaymentMode ?? "unknown");
  if (mode === "full") return remaining;
  const minimum = unit === "ARS" ? st.minimum : st.minimumUSD;
  if (mode === "unknown" || minimum == null) return null;
  return Math.min(remaining, Math.max(0, minimum - paid(s, st.id, unit)));
}
export function overview(s: State, month: string, unit: Currency = "ARS") {
  const statements = s.statements.filter((x) => x.month === month),
    invoices = s.invoices.filter((x) => x.month === month && unit === "ARS");
  const total = statements.reduce(
      (a, x) => a + statementValue(x, "total", unit),
      0,
    ),
    minimum = statements.reduce(
      (a, x) => a + (requiredPayment(s, x, unit) ?? 0),
      0,
    );
  const services = invoices.reduce((a, x) => a + x.amount, 0),
    payment =
      statements.reduce((a, x) => a + paid(s, x.id, unit), 0) +
      invoices.filter((x) => x.paid).reduce((a, x) => a + x.amount, 0);
  return {
    statements,
    obligationsIncomplete: statements.some(
      (st) =>
        refinancingMode(st, unit) && !refinancingPosition(s, st, unit).valid,
    ),
    minimumIncomplete: statements.some(
      (st) => requiredPayment(s, st, unit) === null,
    ),
    unconfirmedPayments: statements.filter(
      (st) => balance(s, st, unit) > 0 && st.paymentsConfirmed === false,
    ).length,
    invoices,
    total,
    minimum,
    services,
    payment,
    obligations:
      statements.reduce((a, st) => a + monthlyTotal(s, st, unit), 0) + services,
    pending:
      statements.reduce((a, st) => a + amountDue(s, st, unit), 0) +
      invoices.filter((i) => !i.paid).reduce((a, i) => a + i.amount, 0),
    debt: statements.reduce((a, x) => a + balance(s, x, unit), 0),
  };
}
export type Strategy = "recommended" | "interest" | "snowball";
export function paymentPlan(
  s: State,
  month: string,
  budget: number,
  strategy: Strategy = "recommended",
  unit: Currency = "ARS",
) {
  const rows = s.statements
    .filter(
      (x) =>
        x.month === month &&
        (balance(s, x, unit) > 0 || requiredPayment(s, x, unit) === null),
    )
    .map((st) => ({
      statement: st,
      remaining: balance(s, st, unit),
      dueDate: effectiveDueDate(st, unit),
      refinanced: refinancingMode(st, unit),
      extraLimit: refinancingMode(st, unit)
        ? refinancingPosition(s, st, unit).extraCap
        : Number.MAX_SAFE_INTEGER,
      minimum: requiredPayment(s, st, unit),
      rate: effectiveRate(s, st, unit),
      suggested: 0,
      reason: "",
    }));
  const sumMinimum = rows.reduce((a, r) => a + (r.minimum ?? 0), 0);
  let available = Math.max(0, Math.round(budget));
  const blocked = rows.some(
    (r) => r.minimum === null || r.statement.paymentsConfirmed === false,
  );
  if (blocked)
    return {
      rows: rows.map((r) => ({
        ...r,
        reason:
          r.statement.paymentsConfirmed === false
            ? "Confirmar los pagos posteriores al cierre."
            : r.minimum === null
              ? r.refinanced
                ? refinancingPosition(s, r.statement, unit).reason
                : "Confirmar el mínimo o la modalidad de pago total; no se supone mínimo cero."
              : "La distribución espera la revisión de las otras cuentas.",
      })),
      blocked: true,
      costComparisonIncomplete: true,
      shortfall: Math.max(0, sumMinimum - budget),
      unused: available,
      allocated: 0,
      minimum: sumMinimum,
    };
  // Minimums always first, earliest due date first, including overdue bills.
  rows.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) || (b.rate ?? -1) - (a.rate ?? -1),
  );
  for (const row of rows) {
    const n = Math.min(available, row.minimum ?? 0);
    row.suggested += n;
    available -= n;
    row.reason = row.refinanced
      ? "Se cubre solo la obligación mensual confirmada del plan, no el saldo completo refinanciado."
      : (unit === "ARS"
            ? row.statement.paymentMode
            : row.statement.usdPaymentMode) === "full"
        ? "Se cubre el total según la modalidad confirmada, por vencimiento."
        : "Primero se cubre el mínimo, en orden de vencimiento.";
  }
  const extra = [...rows].sort((a, b) =>
    strategy === "snowball"
      ? a.remaining - b.remaining
      : (b.rate ?? -1) - (a.rate ?? -1) ||
        a.dueDate.localeCompare(b.dueDate) ||
        a.remaining - b.remaining,
  );
  for (const row of extra) {
    const n = Math.max(
      0,
      Math.min(available, row.remaining - row.suggested, row.extraLimit),
    );
    if (n > 0) {
      row.suggested += n;
      available -= n;
      row.reason +=
        strategy === "snowball"
          ? " El excedente reduce primero los saldos más pequeños."
          : strategy === "interest"
            ? " El excedente prioriza la tasa mensual informada más alta."
            : " El excedente prioriza la tasa mensual conocida más alta, con las obligaciones ya cubiertas.";
    }
    if (row.refinanced && row.extraLimit === 0)
      row.reason +=
        " No se proponen adelantos sin límite, beneficio y costo confirmados por el banco.";
    if (row.rate === null)
      row.reason += " Falta tasa: no es posible comparar su costo financiero.";
  }
  return {
    rows,
    blocked: false,
    shortfall: Math.max(0, sumMinimum - budget),
    unused: available,
    allocated: rows.reduce((a, r) => a + r.suggested, 0),
    minimum: sumMinimum,
    costComparisonIncomplete: rows.some(
      (r) =>
        r.remaining > r.suggested &&
        (r.rate === null || (r.refinanced && r.extraLimit === 0)),
    ),
  };
}
export function projection(
  s: State,
  base: string,
  count = 12,
  unit: Currency = "ARS",
) {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonth(base, i + 1);
    const total = s.purchases
      .filter((p) => (p.currency ?? "ARS") === unit)
      .reduce((a, p) => {
        const delta =
          (Number(month.slice(0, 4)) - Number(p.month.slice(0, 4))) * 12 +
          Number(month.slice(5)) -
          Number(p.month.slice(5));
        return a + (delta > 0 && p.current + delta <= p.total ? p.amount : 0);
      }, 0);
    return { month, total };
  });
}
export const estimate = (
  remaining: number,
  payment: number,
  monthlyRate: number | null,
) => ({
  remaining: Math.max(0, remaining - payment),
  interest:
    monthlyRate === null
      ? null
      : Math.round((Math.max(0, remaining - payment) * monthlyRate) / 100),
});
export function deadlines(s: State, unit: Currency = "ARS") {
  return [
    ...s.statements.map((st) => ({
      id: st.id,
      month: st.month,
      name: s.cards.find((c) => c.id === st.cardId)?.name ?? "Tarjeta",
      kind: "Tarjeta",
      dueDate: effectiveDueDate(st, unit),
      amount: amountDue(s, st, unit),
      minimum: requiredPayment(s, st, unit),
      uncertain:
        refinancingMode(st, unit) && !refinancingPosition(s, st, unit).valid,
    })),
    ...s.invoices
      .filter(() => unit === "ARS")
      .map((i) => ({
        id: i.id,
        month: i.month,
        name:
          s.services.find((x) => x.id === i.serviceId)?.company ?? "Servicio",
        kind: "Servicio",
        dueDate: i.dueDate,
        amount: i.paid ? 0 : i.amount,
        minimum: 0,
        uncertain: false,
      })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
