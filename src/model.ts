import { z } from "zod";
export const currencySchema = z.enum(["ARS", "USD"]);
export type Currency = z.infer<typeof currencySchema>;
const paymentMode = z.enum(["minimum", "full", "unknown"]);
const id = z.string().min(1).max(100);
const text = z.string().max(2000);
const money = z.number().int().min(0).max(1e14);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const date = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Fecha inválida",
  );
const optionalDate = z.union([date, z.literal("")]);
const rate = z.number().min(0).max(1000).nullable();
export const cardSchema = z.object({
  id,
  bank: text,
  name: text,
  brand: z.enum(["Visa", "Mastercard", "American Express", "Otra"]),
  last4: z.string().regex(/^(?:\d{4})?$/),
  referenceLast4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  referenceKind: z.enum(["account", "member"]).optional(),
  importKey: text.optional(),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  interestRate: rate,
  financingRate: rate,
  financingRateUSD: rate.optional(),
  notes: text,
});
export const statementSchema = z.object({
  id,
  cardId: id,
  month,
  closingDate: date,
  dueDate: date,
  previous: money,
  consumption: money,
  interest: money,
  taxes: money,
  other: money,
  previousPayments: money,
  total: money,
  minimum: money.nullable(),
  paymentMode: paymentMode.optional(),
  usdPaymentMode: paymentMode.optional(),
  totalUSD: money.optional(),
  minimumUSD: money.nullable().optional(),
  previousUSD: money.optional(),
  consumptionUSD: money.optional(),
  interestUSD: money.optional(),
  taxesUSD: money.optional(),
  otherUSD: money.optional(),
  previousPaymentsUSD: money.optional(),
  rateUSD: rate.optional(),
  importKey: text.optional(),
  source: text.optional(),
  paymentsConfirmed: z.boolean().optional(),
  rate,
  notes: text,
});
export const expenseSchema = z.object({
  id,
  statementId: id,
  date,
  description: text,
  amount: money,
  currency: currencySchema.optional(),
  importKey: text.optional(),
  category: text,
  notes: text,
  purchaseId: z.union([id, z.literal("")]),
});
export const purchaseSchema = z
  .object({
    id,
    cardId: id,
    description: text,
    month,
    current: z.number().int().min(1).max(600),
    total: z.number().int().min(1).max(600),
    amount: money,
    currency: currencySchema.optional(),
    importKey: text.optional(),
  })
  .refine((v) => v.current <= v.total, "Cuota actual superior al total");
export const paymentSchema = z.object({
  currency: currencySchema.optional(),
  importKey: text.optional(),
  id,
  statementId: id,
  date,
  amount: money,
  method: text,
});
export const serviceSchema = z.object({
  id,
  company: text,
  type: text,
  reference: text,
  notes: text,
});
export const invoiceSchema = z
  .object({
    id,
    serviceId: id,
    month,
    issued: date,
    dueDate: date,
    amount: money,
    paid: z.boolean(),
    paidDate: optionalDate,
    method: text,
    notes: text,
  })
  .refine((v) => !v.paid || !!v.paidDate, "Un pago necesita fecha");
export const budgetSchema = z.object({
  id,
  month,
  income: money,
  other: money,
  cardBudget: money,
  cardBudgetUSD: money.optional(),
});
export const stateSchema = z.object({
  version: z.literal(2),
  demo: z.boolean(),
  cards: z.array(cardSchema),
  statements: z.array(statementSchema),
  expenses: z.array(expenseSchema),
  purchases: z.array(purchaseSchema),
  payments: z.array(paymentSchema),
  services: z.array(serviceSchema),
  invoices: z.array(invoiceSchema),
  budgets: z.array(budgetSchema),
});
export type Card = z.infer<typeof cardSchema>;
export type Statement = z.infer<typeof statementSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type State = z.infer<typeof stateSchema>;
export type Table = Exclude<keyof State, "version" | "demo">;
export const emptyState = (): State => ({
  version: 2,
  demo: false,
  cards: [],
  statements: [],
  expenses: [],
  purchases: [],
  payments: [],
  services: [],
  invoices: [],
  budgets: [],
});
export const uid = () => crypto.randomUUID();
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const currentMonth = () => today().slice(0, 7);
export function validateState(input: unknown): State {
  const legacy =
    input &&
    typeof input === "object" &&
    "version" in input &&
    input.version === 1;
  const s = stateSchema.parse(legacy ? { ...input, version: 2 } : input);
  const has = (table: Table, id: string) => s[table].some((x) => x.id === id);
  for (const table of [
    "cards",
    "statements",
    "expenses",
    "purchases",
    "payments",
    "services",
    "invoices",
    "budgets",
  ] as Table[]) {
    const ids = s[table].map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      throw Error("Identificadores duplicados");
  }
  for (const row of [...s.statements, ...s.purchases])
    if (!has("cards", row.cardId)) throw Error("Tarjeta inexistente");
  for (const row of [...s.expenses, ...s.payments])
    if (!has("statements", row.statementId)) throw Error("Resumen inexistente");
  for (const row of s.expenses)
    if (
      row.purchaseId &&
      (!has("purchases", row.purchaseId) ||
        s.purchases.find((p) => p.id === row.purchaseId)!.cardId !==
          s.statements.find((st) => st.id === row.statementId)!.cardId)
    )
      throw Error("Compra en cuotas incompatible");
  for (const row of s.expenses) {
    if (
      row.purchaseId &&
      (s.purchases.find((p) => p.id === row.purchaseId)?.currency ?? "ARS") !==
        (row.currency ?? "ARS")
    )
      throw Error("La moneda del consumo no coincide con la compra en cuotas");
  }
  for (const row of s.invoices)
    if (!has("services", row.serviceId)) throw Error("Servicio inexistente");
  for (const [rows, key] of [
    [s.statements, (r: Statement) => r.cardId + r.month],
    [s.invoices, (r: Invoice) => r.serviceId + r.month],
    [s.budgets, (r: Budget) => r.month],
  ] as const) {
    const keys = (rows as any[]).map(key as any);
    if (new Set(keys).size !== keys.length)
      throw Error("Ya existe un registro para ese período");
  }
  for (const st of s.statements) {
    if (st.minimum !== null && st.minimum > st.total)
      throw Error("El mínimo no puede superar el total");
    if (
      st.minimumUSD !== null &&
      st.minimumUSD !== undefined &&
      st.minimumUSD > (st.totalUSD ?? 0)
    )
      throw Error("El mínimo USD supera el total USD");
    if (st.paymentMode === "minimum" && st.minimum === null)
      throw Error("La modalidad mínimo requiere un importe ARS informado");
    if (st.usdPaymentMode === "minimum" && st.minimumUSD == null)
      throw Error("La modalidad mínimo requiere un importe USD informado");
    for (const unit of ["ARS", "USD"] as const) {
      const total = unit === "ARS" ? st.total : (st.totalUSD ?? 0);
      if (
        s.payments
          .filter(
            (p) => p.statementId === st.id && (p.currency ?? "ARS") === unit,
          )
          .reduce((a, p) => a + p.amount, 0) > total
      )
        throw Error(`Los pagos ${unit} superan el total del resumen`);
    }
  }
  return s;
}
