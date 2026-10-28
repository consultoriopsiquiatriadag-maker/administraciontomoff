import { describe, it, expect } from "vitest";
import { emptyState } from "../src/model";
import {
  buildStatementPrompt,
  extractionExample,
} from "../src/statementPrompt";
import {
  parseExtracted,
  parseExtractedText,
  defaultChoices,
  mergeExtracted,
  importErrorMessage,
} from "../src/importAccounts";
import { fixture } from "./import-fixture";

describe("prompt para el ChatGPT del usuario", () => {
  it("incluye un ejemplo ficticio válido para el importador real", () => {
    expect(() =>
      parseExtracted(JSON.stringify(extractionExample)),
    ).not.toThrow();
  });
  it("incluye solo referencias de la tarjeta elegida, nunca saldos ni pagos del usuario", () => {
    const b = fixture(),
      s = mergeExtracted(
        emptyState(),
        b,
        defaultChoices(emptyState(), b),
      ).state;
    s.statements[0].notes = "NOTA-PRIVADA-DE-SALDO";
    s.cards[0].notes = "NOTA-PRIVADA-DE-TARJETA";
    s.payments.push({
      id: "p",
      statementId: s.statements[0].id,
      date: "2026-10-20",
      amount: 1234,
      method: "MEDIO-PRIVADO",
    });
    const prompt = buildStatementPrompt(s, s.cards[0].id);
    expect(prompt).toContain("test-account");
    expect(prompt).toContain("9001");
    expect(prompt).toContain("purchaseKey");
    expect(prompt).not.toContain("NOTA-PRIVADA");
    expect(prompt).not.toContain("MEDIO-PRIVADO");
    const excluded = buildStatementPrompt(s, "no-such-card");
    expect(excluded).not.toContain("9001");
  });
  it("reutiliza claves importadas y ofrece claves para compras manuales", () => {
    const b = fixture(),
      s = mergeExtracted(
        emptyState(),
        b,
        defaultChoices(emptyState(), b),
      ).state;
    const importedKey = s.purchases[0].importKey!.split(":purchase:")[1];
    expect(buildStatementPrompt(s)).toContain(
      `"purchaseKey": "${importedKey}"`,
    );
    delete s.purchases[0].importKey;
    expect(buildStatementPrompt(s)).toContain(`compra-${s.purchases[0].id}`);
  });
});

describe("respuesta mensual de ChatGPT", () => {
  it("acepta JSON con cercas Markdown y solicitud de revisión legible", async () => {
    const b = fixture();
    expect(
      await parseExtractedText("```json\n" + JSON.stringify(b) + "\n```"),
    ).toEqual(b);
    await expect(
      parseExtractedText(
        JSON.stringify({
          format: "mis-cuentas-extraction-error",
          version: 1,
          issues: ["No se lee el vencimiento"],
        }),
      ),
    ).rejects.toThrow("No se lee el vencimiento");
    try {
      parseExtracted('{"format":"bad"}');
    } catch (e) {
      expect(importErrorMessage(e)).toContain("campos");
    }
  });
  it("agrega un nuevo mes a la misma tarjeta sin duplicar compra ni pagos", async () => {
    const b = fixture(),
      s = mergeExtracted(
        emptyState(),
        b,
        defaultChoices(emptyState(), b),
      ).state;
    const next = structuredClone(b);
    next.accounts[0].statement.month = "2026-11";
    next.accounts[0].statement.closingDate = "2026-11-10";
    next.accounts[0].statement.dueDate = "2026-11-25";
    next.accounts[0].expenses[0].installmentCurrent = 3;
    const reply = await parseExtractedText(
      "```json\n" + JSON.stringify(next) + "\n```",
    );
    const merged = mergeExtracted(s, reply, defaultChoices(s, reply));
    expect(merged.added).toBe(1);
    expect(merged.state.cards).toHaveLength(1);
    expect(merged.state.statements).toHaveLength(2);
    expect(merged.state.purchases).toHaveLength(1);
    expect(merged.state.expenses).toHaveLength(2);
    expect(merged.state.payments).toEqual([]);
    const repeated = mergeExtracted(
      merged.state,
      reply,
      defaultChoices(merged.state, reply),
    );
    expect(repeated.state).toEqual(merged.state);
    expect(repeated.skipped).toBe(1);
  });
  it("adopta una clave estable al vincular una tarjeta manual", () => {
    const b = fixture();
    const original = mergeExtracted(
      emptyState(),
      b,
      defaultChoices(emptyState(), b),
    ).state;
    const card = { ...original.cards[0] };
    delete card.importKey;
    const s = { ...emptyState(), cards: [card] };
    const result = mergeExtracted(s, b, [
      { key: b.accounts[0].key, selected: true, targetCardId: card.id },
    ]);
    expect(result.state.cards[0].importKey).toBe(b.accounts[0].key);
  });
  it("un cambio de clave externa no duplica una compra de la misma tarjeta", () => {
    const b = fixture(),
      s = mergeExtracted(
        emptyState(),
        b,
        defaultChoices(emptyState(), b),
      ).state;
    const next = structuredClone(b);
    next.accounts[0].key = "new-external-alias";
    next.accounts[0].statement.month = "2026-11";
    next.accounts[0].statement.closingDate = "2026-11-10";
    next.accounts[0].expenses[0].installmentCurrent = 3;
    const merged = mergeExtracted(s, next, defaultChoices(s, next));
    expect(merged.state.purchases).toHaveLength(1);
  });
  it("rechaza claves de cuenta o cuotas incompatibles sin alterar datos anteriores", () => {
    const b = fixture(),
      s = mergeExtracted(
        emptyState(),
        b,
        defaultChoices(emptyState(), b),
      ).state,
      before = structuredClone(s);
    const wrong = structuredClone(b);
    wrong.accounts[0].card.referenceLast4 = "9002";
    wrong.accounts[0].statement.month = "2026-11";
    wrong.accounts[0].statement.closingDate = "2026-11-10";
    expect(() => mergeExtracted(s, wrong, defaultChoices(s, wrong))).toThrow(
      "otra tarjeta",
    );
    const wrongQuota = structuredClone(b);
    wrongQuota.accounts[0].statement.month = "2026-11";
    wrongQuota.accounts[0].statement.closingDate = "2026-11-10";
    expect(() =>
      mergeExtracted(s, wrongQuota, defaultChoices(s, wrongQuota)),
    ).toThrow("cuota");
    expect(s).toEqual(before);
  });
});
