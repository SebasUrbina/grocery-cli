import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { addToCart } from "../services/cart";
import { getItemDetail } from "../services/product";
import { withSpinner, ok, dim, bold, warn } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));

const storeUuid = args[0];
const itemUuid = args[1];
const itemName = args[2] || "Item";
const quantity = parseInt(args[3] || "1");
const customizationsArg = args[4];

if (!storeUuid || !itemUuid) {
  console.error('Usage: grocery add-to-cart <store_uuid> <item_uuid> [name] [qty] [customization_uuids] [--provider <name>]');
  process.exit(1);
}

const customizations = customizationsArg
  ? customizationsArg.split(",").map((c) => {
      const [groupUuid, choiceUuid] = c.trim().split(":");
      if (!groupUuid || !choiceUuid) {
        console.error("Customizations must use groupUuid:choiceUuid pairs.");
        process.exit(1);
      }
      return { groupUuid, choiceUuid };
    })
  : [];

const config = await loadConfig();

try {
  const result = await withSpinner(`Adding to cart on ${provider}...`, async () => {
    // If we're using a Cencosud provider, we might need the SKU ID instead of the slug to add to cart
    let finalItemUuid = itemUuid;
    if (provider.toLowerCase() === "jumbo" || provider.toLowerCase() === "santaisabel") {
      try {
        const item = await getItemDetail(storeUuid, itemUuid, config, provider);
        if (item && item.uuid) {
          finalItemUuid = item.uuid;
        }
      } catch (e) {
        // Fallback to the provided uuid if getProduct fails
      }
    }

    return addToCart({
      storeUuid,
      itemUuid: finalItemUuid,
      title: itemName,
      quantity,
      price: 0,
      customizations,
    }, config, provider);
  });

  console.log(`\n${ok(`Added ${bold(itemName)} x${quantity} to cart`)}`);

  if (result.stores?.length) {
    for (const store of result.stores) {
      console.log(`\n  ${bold(store.storeName)}`);
      for (const p of store.items) {
        console.log(`    ${p.title} ${dim(`x${p.quantity}`)} -- ${formatPrice(p.totalPrice / 100)}`);
      }
      console.log(`\n  ${dim("Total")} ${bold(formatPrice(store.total / 100))}`);
    }
  }
  console.log();
} catch (e: any) {
  console.log(`\n  Error: ${e.message}\n`);
  process.exit(1);
}
