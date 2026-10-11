import { loadConfig, saveConfig } from "../config";
import { formatPrice } from "../formatters";
import { placeOrder } from "../services/order";
import { getCheckoutDetail } from "../services/checkout";
import { withSpinner, brandBold, success, error, dim, bold, warn } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));

const config = await loadConfig();

try {
  const detail = await withSpinner(`Reviewing order on ${provider}...`, () => getCheckoutDetail(config, provider));

  console.log(`\n  ${brandBold("Order Confirmation")}`);
  console.log(`  ${dim("Total:")} ${bold(formatPrice(detail.total / 100))}`);
  if (detail.paymentMethod) {
    console.log(`  ${dim("Payment:")} ${detail.paymentMethod.type} ending in ${detail.paymentMethod.lastFour || ""}`);
  } else {
    console.log(`  ${dim("Payment:")} Not selected`);
  }

  console.log(`\n  ${warn("Placing order is currently mock-only for safety/missing APIs.")}\n`);

  // const result = await withSpinner("Placing order...", () => placeOrder(config, provider));
  // config.draftOrderUuid = undefined;
  // await saveConfig(config);

  console.log(`  ${success("\u2713")} Order placed successfully! (Mocked)`);
  // console.log(`  ${dim("Order ID:")} ${result.orderId || "N/A"}`);
  console.log(`  ${dim("ETA:")} ${detail.estimatedDelivery || "N/A"}\n`);

} catch (e: any) {
  console.log(`\n  ${error(e.message)}\n`);
  process.exit(1);
}
