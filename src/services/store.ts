import type { Config } from "../schemas/config";
import type { StoreDetail } from "../schemas/store";
import { getProvider } from "../providers";

export async function getStoreDetail(
  storeUuidOrSlug: string,
  config: Config,
  providerName: string
): Promise<StoreDetail> {
  const provider = getProvider(providerName);
  return provider.getStore(storeUuidOrSlug, config);
}
