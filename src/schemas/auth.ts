import { z } from "zod/v4";

export const UserSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    userId: z.string(),
    phone: z.string().optional(),
  })
  .passthrough();

export type User = z.infer<typeof UserSchema>;
