import type { Config } from "../schemas/config";
import type { SearchResult, SearchStore } from "../schemas/search";
import { getProvider } from "../providers";

export async function search(
  query: string,
  config: Config,
  providerName: string
): Promise<SearchResult> {
  const provider = getProvider(providerName);
  return provider.search(query, config);
}

export async function getNearbyRestaurants(
  config: Config,
  providerName: string,
  limit = 15
): Promise<SearchStore[]> {
  const provider = getProvider(providerName);
  if (provider.getNearbyStores) {
    return provider.getNearbyStores(config, limit);
  }
  // Fallback if not implemented
  return [];
}
