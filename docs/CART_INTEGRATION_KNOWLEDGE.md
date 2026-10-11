# Conocimiento para integrar Grocery CLI en una app de comida

Este documento entrega a otro agente la lógica observada en el código y una propuesta para construir carritos desde listas de compras o recetas. La lógica actual corresponde al commit `feae5d6`; las recomendaciones están señaladas como propuestas. No incluye credenciales ni información de cuentas. Las API remotas no fueron verificadas durante esta documentación.

## 1. Qué aporta el proyecto

Grocery CLI es una capa de acceso a supermercados, con CLI, REST y MCP sobre los mismos servicios. Puede buscar productos, consultar su detalle y modificar el carrito de una cuenta. No incorpora un optimizador de recetas, equivalencias, nutrición, cantidades por envase ni comparación entre supermercados. Esa inteligencia debe construirse en la app que lo integre.

La unidad útil de reutilización es `src/providers/` más los contratos de `src/schemas/` y los servicios. No conviene interpretar texto de terminal para integrar una app: usar servicios desde el backend o REST con respuestas estructuradas. MCP sirve como interfaz para agentes, pero devuelve JSON dentro de bloques de texto y algunas operaciones agregan mensajes antes del JSON.

| Capa | Responsabilidad actual | Fuente |
|---|---|---|
| Entrada | Argumentos CLI, rutas REST o parámetros de tools MCP | [CLI](../index.ts), [REST](../src/api/app.ts), [MCP](../src/mcp/index.ts) |
| Servicios | Seleccionar proveedor y delegar operaciones | [Servicios de carrito](../src/services/cart.ts) |
| Registro | `jumbo`, `santaisabel`, `pedidosya`; error si el nombre no existe | [Registro](../src/providers/index.ts) |
| Contrato | Interfaz `IProvider`, tipos de búsqueda, producto, carrito y checkout | [Interfaz](../src/providers/types.ts), [Schemas](../src/schemas/cart.ts) |
| Adaptador | Peticiones HTTP y mapeo de respuestas remotas | [Cencosud](../src/providers/cencosud/index.ts) |
| Credenciales | JWT por proveedor y claves API por dominio | [Config](../src/config.ts), [Claves](../src/providers/api-keys.ts) |

## 2. Capacidades reales y límites

| Operación | Jumbo y Santa Isabel | PedidosYa |
|---|---|---|
| Buscar / obtener producto | Implementada | Lanza error de método pendiente |
| Perfil / direcciones | Implementada | Pendiente |
| Leer / agregar / quitar del carrito | Implementada | Pendiente |
| Preview de checkout | Implementada, con estimaciones y fallbacks | Pendiente |
| Historial / detalle de pedidos | Implementada si se configura clave ORDERS | Pendiente |
| Confirmar compra | Proveedor lanza error; CLI simula éxito | Pendiente |
| Tienda / tiendas cercanas | Tienda lanza error; listado puede devolver vacío | Pendiente |
| Cambiar dirección / propina / método de pago | Stubs; no realizan el cambio remoto | Pendiente |

El registro de un proveedor y el listado de tools no prueban soporte real. MCP registra 17 tools aunque su mensaje de inicio anuncia 16. Algunas tools informan éxito sobre stubs. La app debe mantener una matriz explícita de capacidades y no tratar esos mensajes como evidencia de una acción remota.

## 3. Contexto, cuenta y tienda

- El proveedor predeterminado es `jumbo`; indicar siempre el proveedor al integrar para evitar mezclar resultados.
- El JWT se lee desde `config.providers[provider.toLowerCase()].token`. Se usa `Authorization: Bearer <token>` en operaciones de cuenta/carrito.
- Las claves API se leen del entorno: `JUMBO_<DOMINIO>_API_KEY` o `SANTAISABEL_<DOMINIO>_API_KEY`, con dominios `CATALOG`, `CART`, `LOCATION`, `SESSION`, `ORDERS`.
- Búsqueda y detalle usan la clave CATALOG sin JWT. Perfil usa SESSION; carrito y checkout usan CART; direcciones usan LOCATION.
- Actualmente `loadConfig()` lee un único archivo `.grocery-config.json` compartido por el proceso. REST y MCP no seleccionan una cuenta distinta por usuario de la app.
- Los campos `storeId`, `draftOrderId`, latitud, longitud y dirección existen en configuración, pero el adaptador Cencosud usa sus valores de tienda fijos en búsqueda, producto y carrito.

