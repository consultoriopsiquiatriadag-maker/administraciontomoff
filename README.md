# Mis cuentas

Panel personal para organizar tarjetas, deudas y servicios del hogar. Versión 2 local, en español, con pesos y dólares separados. No requiere cuentas bancarias, claves, una API ni una base de datos remota.

## Usar en Windows

1. Instala **Node.js 24 LTS** desde su sitio oficial.
2. Descarga el proyecto, descomprime la carpeta y haz doble clic en **`iniciar.cmd`**. La primera instalación necesita Internet para descargar dependencias.
3. Sigue la dirección indicada en la consola: `http://127.0.0.1:4173`. Mantén esa ventana abierta mientras usas la aplicación. Después de instalar, el funcionamiento habitual es local.
4. Agrega tus tarjetas o elige **Explorar demostración**. Puedes eliminar toda la demostración desde Configuración y comenzar con tus datos.

Usa siempre **la misma dirección, puerto y perfil de navegador**. Los datos se asocian al origen del sitio; cambiar de `127.0.0.1` a `localhost` o cambiar el puerto abre otro almacenamiento. Exporta una copia antes de cambiar de dirección o equipo.

El lanzador de Windows está incluido; la validación automatizada se ejecutó en Linux con Chromium. No se ha probado este archivo en una PC Windows real.

## Desarrollo

```sh
npm ci --cache /tmp/mis-cuentas-npm
npm run dev -- --port 5173 --strictPort
```

Node 24; versión usada: 24.19.0, registrada en `.node-version`. Dependencias reproducibles en `package-lock.json`. La caché explícita evita depender de una carpeta personal escribible en entornos cloud. En Windows, `npm ci` puede usarse sin esa opción.

```sh
npm run build
npm start
npm test
npm run test:browser
```

`npm start` sirve la compilación de producción en el puerto fijo 4173 y solo en la interfaz local. `npm run dev` usa un origen diferente, destinado al desarrollo con datos de prueba. No abras `dist/index.html` con doble clic.

Las pruebas de navegador usan Chromium en `/usr/bin/chromium` en el entorno cloud. En otro equipo, configura `CHROMIUM_PATH` con la ruta al ejecutable Chrome/Chromium. Playwright es una dependencia de desarrollo, no un servicio externo de la aplicación.

## Qué incluye la V1

- Panel por mes/año: obligaciones, deuda pendiente, mínimos, pagos, saldo pendiente, presupuesto y próximos vencimientos.
- Alta, edición y eliminación de tarjetas; únicamente los últimos cuatro dígitos.
- Resúmenes mensuales con importes reales, consumos, pagos parciales y documentos.
- Compras en cuotas: puedes cargarlas directamente en un consumo o desde Cuotas futuras. El sistema proyecta las cuotas restantes sin crear cargos reales.
- Tres estrategias de pago comparables y simulador de intereses mensuales.
- Servicios personalizados, facturas mensuales, registro de pago, documentos e historial con variaciones.
- Calendario unificado, historial de deuda global/por tarjeta y resumen imprimible, guardable como PDF desde el navegador.
- IndexedDB, datos de demostración eliminables, exportación/importación con documentos y diseño responsive.

## Flujo recomendado

1. Registra la tarjeta y su tasa de financiación **mensual TEM** si la conoces. No ingreses TNA o TEA como si fueran TEM.
2. Carga el resumen del período con su **total y mínimo informados por el banco**. Los consumos detallados sirven para verificarlo: no lo sustituyen ni se suman de nuevo al total.
3. Al cargar un consumo de una compra nueva, indica, por ejemplo, cuota 3 de 12. Para meses posteriores, selecciona la compra existente para no duplicar el compromiso. También puedes registrar las compras en su sección independiente.
4. Registra cada pago del resumen con importe y fecha. Los pagos se pueden editar y eliminar; el saldo y el mínimo pendiente se recalculan. No se permiten pagos superiores al total del resumen.
5. Registra los servicios y una factura por servicio/período. Agrega PDF, JPG o PNG (hasta 15 MB por documento); usa **Abrir** para visualizar o el nombre del archivo para descargarlo.
6. En Plan de pago, define ingresos, otros gastos y dinero disponible para tarjetas. Compara las sugerencias. La aplicación no realiza pagos.
7. Exporta una copia desde Configuración regularmente.

Las eliminaciones requieren confirmación. Eliminar una tarjeta elimina sus resúmenes, consumos, pagos, compras y documentos dependientes. Eliminar un servicio elimina sus facturas y documentos. Eliminar una compra conserva los consumos, quitando su vínculo a la compra.

## Privacidad y copias

