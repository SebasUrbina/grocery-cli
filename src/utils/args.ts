import { parseArgs } from "util";

export function parseProviderArgs(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      provider: {
        type: "string",
        short: "p",
        default: "jumbo",
      },
    },
    strict: false, // allow other args to pass through
  });

  return {
    provider: values.provider as string,
    args: positionals,
  };
}
