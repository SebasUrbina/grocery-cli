import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { getOrder } from "../services/order";
import { printTable, withSpinner, bold, dim, chalk, uberGreenBold } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));
const uuid = args[0];

if (!uuid) {
  console.error("Usage: grocery order <uuid> [--provider <name>]");
  process.exit(1);
}

const config = await loadConfig();
const order = await withSpinner(`Loading order ${uuid} for ${provider}...`, () => getOrder(uuid, config, provider));

console.log(`\n${bold("Order Details")} - ${order.uuid}`);
console.log(`${dim("Store:")} ${order.storeName}`);
console.log(`${dim("Status:")} ${order.state}`);
if (order.placedAt) console.log(`${dim("Placed At:")} ${new Date(order.placedAt).toLocaleString()}`);
if (order.eta) console.log(`${dim("ETA:")} ${order.eta}`);

if (order.deliveryAddress) {
  console.log(`\n${bold("Delivery Info")}`);
  console.log(`${dim("Address:")} ${order.deliveryAddress}`);
  if (order.receiverName) console.log(`${dim("Receiver:")} ${order.receiverName} ${order.receiverPhone ? `(${order.receiverPhone})` : ""}`);
}

console.log();
printTable({
  title: "Items",
  head: ["Product", "Qty", "Unit Price", "Total"],
  rows: order.items.map((item) => [
    item.title.length > 40 ? item.title.slice(0, 37) + "..." : item.title,
    item.quantity.toString(),
    formatPrice(item.unitPrice / 100),
    formatPrice(item.totalPrice / 100),
  ]),
});
console.log();

console.log(`${bold("Summary:")}`);
console.log(`  ${dim("Subtotal:")} ${formatPrice(order.subtotal / 100)}`);
if (order.deliveryFee > 0) console.log(`  ${dim("Delivery:")} ${formatPrice(order.deliveryFee / 100)}`);
if (order.discounts < 0) console.log(`  ${dim("Discounts:")} ${formatPrice(order.discounts / 100)}`);
console.log(`  ${bold("Total:")} ${uberGreenBold(formatPrice(order.total / 100))}`);

if (order.urlInvoice) {
  console.log(`\n${dim("Invoice URL:")}\n${chalk.cyan(order.urlInvoice)}`);
}

console.log();
