import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  createGrlsLoader,
  lookupRegistration,
  registrationKey,
  type GrlsSnapshot,
  type GrlsRegistration,
} from "../src/grls";
import {
  createCatalogService,
  type CatalogResponse,
} from "../src/catalog-service";
import type { CatalogRow } from "../src/catalog";
import { DEMO_MEDICATIONS } from "../src/demo-medications";
const record: GrlsRegistration = {
  registration: "ЛП-№(010175)-(РГ-RU)",
  name: "Амлодипин",
  status: "Действующий",
  registeredAt: "2020-01-02",
  expiresAt: null,
  holder: "Держатель",
  country: "Россия",
  group: "Группа",
  vital: null,
  narcotic: null,
  orphan: null,
  manufacturing: null,
  documents: null,
};
const snapshot: GrlsSnapshot = {
  schemaVersion: 1,
  snapshotDate: "2026-10-30",
  source: "https://grls.minzdrav.gov.ru/grls.aspx",
  registrations: { [registrationKey(record.registration)!]: [record] },
};
const row: CatalogRow = [
  "04607143562394",
  "Амлодипин",
  "АМЛОДИПИН",
  "5 мг",
  "ТАБЛЕТКИ",
  "Производитель упаковки",
  "30 шт",
  30,
  "табл.",
  "Описание",
  record.registration,
];
const reply = (value: unknown) =>
  new Response(JSON.stringify(value), { status: 200 });
test("GRLS normalizes formatting only and retains leading zeros and meaningful letters", () => {
  assert.equal(
    registrationKey("лп № (010175) (рг-ru)"),
    registrationKey(record.registration),
  );
  assert.equal(
    registrationKey("П N015875/01"),
    registrationKey("П № 015875/01"),
  );
  assert.notEqual(registrationKey("ЛП-00123"), registrationKey("ЛП-0123"));
  assert.notEqual(registrationKey("ЛП-123-N"), registrationKey("ЛП-123"));
  assert.equal(registrationKey("~"), null);
});
test("GRLS lookup preserves conflicting variants and does not approximate missing RUs", () => {
  const data = structuredClone(snapshot);
  data.registrations[registrationKey(record.registration)!].push({
    ...record,
    holder: "Другой держатель",
  });
  const result = lookupRegistration(data, record.registration);
  assert.equal(result.status, "matched");
  if (result.status === "matched") assert.equal(result.variants.length, 2);
  assert.equal(lookupRegistration(data, "ЛП-01017").status, "not_found");
  assert.equal(record.vital, null);
});
test("GRLS errors are retryable and successful downloads are cached", async () => {
  let calls = 0;
  const load = createGrlsLoader((async () => {
    calls++;
    if (calls === 1) throw new Error("offline");
    return reply(snapshot);
  }) as typeof fetch);
  await assert.rejects(load("grls.json"));
  const [a, b] = await Promise.all([load("grls.json"), load("grls.json")]);
  assert.equal(calls, 2);
  assert.equal(a, b);
  const invalid = createGrlsLoader((async () =>
    reply({
      ...snapshot,
      registrations: { key: [{ ...record, vital: "~" }] },
    })) as typeof fetch);
  await assert.rejects(invalid("grls.json"), /Некорректные записи/);
});
test("Ordinary catalog searches never download GRLS", async () => {
  const urls: string[] = [];
  const handle = createCatalogService((async (url) => {
    urls.push(String(url));
    return reply([row]);
  }) as typeof fetch);
  const posts: CatalogResponse[] = [];
  await handle(
    {
      id: 1,
      url: "https://example.test/aptechka/catalog/medications.json",
      query: "Амлодипин",
    },
    (p) => posts.push(p),
  );
  assert.equal(urls.length, 1);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].products?.[0].manufacturer, row[5]);
  assert.equal(posts[0].grls, undefined);
});
test("Card enrichment keeps package fields intact and resolves GRLS under the deployment subpath", async () => {
  const urls: string[] = [];
  const handle = createCatalogService((async (url) => {
    urls.push(String(url));
    return reply(String(url).endsWith("grls.json") ? snapshot : [row]);
  }) as typeof fetch);
  const posts: CatalogResponse[] = [];
  await handle(
    {
      id: 7,
      url: "https://example.test/aptechka/catalog/medications.json",
      query: row[0],
      byCode: true,
      includeRegistration: true,
    },
    (p) => posts.push(p),
  );
  assert.equal(posts[0].grls?.status, "loading");
  assert.equal(posts[1].grls?.status, "matched");
  assert.equal(urls[1], "https://example.test/aptechka/catalog/grls.json");
  assert.deepEqual(posts[0].products, posts[1].products);
  assert.equal(posts[1].products?.[0].strength, "5 мг");
  assert.equal(posts[1].products?.[0].manufacturer, "Производитель упаковки");
});
test("Unavailable GRLS keeps MDLP visible; retry fetches GRLS only", async () => {
  let fail = true;
  const urls: string[] = [];
  const handle = createCatalogService((async (url) => {
    urls.push(String(url));
    if (String(url).endsWith("grls.json")) {
      if (fail) throw new Error("offline");
      return reply(snapshot);
    }
    return reply([row]);
  }) as typeof fetch);
  const posts: CatalogResponse[] = [];
  const url = "https://example.test/app/catalog/medications.json";
  await handle(
    { id: 1, url, query: row[0], byCode: true, includeRegistration: true },
    (p) => posts.push(p),
  );
  assert.equal(posts[1].grls?.status, "error");
  assert.equal(posts[1].products?.[0].gtin, row[0]);
  assert.equal(posts[1].error, undefined);
  fail = false;
  await handle({ id: 2, url, registrationOnly: record.registration }, (p) =>
    posts.push(p),
  );
  assert.equal(posts.at(-1)?.grls?.status, "matched");
  assert.equal(posts.at(-1)?.products, undefined);
  assert.equal(urls.filter((u) => u.endsWith("medications.json")).length, 1);
});
test("Prepared snapshot enriches all three demo packages and metadata matches actual joins", () => {
  const data = JSON.parse(
    readFileSync(
      new URL("../public/catalog/grls.json", import.meta.url),
      "utf8",
    ),
  ) as GrlsSnapshot;
  const rows = JSON.parse(
    readFileSync(
      new URL("../public/catalog/medications.json", import.meta.url),
      "utf8",
    ),
  ) as CatalogRow[];
  for (const med of DEMO_MEDICATIONS) {
    const row = rows.find((r) => r[0] === med.gtin)!;
    const result = lookupRegistration(data, row[10]);
    assert.equal(result.status, "matched");
    if (result.status === "matched")
      assert.ok(
        result.variants.every(
          (v) => registrationKey(v.registration) === registrationKey(row[10]),
        ),
      );
  }
  const metadata = JSON.parse(
    readFileSync(
      new URL("../public/catalog/grls-metadata.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    metadata.matching.matchedPackages,
    rows.filter((r) => lookupRegistration(data, r[10]).status === "matched")
      .length,
  );
  assert.equal(metadata.records, 29363);
  assert.equal(data.snapshotDate, "2026-10-30");
  assert.equal(
    Object.keys(data.registrations).length,
    metadata.registrationKeys,
  );
  assert.ok(
    Object.values(data.registrations)
      .flat()
      .every(
        (r) =>
          ![
            "Изменённый",
            "Исключённый",
            "Истёкший",
            "Приостановлено применение",
          ].includes(r.status),
      ),
  );
});
