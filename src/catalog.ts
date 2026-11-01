export type CatalogRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number | null,
  string,
  string,
  string,
];
export interface CatalogProduct {
  gtin: string;
  name: string;
  inn: string;
  strength: string;
  form: string;
  manufacturer: string;
  package: string;
  packSize: number | null;
  unit: string;
  description: string;
  registration: string;
}
export const normalizeSearch = (value: string) =>
  value
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function productFromRow(r: CatalogRow): CatalogProduct {
  return {
    gtin: r[0],
    name: r[1],
    inn: r[2],
    strength: r[3],
    form: r[4],
    manufacturer: r[5],
    package: r[6],
    packSize: r[7],
    unit: r[8],
    description: r[9],
    registration: r[10],
  };
}
export function normalizeGtin(value: string): string | null {
  const raw = value.trim().replace(/^\](?:d2|C1)/, "");
  const marked =
    raw.match(/^\(01\)(\d{14})(?:\(\d{2,4}\)|$)/) ||
    raw.match(/^01(\d{14})(?:21|17|\x1d)/);
  const digits = marked ? marked[1] : raw.replace(/[\s-]/g, "");
  if (!/^\d{8}$|^\d{12,14}$/.test(digits)) return null;
  const body = digits.slice(0, -1);
  let sum = 0;
  for (
    let i = body.length - 1, weight = 3;
    i >= 0;
    i--, weight = weight === 3 ? 1 : 3
  )
    sum += Number(body[i]) * weight;
  if ((10 - (sum % 10)) % 10 !== Number(digits.at(-1))) return null;
  return digits.padStart(14, "0");
}
export function searchCatalog(
  rows: CatalogRow[],
  query: string,
  byCode: boolean,
) {
  if (byCode) {
    const code = normalizeGtin(query);
    if (code)
      return rows
        .filter((r) => r[0] === code)
        .slice(0, 40)
        .map(productFromRow);
    const registration = normalizeRegistration(query);
    return registration
      ? rows
          .filter((r) => normalizeRegistration(r[10]) === registration)
          .slice(0, 40)
          .map(productFromRow)
      : [];
  }
  const tokens = normalizeSearch(query).split(" ").filter(Boolean);
  if (!tokens.length) return [];
  return rows
    .filter((r) =>
      tokens.every((t) =>
        normalizeSearch(`${r[1]} ${r[2]} ${r[3]}`).includes(t),
      ),
    )
    .slice(0, 40)
    .map(productFromRow);
}
export function quantityToAdd(
  product: CatalogProduct,
  amount: number,
  mode: "units" | "packs",
) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (mode === "packs" && (!product.packSize || !Number.isInteger(amount)))
    return null;
  const qty = mode === "packs" ? amount * product.packSize! : amount;
  return qty <= 100000 && (qty * 4) % 1 === 0 ? qty : null;
}

export function createCatalogLoader(fetcher: typeof fetch = fetch) {
  let data: Promise<CatalogRow[]> | undefined;
  return (url: string): Promise<CatalogRow[]> => {
    data ??= fetcher(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Каталог недоступен");
        const rows = await response.json();
        if (
          !Array.isArray(rows) ||
          !rows.every(
            (r) =>
              Array.isArray(r) &&
              r.length === 11 &&
              r.slice(0, 7).every((v) => typeof v === "string") &&
              (r[7] === null || (typeof r[7] === "number" && r[7] > 0)) &&
              r.slice(8).every((v) => typeof v === "string"),
          )
        )
          throw new Error("Некорректный каталог");
        return rows as CatalogRow[];
      })
      .catch((error) => {
        data = undefined;
        throw error;
      });
    return data;
  };
}

export function normalizeRegistration(value: string): string | null {
  if (!/[а-я]/i.test(value) || !/\d/.test(value)) return null;
  return normalizeSearch(value)
    .replace(/№|n(?=\d)/g, "")
    .replace(/[^а-яa-z0-9]/g, "");
}
