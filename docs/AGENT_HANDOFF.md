# Brief para el agente que integrará carritos en una app de comida

Usa este texto como instrucción inicial y adjunta `CART_INTEGRATION_KNOWLEDGE.md`. El documento describe el código base `feae5d6`; las propuestas todavía no están implementadas. No incluye secretos.

## Objetivo

Integrar los adaptadores de Grocery CLI en el backend de una app de comida para transformar recetas o listas de ingredientes en propuestas de compra comparables y aplicar cambios verificables al carrito elegido. Optimizar cobertura, costo total y número de llamadas sin perder trazabilidad ni mezclar cuentas.

## Conocimiento que debes conservar

1. Solo Jumbo y Santa Isabel tienen implementaciones de catálogo/carrito. PedidosYa está pendiente. `place-order` de CLI es simulado; el proveedor no confirma compras.
2. Búsqueda devuelve slug; detalle devuelve SKU o fallback productId; carrito necesita SKU. Modela estos IDs por separado y bloquea escritura si la resolución no es fiable.
3. Los códigos de tienda son fijos en el adaptador. Ni las coordenadas ni `config.providers[provider].storeId` gobiernan actualmente esas consultas.
4. El carrito es remoto y pertenece a la cuenta. Las alternativas para comparar tiendas deben mantenerse como planes locales en la app, sin modificar carritos para cotizar.
5. La cantidad del carrito es cantidad de unidades de venta, no gramos o mililitros requeridos por una receta. Convierte necesidades a envases con unidades verificadas.
6. No está probado si PATCH suma o reemplaza cantidades. No asumas idempotencia, atomicidad de lotes ni que reintentar sea seguro.
7. Los montos normalizados usan una escala heredada de 100 y no siempre incluyen moneda. Verifica unidades; precios ausentes se convierten a cero y ciertas tarifas son placeholders.
8. Stock, alérgenos, nutrición y formatos no están normalizados. No inventes disponibilidad ni compatibilidad. Marca datos inferidos y desconocidos.
9. Checkout puede ser parcial y su primera ventana puede ser una estimación no reservada. Cambiar dirección/pago/propina contiene stubs que pueden anunciar éxito.
10. Config es global por proceso. Para una app multiusuario necesitas contexto y secretos por usuario/cuenta/proveedor, autenticación y autorización. Nunca pases secretos al frontend/modelo.

## Cómo abordar la implementación

Lee el documento adjunto y los contratos antes de diseñar la integración. Mantén cuatro piezas:

- Normalizador de necesidades: agrega ingredientes por recetas/porciones, descuenta despensa confirmada y aplica restricciones.
- Planificador: busca, filtra, resuelve finalistas y compara envases/costo completo por tienda sin mutaciones.
- Adaptadores: contexto de cuenta/tienda, catálogo, SKU, precios, capabilities y errores estructurados.
- Aplicador: snapshot inicial, cambios autorizados, serialización por carrito, reconciliación y snapshot final.

Preserva productos que ya estaban en el carrito salvo autorización para retirarlos. Relee después de una mutación incierta antes de repetir. Valida los datos en runtime, no solo con interfaces TypeScript.

Optimiza primero consultas duplicadas y resolución de SKU. Batching es una hipótesis que requiere validación del contrato remoto. No mezcles cachés privados de distintas cuentas.

## Entregables esperados

- Contratos para necesidades, candidatos, plan por tienda, precio con moneda/unidad, contexto de cuenta y resultado parcial.
- Matriz de capacidades y selección explícita de proveedor/tienda.
- Plan de carrito con razones de selección, cantidades de envases, excedentes, faltantes y costo marcado como parcial o completo.
- Aplicación de cambios con conciliación y errores legibles; ningún éxito basado solo en mensajes de un stub.
- Pruebas de slug/SKU, unidades, cuentas aisladas, carrito preexistente, timeout después de PATCH y preview parcial.
- Medición de llamadas y latencia antes/después, sin logs de credenciales o datos personales.

## Decisiones que dependen de la app receptora

Resolver con su contexto: una tienda o múltiples, presupuesto estricto o flexible, reglas de sustitución, fuente fiable de ingredientes/unidades/restricciones, política de despensa, mecanismo para vincular cuentas y nivel de autorización para modificar carritos. Si falta contexto, avanzar con planes de solo lectura y dejar explícitas esas decisiones.

## Archivos mínimos para implementar

- `src/providers/types.ts`, `src/providers/index.ts` y `src/providers/cencosud/index.ts`.
- `src/providers/jumbo.ts`, `src/providers/santaisabel.ts` y `src/providers/api-keys.ts`.
- `src/services/search.ts`, `src/services/product.ts`, `src/services/cart.ts`, `src/services/checkout.ts`.
- Schemas de búsqueda, producto, carrito, checkout y configuración.
- `src/api/app.ts` o `src/mcp/index.ts`, según el transporte elegido.
- README, PROJECT_REVIEW y `.env.example` con campos vacíos.

El ejemplo y las instrucciones son transferibles; credenciales y sesiones locales no lo son.
