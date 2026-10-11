import type { IProvider } from "./types";
import type { Config } from "../schemas/config";
import type { SearchResult, SearchStore } from "../schemas/search";
import type { StoreDetail } from "../schemas/store";
import type { ItemDetail } from "../schemas/product";
import type { CartResponse } from "../schemas/cart";
import type { CheckoutDetail } from "../schemas/checkout";

export class PedidosYaProvider implements IProvider {
  name = "PedidosYa";
  baseUrl = "https://www.pedidosya.cl/api/v1";

  async getUser(config: Config): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async search(query: string, config: Config): Promise<SearchResult> {
    throw new Error("Method not implemented.");
  }

  async getStore(storeId: string, config: Config): Promise<StoreDetail> {
    throw new Error("Method not implemented.");
  }

  async getProduct(productId: string, storeId: string, config: Config): Promise<ItemDetail> {
    throw new Error("Method not implemented.");
  }

  async addToCart(productId: string, quantity: number, options: any, config: Config): Promise<CartResponse> {
    throw new Error("Method not implemented.");
  }

  async getCart(config: Config): Promise<CartResponse> {
    throw new Error("Method not implemented.");
  }

  async removeFromCart(itemId: string, config: Config): Promise<CartResponse> {
    throw new Error("Method not implemented.");
  }

  async getAddresses(config: Config): Promise<import("../schemas/address").SavedAddress[]> {
    throw new Error("Method not implemented.");
  }

  async getCheckout(config: Config): Promise<CheckoutDetail> {
    throw new Error("Method not implemented.");
  }

  async placeOrder(config: Config, tip?: number): Promise<any> {
    throw new Error("Method not implemented.");
  }
}
