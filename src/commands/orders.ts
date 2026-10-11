import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { getOrders } from "../services/order";
import { printTable, withSpinner, dim, warn } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider } = parseProviderArgs(process.argv.slice(2));

const config = await loadConfig();
const data = await withSpinner(`Loading orders for ${provider}...`, () => getOrders(config, provider));

if (data.activeOrders?.length) {
  printTable({
    title: "Active Orders",
    head: ["UUID", "Restaurant", "Status", "ETA", "Total"],
    rows: data.activeOrders.map((o) => [
      o.uuid.slice(0, 8) + "...",
      o.storeName,
      o.state,
      o.eta || null,
      o.total ? formatPrice(o.total) : null,
    ]),
  });
  console.log();
} else {
  console.log(`\n  ${dim("No active orders.")}\n`);
}

if (data.pastOrders?.length) {
  printTable({
    title: "Past Orders",
    head: ["UUID", "Restaurant", "Status", "Total", "Date"],
    rows: data.pastOrders.slice(0, 10).map((o) => [
      o.uuid.slice(0, 8) + "...",
      o.storeName,
      o.state,
      o.total ? formatPrice(o.total) : null,
      o.placedAt || null,
    ]),
  });
  console.log();
}
