import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { getCart } from "../services/cart";
import { printTable, withSpinner, brandBold, dim, bold } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider } = parseProviderArgs(process.argv.slice(2));

const config = await loadConfig();

try {
  const cart = await withSpinner(`Loading cart on ${provider}...`, () => getCart(config, provider));

  if (!cart || !cart.stores.length) {
    console.log("\n  Your cart is empty.\n");
    process.exit(0);
  }

  console.log(`\n  ${brandBold("Cart")} ${dim(`(${cart.draftOrderUuid.slice(0, 8)}...)`)}\n`);

  for (const store of cart.stores) {
    printTable({
      title: `${store.storeName}`,
      head: ["Item", "Qty", "Price"],
      rows: store.items.map((item) => [
        item.title,
        `x${item.quantity}`,
        formatPrice(item.totalPrice / 100),
      ]),
    });

    if (store.deliveryFee > 0) console.log(`  ${dim("Delivery")}  ${formatPrice(store.deliveryFee / 100)}`);
    if (store.serviceFee > 0) console.log(`  ${dim("Service fee")}  ${formatPrice(store.serviceFee / 100)}`);
    console.log(`  ${dim("Store total")}  ${bold(formatPrice(store.total / 100))}`);
    console.log();
  }

  console.log(`  ${dim("Subtotal")}     ${formatPrice(cart.subtotal / 100)}`);
  console.log(`  ${dim("Delivery")}     ${formatPrice(cart.deliveryFee / 100)}`);
  console.log(`  ${dim("Service fee")}   ${formatPrice(cart.serviceFee / 100)}`);
  console.log(`  ${bold("Total")}        ${bold(formatPrice(cart.total / 100))}`);
  console.log();
  console.log(`  Run ${bold(`grocery checkout --provider ${provider}`)} to proceed\n`);
} catch (e: any) {
  console.log(`\n  ${e.message}\n`);
  process.exit(1);
}