| Proveedor | Código de tienda usado | `soldBy` del carrito | Base catálogo | Base carrito |
|---|---|---|---|---|
| Jumbo | `jumboclj512` | `JUMBO` | `https://bff.jumbo.cl` | `https://be-reg-groceries-bff-jumbo.ecomm.cencosud.com` |
| Santa Isabel | `huerfanos` | `santa-isabel` | `https://be-reg-groceries-bff-sisa.ecomm.cencosud.com` | Misma base del catálogo |

**Implicación para la app:** una dirección ingresada en tu app no cambia automáticamente la tienda consultada ni la dirección remota. Resolver cobertura y tienda antes de comparar precios es una mejora necesaria, aún no implementada.

**Propuesta multiusuario:** inyectar un contexto `{ appUserId, provider, accountId, storeCode, deliveryAddressId }` en cada operación; recuperar secretos en el backend por usuario y proveedor. No conectar todos los usuarios al archivo de sesión global ni entregar JWT/claves al modelo o al frontend.

## 4. Flujo actual de construcción de carrito

```mermaid
sequenceDiagram
    participant App as CLI / REST / MCP
    participant S as Servicios
    participant P as Proveedor Cencosud
    participant API as API supermercado
    App->>S: search(query, config, provider)
    S->>P: search(query, config)
    P->>API: POST /catalog/plp
    API-->>App: Productos normalizados; uuid = slug
    App->>S: getItemDetail(store, slug, config, provider)
    S->>P: getProduct(slug, store, config)
    P->>API: POST /catalog/pdp
    API-->>App: Producto normalizado; uuid = skuId o productId
    App->>S: addToCart(input con SKU, config, provider)
    S->>P: addToCart(SKU, quantity, customizations, config)
    P->>API: PATCH /cart/items
    P->>API: GET /cart
    API-->>App: Snapshot normalizado del carrito
    App->>S: getCheckoutDetail(config, provider)
    S->>P: getCheckout(config)
    P->>API: GET /cart/checkout + GET /location/address
    opt Sin ventana seleccionada y con dirección
        P->>API: POST /cart/delivery-windows
    end
    P->>API: GET /cart
    API-->>App: Resumen con costos y entrega
```

### Buscar candidatos

`search(query, config, provider)` hace `POST {bffBaseUrl}/catalog/plp` con `fullText=query`, `store=defaultStoreCode`, `from=0`, `to=40`, `hideUnavailableItems=false` y filtros vacíos.

No implementa paginación, orden por precio, comparación ni filtro efectivo de disponibilidad. De cada producto toma solamente `product.items[0]`; variantes adicionales quedan fuera. La respuesta normalizada contiene:

- `items[].uuid = product.slug`: referencia de búsqueda, no SKU de compra.
- `title = item.name || product.productName`.
- `price = (item.price || 0) * 100`.
- `itemDescription = product.brand || ""`: en búsqueda es marca, no descripción nutricional.
- `storeUuid = defaultStoreCode`.
- Una tienda sintética con `deliveryFee=0`: ese cero es un placeholder.

No inferir disponibilidad ni gratuidad desde estos campos. Un precio ausente se convierte en cero; debe tratarse como desconocido hasta verificarlo.

### Resolver el producto comprable

`getItemDetail(storeUuid, itemUuid, config, provider)` delega a `getProduct(itemUuid, storeUuid, config)`; el adaptador hace `POST /catalog/pdp` con `{ slug: productId, store: defaultStoreCode }`.

