import { createCatalogService, type CatalogRequest } from "./catalog-service";
const handle = createCatalogService();
self.onmessage = (event: MessageEvent<CatalogRequest>) => {
  void handle(event.data, (message) => self.postMessage(message));
};
