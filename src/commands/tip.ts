import { loadConfig } from "../config";
import { setTip } from "../services/checkout";
import { withSpinner, ok, bold } from "../ui";
import { parseProviderArgs } from "../utils/args";

const { provider, args } = parseProviderArgs(process.argv.slice(2));
const tipArg = args[0];

if (!tipArg) {
  console.error("Usage: grocery tip <percent> [--provider <name>]");
  console.error("  percent: tip percentage (e.g., 15) or 0 to remove tip");
  console.error("  Common options: 0, 5, 10, 15, 20");
  process.exit(1);
}

const tip = parseInt(tipArg);
const config = await loadConfig();
await withSpinner(`Setting tip on ${provider}...`, () => setTip(tip, config, provider));

if (tip > 0) {
  console.log(`\n${ok(`Tip set to ${bold(`${tip}%`)}`)}\n`);
} else {
  console.log(`\n${ok("Tip removed")}\n`);
}
