import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { getStoreDetail } from "../services/store";
import { printDetail, printTable, withSpinner, uberGreenBold, dim, bold, hint, success, warn } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));
const storeUuid = args[0];

if (!storeUuid) {
  console.error("Usage: grocery store <store_uuid> [--provider <name>]");
  process.exit(1);
}

const config = await loadConfig();
const store = await withSpinner(`Loading store on ${provider}...`, () => getStoreDetail(storeUuid, config, provider));

const status = store.isOpen !== false ? success("OPEN") : warn("CLOSED");

printDetail(store.title, [
  ["UUID", store.uuid],
  ["Address", store.address],
  ["Status", status],
  ["ETA", store.etaRange],
  ["Rating", store.rating ? String(store.rating) : null],
  ["Price Range", store.priceRange],
  ["Delivery Fee", store.deliveryFee != null ? formatPrice(store.deliveryFee) : null],
  ["Categories", store.categories?.join(", ")],
]);

if (store.sections?.length) {
  console.log(`  ${uberGreenBold("Menu")}\n`);

  for (const section of store.sections) {
    printTable({
      title: section.title,
      head: ["UUID", "Item", "Price", ""],
      rows: section.items.map((item) => {
        const price = formatPrice(item.price / 100);
        const flags = [
          item.isAvailable === false ? dim("UNAVAILABLE") : null,
          item.hasCustomizations ? dim("[+options]") : null,
        ].filter(Boolean).join(" ");
        return [item.uuid.slice(0, 8) + "...", item.title, price, flags || null];
      }),
    });
  }
}
