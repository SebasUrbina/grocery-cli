# Development notes

Grocery CLI is an experimental Bun/TypeScript project for Chilean grocery providers. Read README.md and PROJECT_REVIEW.md for the actual implementation status.

- `index.ts`: CLI dispatcher; `src/commands/`: command presentation and argument parsing.
- `src/services/`: shared operations used by CLI, REST and MCP.
- `src/providers/`: provider registry, interface and Cencosud implementations.
- `src/schemas/`: Zod schemas; `src/config.ts`: local session persistence.
- `src/api/app.ts`: Hono REST routes; `server.ts`: port 3200 entry point.
- `src/mcp/index.ts`: MCP tools.

Use `bun run typecheck` to validate source types and `bun run index.ts help` for a CLI smoke check. Provider selection defaults to Jumbo.

Never commit credentials, session cookies, personal tokens, local configuration or API response captures. Provider API keys come from environment variables documented in .env.example. Session credentials are stored in the ignored .grocery-config.json.

Several operations remain unimplemented. In particular, CLI place-order simulates success and does not submit a purchase. Do not describe simulated or stub operations as completed transactions. Check provider support before using a tool. Obtain explicit user confirmation before any real purchase or delivery-address change.
