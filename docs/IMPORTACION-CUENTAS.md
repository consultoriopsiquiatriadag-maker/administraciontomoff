# Importar las cuentas y consultar las monedas

## Carga inicial

1. Si ya tienes datos, exporta primero una copia desde Configuración.
2. Descarga el archivo privado `mis-cuentas-importacion.json` que recibiste en el chat. No lo subas al repositorio ni a una carpeta pública del sitio.
3. Abre la web y actualiza con Ctrl+F5 después de que la publicación de GitHub Actions termine correctamente.
4. Ve a **Configuración → Importar cuentas extraídas → Seleccionar paquete de cuentas**.
5. Revisa las cuentas seleccionadas, sus fechas, los saldos en las dos monedas y la tarjeta de destino. Si ya registraste una tarjeta manualmente, selecciónala en el destino para evitar crear otra.
6. Pulsa **Importar cuentas seleccionadas**. Se abrirán los resúmenes del mes de cierre del archivo (no del mes del vencimiento).

La importación es aditiva: no elimina servicios, presupuestos, tarjetas, documentos ni pagos existentes. Si ya existe un resumen de la tarjeta y período elegidos, se conserva completo y se informa que fue omitido. Para corregir un resumen existente usa Editar; reimportar un paquete no reemplaza sus datos. Repetir la importación reconoce las cuentas creadas previamente por su identificador estable.

Los PDFs originales no se incluyen en este paquete. Puedes adjuntarlos desde cada resumen una vez importado. Las imágenes de bancos se mantienen en el almacenamiento local y en las copias, como antes.

Si estás usando demostración, expórtala si quieres conservarla y elimínala antes de importar datos reales. La app evita mezclar ambos conjuntos.

## Revisión necesaria para el plan de pagos

Los saldos de un resumen corresponden a su fecha de cierre. El paquete no confirma automáticamente que sigan pendientes hoy:

1. Abre cada resumen y registra únicamente pagos **posteriores al cierre**, en la moneda en que fueron acreditados.
2. Los pagos que el banco ya descontó en el documento son parte de la conciliación; no los registres otra vez como pagos de este saldo.
3. Pulsa **Confirmar pagos al día** cuando estén registrados todos los pagos posteriores o hayas verificado que no hubo otros.
4. Si el resumen no informa mínimo, entra a **Editar resumen**. Deja el mínimo vacío y conserva la modalidad pendiente hasta confirmar las condiciones con la documentación o el emisor. Si confirmas que exige el total, selecciona **Pago total exigible (confirmado)**. Si obtienes un mínimo real, ingresa ese importe y selecciona **Mínimo informado**.

Un mínimo vacío no es cero. La confirmación de pago total es una decisión explícita del usuario; no cambia ni completa el importe mínimo real. Si alguna cuenta con saldo necesita revisar pagos o modalidad, el plan de esa moneda queda bloqueado y no asigna dinero como si estuviera completo.

## Pesos y dólares

El selector **Moneda de consulta** cambia entre ARS y USD en panel, resúmenes, plan, simulador, cuotas, calendario, historial e informe imprimible. Las dos monedas se consultan por separado y no se suman ni convierten. Los saldos y pagos de un resumen tienen controles independientes por moneda: un pago USD no reduce el saldo ARS, y viceversa.

Los consumos y pagos individuales muestran su moneda incluso si se consultan juntos. Los servicios permanecen en ARS. En Presupuesto se registran por separado el dinero para tarjetas en ARS y el disponible en USD; los dólares no se descuentan de los ingresos en pesos.

Si el banco convierte una deuda de USD a ARS, utiliza los movimientos y saldos efectivamente acreditados por el banco. La app no supone una cotización ni ejecuta una conversión. Los importes de transferencias históricas documentados en el paquete ya están aplicados a los saldos anteriores de cada moneda.

Las tasas USD, cuando faltan, no se sustituyen por tasas ARS. Las tasas del próximo período informadas en los resúmenes se conservan en las observaciones; no reemplazan silenciosamente las del período cargado. Las recomendaciones y estimaciones no son el cálculo contractual del banco.

## Compatibilidad y privacidad

La versión de datos y de las nuevas copias es **2**. Las bases y copias de versión 1 se leen y migran conservando sus valores; los importes antiguos y pagos sin moneda siguen siendo ARS. No vuelvas a una versión vieja de la app ni intentes importar un backup v2 en ella: no soporta estos campos. La versión física de IndexedDB sigue siendo 1 porque se conservan los mismos almacenes; cambia la versión del contenido.

El archivo `mis-cuentas-importacion.json` usa su propio formato `mis-cuentas-extracted` versión 1. No es un backup y no debe elegirse en Importar copia de seguridad. Los antiguos archivos de extracción para revisión tampoco son el paquete importable: usa el archivo preparado para esta función.

Los paquetes y las copias contienen información financiera sin cifrar. Guárdalos fuera de GitHub. La selección de archivo, la revisión y la escritura en IndexedDB ocurren dentro del navegador; no hay un endpoint que reciba esos datos.

## Usar el código del chat sin descargar archivos (Mac)

En Configuración → Importar cuentas extraídas encontrarás **Sin descargar archivos**. Copia el bloque que empieza con `MCUENTAS1:` desde el chat y pégalo en **Pegar código de tus cuentas** (⌘V en Mac). Pulsa **Revisar datos pegados** y confirma las cuentas en la tabla antes de importarlas.

El código es el mismo paquete de datos, comprimido para facilitar la copia; no es una dirección web ni ejecuta instrucciones. Se decodifica y valida dentro del navegador, sin enviarlo a un servicio. Requiere una versión actual de Safari, Chrome o Firefox con DecompressionStream. También se acepta pegar el JSON completo. Se conservan los límites de tamaño y todas las comprobaciones de integridad y duplicados. Si el código está incompleto no se guardan cambios. Después de leerlo correctamente, el cuadro de texto se limpia y los datos quedan en la revisión hasta que confirmes la importación.
