import { useState } from "react";
import { Upload } from "lucide-react";
import { currency, dateLabel } from "./finance";
import {
  parseExtracted,
  defaultChoices,
  type ExtractedBundle,
  type ImportChoice,
} from "./importAccounts";
import type { State } from "./model";
import { Table } from "./ui";
export function ImportAccounts({
  state,
  onImport,
}: {
  state: State;
  onImport: (bundle: ExtractedBundle, choices: ImportChoice[]) => Promise<void>;
}) {
  const [bundle, setBundle] = useState<ExtractedBundle | null>(null),
    [choices, setChoices] = useState<ImportChoice[]>([]),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const update = (key: string, patch: Partial<ImportChoice>) =>
    setChoices((xs) => xs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  return (
    <section className="panel import-accounts">
      <h2>Importar cuentas extraídas</h2>
      <p>
        Selecciona el paquete de importación preparado a partir de tus
        resúmenes. Primero podrás revisar cada cuenta, sus monedas y la tarjeta
        de destino. Los datos permanecen en este navegador.
      </p>
      <p className="muted">
        Esta carga agrega cuentas y resúmenes. Los registros existentes del
        mismo período, sus pagos y documentos se conservan sin reemplazarlos. El
        paquete es distinto de una copia de seguridad.
      </p>
      {state.demo && (
        <p className="alert warning">
          Estás usando datos de demostración. Exporta o elimina la demostración
          antes de importar tus cuentas reales.
        </p>
      )}
      <label className="button secondary">
        <Upload size={18} />
        Seleccionar paquete de cuentas
        <input
          className="file-input"
          type="file"
          accept="application/json,.json"
          disabled={saving || state.demo}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError("");
            setBundle(null);
            try {
              if (file.size > 10 * 1024 * 1024)
                throw Error("El paquete supera 10 MB");
              const next = parseExtracted(await file.text());
              setBundle(next);
              setChoices(defaultChoices(state, next));
            } catch {
              setError(
                "No se pudo leer el paquete. Usa el archivo «mis-cuentas-importacion.json»; el JSON de extracción anterior y las copias de seguridad tienen otro formato. Los datos actuales se conservaron.",
              );
            }
          }}
        />
      </label>
      {error && (
        <p className="alert danger" role="alert">
          {error}
        </p>
      )}
      {bundle && (
        <>
          <h3 className="import-review-title">Revisar antes de importar</h3>
          <Table
            headers={[
              "Incluir",
              "Cuenta / destino",
              "Cierre y vencimiento",
              "Saldo en pesos",
              "Saldo en dólares",
              "Mínimo ARS",
              "Revisión pendiente",
            ]}
            rows={bundle.accounts.map((a) => {
              const c = choices.find((c) => c.key === a.key)!;
              return [
                <input
                  type="checkbox"
                  aria-label={"Incluir " + a.card.name}
                  checked={c.selected}
                  disabled={saving}
                  onChange={(e) =>
                    update(a.key, { selected: e.target.checked })
                  }
                />,
                <>
                  <strong>{a.card.name}</strong>
                  <small>{a.card.bank}</small>
                  <label>
                    Tarjeta de destino
                    <select
                      aria-label={"Destino de " + a.card.name}
                      value={c.targetCardId}
                      disabled={saving}
                      onChange={(e) =>
                        update(a.key, { targetCardId: e.target.value })
                      }
                    >
                      <option value="new">
                        Crear / reconocer por identificador de importación
                      </option>
                      {state.cards.map((card) => (
                        <option key={card.id} value={card.id}>
                          {card.name} ·{" "}
                          {card.last4 ||
                            card.referenceLast4 ||
                            "sin terminación"}
                        </option>
                      ))}
                    </select>
                  </label>
                </>,
                <>
                  {dateLabel(a.statement.closingDate)}
                  <small>Vence {dateLabel(a.statement.dueDate)}</small>
                </>,
                currency(a.statement.total),
                currency(a.statement.totalUSD ?? 0, "USD"),
                a.statement.minimum === null
                  ? "No informado (no es cero)"
                  : currency(a.statement.minimum),
                <ul className="import-warnings">
                  {[
                    ...a.warnings,
                    "Confirmar pagos posteriores al cierre.",
                  ].map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>,
              ];
            })}
          />
          <p className="alert warning">
            Los pagos ya descontados por el banco no se crearán como pagos
            nuevos. Después de importar, registra los pagos posteriores al
            cierre o confirma que no hubo otros. El plan esperará esa revisión y
            la definición de los mínimos desconocidos.
          </p>
          <button
            className="button"
            disabled={saving || !choices.some((c) => c.selected) || state.demo}
            onClick={async () => {
              setSaving(true);
              setError("");
              try {
                await onImport(bundle, choices);
                setBundle(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving
              ? "Importando…"
              : `Importar ${choices.filter((c) => c.selected).length} cuentas seleccionadas`}
          </button>
        </>
      )}
    </section>
  );
}
