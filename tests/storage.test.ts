import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { demoState } from "../src/demo";
import { emptyState } from "../src/model";
import { bankKey, bankLogoOwner } from "../src/banks";
import {
  saveState,
  readState,
  exportBackup,
  parseBackup,
  readAttachments,
  attach,
} from "../src/storage";
beforeEach(async () => saveState(emptyState(), []));
describe("persistencia y copias", () => {
  it("conserva datos tras reabrir IndexedDB", async () => {
    const s = demoState("2026-10");
    await saveState(s);
    expect(await readState()).toEqual(s);
  });
  it("exporta y restaura documentos junto con todos los registros", async () => {
    const s = demoState("2026-10");
    const blob = new Blob(["%PDF-1.7\nexample"], { type: "application/pdf" });
    await saveState(s, [
      {
        id: "doc",
        ownerId: s.statements[0].id,
        name: "resumen.pdf",
        type: "application/pdf",
        blob,
      },
      {
        id: "logo",
        ownerId: bankLogoOwner(s.cards[0].bank),
        name: "logo.png",
        type: "image/png",
        blob: new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: "image/png",
        }),
      },
    ]); // FileReader browser API replaced for this node test only.
    const original = globalThis.FileReader;
    class Reader {
      result: string | null = null;
      onload?: () => void;
      onerror?: () => void;
      async readAsDataURL(b: Blob) {
        this.result =
          "data:" +
          b.type +
          ";base64," +
          btoa(String.fromCharCode(...new Uint8Array(await b.arrayBuffer())));
        this.onload?.();
      }
    }
    globalThis.FileReader = Reader as unknown as typeof FileReader;
    try {
      const raw = await exportBackup();
      const backup = await parseBackup(raw);
      await saveState(emptyState(), []);
      await saveState(backup.state, backup.attachments);
      expect(await readState()).toEqual(s);
      const docs = await readAttachments();
      expect(docs).toHaveLength(2);
      expect(await docs.find((a) => a.id === "doc")!.blob.text()).toBe(
        "%PDF-1.7\nexample",
      );
      expect(
        new Uint8Array(
          await docs.find((a) => a.id === "logo")!.blob.arrayBuffer(),
        ),
      ).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
    } finally {
      globalThis.FileReader = original;
    }
  });
  it("rechaza copia corrupta sin alterar la base actual", async () => {
    const s = demoState("2026-10");
    await saveState(s);
    await expect(parseBackup('{"format":"other"}')).rejects.toThrow();
    expect(await readState()).toEqual(s);
  });
  it("elimina documentos huérfanos al eliminar registros", async () => {
    const s = demoState("2026-10");
    await saveState(s, [
      {
        id: "d",
        ownerId: s.statements[0].id,
        name: "a.pdf",
        type: "application/pdf",
        blob: new Blob(["a"]),
      },
    ]);
    await saveState(emptyState());
    expect(await readAttachments()).toEqual([]);
  });
  it("rechaza adjuntos de tipos no permitidos", async () => {
    await expect(
      attach("x", new File(["<script>"], "bad.html", { type: "text/html" })),
    ).rejects.toThrow("PDF, JPG o PNG");
  });
});

describe("logos de bancos", () => {
  it("reconoce alias sin confundir instituciones", () => {
    expect(bankKey("BANCO MACRO S.A.")).toBe(bankKey("Macro"));
    expect(bankKey("Santander Río")).toBe(bankKey("Banco Santander"));
    expect(bankKey("AMEX")).toBe(bankKey("American Express Argentina"));
    expect(bankKey("Banco Nación")).not.toBe(bankKey("Banco Galicia"));
  });
  it("reemplaza el logo y lo conserva mientras exista otra tarjeta del banco", async () => {
    const s = emptyState();
    s.cards = demoState("2026-10").cards.map((c) => ({
      ...c,
      bank: "Banco Macro",
    }));
    await saveState(s);
    const file = (name: string) =>
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], name, {
        type: "image/png",
      });
    await attach(bankLogoOwner("Macro"), file("original.png"));
    await attach(bankLogoOwner("Banco Macro"), file("nuevo.png"));
    expect(await readAttachments()).toHaveLength(1);
    expect((await readAttachments())[0].name).toBe("nuevo.png");
    s.cards.pop();
    await saveState(s);
    expect(await readAttachments()).toHaveLength(1);
    s.cards = [];
    await saveState(s);
    expect(await readAttachments()).toHaveLength(0);
  });
  it("no permite PDF ni SVG como logo", async () => {
    await expect(
      attach(
        bankLogoOwner("Macro"),
        new File(["%PDF-1.7"], "logo.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("PNG o JPG");
    await expect(
      attach(
        bankLogoOwner("Macro"),
        new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("PNG o JPG");
  });
});

describe("copias con monedas y migración", () => {
  it("restaura saldos USD, mínimo nulo y pagos por moneda desde una copia v2", async () => {
    const s = demoState("2026-10"),
      st = s.statements[0];
    st.totalUSD = 20000;
    st.minimum = null;
    st.paymentMode = "full";
    st.usdPaymentMode = "full";
    st.paymentsConfirmed = true;
    s.payments.push({
      id: "usd-payment",
      statementId: st.id,
      date: "2026-10-20",
      amount: 5000,
      currency: "USD",
      method: "Prueba",
    });
    const raw = JSON.stringify({
      format: "mis-cuentas",
      version: 2,
      state: s,
      attachments: [],
    });
    const backup = await parseBackup(raw);
    await saveState(backup.state, backup.attachments);
    expect(await readState()).toEqual(s);
  });
  it("importa backup v1 y conserva importes ARS al migrar a v2", async () => {
    const s = demoState("2026-10");
    const backup = await parseBackup(
      JSON.stringify({
        format: "mis-cuentas",
        version: 1,
        state: { ...s, version: 1 },
        attachments: [],
      }),
    );
    await saveState(backup.state, backup.attachments);
    expect(await readState()).toEqual(s);
  });
});
