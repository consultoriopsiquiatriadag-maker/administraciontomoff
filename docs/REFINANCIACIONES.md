# Refinanciaciones y reparto del dinero disponible

## Registrar un plan contratado

En **Resúmenes**, abre la tarjeta y pulsa **Registrar refinanciación**. La corrección se hace por resumen y moneda; no se reemplazan el total, el mínimo, las tasas ni las fechas del PDF original.

Si todavía faltan datos, guarda el estado **Pendiente** dejando los campos desconocidos vacíos. Un plan pendiente no se trata como una cuota cero ni como la obligación de pagar el total original. El cálculo queda pendiente de revisión y las obligaciones incompletas se señalan.

Para confirmar solicita o verifica con el banco:

- Fecha de inicio del plan y fecha del saldo informado.
- Saldo total vigente adeudado.
- Obligación pendiente de este período, incluyendo cuota y otros cargos que correspondan.
- Valor de la cuota, cuota actual y cantidad total de cuotas.
- Vencimiento de la obligación del período.
- TEM del plan, si está disponible. La tasa anterior de la tarjeta no se hereda automáticamente.

La obligación del período y la deuda total son datos diferentes. Tampoco se debe confundir el saldo vigente con la suma de cuotas futuras, que puede contener intereses aún no devengados. Una publicidad de Plan V o una oferta de financiación no prueban la contratación de un plan.

Al confirmar, declara expresamente que los saldos introducidos ya contemplan todos los pagos actualmente registrados. El sitio conserva qué pagos estaban incluidos y solo descuenta los nuevos una vez. Si después cambias o eliminas uno de los pagos incluidos, o agregas uno anterior a la fecha del saldo, el plan vuelve a necesitar revisión antes de repartir fondos. Revisa o vuelve a confirmar los saldos con el banco; no se recalculan condiciones contractuales automáticamente.

Después de guardar un plan confirmado se toma su vencimiento y obligación mensual para el calendario y el plan de pagos. La deuda restante sigue visible por separado. Al registrar un pago, se propone por defecto lo exigible del período, no toda la deuda refinanciada.

Los datos importados de un PDF que describan una refinanciación se reciben como pendientes. Se revisan en el sitio antes de usarlos como condiciones confirmadas. Cada nuevo resumen mensual debe reflejar la situación vigente; el prompt de ChatGPT advierte cuando el contexto contiene un plan previo y el documento nuevo no aclara su continuidad.

## Adelantar pagos

Una cuota vigente no autoriza a suponer que cualquier pago extra reducirá el capital o los intereses. Por defecto el motor propone solo la obligación mensual del plan.

Para habilitar una propuesta de adelanto adicional, registra un límite adicional aceptado por el banco, la TEM relevante del plan y la confirmación de que ese adelanto reduce el costo. Se respeta ese límite y se descuentan los adelantos ya registrados. Si las condiciones no están confirmadas, puede quedar dinero sin asignar: no se inventa una cancelación anticipada ni se modifica la cantidad de cuotas futuras.

El simulador y la comparación no multiplican el saldo de una refinanciación por la tasa para presentarlo como interés contractual. Para una cancelación o una refinanciación nueva se necesita la liquidación del banco.

## Dinero disponible para cuentas

En **Plan de pago → ¿Cuánto dinero tienes disponible ahora?**:

1. Elige si ese monto es para **Servicios y tarjetas** o **Solo tarjetas**, cuando ya separaste los servicios.
2. Ingresa el dinero efectivamente disponible hoy. No es necesario que coincida con tus ingresos totales del mes, que pueden estar parcialmente gastados.
3. Si corresponde, reserva un importe para otros pagos pendientes.
4. Pulsa **Guardar y calcular estrategia**.

En el modo conjunto, el motor separa primero la reserva indicada por el usuario; después reserva las facturas de servicios pendientes del período, por vencimiento; el resto queda disponible para tarjetas. No vuelve a descontar servicios marcados como pagados. Si no alcanza para los servicios, muestra el faltante y no inventa dinero para las tarjetas. Estas reservas no realizan ni registran pagos.

El presupuesto USD sigue separado. Nunca se descuentan servicios ARS de los dólares ni se aplica una cotización supuesta. Los presupuestos anteriores conservan su modo de dinero reservado solo para tarjetas hasta que lo cambies.

## Estrategia para reducir deuda

Con las obligaciones y pagos revisados:

- Primero se cubren mínimos, cuotas y obligaciones confirmadas por orden de vencimiento.
- La estrategia recomendada aplica el excedente a la deuda con mayor TEM conocida, respetando las restricciones de cada plan. Los vencimientos ya se consideraron al cubrir las obligaciones.
- Se mantiene la comparación con mayor interés primero y menor deuda primero.
- Si falta dinero para cubrir los importes exigibles, se muestra cuánto falta; la distribución parcial no se presenta como una solución que evita todos los incumplimientos.
- Si faltan tasas o condiciones de adelanto, se informa que la comparación de costos está incompleta.

La recomendación es una heurística explicable con los datos registrados, no una garantía matemática del menor costo contractual. No estima tasas desconocidas, no conoce todos los impuestos y cargos futuros y no puede afirmar cuánto capital amortiza cada cuota sin un cuadro del banco. Los saldos luego de un pago se calculan sin nuevos cargos; no se simulan intereses futuros de un contrato refinanciado como si fuera saldo revolving.

## Copias y acceso desde otro dispositivo

Los datos y las copias nuevas tienen versión **3** para conservar estos planes y su referencia a pagos incluidos. Se aceptan bases y copias v1 y v2; la migración conserva los valores existentes y no crea planes. No restaures una copia v3 en una versión antigua del organizador.

La web es responsive y se puede abrir desde el mismo enlace en un celular. En iPhone puedes añadirla a la pantalla de inicio desde Compartir; en Android desde el menú del navegador. Eso crea un acceso, no sincronización ni funcionamiento sin conexión.

Cada navegador conserva su propia base local. Para trasladar todos los registros, documentos y logos entre equipos exporta una copia, pásala de forma privada (por ejemplo, AirDrop entre equipos Apple) e impórtala en Configuración del otro navegador. La importación de una copia reemplaza la base de destino; exporta esa base primero si contiene cambios que quieras conservar. No hay una fusión automática entre dispositivos ni sincronización continua en esta versión.
