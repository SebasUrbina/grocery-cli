import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { removeFromCart, getCart } from "../services/cart";
import { withSpinner, ok, fail, dim, bold } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));
const itemUuid = args[0];

if (!itemUuid) {
  console.error("Usage: grocery remove-from-cart <item_uuid> [--provider <name>]");
  console.error('  item_uuid: shopping cart item UUID from "grocery cart"');
  process.exit(1);
}

const config = await loadConfig();

const cart = await withSpinner(`Loading cart from ${provider}...`, () => getCart(config, provider));
if (!cart) {
  console.log(`\n${fail("Cart is empty.")}\n`);
  process.exit(1);
}

let found = false;
for (const store of cart.stores) {
  const item = store.items.find((i) => i.uuid === itemUuid);
  if (item) {
    console.log(`\n  ${dim("Removing")} ${bold(item.title)} ${dim(`x${item.quantity} from ${store.storeName}`)}`);
    found = true;
    break;
  }
}

if (!found) {
  console.log(`\n${fail(`Item "${itemUuid}" not found in cart.`)}`);
  console.log(`  ${dim("Run")} grocery cart --provider ${provider} ${dim("to see item UUIDs.")}\n`);
  process.exit(1);
}

await withSpinner("Removing...", () => removeFromCart(itemUuid, config, provider));
console.log(`${ok("Removed from cart")}\n`);

const updated = await getCart(config, provider);
if (!updated || !updated.stores.length) {
  console.log(`  ${dim("Cart is now empty.")}\n`);
} else {
  for (const store of updated.stores) {
    console.log(`  ${bold(store.storeName)}`);
    for (const p of store.items) {
      console.log(`    ${p.title} ${dim(`x${p.quantity}`)} -- ${formatPrice(p.totalPrice / 100)}`);
    }
    console.log(`  ${dim("Total")} ${bold(formatPrice(store.total / 100))}\n`);
  }
}
