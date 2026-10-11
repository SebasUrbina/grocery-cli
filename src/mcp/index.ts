#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "../config";
import { formatPrice } from "../formatters";
import { getUser } from "../services/auth";
import { getAddresses, switchAddress } from "../services/address";
import { search, getNearbyRestaurants } from "../services/search";
import { getStoreDetail } from "../services/store";
import { getItemDetail } from "../services/product";
import { addToCart, getCart, removeFromCart } from "../services/cart";
import { getCheckoutDetail, setTip, getPaymentMethods, setPaymentMethod } from "../services/checkout";
import { placeOrder, getOrders, getOrder } from "../services/order";

const server = new McpServer({
  name: "grocery-cli",
  version: "0.0.1",
  description: [
    "Order groceries from Jumbo, Santa Isabel, and PedidosYa.",
    "",
    "Order flow: search → get_item_options (if has customizations) → add_to_cart → checkout_preview → confirm with user → place_order → track_orders",
    "",
    "IMPORTANT: Always confirm with the user before calling place_order or switch_address.",
  ].join("\n"),
});

// ─── Auth ────────────────────────────────────────────────────────────────────

server.tool("whoami", "Get current user profile", { provider: z.string().optional().default("jumbo").describe("Provider name") }, async ({ provider }) => {
  const config = await loadConfig();
  const user = await getUser(config, provider);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(user, null, 2),
    }],
  };
});

// ─── Addresses ───────────────────────────────────────────────────────────────

server.tool(
  "list_addresses",
  "List all saved delivery addresses",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const addresses = await getAddresses(config, provider);
    return { content: [{ type: "text", text: JSON.stringify(addresses, null, 2) }] };
  }
);

server.tool(
  "switch_address",
  "Switch delivery address by label (e.g. 'home', 'work'). Always confirm with the user before changing.",
  {
    label: z.string().describe("Address label (e.g. 'home', 'work')"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ label, provider }) => {
    const config = await loadConfig();
    const result = await switchAddress(label, config, provider);
    if (!result) return { content: [{ type: "text", text: `Address "${label}" not found` }] };
    return {
      content: [{ type: "text", text: `Address set to: ${result.label} (${result.address})` }],
    };
  }
);

// ─── Search ──────────────────────────────────────────────────────────────────