Toma `data.items[0]` y devuelve `uuid = item.skuId || data.productId`. Ese fallback puede ser un ID de producto, sin prueba de que sea aceptado como SKU. Devuelve precio multiplicado por 100 y `customizationGroups=[]`; no existe procesamiento real de variantes ni personalizaciones Cencosud.

CLI, REST y MCP intentan esta resolución otra vez antes de agregar. Si el detalle falla, silencian el error y siguen con el identificador original. El servicio `addToCart` por sí solo no resuelve el slug.

**Regla para la integración:** mantener campos separados `searchSlug`, `productId` y `skuId`; no llamar UUID a todos. Verificar que se obtuvo un SKU válido antes de mutar. La interfaz actual pierde parte de esa distinción: ampliar el contrato en la app.

### Mutar y releer

El servicio ignora título, precio y tienda del input al construir la llamada al proveedor: pasa `itemUuid`, `input.quantity || 1` y `customizations`. Por ello `quantity=0` se convierte en 1; no usar add para borrar. No hay validación completa de cantidades positivas, enteras o límites en esta capa.

El proveedor hace `PATCH {cartBaseUrl}/cart/items` con:

```json
{
  "items": [{
    "skuId": "SKU_DE_EJEMPLO",
    "quantity": 2,
    "isUnitary": false,
    "giftable": false,
    "itemQuantityLimit": 12,
    "isUnitaryEligible": false,
    "sponsoredId": null,
    "soldBy": "JUMBO"
  }],
  "store": "jumboclj512"
}
```

Los flags y el límite 12 son valores fijos del código, no capacidades consultadas al catálogo. `options/customizations` no se usan en el payload Cencosud.

Después del PATCH se ejecuta `GET /cart?store=<code>&simulationTotals=true`. Quitar un producto usa el mismo PATCH con `quantity=0` y vuelve a leer el carrito.

**Semántica pendiente de verificar:** el código no demuestra si `quantity` reemplaza la cantidad existente o la incrementa. Tampoco demuestra atomicidad del PATCH, idempotencia ni comportamiento de reintentos. No asumir ninguna de esas propiedades por el nombre `addToCart`.

### Obtener resumen

`getCheckout` consulta `/cart/checkout`, las direcciones, opcionalmente `/cart/delivery-windows` y finalmente el carrito. Marca `nearest` como dirección por defecto y usa la primera dirección si no hay una por defecto. Si falta ventana seleccionada, toma la primera ventana del primer día para estimar costo/fecha; no la reserva ni confirma que el usuario la haya elegido.

REST devuelve `{ cart, detail }`; MCP devuelve `{ cart, summary }`. Ambos usan `Promise.allSettled` y convierten errores en `null` sin explicar la causa. Un preview parcialmente nulo no es una cotización completa.

## 5. Contratos que conviene conservar o ampliar

| Modelo actual | Campos relevantes | Precaución |
|---|---|---|
| `SearchResult` | `stores[]`, `items[]` | `items[].uuid` es slug en Cencosud |
| `ItemDetail` | `uuid`, `title`, `price`, `itemDescription`, `imageUrl`, `customizationGroups?` | `uuid` cambia a SKU o productId |
| `AddToCartInput` | `storeUuid`, `itemUuid`, `title`, `quantity?`, `customizations?` | Servicio no usa tienda/título/precio; proveedor ignora opciones |
| `CartResponse` | `draftOrderUuid`, `stores[].items[]`, `subtotal`, `deliveryFee`, `serviceFee`, `total`, `currency?` | Carrito remoto de cuenta; currency no se llena en Cencosud |
| `CartItem` | `uuid`, `title`, `quantity`, `price`, `totalPrice` | `uuid` corresponde al SKU |
| `CheckoutDetail` | Totales, dirección, pago, entrega | Puede incluir fallbacks y estimaciones |

Los schemas Zod definen formas y tipos, pero los adaptadores no hacen `.parse()` de las respuestas; abundan `any` y valores por defecto. Validar en tiempo de ejecución al integrar, incluidos identificadores, precios finitos y cantidades.

