import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Inbox, Pencil, Trash2 } from "lucide-react";
import type { Currency } from "./model";
import { currency } from "./finance";
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  max?: number;
  min?: number;
};
export function Editor({
  title,
  fields,
  initial,
  onClose,
  onSave,
}: {
  title: string;
  fields: Field[];
  initial: Record<string, any>;
  onClose: () => void;
  onSave: (values: Record<string, any>) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setSaving(true);
          try {
            const f = new FormData(e.currentTarget),
              values = { ...initial };
            for (const field of fields) {
              const v = String(f.get(field.name) ?? "");
              if (field.type === "money" || field.type === "nullableMoney") {
                if (field.type === "nullableMoney" && v === "") {
                  values[field.name] = null;
                  continue;
                }
                if (!/^\d+(?:[.,]\d{1,2})?$/.test(v))
                  throw Error(
                    `${field.label}: usa un importe positivo con hasta dos decimales, sin separador de miles.`,
                  );
                values[field.name] = Math.round(
                  Number(v.replace(",", ".")) * 100,
                );
              } else if (field.type === "number")
                values[field.name] = Number(v);
              else if (field.type === "rate")
                values[field.name] =
                  v === "" ? null : Number(v.replace(",", "."));
              else if (field.type === "checkbox")
                values[field.name] = f.get(field.name) === "on";
              else values[field.name] = v;
            }
            await onSave(values);
            onClose();
          } catch (err) {
            setError(err instanceof Error ? err.message : "No se pudo guardar");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar"
            disabled={saving}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="form-grid">
          {fields.map((f) => (
            <label
              className={f.type === "textarea" ? "span-2" : ""}
              key={f.name}
            >
              {f.label}
              {f.required !== false && f.type !== "checkbox" && (
                <span className="required"> *</span>
              )}
              {f.options ? (
                <select
                  name={f.name}
                  defaultValue={initial[f.name] ?? ""}
                  required={f.required !== false}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.name}
                  defaultValue={initial[f.name] ?? ""}
                  maxLength={2000}
                />
              ) : f.type === "checkbox" ? (
                <input
                  type="checkbox"
                  name={f.name}
                  defaultChecked={initial[f.name]}
                />
              ) : (
                <input
                  name={f.name}
                  type={
                    f.type === "money" ||
                    f.type === "nullableMoney" ||
                    f.type === "rate"
                      ? "text"
                      : (f.type ?? "text")
                  }
                  inputMode={
                    f.type === "money" ||
                    f.type === "nullableMoney" ||
                    f.type === "rate"
                      ? "decimal"
                      : undefined
                  }
                  required={f.required !== false}
                  defaultValue={
                    f.type === "nullableMoney"
                      ? initial[f.name] == null
                        ? ""
                        : (initial[f.name] / 100).toFixed(2)
                      : f.type === "money"
                        ? ((initial[f.name] ?? 0) / 100).toFixed(2)
                        : (initial[f.name] ?? "")
                  }
                  min={f.min ?? (f.type === "number" ? 0 : undefined)}
                  max={f.max}
                  maxLength={f.name === "last4" ? 4 : 2000}
                  pattern={f.name === "last4" ? "[0-9]{4}" : undefined}
                />
              )}{" "}
              {f.help && <small>{f.help}</small>}
            </label>
          ))}
        </div>
        {error && (
          <p className="alert danger" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <span>* Campos obligatorios</span>
          <button
            type="button"
            className="button secondary"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className="button" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
export function Empty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={36} />
      <h3>Todavía no hay registros</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status ${value === "Pagado" ? "green" : value === "Vencido" ? "red" : value === "Próximo a vencer" ? "yellow" : "blue"}`}
    >
      <i />
      {value}
    </span>
  );
}
export function Actions({
  edit,
  remove,
}: {
  edit: () => void;
  remove: () => void;
}) {
  return (
    <div className="actions">
      <button className="icon-button" aria-label="Editar" onClick={edit}>
        <Pencil size={17} />
      </button>
      <button
        className="icon-button danger-text"
        aria-label="Eliminar"
        onClick={remove}
      >
        <Trash2 size={17} />
      </button>
    </div>
  );
}
export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="no-rows">Sin registros para este período.</p>
      )}
    </div>
  );
}
export function Chart({
  points,
  label,
  unit = "ARS",
}: {
  points: { label: string; value: number }[];
  label: string;
  unit?: Currency;
}) {
  const max = Math.max(...points.map((x) => x.value), 1),
    w = 680,
    h = 180;
  return (
    <div className="chart">
      <svg viewBox="0 0 720 230" role="img" aria-label={label}>
        <title>{label}</title>
        {[0, 1, 2, 3].map((n) => (
          <g key={n}>
            <line
              x1="20"
              x2="700"
              y1={20 + n * 60}
              y2={20 + n * 60}
              stroke="#e5ebef"
              strokeDasharray="4 4"
            />
          </g>
        ))}
        <polyline
          fill="none"
          stroke="#207b71"
          strokeWidth="3"
          points={points
            .map(
              (p, i) =>
                `${20 + (i * w) / Math.max(1, points.length - 1)},${200 - (p.value / max) * h}`,
            )
            .join(" ")}
        />
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={20 + (i * w) / Math.max(1, points.length - 1)}
              cy={200 - (p.value / max) * h}
              r="5"
              fill="#207b71"
            >
              <title>
                {p.label}: {currency(p.value, unit)}
              </title>
            </circle>
            <text
              x={20 + (i * w) / Math.max(1, points.length - 1)}
              y="226"
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              fill="#66788a"
              fontSize="12"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <details>
        <summary>Ver valores del gráfico</summary>
        <Table
          headers={["Período", "Importe"]}
          rows={points.map((p) => [p.label, currency(p.value, unit)])}
        />
      </details>
    </div>
  );
}
