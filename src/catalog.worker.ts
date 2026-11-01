import { searchCatalog, createCatalogLoader } from "./catalog";
const load = createCatalogLoader();
self.onmessage = async (
  event: MessageEvent<{
    id: number;
    query: string;
    byCode: boolean;
    url: string;
  }>,
) => {
  const { id, query, byCode, url } = event.data;
  try {
    const products = searchCatalog(await load(url), query, byCode);
    self.postMessage({ id, products });
  } catch {
    self.postMessage({
      id,
      error:
        "Не удалось загрузить каталог. Проверьте соединение и повторите поиск.",
    });
  }
};
