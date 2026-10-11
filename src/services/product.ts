import type { Config } from "../schemas/config";
import type { ItemDetail } from "../schemas/product";
import { getProvider } from "../providers";

export async function getItemDetail(
  storeUuid: string,
  itemUuid: string,
  config: Config,
  providerName: string
): Promise<ItemDetail> {
  const provider = getProvider(providerName);
  return provider.getProduct(itemUuid, storeUuid, config);
}
