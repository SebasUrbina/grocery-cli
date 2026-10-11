export function requireApiKey(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Set it in your environment or .env.local.`);
  }
  return value;
}
