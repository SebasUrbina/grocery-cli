import { loadConfig, saveConfig } from "../config";
import type { Config } from "../schemas/config";
import { printDetail, ok, fail, brandBold, dim, bold, success, hint } from "../ui";
import { parseProviderArgs } from "../utils/args";
import { getProvider } from "../providers";

let chromium: typeof import("playwright").chromium;

const { provider } = parseProviderArgs(process.argv.slice(2));
const providerImpl = getProvider(provider);

if (!providerImpl.loginUrl) {
  console.log(`\n${fail(`Automated login not supported for ${provider}`)}\n`);
  process.exit(1);
}

try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log(`\n${fail("Playwright is not installed")}\n`);
  console.log(`  The ${bold("grocery login")} command uses a browser to capture your session.`);
  console.log(`  To use it, install Playwright:\n`);
  console.log(`    ${hint("bun add playwright")}\n`);
  console.log(`  Or skip browser login and set your token manually:\n`);
  console.log(`    ${hint(`grocery setup <token> --provider ${provider}`)}\n`);
  process.exit(1);
}

console.log(`\n  ${brandBold(`Grocery CLI Login - ${providerImpl.name}`)}`);
console.log(`  ${dim(`Opening browser — log in to your ${providerImpl.name} account...`)}\n`);

const browser = await chromium.launch({
  headless: false,
  args: ["--window-size=600,900"],
});

const context = await browser.newContext({
  viewport: { width: 600, height: 900 },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});

const page = await context.newPage();

let capturedToken: string | null = null;

// Listen to network requests to steal the Bearer token
page.on('request', request => {
  const headers = request.headers();
  if (headers['authorization'] && headers['authorization'].startsWith('Bearer ')) {
      // Check if it's the right token format for Cencosud (JWT)
      const token = headers['authorization'].replace('Bearer ', '');
      if (token.split('.').length === 3) {
          capturedToken = token;
      }
  }
});

await page.goto(providerImpl.loginUrl);

console.log(`  ${dim("Waiting for you to log in...")}`);
console.log(`  ${dim("(The browser will close automatically after login is detected)")}\n`);

const timeout = 5 * 60 * 1000;
const start = Date.now();

while (!capturedToken && Date.now() - start < timeout) {
  await new Promise((r) => setTimeout(r, 1000));
}

await browser.close();

if (!capturedToken) {
  console.log(`\n${fail("Login timed out. Please try again.")}\n`);
  process.exit(1);
}

console.log(`${ok("Session token captured!")} ${dim("Saving config...")}`);

const config = await loadConfig().catch(() => ({ providers: {} } as Config));

if (!config.providers) {
  config.providers = {};
}

config.providers[provider.toLowerCase()] = {
  ...config.providers[provider.toLowerCase()],
  token: capturedToken
};

await saveConfig(config);
console.log(`${ok(`Config saved for ${providerImpl.name}! You can now use the CLI.`)}\n`);

console.log(`  ${dim("What's next?")}\n`);
console.log(`  ${hint(`grocery search "leche" --provider ${provider}`)}     Search for food`);
console.log(`  ${hint(`grocery addresses --provider ${provider}`)}          Check delivery address\n`);
