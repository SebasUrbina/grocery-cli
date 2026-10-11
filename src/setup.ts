import { saveConfig, loadConfig } from "./config";
import type { Config } from "./schemas/config";
import { ok, fail, dim, hint, brandBold } from "./ui";
import { parseProviderArgs } from "./utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));

const token = args[0];
if (!token) {
  console.error("Usage: grocery setup <token> [--provider <name>]");
  console.error("\nGet your JWT token from browser DevTools → Network -> Request Headers -> Authorization: Bearer <token>");
  process.exit(1);
}

const config = await loadConfig().catch(() => ({ providers: {} } as Config));

if (!config.providers) {
  config.providers = {};
}

config.providers[provider.toLowerCase()] = {
  ...config.providers[provider.toLowerCase()],
  token
};

await saveConfig(config);
console.log(`\n${ok(`Config saved for ${brandBold(provider)}! You can now use the CLI.`)}\n`);

console.log(`  ${dim("What's next?")}\n`);
console.log(`  ${hint(`grocery search "leche" --provider ${provider}`)}     Search for food`);
console.log(`  ${hint(`grocery cart --provider ${provider}`)}             Check your cart\n`);
