import type { IProvider } from "../types";
import type { Config } from "../../schemas/config";
import type { SearchResult, SearchStore } from "../../schemas/search";
import type { StoreDetail } from "../../schemas/store";
import type { ItemDetail } from "../../schemas/product";
import type { SavedAddress } from "../../schemas/address";
import type { User } from "../../schemas/auth";
import type { CartResponse } from "../../schemas/cart";
import type { CheckoutDetail } from "../../schemas/checkout";
import type { OrdersResponse, ActiveOrder, PastOrder, OrderDetail } from "../../schemas/order";
import { get, post } from "../../http"; // we might need to modify http.ts to be provider aware

export abstract class CencosudProvider implements IProvider {
  abstract name: string;
  abstract loginUrl: string;
  abstract baseUrl: string;
  abstract bffBaseUrl: string;
  abstract cartBaseUrl: string;
  abstract storeId: string;
  abstract defaultStoreCode: string;
  abstract catalogApiKey: string;
  abstract cartApiKey: string;
  abstract locationApiKey: string;
  abstract sessionApiKey: string;
  abstract ordersApiKey: string;

  protected getAuthHeaders(config: Config): Record<string, string> {
    const providerConfig = config.providers[this.name.toLowerCase()];
    if (!providerConfig || !providerConfig.token) {
      throw new Error(`Authentication required for ${this.name}. Please run: grocery setup <token> --provider ${this.name.toLowerCase()}`);
    }
    return {
      "Authorization": `Bearer ${providerConfig.token}`
    };
  }

