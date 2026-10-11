import { requireApiKey } from "./api-keys";
import { CencosudProvider } from "./cencosud";

export class SantaIsabelProvider extends CencosudProvider {
  name = "SantaIsabel";
  loginUrl = "https://www.santaisabel.cl/";
  baseUrl = "https://www.santaisabel.cl/api";
  bffBaseUrl = "https://be-reg-groceries-bff-sisa.ecomm.cencosud.com";
  cartBaseUrl = "https://be-reg-groceries-bff-sisa.ecomm.cencosud.com";
  storeId = "santaisabel-cl";
  defaultStoreCode = "huerfanos";
  get catalogApiKey() { return requireApiKey("SANTAISABEL_CATALOG_API_KEY"); }
  get cartApiKey() { return requireApiKey("SANTAISABEL_CART_API_KEY"); }
  get locationApiKey() { return requireApiKey("SANTAISABEL_LOCATION_API_KEY"); }
  get sessionApiKey() { return requireApiKey("SANTAISABEL_SESSION_API_KEY"); }
  get ordersApiKey() { return requireApiKey("SANTAISABEL_ORDERS_API_KEY"); }
}
