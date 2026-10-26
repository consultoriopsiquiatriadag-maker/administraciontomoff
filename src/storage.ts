import { emptyState, validateState, type State } from "./model";
import { z } from "zod";
export type Attachment = {
  id: string;
  ownerId: string;
  name: string;
  type: string;
  blob: Blob;
};
const DB = "mis-cuentas-local";
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("state");
      r.result.createObjectStore("attachments", { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () =>
      reject(
        Error(
          "Cierra otras pestañas de la aplicación para actualizar la base.",
        ),
      );
  });
}
const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
const completed = (t: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? Error("Operación cancelada"));
  });
export async function readState() {
  const db = await openDB();
  try {
    const result = await request(
      db.transaction("state").objectStore("state").get("data"),
    );
    return result ? validateState(result) : emptyState();
  } finally {
    db.close();
  }
}
export async function readAttachments() {
  const db = await openDB();
  try {
    return (await request(
      db.transaction("attachments").objectStore("attachments").getAll(),
    )) as Attachment[];
  } finally {
    db.close();
  }
}
export async function saveState(s: State, attachments?: Attachment[]) {
  validateState(s);
  const db = await openDB();
  try {
    const t = db.transaction(["state", "attachments"], "readwrite");
    const done = completed(t);
    t.objectStore("state").put(s, "data");
    const owners = new Set([...s.statements, ...s.invoices].map((x) => x.id));
    if (attachments) {
      t.objectStore("attachments").clear();
      for (const a of attachments) t.objectStore("attachments").put(a);
    } else {
      const r = t.objectStore("attachments").openCursor();
      r.onsuccess = () => {
        const c = r.result;
        if (c) {
          if (!owners.has(c.value.ownerId)) c.delete();
          c.continue();
        }
      };
    }
    await done;
  } finally {
    db.close();
  }
}
export async function attach(ownerId: string, file: File) {
  if (file.size > 15 * 1024 * 1024)
    throw Error("El documento no puede superar 15 MB.");
  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const valid =
    (file.type === "application/pdf" &&
      String.fromCharCode(...header.slice(0, 5)) === "%PDF-") ||
    (file.type === "image/png" &&
      header[0] === 137 &&
      header[1] === 80 &&
      header[2] === 78 &&
      header[3] === 71) ||
    (file.type === "image/jpeg" &&
      header[0] === 255 &&
      header[1] === 216 &&
      header[2] === 255);
  if (!valid) throw Error("Selecciona un PDF, JPG o PNG válido.");
  const db = await openDB();
  try {
    const t = db.transaction(["state", "attachments"], "readwrite");
    const done = completed(t);
    const s = (await request(t.objectStore("state").get("data"))) as State;
    if (!s || ![...s.statements, ...s.invoices].some((x) => x.id === ownerId)) {
      t.abort();
      await done;
      return;
    }
    t.objectStore("attachments").put({
      id: crypto.randomUUID(),
      ownerId,
      name: file.name,
      type: file.type,
      blob: file,
    });
    await done;
  } finally {
    db.close();
  }
}
export async function deleteAttachment(id: string) {
  const db = await openDB();
  try {
    const t = db.transaction("attachments", "readwrite");
    const done = completed(t);
    t.objectStore("attachments").delete(id);
    await done;
  } finally {
    db.close();
  }
}
const base64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
export async function exportBackup() {
  const state = await readState(),
    attachments = await readAttachments();
  return JSON.stringify({
    format: "mis-cuentas",
    version: 1,
    exportedAt: new Date().toISOString(),
    state,
    attachments: await Promise.all(
      attachments.map(async (a) => ({
        id: a.id,
        ownerId: a.ownerId,
        name: a.name,
        type: a.type,
        data: await base64(a.blob),
      })),
    ),
  });
}
const backupSchema = z.object({
  format: z.literal("mis-cuentas"),
  version: z.literal(1),
  state: z.unknown(),
  attachments: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        ownerId: z.string(),
        name: z.string().max(255),
        type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
        data: z.string().regex(/^[A-Za-z0-9+/]*={0,2}$/),
      }),
    )
    .max(1000),
});
export async function parseBackup(raw: string) {
  if (raw.length > 150 * 1024 * 1024) throw Error("La copia supera 150 MB.");
  const b = backupSchema.parse(JSON.parse(raw));
  const state = validateState(b.state),
    owners = new Set([...state.statements, ...state.invoices].map((x) => x.id));
  if (new Set(b.attachments.map((x) => x.id)).size !== b.attachments.length)
    throw Error("Documentos duplicados");
  const attachments = b.attachments.map((a) => {
    if (!owners.has(a.ownerId)) throw Error("Documento sin factura o resumen");
    const bytes = Uint8Array.from(atob(a.data), (c) => c.charCodeAt(0));
    if (bytes.length > 15 * 1024 * 1024)
      throw Error("Documento demasiado grande");
    return {
      id: a.id,
      ownerId: a.ownerId,
      name: a.name,
      type: a.type,
      blob: new Blob([bytes], { type: a.type }),
    };
  });
  return { state, attachments };
}
