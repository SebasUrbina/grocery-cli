import { z } from "zod/v4";

export const ActiveOrderSchema = z
  .object({
    uuid: z.string(),
    storeName: z.string(),
    state: z.string(),
    total: z.number(),
    eta: z.string().optional(),
    placedAt: z.string().optional(),
    items: z.array(z.object({
      title: z.string(),
      quantity: z.number(),
    })).optional(),
  })
  .passthrough();

export type ActiveOrder = z.infer<typeof ActiveOrderSchema>;

export const PastOrderSchema = z
  .object({
    uuid: z.string(),
    storeName: z.string(),
    state: z.string(),
    total: z.number(),
    placedAt: z.string().optional(),
  })
  .passthrough();

export type PastOrder = z.infer<typeof PastOrderSchema>;

export const OrdersResponseSchema = z
  .object({
    activeOrders: z.array(ActiveOrderSchema),
    pastOrders: z.array(PastOrderSchema),
  })
  .passthrough();

export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

export const OrderItemSchema = z.object({
  title: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  imageUrl: z.string().optional()
}).passthrough();

export const OrderDetailSchema = z.object({
  uuid: z.string(),
  storeName: z.string(),
  state: z.string(),
  placedAt: z.string().optional(),
  subtotal: z.number(),
  deliveryFee: z.number(),
  discounts: z.number(),
  total: z.number(),
  items: z.array(OrderItemSchema),
  deliveryAddress: z.string().optional(),
  eta: z.string().optional(),
  receiverName: z.string().optional(),
  receiverPhone: z.string().optional(),
  urlInvoice: z.string().optional(),
}).passthrough();

export type OrderDetail = z.infer<typeof OrderDetailSchema>;
