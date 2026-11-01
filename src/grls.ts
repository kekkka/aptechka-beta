export interface GrlsRegistration {
  registration: string;
  name: string;
  status: string;
  registeredAt: string | null;
  expiresAt: string | null;
  holder: string | null;
  country: string | null;
  group: string | null;
  vital: boolean | null;
  narcotic: boolean | null;
  orphan: boolean | null;
  manufacturing: string | null;
  documents: string | null;
}
export interface GrlsSnapshot {
  schemaVersion: 1;
  snapshotDate: string;
  source: string;
  registrations: Record<string, GrlsRegistration[]>;
}
export type GrlsLookup =
  | { status: "loading" }
  | {
      status: "matched";
      variants: GrlsRegistration[];
      snapshotDate: string;
      source: string;
    }
  | { status: "not_found"; snapshotDate: string; source: string }
  | { status: "error"; message: string };

/** Formatting differences only: never fuzzy-match different registration IDs. */
export function registrationKey(value: string): string | null {
  if (!/\d/.test(value)) return null;
  return (
    value
      .normalize("NFC")
      .toLocaleLowerCase("ru")
      .replace(/ё/g, "е")
      .replace(/№|n(?=\s*\d)/g, "")
      .replace(/[^а-яa-z0-9]/g, "") || null
  );
}
export function lookupRegistration(
  snapshot: GrlsSnapshot,
  registration: string,
): GrlsLookup {
  const key = registrationKey(registration);
  const variants = key ? snapshot.registrations[key] : undefined;
  const meta = { snapshotDate: snapshot.snapshotDate, source: snapshot.source };
  return variants?.length
    ? { status: "matched", variants, ...meta }
    : { status: "not_found", ...meta };
}
export function createGrlsLoader(fetcher: typeof fetch = fetch) {
  let data: Promise<GrlsSnapshot> | undefined;
  return (url: string): Promise<GrlsSnapshot> => {
    data ??= fetcher(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Выгрузка ГРЛС недоступна");
        const json = await response.json();
        if (
          json?.schemaVersion !== 1 ||
          typeof json.snapshotDate !== "string" ||
          typeof json.source !== "string" ||
          !json.registrations ||
          typeof json.registrations !== "object" ||
          Array.isArray(json.registrations)
        )
          throw new Error("Некорректная выгрузка ГРЛС");
        const required = ["registration", "name", "status"];
        const optional = [
          "registeredAt",
          "expiresAt",
          "holder",
          "country",
          "group",
          "manufacturing",
          "documents",
        ];
        const flags = ["vital", "narcotic", "orphan"];
        for (const records of Object.values(json.registrations)) {
          if (
            !Array.isArray(records) ||
            !records.length ||
            !records.every(
              (r) =>
                r &&
                required.every((k) => typeof r[k] === "string") &&
                optional.every(
                  (k) => r[k] === null || typeof r[k] === "string",
                ) &&
                flags.every((k) => r[k] === null || typeof r[k] === "boolean"),
            )
          )
            throw new Error("Некорректные записи ГРЛС");
        }
        return json as GrlsSnapshot;
      })
      .catch((error) => {
        data = undefined;
        throw error;
      });
    return data;
  };
}
export async function enrichRegistration(
  load: ReturnType<typeof createGrlsLoader>,
  url: string,
  registration: string,
): Promise<GrlsLookup> {
  try {
    return lookupRegistration(await load(url), registration);
  } catch {
    return {
      status: "error",
      message:
        "Не удалось загрузить сведения ГРЛС. Данные упаковки МДЛП доступны ниже.",
    };
  }
}
