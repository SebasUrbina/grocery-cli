import type { Config } from "../schemas/config";
import type { User } from "../schemas/auth";
import type { SearchResult, SearchStore } from "../schemas/search";
import type { StoreDetail } from "../schemas/store";
import type { ItemDetail } from "../schemas/product";
import type { CartResponse } from "../schemas/cart";
import type { CheckoutDetail } from "../schemas/checkout";
import type { SavedAddress } from "../schemas/address";
import type { OrdersResponse, OrderDetail } from "../schemas/order";

export interface IProvider {
  name: string;
  loginUrl?: string;

  getUser(config: Config): Promise<User>;
  search(query: string, config: Config): Promise<SearchResult>;
  getNearbyStores?(config: Config, limit?: number): Promise<SearchStore[]>;
  getStore(storeId: string, config: Config): Promise<StoreDetail>;
  getProduct(productId: string, storeId: string, config: Config): Promise<ItemDetail>;

  addToCart(productId: string, quantity: number, options: any, config: Config): Promise<CartResponse>;
  getCart(config: Config): Promise<CartResponse>;
  removeFromCart(itemId: string, config: Config): Promise<CartResponse>;

  getAddresses(config: Config): Promise<SavedAddress[]>;

  getCheckout(config: Config): Promise<CheckoutDetail>;
  placeOrder(config: Config, tip?: number): Promise<any>;
  getOrders?(config: Config): Promise<OrdersResponse>;
  getOrder?(uuid: string, config: Config): Promise<OrderDetail>;
}
