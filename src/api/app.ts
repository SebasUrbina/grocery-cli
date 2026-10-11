import { Hono } from "hono";
import { cors } from "hono/cors";
import { loadConfig } from "../config";
import { getUser } from "../services/auth";
import { getAddresses, switchAddress } from "../services/address";
import { search, getNearbyRestaurants } from "../services/search";
import { getStoreDetail } from "../services/store";
import { getItemDetail } from "../services/product";
import { addToCart, getCart, removeFromCart } from "../services/cart";
import { getCheckoutDetail, setTip, getPaymentMethods } from "../services/checkout";
import { placeOrder, getOrders } from "../services/order";
import type { Config } from "../schemas/config";

type Variables = { config: Config };

const app = new Hono<{ Variables: Variables }>();

app.use("*", cors());

app.use("/api/*", async (c, next) => {
  const config = await loadConfig();
  c.set("config", config);
  await next();
});

// --- Auth ---

app.get("/api/whoami", async (c) => {
  const config = c.get("config");
  const provider = c.req.query("provider") || "jumbo";
  return c.json(await getUser(config, provider));
});

// --- Search ---

app.get("/api/search", async (c) => {
  const q = c.req.query("q");
  const provider = c.req.query("provider") || "jumbo";
  if (!q) return c.json({ error: "Missing query parameter 'q'" }, 400);
  const config = c.get("config");
  return c.json(await search(q, config, provider));
});

// --- Restaurants ---

app.get("/api/restaurants", async (c) => {
  const config = c.get("config");
  const limit = parseInt(c.req.query("limit") || "15");
  const provider = c.req.query("provider") || "jumbo";
  return c.json(await getNearbyRestaurants(config, provider, limit));
});

// --- Store ---

app.get("/api/store/:uuid", async (c) => {
  const config = c.get("config");
  const uuid = c.req.param("uuid");
  return c.json(await getStoreDetail(uuid, config, c.req.query("provider") || "jumbo"));
});

// --- Product ---

app.get("/api/product/:storeUuid/:itemUuid", async (c) => {
  const config = c.get("config");
  return c.json(await getItemDetail(c.req.param("storeUuid"), c.req.param("itemUuid"), config, c.req.query("provider") || "jumbo"));
});

// --- Cart ---

app.post("/api/cart/add", async (c) => {
  const config = c.get("config");
  const body = await c.req.json<{
    storeUuid: string;
    itemUuid: string;
    title: string;
    quantity?: number;
    customizations?: { groupUuid: string; choiceUuid: string }[];
  }>();
  if (!body.storeUuid || !body.itemUuid || !body.title) {
    return c.json({ error: "Missing required fields: storeUuid, itemUuid, title" }, 400);
  }

  let finalItemUuid = body.itemUuid;
  const provider = c.req.query("provider") || "jumbo";
  if (provider.toLowerCase() === "jumbo" || provider.toLowerCase() === "santaisabel") {
    try {
      const item = await getItemDetail(body.storeUuid, body.itemUuid, config, provider);
      if (item && item.uuid) {
        finalItemUuid = item.uuid;
      }
    } catch (e) {
      // Fallback
    }
  }

  return c.json(await addToCart({ ...body, itemUuid: finalItemUuid }, config, provider));
});

app.delete("/api/cart/item/:itemUuid", async (c) => {
  const config = c.get("config");
  return c.json(await removeFromCart(c.req.param("itemUuid"), config, c.req.query("provider") || "jumbo"));
});

app.get("/api/cart", async (c) => {
  const config = c.get("config");
  return c.json(await getCart(config, c.req.query("provider") || "jumbo"));
});

// --- Tip ---

app.post("/api/tip", async (c) => {
  const config = c.get("config");
  const body = await c.req.json<{ percent: number }>();
  if (body.percent === undefined) return c.json({ error: "Missing: percent" }, 400);
  await setTip(body.percent, config, c.req.query("provider") || "jumbo");
  return c.json({ ok: true, tip: body.percent });
});

// --- Checkout ---

app.get("/api/checkout", async (c) => {
  const config = c.get("config");
  const [cart, detail] = await Promise.allSettled([
    getCart(config, c.req.query("provider") || "jumbo"),
    getCheckoutDetail(config, c.req.query("provider") || "jumbo"),
  ]);
  return c.json({
    cart: cart.status === "fulfilled" ? cart.value : null,
    detail: detail.status === "fulfilled" ? detail.value : null,
  });
});

// --- Payment ---

app.get("/api/payment-methods", async (c) => {
  const config = c.get("config");
  return c.json(await getPaymentMethods(config, c.req.query("provider") || "jumbo"));
});

// --- Order ---

app.post("/api/place-order", async (c) => {
  const config = c.get("config");
  return c.json(await placeOrder(config, c.req.query("provider") || "jumbo"));
});

app.get("/api/orders", async (c) => {
  const config = c.get("config");
  return c.json(await getOrders(config, c.req.query("provider") || "jumbo"));
});

// --- Addresses ---

app.get("/api/addresses", async (c) => {
  const config = c.get("config");
  return c.json(await getAddresses(config, c.req.query("provider") || "jumbo"));
});

app.post("/api/addresses/switch", async (c) => {
  const config = c.get("config");
  const body = await c.req.json<{ label: string }>();
  if (!body.label) return c.json({ error: "Missing: label" }, 400);
  const result = await switchAddress(body.label, config, c.req.query("provider") || "jumbo");
  if (!result) return c.json({ error: `Address "${body.label}" not found` }, 404);
  return c.json({ ok: true, address: result });
});

export default app;
