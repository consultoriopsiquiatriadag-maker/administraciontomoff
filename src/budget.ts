import type { Currency, State } from "./model";
/** Cash available now, not income already spent. Reserve only unpaid services. */
export function allocateBudget(
  s: State,
  month: string,
  unit: Currency = "ARS",
) {
  const b = s.budgets.find((b) => b.month === month);
  const combined = unit === "ARS" && b?.allocationMode === "all";
  const total =
    unit === "USD"
      ? (b?.cardBudgetUSD ?? 0)
      : combined
        ? (b?.availableForBills ?? 0)
        : (b?.cardBudget ?? 0);
  const otherRequested = combined ? (b?.reserveOther ?? 0) : 0,
    otherReserved = Math.min(total, otherRequested);
  let left = total - otherReserved;
  const services = s.invoices
    .filter((i) => i.month === month && !i.paid && unit === "ARS")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((i) => {
      const suggested = combined ? Math.min(left, i.amount) : 0;
      if (combined) left -= suggested;
      return {
        invoice: i,
        name:
          s.services.find((x) => x.id === i.serviceId)?.company ?? "Servicio",
        suggested,
      };
    });
  const servicesPending = services.reduce((a, r) => a + r.invoice.amount, 0),
    servicesReserved = services.reduce((a, r) => a + r.suggested, 0);
  return {
    combined,
    total,
    otherRequested,
    otherReserved,
    otherShortfall: otherRequested - otherReserved,
    services,
    servicesPending,
    servicesReserved,
    servicesShortfall: combined ? servicesPending - servicesReserved : 0,
    cardsAvailable: left,
  };
}
