# Preparar cada resumen mensual con tu propio ChatGPT

El circuito es manual y sencillo: **PDF → tu ChatGPT → copiar respuesta → pegar en el organizador → revisar e importar**. No necesitas gestionar archivos JSON, códigos comprimidos ni una clave API.

1. En el organizador, abre **Configuración → Preparar un resumen con mi ChatGPT**.
2. Deja seleccionadas todas tus tarjetas para que el prompt pueda reconocerlas, o elige la tarjeta correspondiente al PDF que vas a subir.
3. Pulsa **Copiar prompt para mi ChatGPT**. Puedes ver el texto completo; si el navegador no permite copiar automáticamente, el sitio lo selecciona para copiar con ⌘C en Mac o Ctrl+C en Windows.
4. Abre tu ChatGPT, pega el prompt y adjunta el PDF mensual o imágenes legibles de todas sus páginas.
5. Copia el bloque **JSON** que te devuelve ChatGPT.
6. Vuelve a **Configuración → Importar cuentas extraídas → Sin descargar archivos**. Pega la respuesta con ⌘V en Mac y pulsa **Revisar datos pegados**.
7. Comprueba la tarjeta de destino, las fechas, los saldos de ambas monedas y las advertencias. Después confirma la importación.

La web no sube PDFs ni manda el prompt a ChatGPT. Tú realizas ese paso con tu cuenta de ChatGPT, bajo sus condiciones y controles de privacidad. El prompt incorpora nombres, terminaciones parciales y referencias de cuotas de las tarjetas elegidas para reconocer las mismas cuentas y compras en meses posteriores; no incluye saldos ni pagos del organizador. Conviene copiarlo de nuevo desde la página cada mes para que use las referencias actuales.

ChatGPT puede cometer errores de lectura. El sitio valida la estructura y varias restricciones, pero no puede comprobar que cada cifra coincida con el PDF que no recibió. La revisión del resumen original antes de guardar sigue siendo necesaria.

## Qué pide el prompt

- Importes enteros en centavos, ARS y USD por separado, sin cotizaciones inventadas.
- Período del cierre, con fechas actuales en lugar de fechas anteriores/próximas.
- Solo los últimos cuatro dígitos de identificación y distinción entre tarjeta, cuenta y socio.
- Mínimos desconocidos como `null`, nunca como cero. Pago total solo cuando corresponda y esté confirmado por el documento.
- Tasas mensuales expresamente informadas, sin confundir TNA, TEM, punitorios o topes futuros.
- Pagos previos ya descontados como parte de la conciliación, sin crear pagos nuevos.
- Claves estables de cuenta y compra en cuotas, para conservar el historial mensual y evitar duplicados.
- Respuesta JSON estándar, sin descargas, base64 ni códigos comprimidos.

Si faltan datos imprescindibles, el prompt pide una respuesta de revisión y el sitio muestra lo que falta, sin guardar importes inventados. También señala respuestas que no cumplen el formato para que puedas pedirle a ChatGPT que las corrija. Se puede pegar el JSON solo o su bloque Markdown completo con las marcas de código.

## Historial y cuotas

Cada nuevo mes agrega un resumen a la tarjeta existente. Si ya hay un resumen de esa tarjeta y período, se conserva; las correcciones de uno ya cargado se hacen con **Editar**. Los nombres elegidos para tarjetas existentes no se reemplazan automáticamente.

Las referencias de compras en cuotas incluyen una clave estable y el período de la cuota ya observada. El nuevo resumen debe informar la nueva cuota; no se crea otra compra cada mes. Si una cuota contradice el total o la secuencia de la compra vinculada, se pide revisar la relación en lugar de cambiar los registros anteriores. Las referencias de una compra manual también se pueden reutilizar sin duplicarla.

Los pagos posteriores al cierre continúan necesitando revisión y confirmación dentro del organizador antes de generar el plan de pagos. El prompt no confirma el saldo pendiente actual en nombre del usuario.
