# Validación de la V1

Comandos reproducibles:

```sh
npm ci --cache /tmp/mis-cuentas-npm
npm run build
npm test
npm run test:browser
npm audit
```

Las pruebas unitarias cubren prioridades por costo/saldo/vencimiento, mínimos insuficientes, pagos previos, ausencia de tasas, excedentes, redondeo a centavos, invariantes sobre múltiples presupuestos, cuotas 3/12, cambio de año, separación de períodos, referencias inválidas, duplicados y sobrepagos.

La persistencia se prueba reabriendo IndexedDB y restaurando datos más documentos desde una copia. Se comprueba que una importación inválida deja la base intacta y que la eliminación de registros limpia documentos huérfanos.

Las pruebas de navegador crean tarjeta, resumen, consumo, pago, cuotas, servicio, factura y presupuesto; recargan para confirmar persistencia; exportan una copia con un PDF, vacían el almacenamiento y restauran la copia verificando el saldo y el documento. También recorren todas las secciones con demostración, verifican el diseño a 390 px, comprueban ausencia de solicitudes externas y eliminan la demostración.

La compilación verifica TypeScript y genera la aplicación de producción con su política de contenido. Se hace además una solicitud real y navegación a la compilación servida localmente.

No se ha validado un instalador PWA/escritorio ni el lanzador en Windows real. No hay OCR ni interpretación automática de archivos. Las pruebas usan información ficticia.

## Resultado de esta entrega

- Instalación limpia mediante `npm ci`: correcta.
- TypeScript y compilación de producción: correctos.
- Pruebas unitarias y de persistencia: **22 de 22**.
- Recorridos con Chromium en desarrollo: **3 de 3**.
- Los mismos recorridos contra la compilación de producción: **3 de 3**.
- Petición HTTP a producción: **200**.
- `npm audit`: **0 vulnerabilidades** al realizar esta entrega.
- Validación responsive a 390 px: sin desbordamiento horizontal del documento.

La comprobación de navegador también ejercita la creación automática de una compra 3/12 desde un consumo, corrección de registros y eliminación en cascada. Los resultados son de este entorno Linux; no equivalen a una prueba en Windows.

Actualización de logos: compilación correcta, **25 pruebas unitarias/de persistencia** y **4 recorridos de navegador contra producción** aprobados. Se verificaron alias de emisor, reemplazo único de logo, conservación mientras quede otra tarjeta, restauración binaria en copias, rechazo de PDF/SVG como logo y visualización tras recargar.

Versión 2: compilación correcta, **39 pruebas unitarias/de persistencia** y **5 recorridos de navegador contra producción** aprobados. Se verificaron la migración de bases y backups v1, restauración de USD y mínimos nulos, importación aditiva sin duplicados, elección de tarjeta existente, separación de pagos/presupuestos ARS y USD, bloqueo del plan por obligaciones o pagos sin confirmar, y conservación de ingresos ARS en un informe consultado en USD. La auditoría de dependencias de producción no detectó vulnerabilidades en esta actualización.

El paquete privado de la sesión se validó fuera del checkout: cinco cuentas y 49 consumos, totales por moneda coincidentes con la extracción, sin crear pagos previos otra vez ni inventar mínimos. Ese archivo y sus importes no forman parte del repositorio publicado.

Importación sin archivos: **42 pruebas unitarias y 6 recorridos de navegador** aprobados, con compilación correcta. Se comprobó JSON pegado, código compacto válido, rechazo de código incompleto/de otro formato y revisión previa antes de guardar. El código privado entregado en el chat se comparó con el paquete de cinco cuentas y 49 consumos fuera del repositorio: conserva exactamente sus datos. No se publicó el código privado ni el archivo financiero.

Prompt mensual: **50 pruebas unitarias/de persistencia y 7 recorridos de navegador** aprobados, con compilación correcta. Se validó que el ejemplo del prompt cumple el contrato del importador, que el contexto excluye notas/saldos/pagos privados, que se puede copiar al portapapeles, pegar JSON con cercas Markdown e importar otro mes sobre la misma tarjeta sin duplicar cuotas. También se probaron claves para compras manuales, alias externos, respuestas que solicitan aclaración y conflictos de identidad o secuencia de cuotas. Las respuestas JSON de las pruebas son ficticias; la lectura de un PDF por otro ChatGPT sigue requiriendo revisión humana.
