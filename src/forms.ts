import type { State, Table as TableName } from "./model";
import type { Field } from "./ui";
const categories = [
  "Supermercado",
  "Farmacia",
  "Salud",
  "Combustible",
  "Servicios",
  "Hogar",
  "Indumentaria",
  "Comida",
  "Transporte",
  "Suscripciones",
  "Impuestos",
  "Otros",
];
const serviceTypes = [
  "Electricidad",
  "Gas",
  "Agua",
  "Internet",
  "Cable / TV",
  "Telefonía",
  "Expensas",
  "Otros",
];
const opts = (xs: string[]) => xs.map((value) => ({ value, label: value }));
const money = (name: string, label: string): Field => ({
  name,
  label,
  type: "money",
  help: "Importe en la moneda indicada, sin separador de miles. Ej.: 125000,50",
});
const notes: Field = {
  name: "notes",
  label: "Observaciones",
  type: "textarea",
  required: false,
};
export function fieldsFor(
  table: TableName,
  s: State,
  editing: { row: Record<string, any> } | null,
): Field[] {
  const selectCards = s.cards.map((c) => ({
    value: c.id,
    label: c.name + " · " + c.last4,
  }));

  switch (table) {
    case "cards":
      return [
        { name: "bank", label: "Banco / emisor" },
        { name: "name", label: "Nombre de la tarjeta" },
        {
          name: "brand",
          label: "Marca",
          options: opts(["Visa", "Mastercard", "American Express", "Otra"]),
        },
        {
          name: "last4",
          label: "Últimos 4 dígitos",
          required: false,
          help: "Deja vacío si no conoces los últimos cuatro de la tarjeta. Nunca ingreses número completo, CVV, PIN ni claves.",
        },
        {
          name: "closingDay",
          label: "Día habitual de cierre",
          type: "number",
          min: 1,
          max: 31,
        },
        {
          name: "dueDay",
          label: "Día habitual de vencimiento",
          type: "number",
          min: 1,
          max: 31,
        },
        {
          name: "interestRate",
          label: "Interés mensual informado (%)",
          type: "rate",
          required: false,
        },
        {
          name: "financingRate",
          label: "Financiación mensual (%)",
          type: "rate",
          required: false,
          help: "Ingresa TEM mensual. No ingreses TNA ni TEA sin convertir.",
        },
        {
          name: "financingRateUSD",
          label: "Financiación mensual USD (%)",
          type: "rate",
          required: false,
        },
        notes,
      ];
    case "statements":
      return [
        { name: "cardId", label: "Tarjeta", options: selectCards },
        { name: "month", label: "Período", type: "month" },
        { name: "closingDate", label: "Fecha de cierre", type: "date" },
        { name: "dueDate", label: "Fecha de vencimiento", type: "date" },
        money("previous", "Saldo anterior"),
        money("consumption", "Consumos informados en el resumen"),
        money("interest", "Intereses"),
        money("taxes", "Impuestos / cargos"),
        money("other", "Otros cargos"),
        money("previousPayments", "Pagos descontados por el banco"),
        money("total", "Total del resumen (dato real)"),
        {
          ...money("minimum", "Pago mínimo ARS informado"),
          type: "nullableMoney",
          required: false,
          help: "Vacío significa no informado; no se interpreta como cero.",
        },
        {
          name: "paymentMode",
          label: "Modalidad de pago ARS",
          options: [
            { value: "minimum", label: "Mínimo informado" },
            { value: "full", label: "Pago total exigible (confirmado)" },
            { value: "unknown", label: "Pendiente de confirmar" },
          ],
        },
        {
          name: "rate",
          label: "Financiación mensual TEM (%)",
          type: "rate",
          required: false,
          help: "Si falta, se usa la tasa de financiación de la tarjeta. Nunca se inventa.",
        },
        money("totalUSD", "Saldo en dólares (USD)"),
        {
          ...money("minimumUSD", "Mínimo en dólares informado"),
          type: "nullableMoney",
          required: false,
          help: "Vacío significa no informado. No se convierte con una cotización supuesta.",
        },
        {
          name: "usdPaymentMode",
          label: "Modalidad de pago USD",
          options: [
            { value: "unknown", label: "Pendiente de confirmar" },
            { value: "minimum", label: "Mínimo USD informado" },
            { value: "full", label: "Pago total USD exigible (confirmado)" },
          ],
        },
        {
          name: "rateUSD",
          label: "TEM de financiación USD (%)",
          type: "rate",
          required: false,
        },
        money("previousUSD", "Saldo anterior en USD"),
        money("consumptionUSD", "Consumos informados en USD"),
        money("interestUSD", "Intereses en USD"),
        money("taxesUSD", "Impuestos en USD"),
        money("otherUSD", "Otros cargos en USD"),
        money("previousPaymentsUSD", "Pagos descontados por el banco en USD"),
        notes,
      ];
    case "expenses":
      return [
        { name: "date", label: "Fecha", type: "date" },
        { name: "description", label: "Comercio / descripción" },
        money("amount", "Importe"),
        {
          name: "currency",
          label: "Moneda del consumo",
          options: opts(["ARS", "USD"]),
        },
        { name: "category", label: "Categoría", options: opts(categories) },
        {
          name: "installmentCurrent",
          label: "Cuota actual (compra nueva)",
          type: "number",
          min: 1,
          max: 600,
          help: "1 de 1 para un consumo sin cuotas. Si vinculas una compra existente, estos dos campos no se aplican.",
        },
        {
          name: "installmentTotal",
          label: "Total de cuotas (compra nueva)",
          type: "number",
          min: 1,
          max: 600,
          help: "Si es mayor que 1, se crea automáticamente la compra y su proyección.",
        },
        {
          name: "purchaseId",
          label: "Compra en cuotas (opcional)",
          required: false,
          options: [
            { value: "", label: "Sin compra vinculada" },
            ...s.purchases
              .filter(
                (p) =>
                  p.cardId ===
                  s.statements.find((st) => st.id === editing?.row.statementId)
                    ?.cardId,
              )
              .map((p) => ({
                value: p.id,
                label: p.description + ` · ${p.current}/${p.total}`,
              })),
          ],
          help: "Puedes vincular una compra existente o crearla con los campos de cuotas. No se generan cargos automáticos.",
        },
        notes,
      ];
    case "purchases":
      return [
        { name: "cardId", label: "Tarjeta", options: selectCards },
        { name: "description", label: "Compra / descripción" },
        { name: "month", label: "Período de la cuota actual", type: "month" },
        {
          name: "current",
          label: "Cuota actual",
          type: "number",
          min: 1,
          max: 600,
        },
        {
          name: "total",
          label: "Total de cuotas",
          type: "number",
          min: 1,
          max: 600,
        },
        money("amount", "Valor de cada cuota"),
        {
          name: "currency",
          label: "Moneda de las cuotas",
          options: opts(["ARS", "USD"]),
        },
      ];
    case "payments":
      return [
        { name: "date", label: "Fecha del pago", type: "date" },
        money("amount", "Importe efectivamente pagado"),
        {
          name: "currency",
          label: "Moneda del pago",
          options: opts(["ARS", "USD"]),
        },
        { name: "method", label: "Medio de pago", required: false },
      ];
    case "services":
      return [
        { name: "company", label: "Empresa / nombre del servicio" },
        {
          name: "type",
          label: "Tipo (puedes escribir uno personalizado)",
          help: serviceTypes.join(" · "),
        },
        {
          name: "reference",
          label: "N.º de cliente / referencia",
          required: false,
        },
        notes,
      ];
    case "invoices":
      return [
        {
          name: "serviceId",
          label: "Servicio",
          options: s.services.map((x) => ({
            value: x.id,
            label: x.company,
          })),
        },
        { name: "month", label: "Período", type: "month" },
        { name: "issued", label: "Fecha de emisión", type: "date" },
        { name: "dueDate", label: "Fecha de vencimiento", type: "date" },
        money("amount", "Importe"),
        {
          name: "paid",
          label: "Factura pagada",
          type: "checkbox",
          required: false,
        },
        {
          name: "paidDate",
          label: "Fecha de pago (obligatoria si está pagada)",
          type: "date",
          required: false,
        },
        { name: "method", label: "Medio de pago", required: false },
        notes,
      ];
    case "budgets":
      return [
        money("income", "Ingresos del mes"),
        money("cardBudget", "Dinero disponible para tarjetas ARS"),
        money(
          "cardBudgetUSD",
          "Dinero disponible en dólares para tarjetas USD",
        ),
        money("other", "Otros gastos del mes"),
      ];
  }
}
