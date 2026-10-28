import { z } from "zod";
import {
  cardSchema,
  statementSchema,
  expenseSchema,
  uid,
  validateState,
  type State,
} from "./model";
import { bankKey } from "./banks";
const key = z.string().min(1).max(100);
const accountSchema = z.object({
  key,
  card: cardSchema.omit({ id: true, importKey: true }),
  statement: statementSchema.omit({
    id: true,
    cardId: true,
    importKey: true,
    paymentsConfirmed: true,
  }),
  expenses: z
    .array(
      expenseSchema
        .omit({
          id: true,
          statementId: true,
          purchaseId: true,
          importKey: true,
        })
        .extend({
          key,
          installmentCurrent: z.number().int().min(1).max(600).optional(),
          installmentTotal: z.number().int().min(1).max(600).optional(),
          purchaseKey: key.optional(),
        }),
    )
    .max(2000),
  warnings: z.array(z.string().max(1000)).max(20),
});
export const extractedSchema = z.object({
  format: z.literal("mis-cuentas-extracted"),
  version: z.literal(1),
  accounts: z.array(accountSchema).min(1).max(100),
});
export type ExtractedBundle = z.infer<typeof extractedSchema>;
export type ImportChoice = {
  key: string;
  targetCardId: string;
  selected: boolean;
};
export function parseExtracted(raw: string): ExtractedBundle {
  if (raw.length > 10 * 1024 * 1024) throw Error("El paquete supera 10 MB.");
  const bundle = extractedSchema.parse(JSON.parse(raw));
  const keys = bundle.accounts.map((a) => a.key);
  if (new Set(keys).size !== keys.length)
    throw Error("Hay cuentas duplicadas en el paquete");
  for (const a of bundle.accounts) {
    if (a.statement.month !== a.statement.closingDate.slice(0, 7))
      throw Error("El período debe coincidir con el cierre");
    const expKeys = a.expenses.map((e) => e.key);
    if (new Set(expKeys).size !== expKeys.length)
      throw Error("Hay consumos duplicados en una cuenta");
    for (const e of a.expenses)
      if ((e.installmentCurrent ?? 1) > (e.installmentTotal ?? 1))
        throw Error("Cuotas incompatibles");
    // Validate cross-field financial rules using the same model as manual entry.
    validateState({
      version: 2,
      demo: false,
      cards: [{ ...a.card, id: "card" }],
      statements: [
        {
          ...a.statement,
          id: "statement",
          cardId: "card",
          paymentsConfirmed: false,
        },
      ],
      expenses: [],
      purchases: [],
      payments: [],
      services: [],
      invoices: [],
      budgets: [],
    });
  }
  return bundle;
}
export function defaultChoices(s: State, b: ExtractedBundle): ImportChoice[] {
  return b.accounts.map((a) => {
    const match =
      s.cards.find((c) => c.importKey === a.key) ||
      s.cards.find(
        (c) =>
          bankKey(c.bank) === bankKey(a.card.bank) &&
          c.brand === a.card.brand &&
          ((!!c.last4 && c.last4 === a.card.last4) ||
            (!c.last4 &&
              !a.card.last4 &&
              !!c.referenceLast4 &&
              c.referenceLast4 === a.card.referenceLast4 &&
              c.referenceKind === a.card.referenceKind)),
      );
    return { key: a.key, selected: true, targetCardId: match?.id ?? "new" };
  });
}
export function mergeExtracted(
  s: State,
  b: ExtractedBundle,
  choices: ImportChoice[],
) {
  if (s.demo)
    throw Error(
      "Exporta o elimina la demostración antes de importar tus cuentas reales.",
    );
  const n = structuredClone(s);
  let added = 0,
    skipped = 0;
  const seenTargets = new Set<string>();
  for (const a of b.accounts) {
    const choice = choices.find((c) => c.key === a.key);
    if (!choice?.selected) continue;
    let card =
      choice.targetCardId === "new"
        ? n.cards.find((c) => c.importKey === a.key)
        : n.cards.find((c) => c.id === choice.targetCardId);
    if (choice.targetCardId !== "new" && !card)
      throw Error(
        "La tarjeta seleccionada ya no existe; vuelve a revisar la importación.",
      );
    if (!card) {
      card = { ...a.card, id: uid(), importKey: a.key };
      n.cards.push(card);
    }
    const pair = card.id + ":" + a.statement.month;
    if (seenTargets.has(pair))
      throw Error(
        "Dos cuentas están asignadas a la misma tarjeta y período; revisa la selección.",
      );
    seenTargets.add(pair);
    if (
      n.statements.some(
        (st) => st.cardId === card.id && st.month === a.statement.month,
      )
    ) {
      skipped++;
      continue;
    }
    const st = {
      ...a.statement,
      id: uid(),
      cardId: card.id,
      importKey: a.key + ":" + a.statement.month,
      paymentsConfirmed: false,
    };
    n.statements.push(st);
    for (const e of a.expenses) {
      let purchaseId = "";
      if ((e.installmentTotal ?? 1) > 1) {
        const pk = a.key + ":purchase:" + (e.purchaseKey ?? e.key);
        let p = n.purchases.find(
          (p) => p.importKey === pk && p.cardId === card!.id,
        );
        if (!p) {
          p = {
            id: uid(),
            cardId: card.id,
            description: e.description,
            month: st.month,
            current: e.installmentCurrent ?? 1,
            total: e.installmentTotal!,
            amount: e.amount,
            currency: e.currency ?? "ARS",
            importKey: pk,
          };
          n.purchases.push(p);
        }
        purchaseId = p.id;
      }
      const {
        key: _key,
        installmentCurrent: _current,
        installmentTotal: _total,
        purchaseKey: _pk,
        ...expense
      } = e;
      n.expenses.push({
        ...expense,
        id: uid(),
        statementId: st.id,
        purchaseId,
        importKey: st.importKey + ":" + e.key,
      });
    }
    added++;
  }
  return { state: validateState(n), added, skipped };
}

/** Clipboard-only import. Decoding stays in the browser and uses no remote service. */
export async function parseExtractedText(
  input: string,
): Promise<ExtractedBundle> {
  const raw = input.trim();
  if (raw.length > 10 * 1024 * 1024) throw Error("El texto supera 10 MB.");
  if (!raw.startsWith("MCUENTAS1:")) return parseExtracted(raw);
  const encoded = raw.slice("MCUENTAS1:".length).replace(/\s/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw Error("El código está incompleto o no es válido.");
  if (typeof DecompressionStream === "undefined")
    throw Error(
      "Este navegador no admite el código compacto. Usa una versión actual de Safari, Chrome o Firefox, o pega el JSON completo.",
    );
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024) {
        await reader.cancel();
        throw Error("Los datos descomprimidos superan 10 MB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const decoded = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    decoded.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return parseExtracted(
    new TextDecoder("utf-8", { fatal: true }).decode(decoded),
  );
}