server.tool(
  "search",
  "Search for restaurants and menu items. Returns store UUIDs, item UUIDs, prices, and other details.",
  {
    query: z.string().describe("What to search for (e.g. 'pizza', 'sushi')"),
    provider: z.string().optional().default("jumbo").describe("Provider name: jumbo, santaisabel, pedidosya")
  },
  async ({ query, provider }) => {
    const config = await loadConfig();
    const result = await search(query, config, provider);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// ─── Restaurants ─────────────────────────────────────────────────────────────

server.tool(
  "list_restaurants",
  "List nearby restaurants",
  {
    limit: z.number().optional().default(15).describe("Max restaurants to return"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ limit, provider }) => {
    const config = await loadConfig();
    const stores = await getNearbyRestaurants(config, provider, limit);
    return { content: [{ type: "text", text: JSON.stringify(stores, null, 2) }] };
  }
);

// ─── Store ───────────────────────────────────────────────────────────────────

server.tool(
  "get_store",
  "Get restaurant details and full menu",
  {
    store_uuid: z.string().describe("Store UUID from search or restaurants"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ store_uuid, provider }) => {
    const config = await loadConfig();
    const store = await getStoreDetail(store_uuid, config, provider);
    return { content: [{ type: "text", text: JSON.stringify(store, null, 2) }] };
  }
);

// ─── Product ─────────────────────────────────────────────────────────────────

server.tool(
  "get_item_options",
  "Get item customization options — check before adding items with customizations to cart",
  {
    store_uuid: z.string().describe("Store UUID"),
    item_uuid: z.string().describe("Menu item UUID"),
    provider: z.string().optional().default("jumbo").describe("Provider name"),
  },
  async ({ store_uuid, item_uuid, provider }) => {
    const config = await loadConfig();
    const item = await getItemDetail(store_uuid, item_uuid, config, provider);
    return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
  }
);

// ─── Cart ────────────────────────────────────────────────────────────────────

server.tool(
  "add_to_cart",
  "Add an item to cart. If the item has required customizations, call get_item_options first.",
  {
    store_uuid: z.string().describe("Store UUID"),
    item_uuid: z.string().describe("Menu item UUID"),
    title: z.string().describe("Item name"),
    quantity: z.number().optional().default(1).describe("Quantity"),
    customizations: z.array(z.object({
      groupUuid: z.string(),
      choiceUuid: z.string(),
    })).optional().default([]).describe("Customization selections from get_item_options"),
    provider: z.string().optional().default("jumbo").describe("Provider name"),
  },
  async ({ store_uuid, item_uuid, title, quantity, customizations, provider }) => {
    const config = await loadConfig();

    let finalItemUuid = item_uuid;
    if (provider.toLowerCase() === "jumbo" || provider.toLowerCase() === "santaisabel") {
      try {
        const item = await getItemDetail(store_uuid, item_uuid, config, provider);
        if (item && item.uuid) {
          finalItemUuid = item.uuid;
        }
      } catch (e) {
        // Fallback
      }
    }

    const result = await addToCart({
      storeUuid: store_uuid,
      itemUuid: finalItemUuid,
      title,
      quantity,
      customizations,
    }, config, provider);
    return {
      content: [{
        type: "text",
        text: `Added ${title} x${quantity} to cart\n${JSON.stringify(result, null, 2)}`,
      }],
    };
  }
);

server.tool(
  "remove_from_cart",
  "Remove an item from the shopping cart by its shopping cart item UUID",
  {
    item_uuid: z.string().describe("Shopping cart item UUID from get_cart"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ item_uuid, provider }) => {
    const config = await loadConfig();
    const result = await removeFromCart(item_uuid, config, provider);
    return {
      content: [{
        type: "text",
        text: result ? JSON.stringify(result, null, 2) : "Removed. Cart may be empty.",
      }],
    };
  }
);

server.tool(
  "get_cart",
  "View current shopping cart",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const cart = await getCart(config, provider);
    if (!cart) return { content: [{ type: "text", text: "Cart is empty" }] };
    return { content: [{ type: "text", text: JSON.stringify(cart, null, 2) }] };
  }
);

// ─── Checkout ────────────────────────────────────────────────────────────────

server.tool(
  "checkout_preview",
  "Preview the order with full price breakdown. Always call this before place_order and show the summary to the user.",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const [cart, detail] = await Promise.allSettled([
      getCart(config, provider),
      getCheckoutDetail(config, provider),
    ]);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          cart: cart.status === "fulfilled" ? cart.value : null,
          summary: detail.status === "fulfilled" ? detail.value : null,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "set_tip",
  "Set tip percentage for the delivery driver. Common options: 0, 5, 10, 15, 20.",
  {
    percent: z.number().describe("Tip percentage (e.g. 15) or 0 to remove"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ percent, provider }) => {
    const config = await loadConfig();
    await setTip(percent, config, provider);
    return {
      content: [{ type: "text", text: percent > 0 ? `Tip set to ${percent}%` : "Tip removed" }],
    };
  }
);

server.tool(
  "list_payment_methods",
  "List saved payment methods",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const methods = await getPaymentMethods(config, provider);
    return { content: [{ type: "text", text: JSON.stringify(methods, null, 2) }] };
  }
);

server.tool(
  "set_payment_method",
  "Set the payment method for checkout",
  {
    payment_uuid: z.string().describe("Payment profile UUID from list_payment_methods"),
    provider: z.string().optional().default("jumbo").describe("Provider name")
  },
  async ({ payment_uuid, provider }) => {
    const config = await loadConfig();
    await setPaymentMethod(payment_uuid, config, provider);
    return { content: [{ type: "text", text: `Payment method set to ${payment_uuid}` }] };
  }
);

// ─── Order ───────────────────────────────────────────────────────────────────

server.tool(
  "place_order",
  "Place the order. ALWAYS call checkout_preview first and get explicit user confirmation before calling this.",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const result = await placeOrder(config, provider);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "track_orders",
  "Track active and past orders",
  { provider: z.string().optional().default("jumbo").describe("Provider name") },
  async ({ provider }) => {
    const config = await loadConfig();
    const data = await getOrders(config, provider);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_order",
  "Get details of a specific order",
  {
    uuid: z.string().describe("Order UUID"),
    provider: z.string().optional().default("jumbo").describe("Provider name"),
  },
  async ({ uuid, provider }) => {
    const config = await loadConfig();
    const data = await getOrder(uuid, config, provider);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[grocery-mcp] server running — 16 tools available");
