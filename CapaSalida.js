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
