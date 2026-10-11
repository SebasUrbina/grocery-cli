// Stub: We don't use this anymore because each provider has its own fetch logic.
// Keeping it for backwards compatibility if needed later.
import type { Config } from "./schemas/config";

export async function get<T>(path: string, config: Config): Promise<T> {
  throw new Error("Generic get not implemented for multi-provider.");
}

export async function post<T>(
  path: string,
  body: unknown,
  config: Config
): Promise<T> {
  throw new Error("Generic post not implemented for multi-provider.");
}

export async function put<T>(
  path: string,
  body: unknown,
  config: Config
): Promise<T> {
  throw new Error("Generic put not implemented for multi-provider.");
}

export async function del<T>(
  path: string,
  config: Config
): Promise<T> {
  throw new Error("Generic del not implemented for multi-provider.");
}
