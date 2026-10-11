# Revisión del proyecto

## Arquitectura

Bun y TypeScript ejecutan tres interfaces: CLI, API REST con Hono y servidor MCP. Los servicios compartidos delegan a una interfaz de proveedores. Jumbo y Santa Isabel heredan la integración Cencosud; PedidosYa contiene métodos pendientes.

La separación permite incorporar proveedores sin duplicar la presentación, aunque todavía hay nombres y supuestos heredados de Uber Eats (restaurantes, UUID y precios en centavos).

## Preparación para publicar

- Se excluyeron configuraciones personales, sesiones, variables de entorno, herramientas locales, capturas y la copia del proyecto original.
- Se retiró `.mcp.json` del seguimiento actual, conservando el archivo local.
- Se trasladaron las claves API de los proveedores a `.env.local`. El código ahora exige variables de entorno; `.env.example` contiene únicamente campos vacíos.
- Las configuraciones de sesión nuevas se escriben con permisos `0600`.
- Se corrigieron llamadas REST y el comando restaurants que no pasaban el proveedor, el contrato incompleto de PedidosYa y errores de tipos en las personalizaciones y el enmascaramiento del perfil.
- Se corrigió la ruta del comando server y se limitó la comprobación TypeScript al código del proyecto.
- Se actualizó la documentación para distinguir implementaciones, simulaciones y funciones pendientes.

## Hallazgos pendientes

1. PedidosYa no funciona todavía. La confirmación de compras tampoco está implementada para Cencosud; el comando CLI muestra un resultado simulado.
2. Propinas y selección de métodos de pago son stubs. Cambiar dirección encuentra una dirección pero no la modifica en el backend. Algunas operaciones devuelven listas vacías si falta soporte, lo que puede confundirse con resultados reales.
3. La API REST no autentica clientes y habilita CORS general. Necesita controles de acceso antes de desplegarse fuera del entorno local.
4. El login captura cualquier Bearer con formato JWT visto en el navegador, sin verificar dominio ni confirmar que la sesión esté autenticada. Conviene limitarlo al proveedor y validar la sesión.
5. Algunas respuestas de error del carrito se imprimen completas. Pueden contener datos personales; hay que reducir o filtrar estos logs.
6. Faltan pruebas automatizadas de contratos y flujos. Las API internas pueden cambiar sin aviso. Es necesario validar moneda y unidades de precios por endpoint.
7. La instalación npm global descrita anteriormente no fue verificada; el README ahora documenta la ejecución desde el código local.

## Validación y alcance

Se ejecutaron la comprobación de tipos y una prueba de ayuda de la CLI. La revisión de credenciales usa patrones de JWT, claves privadas, tokens conocidos, asignaciones de credenciales y claves Cencosud. Incluye los archivos que se van a publicar y los cinco commits originales; no se detectaron credenciales con estos patrones en el historial original.

No se realizaron compras ni se validaron llamadas autenticadas contra los proveedores. Un escaneo por patrones reduce el riesgo de publicar secretos, pero no garantiza encontrar todos los formatos posibles.
