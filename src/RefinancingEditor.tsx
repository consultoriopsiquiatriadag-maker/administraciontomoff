import { useRef } from "react";
import { z } from "zod";
import { Editor, type Field } from "./ui";
import {
  refinancingSchema,
  today,
  type State,
  type Statement,
  type Currency,
  type Refinancing,
} from "./model";
import { refinancingPosition } from "./refinancing";
export function RefinancingEditor({
  state,
  statement,
  unit,
  onClose,
  onSave,
}: {
  state: State;
  statement: Statement;
  unit: Currency;
  onClose: () => void;
  onSave: (r: Refinancing) => Promise<void>;
}) {
  const pos = refinancingPosition(state, statement, unit),
    r = pos.r;
  const payments = useRef(
    state.payments
      .filter(
        (p) => p.statementId === statement.id && (p.currency ?? "ARS") === unit,
      )
      .map((p) => ({ id: p.id, amount: p.amount, date: p.date })),
  );
  const initial = {
    status: r?.status ?? "pending",
    startDate: r?.startDate ?? "",
    asOfDate: pos.valid ? today() : (r?.asOfDate ?? ""),
    dueDate: r?.dueDate ?? "",
    balance: pos.debt ?? r?.balance ?? null,
    monthlyDue: pos.due ?? r?.monthlyDue ?? null,
    installmentAmount: r?.installmentAmount ?? null,
    current: r?.current ?? null,
    total: r?.total ?? null,
    rate: r?.rate ?? null,
    prepaymentMode: r?.prepaymentMode ?? "unknown",
    prepaymentCap: pos.extraAllowed ? pos.extraCap : (r?.prepaymentCap ?? null),
    prepaymentBenefitConfirmed: r?.prepaymentBenefitConfirmed ?? false,
    notes: r?.notes ?? "",
    evidence: false,
  };
  const money = (name: string, label: string): Field => ({
    name,
    label: `${label} (${unit})`,
    type: "nullableMoney",
    required: false,
    help: "Importe informado por el banco. Vacío significa pendiente, no cero.",
  });
  const fields: Field[] = [
    {
      name: "status",
      label: "Estado de los datos del plan",
      options: [
        { value: "pending", label: "Pendiente: faltan datos del banco" },
        { value: "confirmed", label: "Confirmado: datos verificados" },
      ],
    },
    {
      name: "startDate",
      label: "Fecha de inicio del plan",
      type: "date",
      required: false,
    },
    {
      name: "asOfDate",
      label: "Fecha del saldo informado / confirmado",
      type: "date",
      required: false,
    },
    {
      name: "dueDate",
      label: "Vencimiento de la obligación de este período",
      type: "date",
      required: false,
    },
    money("balance", "Saldo total de deuda pendiente confirmado"),
    money(
      "monthlyDue",
      "Obligación pendiente de este período: cuota + otros cargos",
    ),
    money("installmentAmount", "Valor de la cuota del plan"),
    {
      name: "current",
      label: "Cuota de este período",
      type: "nullableNumber",
      required: false,
      min: 1,
      max: 600,
    },
    {
      name: "total",
      label: "Cantidad total de cuotas",
      type: "nullableNumber",
      required: false,
      min: 1,
      max: 600,
    },
    {
      name: "rate",
      label: "TEM del plan informada (%)",
      type: "rate",
      required: false,
      help: "No uses automáticamente la tasa anterior de la tarjeta. Sin dato no se compara el costo de adelantar.",
    },
    {
      name: "prepaymentMode",
      label: "Adelantar dinero al plan",
      options: [
        { value: "unknown", label: "Pendiente de consultar al banco" },
        { value: "not_allowed", label: "No proponer adelantos" },
        {
          value: "confirmed",
          label: "Adelantos y ahorro confirmados por el banco",
        },
      ],
    },
    money(
      "prepaymentCap",
      "Máximo adicional aceptado por el banco, sobre la obligación del período",
    ),
    {
      name: "prepaymentBenefitConfirmed",
      label: "El banco confirmó que el adelanto reduce el costo del plan",
      type: "checkbox",
      required: false,
    },
    {
      name: "evidence",
      label:
        "Para confirmar: estos saldos ya contemplan todos los pagos actualmente registrados en este resumen",
      type: "checkbox",
      required: false,
    },
    {
      name: "notes",
      label: "Condiciones, comisiones y observaciones del banco",
      type: "textarea",
      required: false,
      help: "Este registro no cambia los importes del PDF ni contrata una refinanciación. No ingreses una simple oferta de financiación.",
    },
  ];
  return (
    <Editor
      title={`Refinanciación · ${unit}`}
      fields={fields}
      initial={initial}
      onClose={onClose}
      onSave={async (v) => {
        if (v.status === "confirmed" && !v.evidence)
          throw Error(
            "Confirma que el saldo y la obligación pendiente ya incluyen los pagos registrados.",
          );
        try {
          const parsed = refinancingSchema.parse({
            ...v,
            includedPayments: payments.current,
          });
          await onSave(parsed);
        } catch (e) {
          if (e instanceof z.ZodError)
            throw Error(e.issues.map((i) => i.message).join(". "));
          throw e;
        }
      }}
    />
  );
}
