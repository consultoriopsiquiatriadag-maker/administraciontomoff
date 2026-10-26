import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { demoState } from "../src/demo";
import { emptyState } from "../src/model";
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
    ]); // FileReader browser API replaced for this node test only.
    const original = globalThis.FileReader;
    class Reader {
      result: string | null = null;
      onload?: () => void;
      onerror?: () => void;
      async readAsDataURL(b: Blob) {
        this.result = "data:" + b.type + ";base64," + btoa(await b.text());
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
      expect(docs).toHaveLength(1);
      expect(await docs[0].blob.text()).toBe("%PDF-1.7\nexample");
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