  async getUser(config: Config): Promise<User> {
    const url = `${this.bffBaseUrl}/sessions/users`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.sessionApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!res.ok) {
      throw new Error(`${this.name} API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    return {
      userId: data.userId || "",
      name: data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : `${this.name} User`,
      email: data.email || "",
      phone: data.homePhone || "",
    };
  }

  async search(query: string, config: Config): Promise<SearchResult> {
    const url = `${this.bffBaseUrl}/catalog/plp`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.catalogApiKey,
      },
      body: JSON.stringify({
        store: this.defaultStoreCode,
        collections: [],
        fullText: query,
        brands: [],
        hideUnavailableItems: false,
        from: 0,
        to: 40,
        orderBy: "",
        selectedFacets: [],
        promotionalCards: false,
        sponsoredProducts: false
      })
    });

    if (!res.ok) {
      throw new Error(`${this.name} API error: ${res.statusText}`);
    }

    const data: any = await res.json();
    const items: ItemDetail[] = [];

    for (const product of data.products || []) {
      const item = product.items?.[0];
      if (!item) continue;

      items.push({
        uuid: product.slug, // We need the slug for getProduct
        title: item.name || product.productName,
        price: (item.price || 0) * 100, // CLI expects cents
        imageUrl: item.images?.[0] || "",
        itemDescription: product.brand || "",
        storeUuid: this.defaultStoreCode,
      });
    }

    return {
      stores: [
        {
          uuid: this.defaultStoreCode,
          title: `${this.name} (Online)`,
          slug: this.name.toLowerCase(),
          deliveryFee: 0, // Mock for now
        }
      ],
      items
    };
  }

  async getStore(storeId: string, config: Config): Promise<StoreDetail> {
    throw new Error("Method not implemented.");
  }

  async getProduct(productId: string, storeId: string, config: Config): Promise<ItemDetail> {
    const url = `${this.bffBaseUrl}/catalog/pdp`;

    // The endpoint uses the 'slug' or 'reference', but if we only have productId (from search),
    // some VTEX implementations allow fetching by ID, or we must fetch it.
    // In the Jumbo BFF, it seems to expect the slug. We'll pass the productId as the slug fallback
    // since the search might only return UUIDs, or if you changed search to return slugs, use that.
    // For now, we'll assume `productId` can act as the slug or we adjust it.
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.catalogApiKey,
      },
      body: JSON.stringify({
        slug: productId,
        store: this.defaultStoreCode
      })
    });

    if (!res.ok) {
      throw new Error(`${this.name} failed to get product: ${res.statusText}`);
    }

    const data: any = await res.json();
    const item = data.items?.[0] || {};

    // Parse customizations/groups if they exist in VTEX format (usually inside variants or composition)
    const customizationGroups: any[] = [];

    return {
      uuid: item.skuId || data.productId,
      title: item.name || data.productName || data.name,
      itemDescription: data.description || "",
      price: (item.price || 0) * 100, // cents
      imageUrl: item.images?.[0] || data.image || "",
      customizationGroups,
    };
  }

  async addToCart(productId: string, quantity: number, options: any, config: Config): Promise<CartResponse> {
    const url = `${this.cartBaseUrl}/cart/items`;

    // We need to use the exact soldBy format the provider expects.
    // Santa Isabel expects "santa-isabel" instead of "SANTAISABEL".
    let soldBy = this.name.toUpperCase();
    if (this.name === "SantaIsabel") soldBy = "santa-isabel";

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.cartApiKey,
        ...this.getAuthHeaders(config)
      },
      body: JSON.stringify({
        items: [
          {
            skuId: productId,
            quantity: quantity,
            isUnitary: false,
            giftable: false,
            itemQuantityLimit: 12,
            isUnitaryEligible: false,
            sponsoredId: null,
            soldBy
          }
        ],
        store: this.defaultStoreCode
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Cart error details:", errorText);
      throw new Error(`${this.name} failed to add to cart: ${res.statusText}`);
    }

    // After adding, we fetch the full cart to get the updated details
    return this.getCart(config);
  }

  async getCart(config: Config): Promise<CartResponse> {
    const url = `${this.cartBaseUrl}/cart?store=${this.defaultStoreCode}&simulationTotals=true`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.cartApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!res.ok) {
      throw new Error(`${this.name} failed to get cart: ${res.statusText}`);
    }

    const data: any = await res.json();

    const cartItems = (data.items || []).map((item: any) => ({
      uuid: item.skuId,
      title: item.name,
      quantity: item.quantity,
      price: (item.prices?.price || 0) * 100,
      totalPrice: (item.prices?.totalPrice || 0) * 100,
    }));

    const subtotal = (data.totals?.subTotal || 0) * 100;
    const total = (data.totals?.total || 0) * 100;

    return {
      draftOrderUuid: data.id || "unknown",
      subtotal,
      deliveryFee: 0, // Calculate later or from another endpoint
      serviceFee: 0,
      total,
      stores: [
        {
          storeUuid: this.defaultStoreCode,
          storeName: this.name,
          items: cartItems,
          subtotal,
          deliveryFee: 0,
          serviceFee: 0,
          total,
        }
      ]
    };
  }

  async removeFromCart(itemId: string, config: Config): Promise<CartResponse> {
    // To remove an item, we usually PATCH it with quantity 0
    const url = `${this.cartBaseUrl}/cart/items`;

    let soldBy = this.name.toUpperCase();
    if (this.name === "SantaIsabel") soldBy = "santa-isabel";

    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.cartApiKey,
        ...this.getAuthHeaders(config)
      },
      body: JSON.stringify({
        items: [
          {
            skuId: itemId,
            quantity: 0,
            isUnitary: false,
            giftable: false,
            itemQuantityLimit: 12,
            isUnitaryEligible: false,
            sponsoredId: null,
            soldBy
          }
        ],
        store: this.defaultStoreCode
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Cart error details:", errorText);
      throw new Error(`${this.name} failed to remove from cart: ${res.statusText}`);
    }

    return this.getCart(config);
  }

  async getAddresses(config: Config): Promise<SavedAddress[]> {
    const url = `${this.cartBaseUrl}/location/address`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.locationApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!res.ok) {
      throw new Error(`${this.name} failed to get addresses: ${res.statusText}`);
    }

    const data: any = await res.json();
    const addresses: SavedAddress[] = [];

    if (data.nearest) {
      addresses.push({
        id: data.nearest.id || "nearest",
        label: data.nearest.alias || "Nearest",
        address: `${data.nearest.street} ${data.nearest.number}, ${data.nearest.city}`,
        lat: parseFloat(data.nearest.geoCoordinates?.latitude || "0"),
        lng: parseFloat(data.nearest.geoCoordinates?.longitude || "0"),
        isDefault: true,
      });
    }

    for (const a of data.others || []) {
      addresses.push({
        id: a.id,
        label: a.alias || a.street,
        address: `${a.street} ${a.number}, ${a.city}`,
        lat: parseFloat(a.geoCoordinates?.latitude || "0"),
        lng: parseFloat(a.geoCoordinates?.longitude || "0"),
        isDefault: false,
      });
    }

    return addresses;
  }

  async getCheckout(config: Config): Promise<CheckoutDetail> {
    const checkoutUrl = `${this.cartBaseUrl}/cart/checkout?store=${this.defaultStoreCode}`;
    const checkoutRes = await fetch(checkoutUrl, {
      headers: {
        "Content-Type": "application/json",
        "apikey": this.cartApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!checkoutRes.ok) {
      throw new Error(`${this.name} failed to get checkout info: ${checkoutRes.statusText}`);
    }

    const checkoutData: any = await checkoutRes.json();

    const url = `${this.cartBaseUrl}/cart/delivery-windows`;
    const addresses = await this.getAddresses(config);
    const activeAddress = addresses.find(a => a.isDefault) || addresses[0];

    let estimatedDelivery = checkoutData.selectedDeliveryWindow ? checkoutData.selectedDeliveryWindow.timeWindow : "N/A";
    let deliveryFee = (checkoutData.totals?.shipping?.value || 0) * 100;

    if (activeAddress && !checkoutData.selectedDeliveryWindow) {
      // Try to get delivery windows to extract ETA and fee
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": this.cartApiKey,
          ...this.getAuthHeaders(config)
        },
        body: JSON.stringify({
          geoCoordinates: {
            latitude: String(activeAddress.lat),
            longitude: String(activeAddress.lng)
          },
          store: this.defaultStoreCode,
          deliveryChoice: "deliverySchedule",
          firstDeliveryWindow: false
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        // Just grab the first available window from the first available day
        const firstDay = data[0]?.days?.[0];
        const firstWindow = firstDay?.timeWindows?.[0];

        if (firstWindow) {
          const startDate = new Date(firstWindow.startDate);
          estimatedDelivery = `${startDate.toLocaleDateString()} ${startDate.getHours()}:${String(startDate.getMinutes()).padStart(2, '0')}`;
          deliveryFee = (firstWindow.price || 0) * 100;
        }
      }
    }

    // Also get the cart to know the subtotal
    const cart = await this.getCart(config);

    // We prefer the subtotal and total from checkout if they exist
    const subtotal = checkoutData.totals?.subTotal ? checkoutData.totals.subTotal * 100 : cart.subtotal;
    const total = checkoutData.totals?.total ? checkoutData.totals.total * 100 : cart.subtotal + deliveryFee;

    const paymentMethod = checkoutData.selectedPaymentMethod ? {
      uuid: checkoutData.selectedPaymentMethod.id || "",
      type: checkoutData.selectedPaymentMethod.type || "Unknown",
      label: checkoutData.selectedPaymentMethod.name || "Unknown",
    } : undefined;

    return {
      draftOrderUuid: checkoutData.id || cart.draftOrderUuid,
      subtotal: subtotal,
      deliveryFee,
      serviceFee: 0,
      total: total,
      deliveryAddress: checkoutData.address ? checkoutData.address.street : (activeAddress ? activeAddress.address : "No address selected"),
      estimatedDelivery,
      paymentMethod
    };
  }

  async placeOrder(config: Config, tip?: number): Promise<any> {
    throw new Error("Method not implemented.");
  }

  async getOrders(config: Config): Promise<OrdersResponse> {
    if (!this.ordersApiKey) {
      throw new Error(`ordersApiKey not configured for ${this.name}`);
    }

    const url = `${this.bffBaseUrl}/orders?page=1&perPage=10`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.ordersApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!res.ok) {
      throw new Error(`${this.name} failed to get orders: ${res.statusText}`);
    }

    const data: any = await res.json();
    const pastOrders: PastOrder[] = [];
    const activeOrders: ActiveOrder[] = [];

    for (const order of data.payload || []) {
      const isDelivered = order.status === "DELIVERED" || order.status === "CANCELED";

      const parsedOrder = {
        uuid: order.id,
        storeName: order.storeName || order.store,
        state: order.status,
        total: order.totals?.total || 0,
        placedAt: order.createdAt,
      };

      if (isDelivered) {
        pastOrders.push(parsedOrder);
      } else {
        activeOrders.push({
          ...parsedOrder,
          eta: order.shipping?.deliveryWindow?.endDate,
          items: (order.items || []).map((item: any) => ({
            title: item.name,
            quantity: item.quantity,
          })),
        });
      }
    }

    return {
      activeOrders,
      pastOrders,
    };
  }

  async getOrder(uuid: string, config: Config): Promise<OrderDetail> {
    if (!this.ordersApiKey) {
      throw new Error(`ordersApiKey not configured for ${this.name}`);
    }

    const url = `${this.bffBaseUrl}/orders/${uuid}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": this.ordersApiKey,
        ...this.getAuthHeaders(config)
      }
    });

    if (!res.ok) {
      // If the direct endpoint doesn't work, we might need to fetch the list and filter,
      // but for Cencosud it should work.
      throw new Error(`${this.name} failed to get order ${uuid}: ${res.statusText}`);
    }

    const order: any = await res.json();

    return {
      uuid: order.id,
      storeName: order.storeName || order.store,
      state: order.status,
      placedAt: order.createdAt,
      subtotal: (order.totals?.items || 0) * 100, // API returns normal numbers, CLI uses cents
      deliveryFee: (order.totals?.shipping || 0) * 100,
      discounts: (order.totals?.discounts || 0) * 100,
      total: (order.totals?.total || 0) * 100,
      items: (order.items || []).map((item: any) => ({
        title: item.name,
        quantity: item.quantity,
        unitPrice: (item.unitPrice || 0) * 100,
        totalPrice: (item.total || 0) * 100,
        imageUrl: item.imageUrl || undefined
      })),
      deliveryAddress: order.shipping?.address ? `${order.shipping.address.street} ${order.shipping.address.number}` : undefined,
      eta: order.shipping?.deliveryWindow ? `${order.shipping.deliveryWindow.startDate} - ${order.shipping.deliveryWindow.endDate}` : undefined,
      receiverName: order.shipping?.receiverData ? `${order.shipping.receiverData.firstName} ${order.shipping.receiverData.lastName}` : undefined,
      receiverPhone: order.shipping?.receiverData?.phone || undefined,
      urlInvoice: order.posDetails?.urlInvoice || undefined,
    };
  }
}
