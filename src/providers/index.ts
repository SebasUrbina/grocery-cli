import type { IProvider } from "./types";
// import { UberEatsProvider } from "./ubereats";
import { JumboProvider } from "./jumbo";
import { SantaIsabelProvider } from "./santaisabel";
import { PedidosYaProvider } from "./pedidosya";

const providers: Record<string, IProvider> = {
  // ubereats: new UberEatsProvider(),
  jumbo: new JumboProvider(),
  santaisabel: new SantaIsabelProvider(),
  pedidosya: new PedidosYaProvider(),
};

export function getProvider(name: string): IProvider {
  const provider = providers[name.toLowerCase()];
  if (!provider) {
    throw new Error(`Provider "${name}" not found. Available providers: ${Object.keys(providers).join(", ")}`);
  }
  return provider;
}
