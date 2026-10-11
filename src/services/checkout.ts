import type { Config } from "../schemas/config";
import type { CheckoutDetail } from "../schemas/checkout";
import type { PaymentMethod } from "../schemas/checkout";
import { getProvider } from "../providers";

export async function getCheckoutDetail(config: Config, providerName: string): Promise<CheckoutDetail> {
  const provider = getProvider(providerName);
  return provider.getCheckout(config);
}

export async function getPaymentMethods(config: Config, providerName: string): Promise<PaymentMethod[]> {
  return [];
}

export async function setTip(
  tipPercent: number,
  config: Config,
  providerName: string
): Promise<void> {
  // Stub
}

export async function setPaymentMethod(
  paymentProfileUuid: string,
  config: Config,
  providerName: string
): Promise<void> {
  // Stub
}
