/** Stable local logo identities; aliases share a logo without changing card data. */
export function bankKey(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (/\bmacro\b/.test(normalized)) return "macro";
  if (/\bsantander\b/.test(normalized)) return "santander";
  if (/\bamerican express\b|\bamex\b/.test(normalized))
    return "american-express";
  return normalized.replace(/ /g, "-") || "sin-emisor";
}
export const bankLogoOwner = (name: string) => `bank-logo:${bankKey(name)}`;
export const isBankLogo = (ownerId: string) => ownerId.startsWith("bank-logo:");