El carrito Cencosud devuelve siempre una entrada `stores[0]`, incluso cuando no hay items. Para detectar vacío comprobar `stores.flatMap(s => s.items).length`, no solo `stores.length`. Un `draftOrderUuid="unknown"` tampoco identifica un carrito válido.

### Dinero

Búsqueda, producto, carrito y detalle de pedido multiplican montos remotos por 100; la CLI divide por 100 al presentar. El listado de pedidos no aplica esa multiplicación al total: hay una inconsistencia entre endpoints.

Usar un contrato explícito `{ amountMinor, currency, source, observedAt, completeness }` y confirmar la unidad por endpoint. Para CLP, definir en el adaptador cómo representar pesos; la escala heredada de 100 del proyecto no debe confundirse con una conversión de moneda. Los ceros de fallback no son ofertas gratuitas. No comparar catálogo con checkout sin normalizar ambos.

## 6. Interfaces para otro agente

En REST todas las rutas de esta tabla aceptan `?provider=jumbo` o `?provider=santaisabel`. Codificar los parámetros de ruta y búsqueda; no concatenar texto libre sin escape.

| Acción | Servicio interno | REST | MCP |
|---|---|---|---|
| Buscar | `search(query, config, provider)` | `GET /api/search?q=<texto>` | `search(query, provider)` |
| Resolver slug | `getItemDetail(store, slug, config, provider)` | `GET /api/product/:storeUuid/:itemUuid` | `get_item_options(store_uuid, item_uuid, provider)` |
| Leer carrito | `getCart(config, provider)` | `GET /api/cart` | `get_cart(provider)` |
| Agregar | `addToCart(input, config, provider)` | `POST /api/cart/add` | `add_to_cart(store_uuid, item_uuid, title, quantity, customizations, provider)` |
| Quitar | `removeFromCart(sku, config, provider)` | `DELETE /api/cart/item/:itemUuid` | `remove_from_cart(item_uuid, provider)` |
| Direcciones | `getAddresses(config, provider)` | `GET /api/addresses` | `list_addresses(provider)` |
| Preview | `getCheckoutDetail(config, provider)` | `GET /api/checkout` | `checkout_preview(provider)` |

Body REST para agregar: `{ "storeUuid": "<store>", "itemUuid": "<slug>", "title": "<nombre>", "quantity": 2 }`. La ruta intenta resolver el slug. No hay endpoint público de agregar múltiples productos ni endpoint de carrito de simulación aislado.

REST usa la sesión global, no autentica clientes y permite CORS general. Antes de reutilizarlo para una app multiusuario, añadir autenticación, autorización sobre la cuenta y secretos por usuario. El MCP stdio es una interfaz local, no una API multiusuario lista para exponer.

## 7. Propuesta de lógica para optimizar carritos desde comida o recetas

Esta sección es un diseño para implementar; no describe funcionalidades existentes.

### Separar intención, propuesta y carrito remoto

1. Convertir recetas/listas en necesidades: ingrediente, cantidad requerida, unidad, porciones, restricciones, sustituciones permitidas y presupuesto.
2. Agregar ingredientes repetidos entre recetas y descontar despensa solo si el usuario la ha confirmado. Conservar el vínculo a cada receta.
3. Normalizar unidades compatibles (kg/g, l/ml). No convertir masa a volumen sin una densidad fiable. Distinguir cantidad de envases de cantidad de ingrediente.
4. Buscar por ingrediente y proveedor sin modificar carritos. Deduplicar consultas y candidatos por contexto.
5. Extraer marca, tamaño, unidad, variante y contenido neto con procedencia. Si solo se conoce el título, marcar la extracción como inferida y pedir aclaración cuando cambie la decisión.
6. Resolver PDP únicamente para candidatos finalistas; verificar SKU, precio, restricciones y disponibilidad. Ausencia de un campo significa desconocido.
7. Calcular envases necesarios, excedente, costo comparable y cobertura. No seleccionar por el menor precio de una unidad de venta si el formato no cubre la necesidad.
8. Comparar propuestas por tienda considerando productos, envío, mínimos de compra, horario, restricciones y compras incompletas. Si faltan tarifas, el ranking es provisional.
9. Presentar propuesta y cambios sobre el carrito existente. Pedir elección cuando haya sustituciones no autorizadas, datos críticos desconocidos o cambio de presupuesto/tienda.
10. Aplicar cambios autorizados, releer y reconciliar. Mostrar diferencias de precio, faltantes o cantidades rechazadas. Finalizar con preview; una propuesta o un carrito preparado no es una compra confirmada.

