import { z } from "zod/v4";

export const ProviderConfigSchema = z.object({
  cookies: z.string().optional(),
  token: z.string().optional(),
  draftOrderId: z.string().optional(),
  storeId: z.string().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

export const ConfigSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  providers: z.record(z.string(), ProviderConfigSchema).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
