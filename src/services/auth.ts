import type { Config } from "../schemas/config";
import type { User } from "../schemas/auth";
import { getProvider } from "../providers";

export async function getUser(config: Config, providerName: string): Promise<User> {
  const provider = getProvider(providerName);
  return provider.getUser(config);
}