Ejemplo ilustrativo, no precios de catálogo: se necesitan 1,5 l de leche y una unidad de venta contiene 1 l. Comprar dos envases cubre 2 l y deja 0,5 l excedente. Si el envase cuesta 1.200 pesos, el costo de cubrir la necesidad es 2.400 pesos; no 1.800. Restricciones de tipo de leche se evalúan antes del precio.

Una función de costo propuesta puede usar:

```text
minimizar costoProductos + costoEntrega + costoServicio + penalizaciónExcedente
sujeto a cobertura de ingredientes y restricciones alimentarias,
presupuesto, disponibilidad y horarios aceptados.
```

Definir penalizaciones y prioridades con la app; no inventar pesos universales. Restricciones como alérgenos son filtros estrictos, no penalizaciones que un ahorro pueda compensar. Si no se puede comprobar una restricción, no declarar que el producto la cumple. Repartir productos entre tiendas puede reducir el costo de productos y aumentar el costo total por envíos.

### Modelo propuesto de plan

```ts
// Diseño de la app; aún no existe en Grocery CLI.
type PlannedLine = {
  requirementId: string;
  provider: "jumbo" | "santaisabel";
  storeCode: string;
  searchSlug: string;
  skuId?: string; // obligatorio antes de aplicar cambios
  title: string;
  requiredAmount: number;
  requiredUnit: "g" | "ml" | "unit";
  packAmount?: number;
  packUnit?: "g" | "ml" | "unit";
  packCount?: number;
  price?: { amountMinor: number; currency: "CLP"; observedAt: string };
  availability: "known_available" | "known_unavailable" | "unknown";
  evidence: Array<{ field: string; source: "catalog" | "pdp" | "user" | "inferred" }>;
  status: "candidate" | "needs_review" | "resolved" | "applied" | "failed";
};
```

Agregar a nivel plan: usuario/cuenta, versión, snapshot inicial, costo completo o parcial, faltantes y operaciones propuestas. Este estado vive en la app; no usar el carrito remoto como almacenamiento temporal de alternativas.

## 8. Optimización de llamadas y coherencia

**Costo actual:** para N productos, agregar desde CLI/REST/MCP suele ejecutar PDP + PATCH + GET por producto, unas 3N peticiones de proveedor, además de búsquedas. Si el agente ya consultó PDP, se repite la resolución. Preview REST/MCP hace GET del carrito en paralelo al checkout, pero el checkout también relee el carrito.

**Mejoras propuestas en orden:**

1. Cachear búsqueda y resolución con claves que incluyan proveedor, tienda y consulta/slug. Usar TTL configurable e invalidar precios/disponibilidad antes de aplicar; evitar cachear carritos entre cuentas.
2. Centralizar resolución de slug a SKU en una capa compartida, con entrada explícita que indique el tipo de identificador. Evitar que cada interfaz repita PDP o use fallback silencioso.
3. Ejecutar búsquedas y PDP independientes con concurrencia limitada. Serializar mutaciones por cuenta/proveedor/tienda para evitar resultados fuera de orden.
4. Leer el carrito inicial, calcular solo los cambios necesarios y conservar productos ajenos al plan salvo autorización para retirarlos.
5. Diseñar `setItemQuantity` cuando la semántica remota esté verificada. El método actual `addToCart` no garantiza actualización absoluta ni idempotencia.
6. Investigar envío de múltiples items en un PATCH: el cuerpo actual contiene un array, pero soporte, límites y atomicidad de lotes no están comprobados. Solo después implementar batching con manejo de errores parciales y lectura final.
7. Reutilizar snapshots en preview para evitar lecturas duplicadas, conservando una lectura final consistente. Medir peticiones por carrito, latencia, resolución fallida y cambios inesperados de precio.

