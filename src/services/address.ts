import type { Config } from "../schemas/config";
import type { SavedAddress } from "../schemas/address";
import { getProvider } from "../providers";

export async function getAddresses(config: Config, providerName: string): Promise<SavedAddress[]> {
  try {
    const provider = getProvider(providerName);
    return provider.getAddresses(config);
  } catch {
    return [];
  }
}

export async function setAddress(address: string, config: Config, providerName: string): Promise<void> {
  // TODO: Map to provider interface
}

export async function switchAddress(label: string, config: Config, providerName: string): Promise<SavedAddress | null> {
  const addresses = await getAddresses(config, providerName);
  const match = addresses.find(
    (a) => a.label.toLowerCase() === label.toLowerCase()
  );
  if (!match) return null;

  // TODO: Actually switch the address on the backend if needed by the provider
  return match;
}
