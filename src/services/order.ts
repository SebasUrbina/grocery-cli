import type { Config } from "../schemas/config";
import type { OrdersResponse, OrderDetail } from "../schemas/order";
import { getProvider } from "../providers";

export async function placeOrder(config: Config, providerName: string): Promise<any> {
  const provider = getProvider(providerName);
  return provider.placeOrder(config);
}

export async function getOrders(config: Config, providerName: string): Promise<OrdersResponse> {
  const provider = getProvider(providerName);
  if (provider.getOrders) {
    return provider.getOrders(config);
  }
  return { activeOrders: [], pastOrders: [] };
}

export async function getOrder(uuid: string, config: Config, providerName: string): Promise<OrderDetail> {
  const provider = getProvider(providerName);
  if (provider.getOrder) {
    return provider.getOrder(uuid, config);
  }
  throw new Error(`getOrder is not implemented for provider ${providerName}`);
}