No optimizar quitando la verificación final. Si un PATCH falla por timeout o el GET posterior falla, la mutación puede haber ocurrido. Releer antes de reintentar; no repetir a ciegas. Reintentos de lecturas pueden usar backoff acotado para errores transitorios. Para mutaciones, requieren verificación del estado y de la semántica del proveedor.

## 9. Errores que el agente debe conservar

Propuesta: mapear errores a códigos estructurados, diferenciando `AUTH_REQUIRED`, `AUTH_EXPIRED`, `MISSING_API_KEY`, `UNSUPPORTED_OPERATION`, `PRODUCT_UNRESOLVED`, `OUT_OF_STOCK`, `INVALID_QUANTITY`, `RATE_LIMITED`, `REMOTE_UNAVAILABLE`, `PARTIAL_CHECKOUT` y `MUTATION_UNCERTAIN`.

Hoy se lanzan principalmente errores de texto, se pierden causas en algunos fallbacks y no se aplica un timeout general a fetch. No devolver vacío si el proveedor falló; distinguir resultado vacío de consulta fallida. Registrar metadatos técnicos sin JWT, headers de autorización, respuestas completas con datos personales ni direcciones del usuario.

## 10. Criterios de aceptación para la integración

Casos a validar con mocks/fixtures sanitizados, antes de usar cuentas reales:

- Dos recetas comparten ingrediente: las necesidades se suman una vez y generan la cantidad correcta de envases.
- Dos formatos y dos tiendas: comparar cantidad equivalente y costo completo; tarifas desconocidas mantienen el ranking provisional.
- Slug de búsqueda resuelto a SKU: PATCH recibe el SKU; detalle fallido bloquea la mutación.
- Precio ausente, stock desconocido y restricción alimentaria no comprobada: no se convierten en producto gratis, disponible o compatible.
- Cuenta A y B: credenciales, snapshots y escrituras no se mezclan.
- Carrito preexistente: conserva productos fuera del plan; no interpreta `stores:[{items:[]}]` como carrito lleno.
- Cantidades cero, negativas, no finitas o fraccionarias: validar según tipo de venta, sin convertir cero en una unidad añadida.
- PATCH exitoso seguido de GET fallido, timeout incierto o aplicación parcial: reconciliar antes de repetir y explicar el resultado parcial.
- Dos cambios concurrentes: serialización y snapshot final consistente; no sobrescribir cambios externos sin resolver el conflicto.
- Checkout parcial o ventana estimada: no informar compra lista/confirmada ni entrega reservada.
- Stubs de pago, propina, dirección y compra: no reportar acciones reales.

## 11. Ruta de implementación para el agente receptor

Primero introducir contexto multiusuario, capabilities y contratos con identificadores/unidades explícitos. Luego construir el plan de ingredientes y selección de envases en la app. Después centralizar resolución y reconciliación del carrito. Finalmente optimizar cache/concurrencia y evaluar lotes con contratos probados.

El primer entregable útil es un carrito propuesto, con productos trazables, costo parcial/completo indicado y faltantes; el segundo es aplicar cambios de forma verificable. La confirmación de compra es una integración futura independiente.

Para entregar este conocimiento sin el resto del repositorio, adjuntar este documento y [AGENT_HANDOFF.md](AGENT_HANDOFF.md). Para implementar, facilitar también los archivos enlazados, README y PROJECT_REVIEW; nunca `.env.local`, sesiones ni capturas de cuentas reales.
