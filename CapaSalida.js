/**
 * CAPA DE SALIDA / PRESENTACIÓN (CapaSalida.js)
 * Responsabilidad única: Consumir la Capa de Negocio (ServicioProyectos) y presentar
 * los resultados en el formato requerido (Consola/Logs, API JSON vía Web App o HTML).
 * No accede a SpreadsheetApp ni implementa cálculos de negocio.
 */

const PresentadorProyectos = (() => {
  /**
   * Formatea un valor numérico como moneda.
   * @private
   * @param {number} monto
   * @return {string}
   */
  function formatearMoneda_(monto) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(monto || 0);
  }

  /**
   * Formatea una fecha para visualización legible.
   * @private
   * @param {Date|string|null} fecha
   * @return {string}
   */
  function formatearFecha_(fecha) {
    if (!fecha) return 'N/D';
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    return String(fecha);
  }

  /**
   * Construye un reporte en texto plano listo para consola (Logger / Ejecuciones).
   * @param {Object} resumen Datos generados por ServicioProyectos.generarResumenPortafolio()
   * @return {string}
   */
  function construirReporteTexto(resumen) {
    const lineas = [
      '====================================================',
      '           REPORTE EJECUTIVO DE PROYECTOS           ',
      '====================================================',
      `Total de proyectos          : ${resumen.totalProyectos}`,
      `Inversión total             : ${formatearMoneda_(resumen.inversionTotal)}`,
      `Total N° integrantes        : ${resumen.totalIntegrantes}`,
      `Valor promedio por proyecto : ${formatearMoneda_(resumen.valorPromedioPorProyecto)}`,
      `Costo promedio / integrante : ${formatearMoneda_(resumen.costoPromedioPorIntegrante)}`,
      '----------------------------------------------------',
      'Distribución por Estado:'
    ];

    Object.entries(resumen.porEstado).forEach(([estado, cantidad]) => {
      lineas.push(`  • ${estado}: ${cantidad}`);
    });

    lineas.push('----------------------------------------------------');
    lineas.push('Detalle de Proyectos:');

    resumen.proyectos.forEach(p => {
      lineas.push(
        `  [${p.id}] ${p.nombreProyecto} | Inicio: ${formatearFecha_(p.fechaInicio)} | ` +
        `Gerente: ${p.gerente || 'N/A'} | Prioridad: ${p.prioridad || 'N/A'} | ` +
        `Integrantes: ${p.numIntegrantes} | Valor: ${formatearMoneda_(p.valorProyecto)}`
      );
    });

    lineas.push('====================================================');
    return lineas.join('\n');
  }

  /**
   * Construye una tabla HTML (útil para envío por MailApp o vista HtmlService).
   * @param {Object} resumen Datos generados por ServicioProyectos.generarResumenPortafolio()
   * @return {string}
   */
  function construirReporteHtml(resumen) {
    const filasHtml = resumen.proyectos
      .map(p => `
        <tr>
          <td>${p.id}</td>
          <td>${formatearFecha_(p.fechaInicio)}</td>
          <td>${p.nombreProyecto}</td>
          <td>${p.prioridad}</td>
          <td>${p.pais}</td>
          <td>${p.empresa}</td>
          <td>${p.area}</td>
          <td>${p.estado}</td>
          <td>${p.gerente}</td>
          <td>${p.director}</td>
          <td>${p.division}</td>
          <td style="text-align:right;">${p.numIntegrantes}</td>
          <td style="text-align:right;">${formatearMoneda_(p.valorProyecto)}</td>
        </tr>`)
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; padding: 16px;">
        <h2>Reporte de Portafolio de Proyectos</h2>
        <p>
          <strong>Total proyectos:</strong> ${resumen.totalProyectos} |
          <strong>Inversión total:</strong> ${formatearMoneda_(resumen.inversionTotal)} |
          <strong>Total integrantes:</strong> ${resumen.totalIntegrantes}
        </p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 13px;">
          <thead style="background-color: #f1f3f4;">
            <tr>
              <th>ID</th>
              <th>Fecha de Inicio</th>
              <th>Nombre del proyecto</th>
              <th>Prioridad</th>
              <th>País</th>
              <th>Empresa</th>
              <th>Área</th>
              <th>Estado</th>
              <th>Gerente</th>
              <th>Director</th>
              <th>Division</th>
              <th>N° integrantes</th>
              <th>Valor proyecto</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml || '<tr><td colspan="13" style="text-align:center;">Sin registros</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Envía el reporte HTML generado por correo electrónico usando MailApp.
   * @param {string} [destinatario] Correo del destinatario (por defecto el usuario activo).
   * @param {string} [asunto] Asunto del correo.
   * @param {Object} [resumen] Datos del portafolio (si no se pasa, se genera el general).
   */
  function enviarReportePorCorreo(destinatario, asunto, resumen) {
    const emailDestino = destinatario || Session.getActiveUser().getEmail();
    if (!emailDestino) {
      throw new Error('No se especificó un correo destinatario y no fue posible obtener el usuario activo.');
    }

    const datosResumen = resumen || ServicioProyectos.generarResumenPortafolio();
    const contenidoHtml = construirReporteHtml(datosResumen);
    const contenidoTexto = construirReporteTexto(datosResumen);
    const asuntoFinal = asunto || `[Reporte] Portafolio de Proyectos - ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd')}`;

    MailApp.sendEmail({
      to: emailDestino,
      subject: asuntoFinal,
      body: contenidoTexto, // Respaldo para clientes de correo sin soporte HTML
      htmlBody: contenidoHtml
    });

    Logger.log(`Reporte enviado exitosamente a: ${emailDestino}`);
  }

  /**
   * Imprime en Logger.log los registros de proyectos extraídos de la base de datos MySQL.
   * @param {Array<Object>} proyectos Lista de proyectos
   * @param {string} [titulo] Título descriptivo para el encabezado del log
   */
  function imprimirProyectosEnConsola(proyectos, titulo = 'DATOS EXTRAÍDOS DE LA BASE DE DATOS MYSQL') {
    Logger.log('====================================================');
    Logger.log(`         ${titulo}         `);
    Logger.log('====================================================');
    Logger.log(`Total de registros obtenidos: ${proyectos ? proyectos.length : 0}`);
    Logger.log('----------------------------------------------------');

    if (!proyectos || proyectos.length === 0) {
      Logger.log('No se encontraron registros en la tabla.');
      Logger.log('====================================================');
      return;
    }

    proyectos.forEach((p, idx) => {
      Logger.log(
        `#${idx + 1} | ID: ${p.id} | Proyecto: ${p.nombreProyecto} | ` +
        `Inicio: ${formatearFecha_(p.fechaInicio)} | Tipo: ${p.descripcion || 'N/A'} | ` +
        `Prioridad: ${p.prioridad || 'N/A'} | País: ${p.pais || 'N/A'} | Empresa: ${p.empresa || 'N/A'} | ` +
        `Área: ${p.area || 'N/A'} | Estado: ${p.estado || 'N/A'} | Gerente: ${p.gerente || 'N/A'} | ` +
        `Director: ${p.director || 'N/A'} | División: ${p.division || 'N/A'} | ` +
        `Integrantes: ${p.numIntegrantes} | Valor: ${formatearMoneda_(p.valorProyecto)}`
      );
    });

    Logger.log('====================================================');
  }

  /**
   * Empaqueta un objeto como respuesta HTTP JSON para Apps Script Web App.
   * @param {Object} payload
   * @return {GoogleAppsScript.Content.TextOutput}
   */
  function responderJson(payload) {
    return ContentService
      .createTextOutput(JSON.stringify(payload, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return {
    construirReporteTexto,
    construirReporteHtml,
    enviarReportePorCorreo,
    imprimirProyectosEnConsola,
    responderJson
  };
})();

/* ========================================================================== *
 * PUNTOS DE ENTRADA (Funciones ejecutables desde el editor o Web App)
 * ========================================================================== */

/**
 * Ejecuta el flujo completo (Datos -> Negocio -> Salida en consola) para todos los proyectos.
 */
function ejecutarReporteGeneral() {
  const resumen = ServicioProyectos.generarResumenPortafolio();
  const textoSalida = PresentadorProyectos.construirReporteTexto(resumen);
  Logger.log(textoSalida);
}

/**
 * Ejemplo de consulta filtrada por gerente (ej. "Viviana", como en la hoja de referencia).
 */
function ejecutarReportePorGerente() {
  const resumen = ServicioProyectos.generarResumenPortafolio({ gerente: 'Viviana' });
  const textoSalida = PresentadorProyectos.construirReporteTexto(resumen);
  Logger.log(textoSalida);
}

/**
 * Envía el reporte HTML de proyectos por correo electrónico.
 * @param {string} [destinatario] Correo a donde enviar el reporte.
 * @param {Object} [filtros] Filtros opcionales de negocio (ej: { gerente: 'Viviana' }).
 */
function enviarReporteEmail(destinatario, filtros) {
  const resumen = ServicioProyectos.generarResumenPortafolio(filtros || {});
  PresentadorProyectos.enviarReportePorCorreo(destinatario, null, resumen);
}

/**
 * Función de TEST para probar el envío del reporte HTML por correo directamente desde el editor.
 * Toma el correo de la sesión activa si no se define uno manualmente.
 */
function testEnviarReportePorCorreo() {
  // Puedes indicar un correo específico aquí o dejarlo vacío para que use tu correo de Google:
  const correoPrueba = ''; // Ej: 'tu_correo@dominio.com'

  const destinatario = correoPrueba || Session.getActiveUser().getEmail();
  Logger.log(`Iniciando prueba de envío de reporte a: ${destinatario}...`);

  try {
    enviarReporteEmail(destinatario);
    Logger.log('¡Prueba finalizada con éxito! Revisa tu bandeja de entrada o spam.');
  } catch (error) {
    Logger.log(`Error durante la prueba de envío: ${error.message}`);
    throw error;
  }
}

/**
 * Extrae todos los datos de la base de datos relacional MySQL e imprime
 * cada uno de los registros formateados en el Logger.log.
 */
function extraerEImprimirDatosDeBD() {
  Logger.log('Iniciando extracción de datos desde la base de datos MySQL...');
  try {
    const proyectos = ServicioProyectos.obtenerProyectosDeBaseDatos();
    PresentadorProyectos.imprimirProyectosEnConsola(proyectos, 'PROYECTOS EXTRAÍDOS DE LA BASE DE DATOS MYSQL');
  } catch (error) {
    Logger.log(`Error al extraer datos de la BD: ${error.message}`);
    if (error.stack) {
      Logger.log(`Stack trace:\n${error.stack}`);
    }
    throw error;
  }
}

/**
 * EJEMPLO DIDÁCTICO: CONSUMO DE UNA API PÚBLICA CON UrlFetchApp
 * 
 * ¿Qué hace esta función?
 * 1. Se conecta a una API pública gratuita (sin contraseñas ni registros):
 *    https://api.exchangerate-api.com/v4/latest/USD
 * 2. Trae el tipo de cambio actual del dólar (USD) hacia las monedas de los países 
 *    de nuestros proyectos (Colombia, México, Perú, Chile, Brasil).
 * 3. Muestra los resultados de forma clara y ordenada en el registro (Logger.log).
 */
function consultarTiposDeCambio() {
  // PASO 1: La dirección (URL) del servicio que queremos consultar
  const urlApi = 'https://api.exchangerate-api.com/v4/latest/USD';

  Logger.log('====================================================');
  Logger.log('1. Conectando con la API pública de tipos de cambio...');
  Logger.log('Dirección: ' + urlApi);

  try {
    // PASO 2: UrlFetchApp.fetch() hace la petición por internet (como abrir una página web)
    const respuesta = UrlFetchApp.fetch(urlApi);

    // PASO 3: Verificamos el código de estado (200 significa "Petición exitosa")
    const codigoEstado = respuesta.getResponseCode();
    Logger.log('2. Código de respuesta recibido: ' + codigoEstado + ' (200 = Éxito)');

    // PASO 4: Obtenemos el texto que nos respondió el servidor
    const textoRespuesta = respuesta.getContentText();

    // PASO 5: JSON.parse() convierte ese texto en un objeto de JavaScript fácil de manipular
    const datos = JSON.parse(textoRespuesta);

    // PASO 6: Extraemos los valores de las monedas que nos interesan
    const fecha = datos.date || 'Hoy';
    const tasas = datos.rates;

    // PASO 7: Imprimimos los resultados de manera entendible para cualquier persona
    Logger.log('----------------------------------------------------');
    Logger.log('   VALOR DE 1 DÓLAR (USD) AL DÍA: ' + fecha);
    Logger.log('----------------------------------------------------');
    Logger.log('🇨🇴 Colombia (COP) : $ ' + Number(tasas.COP).toLocaleString('es-CO') + ' pesos');
    Logger.log('🇲🇽 México   (MXN) : $ ' + Number(tasas.MXN).toLocaleString('es-MX') + ' pesos');
    Logger.log('🇵🇪 Perú     (PEN) : S/ ' + Number(tasas.PEN).toFixed(2) + ' soles');
    Logger.log('🇨🇱 Chile    (CLP) : $ ' + Number(tasas.CLP).toLocaleString('es-CL') + ' pesos');
    Logger.log('🇧🇷 Brasil   (BRL) : R$ ' + Number(tasas.BRL).toFixed(2) + ' reales');
    Logger.log('🇪🇺 Europa   (EUR) : € ' + Number(tasas.EUR).toFixed(2) + ' euros');
    Logger.log('====================================================');
    Logger.log('¡Consumo de API con UrlFetchApp completado con éxito!');

  } catch (error) {
    // Si algo falla (ej. sin conexión a internet), capturamos el mensaje amigablemente
    Logger.log('❌ Ocurrió un error al consultar la API: ' + error.message);
  }
}

/**
 * EJEMPLO DIDÁCTICO: ALIMENTAR UNA API (MÉTODO POST) CON UrlFetchApp
 * 
 * ¿Qué significa "Alimentar una API"?
 * Si en la función anterior "pedimos" información (GET), aquí "enviamos" información (POST).
 * Es como enviar una encomienda o paquete por correo postal:
 * - El "Payload" (carga útil) es lo que va adentro de la caja (nuestros datos).
 * - Los "Headers" son la etiqueta que dice qué tipo de contenido lleva (ej: formato JSON).
 * 
 * Usamos un servicio público de pruebas seguro (https://jsonplaceholder.typicode.com/posts)
 * que simula recibir y registrar el nuevo proyecto devolviendo un código 201 (Creado).
 */
function alimentarApiEjemplo() {
  // PASO 1: La dirección del servidor al que queremos enviar los datos
  const urlApiDestino = 'https://jsonplaceholder.typicode.com/posts';

  Logger.log('====================================================');
  Logger.log('      EJEMPLO DE ENVÍO DE DATOS A UNA API (POST)    ');
  Logger.log('====================================================');

  // PASO 2: Construir el PAYLOAD (el paquete con los datos del proyecto a enviar)
  const payloadDatos = {
    idProyecto: 'PRY-2026-999',
    nombreProyecto: 'Sistema Automatizado de Gestión',
    gerenteResponsable: 'Viviana Gonzalez',
    pais: 'Colombia',
    presupuestoUSD: 25000.00,
    equipoIntegrantes: 8,
    fechaCreacion: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'),
    origen: 'Google Apps Script'
  };

  // PASO 3: Convertir el objeto JavaScript en texto JSON para que viaje por internet
  const payloadJsonTexto = JSON.stringify(payloadDatos, null, 2);

  Logger.log('📦 1. PAYLOAD A ENVIAR (Carga útil de datos):');
  Logger.log(payloadJsonTexto);
  Logger.log('----------------------------------------------------');

  // PASO 4: Configurar las OPCIONES del envío (método POST, encabezados y carga)
  const opcionesEnvio = {
    method: 'post',                                    // Método POST = Crear / Enviar datos
    contentType: 'application/json',                   // Le avisamos al servidor que enviamos JSON
    payload: JSON.stringify(payloadDatos),             // La caja con nuestros datos convertidos a texto
    muteHttpExceptions: true                           // Si hay error en el servidor, no detiene el script
  };

  Logger.log('⚙️ 2. OPCIONES DE LA PETICIÓN:');
  Logger.log('  • Método HTTP : ' + opcionesEnvio.method.toUpperCase());
  Logger.log('  • Content-Type: ' + opcionesEnvio.contentType);
  Logger.log('  • Destino     : ' + urlApiDestino);
  Logger.log('----------------------------------------------------');

  try {
    Logger.log('🚀 3. Enviando datos con UrlFetchApp.fetch()...');
    const respuesta = UrlFetchApp.fetch(urlApiDestino, opcionesEnvio);

    // PASO 5: Revisar la respuesta del servidor
    const codigoRespuesta = respuesta.getResponseCode();
    const textoServidor = respuesta.getContentText();

    Logger.log('📬 4. RESPUESTA RECIBIDA DEL SERVIDOR:');
    Logger.log('  • Código de estado: ' + codigoRespuesta + ' (201 = Recibido y Creado con éxito)');
    Logger.log('  • Contenido devuelto:');
    Logger.log(textoServidor);
    Logger.log('====================================================');
    Logger.log('¡Ejemplo de alimentación de API finalizado correctamente!');

  } catch (error) {
    Logger.log('❌ Ocurrió un error al enviar el payload a la API: ' + error.message);
  }
}

/**
 * SERVICIO AVANZADO DE GOOGLE CALENDAR (API v3)
 * 
 * Consulta todos los eventos del día de hoy en tu calendario principal ('primary')
 * utilizando el servicio avanzado `Calendar`. No requiere tokens manuales ya que
 * Apps Script gestiona la autenticación OAuth 2.0 de forma nativa.
 */
function mostrarEventosDeHoyAvanzado() {
  const ahora = new Date();
  
  // Rango del día actual: desde las 00:00:00 hasta las 23:59:59
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
  const finDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);

  // Parámetros de consulta para la API de Calendar v3
  const opciones = {
    timeMin: inicioDia.toISOString(), // Fecha y hora mínima en formato ISO 8601
    timeMax: finDia.toISOString(),    // Fecha y hora máxima en formato ISO 8601
    singleEvents: true,               // Desglosa eventos recurrentes en citas individuales
    orderBy: 'startTime',             // Orden cronológico por inicio
    maxResults: 50
  };

  Logger.log('====================================================');
  Logger.log('📅 EVENTOS DE HOY: ' + Utilities.formatDate(ahora, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
  Logger.log('====================================================');

  try {
    // 'primary' es el calendario del usuario que ejecuta el script
    const respuesta = Calendar.Events.list('primary', opciones);
    const eventos = respuesta.items;

    if (!eventos || eventos.length === 0) {
      Logger.log('No tienes ningún evento programado para el día de hoy.');
      Logger.log('====================================================');
      return;
    }

    Logger.log(`Total de eventos encontrados: ${eventos.length}\n`);

    eventos.forEach((evento, indice) => {
      let horario = 'Todo el día';

      // Si el evento tiene hora específica
      if (evento.start && evento.start.dateTime) {
        const dInicio = new Date(evento.start.dateTime);
        const dFin = new Date(evento.end.dateTime);
        const hInicio = Utilities.formatDate(dInicio, Session.getScriptTimeZone(), 'HH:mm');
        const hFin = Utilities.formatDate(dFin, Session.getScriptTimeZone(), 'HH:mm');
        horario = `${hInicio} - ${hFin}`;
      }

      const titulo = evento.summary || '(Sin título)';
      const ubicacion = evento.location ? ` | Ubicación: ${evento.location}` : '';
      const meet = evento.hangoutLink ? ` | Meet: ${evento.hangoutLink}` : '';

      Logger.log(`${indice + 1}. [${horario}] ${titulo}${ubicacion}${meet}`);
    });

    Logger.log('====================================================');

  } catch (error) {
    Logger.log('❌ Error al consultar Google Calendar API: ' + error.message);
  }
}

/**
 * SERVICIO AVANZADO DE GOOGLE DRIVE (API v3 / v2)
 * 
 * Lista los 10 archivos modificados más recientemente en tu Google Drive
 * utilizando el servicio avanzado `Drive.Files.list()`.
 * 
 * NOTA PARA LA DEMO EN VIVO:
 * Recuerda agregar el servicio en el editor antes de ejecutar:
 * Menú lateral izquierdo -> Servicios (+) -> "Google Drive API" -> Agregar.
 */
function listarArchivosDriveAvanzado() {
  Logger.log('====================================================');
  Logger.log('📁 CONSULTANDO ÚLTIMOS ARCHIVOS EN GOOGLE DRIVE');
  Logger.log('====================================================');

  try {
    // Parámetros de búsqueda para la API de Drive:
    // - No estar en la papelera (trashed = false)
    // - Máximo 10 archivos ordenados por fecha de modificación descendente
    const parametros = {
      pageSize: 10,                                                // Para Drive API v3
      maxResults: 10,                                              // Para Drive API v2
      q: 'trashed = false',                                       // Excluye archivos eliminados
      orderBy: 'modifiedTime desc',                               // Más recientes primero (v3)
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)' // Campos específicos a traer
    };

    // Llamada directa al servicio avanzado Drive
    const respuesta = Drive.Files.list(parametros);

    // Compatibilidad automática si agregas Drive v3 (.files) o v2 (.items)
    const archivos = respuesta.files || respuesta.items;

    if (!archivos || archivos.length === 0) {
      Logger.log('No se encontraron archivos en tu unidad de Google Drive.');
      Logger.log('====================================================');
      return;
    }

    Logger.log(`Se encontraron ${archivos.length} archivos recientes:\n`);

    archivos.forEach((archivo, i) => {
      const nombre = archivo.name || archivo.title || '(Sin nombre)';
      const tipo = (archivo.mimeType || 'Desconocido').replace('application/vnd.google-apps.', 'Google ');
      const fechaMod = archivo.modifiedTime || archivo.modifiedDate || '';
      const enlace = archivo.webViewLink || archivo.alternateLink || '';

      Logger.log(`${i + 1}. 📄 ${nombre}`);
      Logger.log(`   • Tipo        : ${tipo}`);
      Logger.log(`   • Modificado  : ${fechaMod}`);
      Logger.log(`   • ID          : ${archivo.id}`);
      if (enlace) {
        Logger.log(`   • Enlace      : ${enlace}`);
      }
      Logger.log('----------------------------------------------------');
    });

    Logger.log('¡Consulta con el Servicio Avanzado de Drive completada!');
    Logger.log('====================================================');

  } catch (error) {
    Logger.log('❌ Error al usar Drive API: ' + error.message);
    if (error.message.indexOf('Drive is not defined') !== -1) {
      Logger.log('👉 Recuerda agregar el servicio "Google Drive API" en la sección Servicios (+) del editor.');
    }
  }
}

/**
 * Endpoint GET para publicar como Aplicación Web:
 * - ?formato=html devuelve la tabla HTML interactiva.
 * - Por defecto devuelve JSON, aceptando filtros como ?gerente=Viviana&estado=Activo
 * @param {GoogleAppsScript.Events.DoGet} e
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const filtros = {
      gerente: params.gerente,
      estado: params.estado,
      prioridad: params.prioridad,
      pais: params.pais,
      area: params.area,
      division: params.division
    };

    const resumen = ServicioProyectos.generarResumenPortafolio(filtros);

    if (params.formato === 'html') {
      const html = PresentadorProyectos.construirReporteHtml(resumen);
      return HtmlService.createHtmlOutput(html).setTitle('Portafolio de Proyectos');
    }

    return PresentadorProyectos.responderJson({ ok: true, data: resumen });
  } catch (error) {
    return PresentadorProyectos.responderJson({ ok: false, error: error.message });
  }
}
