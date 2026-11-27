/**
 * CAPA DE NEGOCIO (CapaNegocio.js)
 * Responsabilidad única: Aplicar reglas de negocio, validaciones, filtros y orquestar
 * la sincronización y persistencia de datos entre Google Sheets y la Base de Datos.
 * No accede directamente a SpreadsheetApp ni a Jdbc (eso lo delega a la Capa de Datos).
 */

const ServicioProyectos = (() => {
  /**
   * Normaliza texto para comparaciones insensibles a mayúsculas y tildes.
   * @private
   * @param {string} texto
   * @return {string}
   */
  function normalizar_(texto) {
    return String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Filtra proyectos según criterios opcionales (gerente, estado, prioridad, país, área, división).
   * @param {Object} [filtros={}]
   * @return {Array<Object>}
   */
  function filtrarProyectos(filtros = {}) {
    const proyectos = RepositorioSheets.obtenerTodos();

    return proyectos.filter(p => {
      if (filtros.gerente && normalizar_(p.gerente) !== normalizar_(filtros.gerente)) return false;
      if (filtros.estado && normalizar_(p.estado) !== normalizar_(filtros.estado)) return false;
      if (filtros.prioridad && normalizar_(p.prioridad) !== normalizar_(filtros.prioridad)) return false;
      if (filtros.pais && normalizar_(p.pais) !== normalizar_(filtros.pais)) return false;
      if (filtros.area && normalizar_(p.area) !== normalizar_(filtros.area)) return false;
      if (filtros.division && normalizar_(p.division) !== normalizar_(filtros.division)) return false;
      return true;
    });
  }

  /**
   * Calcula indicadores clave (KPIs) y agrupaciones de negocio para un conjunto de proyectos.
   * @param {Object} [filtros={}]
   * @return {Object} Resumen analítico del portafolio
   */
  function generarResumenPortafolio(filtros = {}) {
    const proyectos = filtrarProyectos(filtros);

    const resumen = {
      totalProyectos: proyectos.length,
      inversionTotal: 0,
      totalIntegrantes: 0,
      valorPromedioPorProyecto: 0,
      costoPromedioPorIntegrante: 0,
      porEstado: {},
      porPrioridad: {},
      porPais: {},
      proyectos
    };

    proyectos.forEach(p => {
      resumen.inversionTotal += p.valorProyecto;
      resumen.totalIntegrantes += p.numIntegrantes;

      const claveEstado = p.estado || 'Sin estado';
      resumen.porEstado[claveEstado] = (resumen.porEstado[claveEstado] || 0) + 1;

      const clavePrioridad = p.prioridad || 'Sin prioridad';
      resumen.porPrioridad[clavePrioridad] = (resumen.porPrioridad[clavePrioridad] || 0) + 1;

      const clavePais = p.pais || 'Sin país';
      if (!resumen.porPais[clavePais]) {
        resumen.porPais[clavePais] = { cantidad: 0, valorTotal: 0 };
      }
      resumen.porPais[clavePais].cantidad += 1;
      resumen.porPais[clavePais].valorTotal += p.valorProyecto;
    });

    if (resumen.totalProyectos > 0) {
      resumen.valorPromedioPorProyecto = resumen.inversionTotal / resumen.totalProyectos;
    }
    if (resumen.totalIntegrantes > 0) {
      resumen.costoPromedioPorIntegrante = resumen.inversionTotal / resumen.totalIntegrantes;
    }

    return resumen;
  }

  /**
   * Valida las reglas de integridad de negocio de un proyecto.
   * @param {Object} datos
   * @return {Object} Datos saneados
   */
  function validarYNormalizarProyecto_(datos) {
    if (!datos.id || String(datos.id).trim() === '') {
      throw new Error('El campo "ID" es obligatorio.');
    }
    if (!datos.nombreProyecto || String(datos.nombreProyecto).trim() === '') {
      throw new Error(`El campo "Nombre del proyecto" es obligatorio (ID: ${datos.id}).`);
    }

    return {
      id: String(datos.id).trim(),
      fechaInicio: datos.fechaInicio || new Date(),
      nombreProyecto: String(datos.nombreProyecto).trim(),
      descripcion: String(datos.descripcion || '').trim(),
      prioridad: String(datos.prioridad || 'Media').trim(),
      pais: String(datos.pais || '').trim(),
      empresa: String(datos.empresa || '').trim(),
      area: String(datos.area || '').trim(),
      estado: String(datos.estado || 'Activo').trim(),
      gerente: String(datos.gerente || '').trim(),
      director: String(datos.director || '').trim(),
      division: String(datos.division || '').trim(),
      numIntegrantes: Math.max(0, parseInt(datos.numIntegrantes, 10) || 0),
      valorProyecto: Math.max(0, parseFloat(datos.valorProyecto) || 0)
    };
  }

  /**
   * Extrae los datos desde la hoja de cálculo de Google Sheets, valida su estructura
   * e inserta/actualiza todos los registros en la base de datos relacional MySQL.
   * @return {Object} Resultado del proceso de sincronización
   */
  function sincronizarSheetsHaciaBaseDatos() {
    const proyectosOrigen = RepositorioSheets.obtenerTodos();

    if (proyectosOrigen.length === 0) {
      return { total: 0, mensaje: 'No hay proyectos en la hoja de cálculo para sincronizar.' };
    }

    const proyectosValidados = proyectosOrigen.map(validarYNormalizarProyecto_);
    const insertados = RepositorioBaseDatos.insertarMuchos(proyectosValidados);

    return {
      total: insertados,
      mensaje: `Se sincronizaron con éxito ${insertados} proyectos desde Google Sheets hacia MySQL.`
    };
  }

  /**
   * Recibe una lista de proyectos extraídos (o los consulta de la Base de Datos)
   * y los inserta en la hoja de cálculo asegurando que cumplan la estructura.
   * @param {Array<Object>} [listaProyectos] Opcional. Si no se pasa, toma los de la BD.
   * @return {Object} Resultado de la inserción en la hoja
   */
  function insertarProyectosEnHojaCalculo(listaProyectos) {
    const proyectosAInsertar = listaProyectos && listaProyectos.length > 0 
      ? listaProyectos 
      : RepositorioBaseDatos.obtenerTodos();

    if (proyectosAInsertar.length === 0) {
      return { total: 0, mensaje: 'No hay proyectos para insertar en la hoja de cálculo.' };
    }

    // Filtrar duplicados con respecto a lo que ya existe en la hoja
    const existentes = RepositorioSheets.obtenerTodos();
    const idsExistentes = new Set(existentes.map(p => String(p.id)));

    const nuevosProyectos = proyectosAInsertar
      .filter(p => !idsExistentes.has(String(p.id)))
      .map(validarYNormalizarProyecto_);

    if (nuevosProyectos.length === 0) {
      return { total: 0, mensaje: 'Todos los proyectos ya existen en la hoja de cálculo.' };
    }

    const insertados = RepositorioSheets.insertarMuchos(nuevosProyectos);

    return {
      total: insertados,
      mensaje: `Se insertaron exitosamente ${insertados} proyectos en la hoja de cálculo.`
    };
  }

  /**
   * Registra un proyecto individual en la hoja validando que no esté duplicado.
   * @param {Object} datosNuevoProyecto
   * @return {Object} Proyecto creado
   */
  function registrarProyecto(datosNuevoProyecto) {
    const proyectoNormalizado = validarYNormalizarProyecto_(datosNuevoProyecto);

    const existente = RepositorioSheets.obtenerPorId(proyectoNormalizado.id);
    if (existente) {
      throw new Error(`Ya existe un proyecto registrado con el ID "${proyectoNormalizado.id}".`);
    }

    return RepositorioSheets.insertar(proyectoNormalizado);
  }

  /**
   * Extrae todos los proyectos registrados directamente en la base de datos relacional MySQL.
   * @return {Array<Object>}
   */
  function obtenerProyectosDeBaseDatos() {
    return RepositorioBaseDatos.obtenerTodos();
  }

  return {
    filtrarProyectos,
    generarResumenPortafolio,
    registrarProyecto,
    sincronizarSheetsHaciaBaseDatos,
    insertarProyectosEnHojaCalculo,
    obtenerProyectosDeBaseDatos
  };
})();


/* ========================================================================== *
 * FUNCIONES EJECUTABLES DESDE EL EDITOR DE GOOGLE APPS SCRIPT
 * ========================================================================== */

/**
 * Función ejecutable: Toma los datos extraídos (con la misma estructura de la hoja)
 * y los inserta en la hoja de cálculo de Google Sheets.
 */
function ejecutarInsercionEnHojaCalculo() {
  Logger.log('Iniciando inserción de proyectos en la hoja de cálculo...');
  try {
    const resultado = ServicioProyectos.insertarProyectosEnHojaCalculo();
    Logger.log(`Resultado: ${resultado.mensaje}`);
  } catch (error) {
    Logger.log(`Error al insertar proyectos en la hoja: ${error.message}`);
    throw error;
  }
}

/**
 * Función ejecutable: Extrae los datos desde la hoja de cálculo de Google Sheets
 * y los inserta en la base de datos MySQL (sincronización Sheets -> MySQL).
 */
function ejecutarSincronizacionSheetsABaseDatos() {
  Logger.log('Iniciando sincronización desde Google Sheets hacia MySQL...');
  try {
    const resultado = ServicioProyectos.sincronizarSheetsHaciaBaseDatos();
    Logger.log(`Resultado: ${resultado.mensaje}`);
  } catch (error) {
    Logger.log(`Error al sincronizar hacia la base de datos: ${error.message}`);
    throw error;
  }
}

/**
 * Función ejecutable: Prueba la conexión directa con la base de datos MySQL.
 */
function ejecutarPruebaConexionMySQL() {
  Logger.log('Probando conexión con el servidor MySQL...');
  try {
    const conexionExitosa = RepositorioBaseDatos.probarConexion();
    if (conexionExitosa) {
      Logger.log('¡Conexión a MySQL establecida exitosamente!');
    } else {
      Logger.log('No se pudo verificar la consulta SELECT 1 en MySQL.');
    }
  } catch (error) {
    Logger.log(`Error al conectar con MySQL: ${error.message}`);
    throw error;
  }
}
