import { useState } from "react";
import type { Budget, Currency } from "./model";
export function BudgetAllocation({
  budget,
  unit,
  onSave,
}: {
  budget: Budget | undefined;
  unit: Currency;
  onSave: (patch: Partial<Budget>) => Promise<void>;
}) {
  const [mode, setMode] = useState(budget?.allocationMode ?? "all"),
    [amount, setAmount] = useState(
      ((unit === "USD"
        ? budget?.cardBudgetUSD
        : mode === "all"
          ? budget?.availableForBills
          : budget?.cardBudget) ?? 0) /
        100 +
        "",
    ),
    [reserve, setReserve] = useState((budget?.reserveOther ?? 0) / 100 + ""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const cents = (v: string) => {
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(v))
      throw Error(
        "Usa importes sin separador de miles, con hasta dos decimales.",
      );
    return Math.round(Number(v.replace(",", ".")) * 100);
  };
  return (
    <section className="panel budget-allocation">
      <h2>¿Cuánto dinero tienes disponible ahora?</h2>
      <p className="muted">
        Ingresa el dinero que todavía puedes repartir. Los cálculos se
        actualizan al guardar; no se realizan pagos automáticamente.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          setError("");
          try {
            const amountCents = cents(amount);
            await onSave(
              unit === "USD"
                ? { cardBudgetUSD: amountCents }
                : mode === "all"
                  ? {
                      allocationMode: "all",
                      availableForBills: amountCents,
                      reserveOther: cents(reserve),
                    }
                  : { allocationMode: "cards", cardBudget: amountCents },
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="inline-form">
          {unit === "ARS" && (
            <label>
              Este dinero es para
              <select
                aria-label="Destino del dinero disponible"
                value={mode}
                disabled={saving}
                onChange={(e) => {
                  const next = e.target.value as "all" | "cards";
                  setMode(next);
                  setAmount(
                    ((next === "all"
                      ? budget?.availableForBills
                      : budget?.cardBudget) ?? 0) /
                      100 +
                      "",
                  );
                }}
              >
                <option value="all">Servicios y tarjetas</option>
                <option value="cards">
                  Solo tarjetas (servicios ya separados)
                </option>
              </select>
            </label>
          )}
          <label>
            Dinero disponible ({unit})
            <input
              aria-label={`Dinero disponible ahora ${unit}`}
              inputMode="decimal"
              value={amount}
              disabled={saving}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          {unit === "ARS" && mode === "all" && (
            <label>
              Reservar para otros pagos pendientes (ARS)
              <input
                inputMode="decimal"
                value={reserve}
                disabled={saving}
                onChange={(e) => setReserve(e.target.value)}
              />
            </label>
          )}
        </div>
        {error && (
          <p className="alert danger" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={saving}>
          {saving ? "Calculando…" : "Guardar y calcular estrategia"}
        </button>
      </form>
    </section>
  );
}