Todos los registros y documentos se guardan en **IndexedDB del navegador**. La aplicación no usa telemetría, fuentes remotas, servicios financieros ni sincronización. La versión de producción incluye una política de contenido que limita conexiones al mismo origen. Ninguna contraseña, PIN, CVV o número completo de tarjeta tiene un campo de almacenamiento.

No es una bóveda cifrada: quien acceda a tu sesión de Windows/perfil de navegador puede acceder a la información. Usa una cuenta protegida y cifrado de disco cuando corresponda. El modo incógnito no es adecuado para conservar datos.

**Exportar copia de seguridad** genera JSON versionado con todos los datos y documentos codificados en base64. **Importar** valida la estructura, las referencias y las restricciones financieras antes de reemplazar la base en una transacción. Una copia inválida no modifica los datos actuales. La importación admite archivos de hasta 150 MB. Las copias no están cifradas; protégelas igual que tus facturas y resúmenes originales. Se puede pedir almacenamiento persistente al navegador, pero eso no reemplaza una copia externa.

No cambies de equipo ni borres el almacenamiento sin exportar primero. La app no puede recuperar datos eliminados sin una copia.

## Alcance y cálculos

Los importes son enteros en **centavos**, nunca cadenas formateadas. La interfaz distingue ARS y USD sin conversiones automáticas. Las tasas reales ingresadas se separan de las recomendaciones. No se crean pagos automáticos ni se cambian importes informados.

La deuda histórica compara fotografías mensuales (total del resumen menos pagos vinculados); no suma saldos de resúmenes de distintos meses, porque podrían representar deuda refinanciada. El calendario reúne fechas reales. El panel y el plan se limitan al período seleccionado. Si hay resúmenes faltantes, la comparación está incompleta: se muestra la cobertura en Historial. Los pagos posteriores actualizan el saldo del resumen al que pertenecen; no es un registro contable inmutable de cierres pasados.

El plan recomendado es una **heurística explicable**, no un optimizador contractual: mínimos por vencimiento, luego vencimientos inmediatos y mayor TEM. El simulador estima saldo restante × TEM; excluye impuestos, días exactos, cargos y nuevos consumos. Sin tasa, no estima intereses. Pagar el mínimo puede aumentar la deuda.

PWA instalable, ejecutable de escritorio, OCR, extracción de PDF, sincronización y refinanciación avanzada quedan para futuras versiones; no están implementados en esta entrega.

Consulta [arquitectura y modelo](docs/ARQUITECTURA.md) y [validación](docs/VALIDACION.md).

## Versión web con GitHub Pages

El proyecto incluye publicación automática desde `main`, con pruebas y compilación previas. Sigue [los pasos de activación y traslado de datos](docs/PUBLICACION-WEB.md). Los datos financieros se conservan en el navegador de cada dispositivo y no se suben a GitHub. No hay sincronización automática entre equipos.

## Logos de bancos y emisores

En **Mis tarjetas → Cargar logo del banco**, selecciona un PNG o JPG de hasta 2 MB. El logo aparece en las tarjetas, el panel y el plan de pago; los nombres equivalentes (Macro/Banco Macro, Santander/Santander Río, Amex/American Express) comparten una imagen. Se puede cambiar o quitar desde la tarjeta. Los bancos sin logo muestran un ícono genérico, conservando su nombre visible.

Las imágenes se almacenan localmente en IndexedDB, se incluyen en las copias y no se descargan desde servicios externos al abrir la app. Eliminar una tarjeta conserva el logo si queda otra del mismo banco. Para restaurar una copia con logos, usa esta versión o una posterior de la aplicación. Las copias anteriores siguen siendo compatibles.

## Importar las cuentas extraídas y consultar USD

La versión 2 agrega **Configuración → Importar cuentas extraídas**, con revisión por cuenta, vinculación a tarjetas existentes y conservación de resúmenes que ya están cargados. Usa el archivo privado `mis-cuentas-importacion.json` entregado en el chat; nunca lo publiques en el repositorio.

El selector de moneda permite consultar ARS y USD por separado. Los pagos y presupuestos para tarjetas también se separan. Los servicios siguen en pesos. Un mínimo desconocido permanece vacío, con modalidad pendiente; para confirmar pago total debes seleccionar esa opción expresamente. Los resúmenes importados necesitan revisar los pagos posteriores al cierre antes de generar un plan.

Consulta el [paso a paso de importación, revisión y compatibilidad](docs/IMPORTACION-CUENTAS.md). Las copias nuevas tienen versión 2; se aceptan las de versión 1 y se migran sin cambiar los importes existentes.
