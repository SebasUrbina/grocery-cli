import { requireApiKey } from "./api-keys";
import { CencosudProvider } from "./cencosud";

export class JumboProvider extends CencosudProvider {
  name = "Jumbo";
  loginUrl = "https://www.jumbo.cl/";
  baseUrl = "https://www.jumbo.cl/api";
  bffBaseUrl = "https://bff.jumbo.cl";
  cartBaseUrl = "https://be-reg-groceries-bff-jumbo.ecomm.cencosud.com";
  storeId = "jumbo-cl";
  defaultStoreCode = "jumboclj512";
  get catalogApiKey() { return requireApiKey("JUMBO_CATALOG_API_KEY"); }
  get cartApiKey() { return requireApiKey("JUMBO_CART_API_KEY"); }
  get locationApiKey() { return requireApiKey("JUMBO_LOCATION_API_KEY"); }
  get sessionApiKey() { return requireApiKey("JUMBO_SESSION_API_KEY"); }
  get ordersApiKey() { return requireApiKey("JUMBO_ORDERS_API_KEY"); }
}
