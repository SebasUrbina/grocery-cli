import type { Config } from "../schemas/config";
import type { CartResponse, AddToCartInput } from "../schemas/cart";
import { getProvider } from "../providers";

export async function addToCart(
  input: AddToCartInput,
  config: Config,
  providerName: string
): Promise<CartResponse> {
  const provider = getProvider(providerName);
  return provider.addToCart(input.itemUuid, input.quantity || 1, input.customizations, config);
}

export async function getCart(config: Config, providerName: string): Promise<CartResponse | null> {
  const provider = getProvider(providerName);
  return provider.getCart(config);
}

export async function removeFromCart(
  itemUuid: string,
  config: Config,
  providerName: string
): Promise<CartResponse | null> {
  const provider = getProvider(providerName);
  return provider.removeFromCart(itemUuid, config);
}
