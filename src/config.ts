import { existsSync } from "fs";
import { chmod } from "fs/promises";
import { join } from "path";
import { ConfigSchema, type Config } from "./schemas/config";
import { CONFIG_FILENAME } from "./constants";

const CONFIG_PATH = join(import.meta.dir, "..", CONFIG_FILENAME);

export async function loadConfig(): Promise<Config> {
  if (!existsSync(CONFIG_PATH)) {
    return ConfigSchema.parse({});
  }
  const text = await Bun.file(CONFIG_PATH).text();
  const parsed = ConfigSchema.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Invalid config: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function saveConfig(config: Config): Promise<void> {
  await Bun.write(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
  await chmod(CONFIG_PATH, 0o600);
}
