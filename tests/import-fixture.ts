import { demoState } from "../src/demo";
import { parseExtracted, type ExtractedBundle } from "../src/importAccounts";
export function fixture(): ExtractedBundle {
  const demo = demoState("2026-10");
  const { id: _c, ...card } = demo.cards[0];
  const { id: _s, cardId: _cid, ...statement } = demo.statements[0];
  return parseExtracted(
    JSON.stringify({
      format: "mis-cuentas-extracted",
      version: 1,
      accounts: [
        {
          key: "test-account",
          card: {
            ...card,
            bank: "Emisor de prueba",
            name: "Cuenta de prueba",
            last4: "",
            referenceLast4: "9001",
            referenceKind: "account",
          },
          statement: {
            ...statement,
            month: "2026-10",
            closingDate: "2026-10-10",
            dueDate: "2026-10-25",
            total: 10000,
            minimum: null,
            paymentMode: "unknown",
            totalUSD: 2000,
            minimumUSD: null,
            usdPaymentMode: "unknown",
            rateUSD: null,
          },
          expenses: [
            {
              key: "installment",
              date: "2026-10-01",
              description: "Compra ficticia",
              amount: 500,
              currency: "ARS",
              category: "Otros",
              notes: "",
              installmentCurrent: 2,
              installmentTotal: 4,
            },
          ],
          warnings: ["Dato de prueba"],
        },
      ],
    }),
  );
}
