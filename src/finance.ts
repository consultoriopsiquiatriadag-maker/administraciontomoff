import type { State, Statement } from "./model";
import { today } from "./model";
export const currency = (cents: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
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
export const paid = (s: State, id: string) =>
  s.payments
    .filter((p) => p.statementId === id)
    .reduce((a, p) => a + p.amount, 0);
export const balance = (s: State, st: Statement) =>
  Math.max(0, st.total - paid(s, st.id));
export const effectiveRate = (s: State, st: Statement) =>
  st.rate ?? s.cards.find((c) => c.id === st.cardId)?.financingRate ?? null;
export function overview(s: State, month: string) {
  const statements = s.statements.filter((x) => x.month === month),
    invoices = s.invoices.filter((x) => x.month === month);
  const total = statements.reduce((a, x) => a + x.total, 0),
    minimum = statements.reduce(
      (a, x) => a + Math.max(0, x.minimum - paid(s, x.id)),
      0,
    );
  const services = invoices.reduce((a, x) => a + x.amount, 0),
    payment =
      statements.reduce((a, x) => a + paid(s, x.id), 0) +
      invoices.filter((x) => x.paid).reduce((a, x) => a + x.amount, 0);
  return {
    statements,
    invoices,
    total,
    minimum,
    services,
    payment,
    obligations: total + services,
    pending: total + services - payment,
    debt: statements.reduce((a, x) => a + balance(s, x), 0),
  };
}
export type Strategy = "recommended" | "interest" | "snowball";
export function paymentPlan(
  s: State,
  month: string,
  budget: number,
  strategy: Strategy = "recommended",
) {
  const rows = s.statements
    .filter((x) => x.month === month && balance(s, x) > 0)
    .map((st) => ({
      statement: st,
      remaining: balance(s, st),
      minimum: Math.min(
        balance(s, st),
        Math.max(0, st.minimum - paid(s, st.id)),
      ),
      rate: effectiveRate(s, st),
      suggested: 0,
      reason: "",
    }));
  const sumMinimum = rows.reduce((a, r) => a + r.minimum, 0);
  let available = Math.max(0, Math.round(budget));
  // Minimums always first, earliest due date first, including overdue bills.
  rows.sort(
    (a, b) =>
      a.statement.dueDate.localeCompare(b.statement.dueDate) ||
      (b.rate ?? -1) - (a.rate ?? -1),
  );
  for (const row of rows) {
    const n = Math.min(available, row.minimum);
    row.suggested += n;
    available -= n;
    row.reason = "Primero se cubre el mínimo, en orden de vencimiento.";
  }
  const extra = [...rows].sort((a, b) =>
    strategy === "snowball"
      ? a.remaining - b.remaining
      : strategy === "interest"
        ? (b.rate ?? -1) - (a.rate ?? -1) ||
          a.statement.dueDate.localeCompare(b.statement.dueDate)
        : (daysUntil(a.statement.dueDate) <= 3 ? 0 : 1) -
            (daysUntil(b.statement.dueDate) <= 3 ? 0 : 1) ||
          (b.rate ?? -1) - (a.rate ?? -1) ||
          a.remaining - b.remaining,
  );
  for (const row of extra) {
    const n = Math.min(available, row.remaining - row.suggested);
    if (n > 0) {
      row.suggested += n;
      available -= n;
      row.reason +=
        strategy === "snowball"
          ? " El excedente reduce primero los saldos más pequeños."
          : strategy === "interest"
            ? " El excedente prioriza la tasa mensual informada más alta."
            : " El excedente prioriza vencimientos inmediatos y luego la tasa mensual más alta.";
    }
    if (row.rate === null)
      row.reason += " Falta tasa: no es posible comparar su costo financiero.";
  }
  return {
    rows,
    shortfall: Math.max(0, sumMinimum - budget),
    unused: available,
    allocated: rows.reduce((a, r) => a + r.suggested, 0),
    minimum: sumMinimum,
  };
}
export function projection(s: State, base: string, count = 12) {
  return Array.from({ length: count }, (_, i) => {
    const month = addMonth(base, i + 1);
    const total = s.purchases.reduce((a, p) => {
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
export function deadlines(s: State) {
  return [
    ...s.statements.map((st) => ({
      id: st.id,
      month: st.month,
      name: s.cards.find((c) => c.id === st.cardId)?.name ?? "Tarjeta",
      kind: "Tarjeta",
      dueDate: st.dueDate,
      amount: balance(s, st),
      minimum: Math.max(0, st.minimum - paid(s, st.id)),
    })),
    ...s.invoices.map((i) => ({
      id: i.id,
      month: i.month,
      name: s.services.find((x) => x.id === i.serviceId)?.company ?? "Servicio",
      kind: "Servicio",
      dueDate: i.dueDate,
      amount: i.paid ? 0 : i.amount,
      minimum: 0,
    })),
  ].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
