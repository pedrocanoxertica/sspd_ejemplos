/**
 * Codigo.js
 * Archivo principal / orquestador con manejo centralizado de excepciones en Google Apps Script.
 */

/**
 * Función genérica de orden superior para ejecutar cualquier operación
 * capturando cualquier excepción y registrando su detalle con Logger.log.
 * 
 * @param {Function} accion Función que contiene la lógica a ejecutar.
 * @param {string} [nombreContexto='Operación'] Nombre identificador de la tarea para los logs.
 * @return {*} Resultado retornado por la acción o null si ocurrió una excepción.
 */
function ejecutarConManejoDeErrores(accion, nombreContexto = 'Operación') {
  try {
    Logger.log(`[INICIO] Ejecutando: ${nombreContexto}`);
    const resultado = accion();
    Logger.log(`[ÉXITO] ${nombreContexto} finalizó correctamente.`);
    return resultado;
  } catch (error) {
    // Captura de la excepción y registro del mensaje y pila de llamadas (stack)
    Logger.log('====================================================');
    Logger.log(`[EXCEPCIÓN CAPTURADA] en ${nombreContexto}`);
    Logger.log(`Mensaje de error: ${error.message}`);
    if (error.stack) {
      Logger.log(`Pila de llamadas:\n${error.stack}`);
    }
    Logger.log('====================================================');

    // Retorna un objeto controlado en lugar de romper abruptamente la ejecución
    return {
      error: true,
      mensaje: error.message
    };
  }
}

/**
 * Ejemplo específico: Función que intenta ejecutar una operación propensa a fallar
 * (como abrir una hoja por ID inválido o procesar datos faltantes) usando try/catch directo.
 */
function ejecutarProcesoConTryCatch() {
  try {
    Logger.log('Iniciando proceso con manejo de excepciones...');

    // Ejemplo: llamada que podría fallar si el ID no está configurado
    const resumen = ServicioProyectos.generarResumenPortafolio();
    Logger.log(`Proyectos cargados exitosamente: ${resumen.totalProyectos}`);

  } catch (error) {
    Logger.log(`[ERROR]: Se produjo una excepción al procesar los datos: ${error.message}`);
  }
}

/**
 * Función de prueba para verificar cómo se captura y muestra la excepción en Logger.log.
 * Ejecuta intencionalmente una acción con error para observar la captura en los logs.
 */
function testCapturaDeExcepcion() {
  Logger.log('--- TEST 1: Probando captura con try/catch directo ---');
  try {
    // Forzamos un error de ejemplo
    throw new Error('Error simulado: No se pudo conectar a la base de datos o Spreadsheet.');
  } catch (error) {
    Logger.log(`Mensaje de la excepción: ${error.message}`);
  }

  Logger.log('\n--- TEST 2: Probando función reutilizable ejecutarConManejoDeErrores ---');
  ejecutarConManejoDeErrores(() => {
    // Intentar acceder a una propiedad de undefined para generar TypeError
    const objetoInexistente = null;
    return objetoInexistente.propiedadInvalida;
  }, 'Prueba de Acceso a Objeto Nulo');
}


function testSinExcepcion() {
  Logger.log('--- TEST 1: Probando captura sin try/catch directo ---');
  throw new Error('Error simulado: No se pudo conectar a la base de datos o Spreadsheet.');
}
