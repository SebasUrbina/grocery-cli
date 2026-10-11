# Grocery CLI

CLI experimental para supermercados en Chile, con interfaces REST (Hono) y MCP. Usa Bun, TypeScript y Zod; deriva del proyecto Uber Eats CLI de crafter-station.

## Instalación local

```bash
bun install --frozen-lockfile
cp .env.example .env.local
# Completa las claves API del proveedor en .env.local.
bun run index.ts help
bun run typecheck
```

Las claves se leen desde variables de entorno: `JUMBO_<DOMINIO>_API_KEY` o `SANTAISABEL_<DOMINIO>_API_KEY`, donde el dominio es `CATALOG`, `CART`, `LOCATION`, `SESSION` u `ORDERS`. Solo necesitas configurar las claves de las operaciones que uses. Bun carga `.env.local` automáticamente. No se incluyen valores reales en el repositorio.

Para iniciar sesión mediante navegador:

```bash
bunx playwright install chromium
bun run index.ts login --provider jumbo
bun run index.ts search "leche" --provider jumbo
bun run index.ts search "leche" --provider santaisabel
bun run index.ts cart --provider jumbo
bun run index.ts checkout --provider jumbo
bun run index.ts orders --provider santaisabel
bun run index.ts order <id> --provider santaisabel
```

`--provider` (o `-p`) selecciona el proveedor; el valor predeterminado es `jumbo`. Los tokens personales se guardan en `.grocery-config.json`, con permisos de lectura y escritura para el propietario.

## Estado de las integraciones

| Función | Jumbo / Santa Isabel | PedidosYa |
|---|---|---|
| Búsqueda y detalle de producto | Implementados | Pendiente |
| Perfil, direcciones y carrito | Implementados | Pendiente |
| Vista previa de checkout | Implementada | Pendiente |
| Historial y detalle de pedidos | Implementados; requieren clave ORDERS | Pendiente |
| Confirmar una compra | Pendiente; el comando CLI simula el resultado | Pendiente |
| Detalle de tienda y tiendas cercanas | Pendientes | Pendientes |
| Cambiar dirección, propina y método de pago | Pendientes | Pendientes |

“Implementado” describe el código disponible; no implica validación contra los servicios reales. Las API utilizadas son internas y pueden cambiar.

## REST y MCP

```bash
bun run server.ts
bun run src/mcp/index.ts
```

La API escucha en el puerto 3200. Selecciona proveedor mediante `?provider=jumbo` o `?provider=santaisabel`. Actualmente no implementa autenticación para sus clientes y permite CORS general; requiere restringir el acceso antes de exponerla en una red.

Ejemplo de configuración MCP local (ajusta la ruta; `.mcp.json` está ignorado):

```json
{
  "mcpServers": {
    "grocery": {
      "command": "bun",
      "args": ["run", "src/mcp/index.ts"],
      "cwd": "/path/to/grocery-cli"
    }
  }
}
```

## Integración en una app de comida

La [guía de conocimiento para carritos](docs/CART_INTEGRATION_KNOWLEDGE.md) documenta el flujo actual, los contratos, la resolución de slug a SKU y una propuesta de optimización desde recetas. El [brief para otro agente](docs/AGENT_HANDOFF.md) resume el objetivo, las reglas y los entregables de la integración.

## Credenciales y archivos locales

Se excluyen de Git `.env*` (excepto `.env.example`), configuraciones y sesiones locales, `.mcp.json`, capturas `dump*`, archivos HAR, logs, herramientas locales y la copia de referencia `ubereats-cli/`. Los ejemplos contienen nombres y campos vacíos, sin credenciales.

Antes de publicar, revisa el contenido preparado y el historial. `.gitignore` no elimina archivos ya versionados ni secretos de commits anteriores.

Consulta [PROJECT_REVIEW.md](PROJECT_REVIEW.md) para el análisis técnico y los límites de la verificación.

## Licencia

MIT, según los metadatos del proyecto original.
