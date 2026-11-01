import {
  createCatalogLoader,
  searchCatalog,
  type CatalogProduct,
} from "./catalog";
import { createGrlsLoader, enrichRegistration, type GrlsLookup } from "./grls";
export interface CatalogRequest {
  id: number;
  url: string;
  query?: string;
  byCode?: boolean;
  includeRegistration?: boolean;
  registrationOnly?: string;
}
export interface CatalogResponse {
  id: number;
  products?: CatalogProduct[];
  grls?: GrlsLookup;
  error?: string;
}
export function createCatalogService(fetcher: typeof fetch = fetch) {
  const load = createCatalogLoader(fetcher);
  const loadGrls = createGrlsLoader(fetcher);
  return async (
    request: CatalogRequest,
    post: (response: CatalogResponse) => void,
  ) => {
    const {
      id,
      url,
      query = "",
      byCode = false,
      includeRegistration,
      registrationOnly,
    } = request;
    try {
      if (registrationOnly) {
        post({
          id,
          grls: await enrichRegistration(
            loadGrls,
            new URL("grls.json", url).href,
            registrationOnly,
          ),
        });
        return;
      }
      const products = searchCatalog(await load(url), query, byCode);
      const registration = includeRegistration
        ? products[0]?.registration
        : undefined;
      post({
        id,
        products,
        ...(registration ? { grls: { status: "loading" } as GrlsLookup } : {}),
      });
      if (registration)
        post({
          id,
          products,
          grls: await enrichRegistration(
            loadGrls,
            new URL("grls.json", url).href,
            registration,
          ),
        });
    } catch {
      post({
        id,
        error:
          "Не удалось загрузить каталог. Проверьте соединение и повторите поиск.",
      });
    }
  };
}
