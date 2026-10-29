import type { Currency, State, Statement } from "./model";
export function refinancingMode(st: Statement, unit: Currency = "ARS") {
  return (unit === "ARS" ? st.paymentMode : st.usdPaymentMode) === "refinanced";
}
export function activeRefinancing(st: Statement, unit: Currency = "ARS") {
  return refinancingMode(st, unit)
    ? unit === "ARS"
      ? st.refinancingARS
      : st.refinancingUSD
    : undefined;
}
/** A confirmed bank balance already includes these recorded payments. Never subtract twice. */
export function refinancingPosition(
  s: State,
  st: Statement,
  unit: Currency = "ARS",
) {
  const r = activeRefinancing(st, unit);
  const payments = s.payments.filter(
    (p) => p.statementId === st.id && (p.currency ?? "ARS") === unit,
  );
  const included = r?.includedPayments ?? [];
  const changed = included.some(
    (before) =>
      !payments.some(
        (p) =>
          p.id === before.id &&
          p.amount === before.amount &&
          p.date === before.date,
      ),
  );
  const later = payments.filter((p) => !included.some((x) => x.id === p.id));
  const backdated = !!r?.asOfDate && later.some((p) => p.date < r.asOfDate);
  const valid = !!r && r.status === "confirmed" && !changed && !backdated;
  const paidAfter = later.reduce((a, p) => a + p.amount, 0);
  const beforePaid = included.reduce((a, p) => a + p.amount, 0);
  const debt =
    valid && r.balance !== null ? Math.max(0, r.balance - paidAfter) : null;
  const due =
    valid && r.monthlyDue !== null
      ? Math.max(0, r.monthlyDue - paidAfter)
      : null;
  const extraAllowed =
    valid &&
    r.prepaymentMode === "confirmed" &&
    r.prepaymentBenefitConfirmed &&
    r.rate !== null &&
    r.prepaymentCap !== null;
  const extraUsed =
    valid && r.monthlyDue !== null ? Math.max(0, paidAfter - r.monthlyDue) : 0;
  const extraCap = extraAllowed ? Math.max(0, r.prepaymentCap! - extraUsed) : 0;
  return {
    r,
    valid,
    changed,
    backdated,
    paidAfter,
    beforePaid,
    debt,
    due,
    extraCap,
    extraAllowed,
    reason:
      changed || backdated
        ? "Los pagos cambiaron respecto del saldo confirmado. Revisa la refinanciación."
        : !valid
          ? "Falta confirmar saldo, cuota y vencimiento de la refinanciación."
          : "",
  };
}
export function effectiveDueDate(st: Statement, unit: Currency = "ARS") {
  const r = activeRefinancing(st, unit);
  return r?.status === "confirmed" && r.dueDate ? r.dueDate : st.dueDate;
}
