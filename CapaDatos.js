/**
 * CAPA DE DATOS (CapaDatos.js)
 * Responsabilidad única: Proveer acceso y persistencia de datos tanto en Google Sheets
 * (mediante SpreadsheetApp.openById) como en base de datos relacional MySQL (mediante Jdbc).
 * No contiene reglas de negocio ni lógica de presentación/salida.
 */

/* ========================================================================== *
 * CONFIGURACIÓN DE CONEXIONES
 * ========================================================================== */

const CONFIG_DATOS = {
  SPREADSHEET_ID: '1aX_KqBAX78waghROyC8SptDcmrLCFXtoTksJUNuE83g', // ID de Google Sheets en la URL
  SHEET_NAME: 'Practica 2'                         // Nombre de la pestaña con los datos
};

const CONFIG_BD = {
  HOST: PropertiesService.getScriptProperties().getProperty('host'),      // Ej: '123.45.67.89' o dominio del servidor
  PORT: PropertiesService.getScriptProperties().getProperty('port'),                   // Puerto de MySQL (por defecto 3306)
  DATABASE: PropertiesService.getScriptProperties().getProperty('data_base'),                   // Nombre de la base de datos
  USER: PropertiesService.getScriptProperties().getProperty('user'),                        // Usuario con permisos en MySQL
  PASSWORD: PropertiesService.getScriptProperties().getProperty('password'),                    // Contraseña del usuario
};


/**
 * Índices (base 0) correspondientes exactamente a las columnas de la hoja:
 * ID | Fecha de Inicio | Nombre del proyecto | Descripcion | Prioridad | País |
 * Empresa | Área | Estado | Gerente | Director | Division | N° integrantes | Valor proyecto
 */
const COLUMNAS_PROYECTO = {
  ID: 0,
  FECHA_INICIO: 1,
  NOMBRE_PROYECTO: 2,
  DESCRIPCION: 3,
  PRIORIDAD: 4,
  PAIS: 5,
  EMPRESA: 6,
  AREA: 7,
  ESTADO: 8,
  GERENTE: 9,
  DIRECTOR: 10,
  DIVISION: 11,
  NUM_INTEGRANTES: 12,
  VALOR_PROYECTO: 13
};


/* ========================================================================== *
 * 1. REPOSITORIO GOOGLE SHEETS
 * ========================================================================== */

const RepositorioSheets = (() => {
  /**
   * Abre el archivo por ID y obtiene la pestaña de datos.
   * @private
   * @return {GoogleAppsScript.Spreadsheet.Sheet}
   */
  function obtenerHoja_() {
    const spreadsheet = SpreadsheetApp.openById(CONFIG_DATOS.SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(CONFIG_DATOS.SHEET_NAME) || spreadsheet.getSheets()[0];

    if (!sheet) {
      throw new Error(`No se encontró la hoja "${CONFIG_DATOS.SHEET_NAME}" en el documento.`);
    }
    return sheet;
  }

  /**
   * Parsea un valor de fecha que puede venir como Date o string en formato dd/mm/yyyy.
   * @private
   * @param {*} valor
   * @return {Date|null}
   */
  function parsearFecha_(valor) {
    if (!valor) return null;
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
    if (typeof valor === 'string') {
      const partes = valor.trim().split(/[\/\-]/);
      if (partes.length === 3) {
        // Asumiendo formato DD/MM/YYYY
        const d = parseInt(partes[0], 10);
        const m = parseInt(partes[1], 10) - 1;
        const y = parseInt(partes[2], 10);
        const fecha = new Date(y, m, d);
        if (!isNaN(fecha.getTime())) return fecha;
      }
    }
    return null;
  }

  /**
   * Parsea importes monetarios eliminando el signo '$' y separadores de miles.
   * @private
   * @param {*} valor
   * @return {number}
   */
  function parsearMoneda_(valor) {
    if (typeof valor === 'number') return valor;
    if (!valor) return 0;
    const limpio = String(valor).replace(/[\$,\s]/g, '');
    return parseFloat(limpio) || 0;
  }

  /**
   * Transforma una fila cruda de la hoja en un objeto de dominio plano.
   * @private
   * @param {Array<*>} fila
   * @param {number} numeroFila
   * @return {Object}
   */
  function mapearFilaAProyecto_(fila, numeroFila) {
    return {
      filaOrigen: numeroFila,
      id: String(fila[COLUMNAS_PROYECTO.ID] ?? '').trim(),
      fechaInicio: parsearFecha_(fila[COLUMNAS_PROYECTO.FECHA_INICIO]),
      nombreProyecto: String(fila[COLUMNAS_PROYECTO.NOMBRE_PROYECTO] ?? '').trim(),
      descripcion: String(fila[COLUMNAS_PROYECTO.DESCRIPCION] ?? '').trim(),
      prioridad: String(fila[COLUMNAS_PROYECTO.PRIORIDAD] ?? '').trim(),
      pais: String(fila[COLUMNAS_PROYECTO.PAIS] ?? '').trim(),
      empresa: String(fila[COLUMNAS_PROYECTO.EMPRESA] ?? '').trim(),
      area: String(fila[COLUMNAS_PROYECTO.AREA] ?? '').trim(),
      estado: String(fila[COLUMNAS_PROYECTO.ESTADO] ?? '').trim(),
      gerente: String(fila[COLUMNAS_PROYECTO.GERENTE] ?? '').trim(),
      director: String(fila[COLUMNAS_PROYECTO.DIRECTOR] ?? '').trim(),
      division: String(fila[COLUMNAS_PROYECTO.DIVISION] ?? '').trim(),
      numIntegrantes: Number(fila[COLUMNAS_PROYECTO.NUM_INTEGRANTES]) || 0,
      valorProyecto: parsearMoneda_(fila[COLUMNAS_PROYECTO.VALOR_PROYECTO])
    };
  }

  /**
   * Transforma un objeto proyecto en un arreglo ordenado según las columnas de la hoja.
   * @private
   * @param {Object} proyecto
   * @return {Array<*>}
   */
  function mapearProyectoAFila_(proyecto) {
    return [
      proyecto.id,
      proyecto.fechaInicio instanceof Date 
        ? Utilities.formatDate(proyecto.fechaInicio, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : (proyecto.fechaInicio || ''),
      proyecto.nombreProyecto || '',
      proyecto.descripcion || '',
      proyecto.prioridad || '',
      proyecto.pais || '',
      proyecto.empresa || '',
      proyecto.area || '',
      proyecto.estado || '',
      proyecto.gerente || '',
      proyecto.director || '',
      proyecto.division || '',
      Number(proyecto.numIntegrantes) || 0,
      Number(proyecto.valorProyecto) || 0
    ];
  }

  /**
   * Obtiene todos los registros de proyectos omitiendo el encabezado (fila 1).
   * @return {Array<Object>}
   */
  function obtenerTodos() {
    const sheet = obtenerHoja_();
    const ultimaFila = sheet.getLastRow();
    const totalColumnas = Object.keys(COLUMNAS_PROYECTO).length;

    if (ultimaFila <= 1) {
      return [];
    }

    const valores = sheet.getRange(2, 1, ultimaFila - 1, totalColumnas).getValues();

    return valores
      .map((fila, idx) => mapearFilaAProyecto_(fila, idx + 2))
      .filter(p => p.id !== '' || p.nombreProyecto !== '');
  }

  /**
   * Busca un proyecto puntual por su columna ID.
   * @param {string} id
   * @return {Object|null}
   */
  function obtenerPorId(id) {
    const idBuscado = String(id).trim();
    return obtenerTodos().find(p => p.id === idBuscado) || null;
  }

  /**
   * Inserta un nuevo proyecto al final de la hoja.
   * @param {Object} proyecto
   * @return {Object} Proyecto insertado
   */
  function insertar(proyecto) {
    const sheet = obtenerHoja_();
    const fila = mapearProyectoAFila_(proyecto);
    sheet.appendRow(fila);
    return proyecto;
  }

  /**
   * Inserta una lista de proyectos por lote al final de la hoja de cálculo.
   * @param {Array<Object>} proyectos Lista de proyectos a insertar
   * @return {number} Cantidad de registros insertados
   */
  function insertarMuchos(proyectos) {
    if (!proyectos || proyectos.length === 0) return 0;
    const sheet = obtenerHoja_();
    const filas = proyectos.map(mapearProyectoAFila_);
    const filaInicio = sheet.getLastRow() + 1;
    sheet.getRange(filaInicio, 1, filas.length, filas[0].length).setValues(filas);
    return filas.length;
  }

  return {
    obtenerTodos,
    obtenerPorId,
    insertar,
    insertarMuchos
  };
})();


/* ========================================================================== *
 * 2. REPOSITORIO BASE DE DATOS RELACIONAL (MYSQL VÍA JDBC)
 * ========================================================================== */

const RepositorioBaseDatos = (() => {
  /**
   * Obtiene una conexión activa a MySQL mediante el servicio nativo Jdbc de Apps Script.
   * @private
   * @return {GoogleAppsScript.JDBC.JdbcConnection}
   */
  function obtenerConexion_() {
    const url = `jdbc:mysql://${CONFIG_BD.HOST}:${CONFIG_BD.PORT}/${CONFIG_BD.DATABASE}`;
    return Jdbc.getConnection(url, CONFIG_BD.USER, CONFIG_BD.PASSWORD);
  }

  /**
   * Prueba rápida de conexión con la base de datos MySQL.
   * @return {boolean} True si conecta satisfactoriamente
   */
  function probarConexion() {
    let conn;
    try {
      conn = obtenerConexion_();
      const stmt = conn.createStatement();
      const rs = stmt.executeQuery('SELECT 1');
      const ok = rs.next();
      rs.close();
      stmt.close();
      return ok;
    } finally {
      if (conn) conn.close();
    }
  }

  /**
   * Consulta y retorna todos los proyectos registrados en la tabla 'proyectos'.
   * @return {Array<Object>}
   */
  function obtenerTodos() {
    let conn;
    try {
      conn = obtenerConexion_();
      const sql = `
        SELECT id, fecha_inicio, nombre_proyecto, descripcion, prioridad, 
               pais, empresa, area, estado, gerente, director, division, 
               num_integrantes, valor_proyecto 
        FROM proyectos 
        ORDER BY id ASC
      `;
      const stmt = conn.createStatement();
      const rs = stmt.executeQuery(sql);

      const proyectos = [];
      while (rs.next()) {
        proyectos.push({
          id: String(rs.getInt('id')),
          fechaInicio: rs.getDate('fecha_inicio'),
          nombreProyecto: rs.getString('nombre_proyecto') || '',
          descripcion: rs.getString('descripcion') || '',
          prioridad: rs.getString('prioridad') || '',
          pais: rs.getString('pais') || '',
          empresa: rs.getString('empresa') || '',
          area: rs.getString('area') || '',
          estado: rs.getString('estado') || '',
          gerente: rs.getString('gerente') || '',
          director: rs.getString('director') || '',
          division: rs.getString('division') || '',
          numIntegrantes: rs.getInt('num_integrantes') || 0,
          valorProyecto: rs.getDouble('valor_proyecto') || 0.0
        });
      }

      rs.close();
      stmt.close();
      return proyectos;
    } finally {
      if (conn) conn.close();
    }
  }

  /**
   * Convierte cualquier valor de fecha (Date o string DD/MM/YYYY o YYYY-MM-DD)
   * a formato estándar 'YYYY-MM-DD' requerido por MySQL.
   * @private
   * @param {*} fecha
   * @return {string|null}
   */
  function formatearFechaSQL_(fecha) {
    if (!fecha) return null;
    if (fecha instanceof Date && !isNaN(fecha.getTime())) {
      return Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    if (typeof fecha === 'string') {
      const limpia = fecha.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(limpia)) {
        return limpia;
      }
      const partes = limpia.split(/[\/\-]/);
      if (partes.length === 3) {
        const d = partes[0].padStart(2, '0');
        const m = partes[1].padStart(2, '0');
        const y = partes[2].length === 2 ? '20' + partes[2] : partes[2];
        return `${y}-${m}-${d}`;
      }
    }
    return null;
  }

  /**
   * Inserta un lote de proyectos en la tabla 'proyectos' de MySQL usando Prepared Statements y batch.
   * Procesa en sublotes de 50 registros para evitar que la conexión remota expire o se cierre.
   * @param {Array<Object>} proyectos
   * @return {number} Cantidad de registros procesados
   */
  function insertarMuchos(proyectos) {
    if (!proyectos || proyectos.length === 0) return 0;

    let conn;
    let stmt;
    try {
      conn = obtenerConexion_();
      conn.setAutoCommit(false);

      const sql = `
        INSERT INTO proyectos (
          id, fecha_inicio, nombre_proyecto, descripcion, prioridad,
          pais, empresa, area, estado, gerente, director, division,
          num_integrantes, valor_proyecto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          fecha_inicio    = VALUES(fecha_inicio),
          nombre_proyecto = VALUES(nombre_proyecto),
          descripcion     = VALUES(descripcion),
          prioridad       = VALUES(prioridad),
          pais            = VALUES(pais),
          empresa         = VALUES(empresa),
          area            = VALUES(area),
          estado          = VALUES(estado),
          gerente         = VALUES(gerente),
          director        = VALUES(director),
          division        = VALUES(division),
          num_integrantes = VALUES(num_integrantes),
          valor_proyecto  = VALUES(valor_proyecto)
      `;

      stmt = conn.prepareStatement(sql);
      const TAMANO_LOTE = 50;
      let contadorEnLote = 0;

      for (let i = 0; i < proyectos.length; i++) {
        const p = proyectos[i];

        // 1. id
        const numId = parseInt(p.id, 10);
        if (!isNaN(numId) && numId > 0) {
          stmt.setInt(1, numId);
        } else {
          stmt.setObject(1, null);
        }

        // 2. fecha_inicio (formato estricto YYYY-MM-DD para MySQL)
        const fechaSql = formatearFechaSQL_(p.fechaInicio);
        if (fechaSql) {
          stmt.setString(2, fechaSql);
        } else {
          stmt.setObject(2, null);
        }

        // 3 al 12 (Strings garantizados)
        stmt.setString(3, String(p.nombreProyecto || ''));
        stmt.setString(4, String(p.descripcion || ''));
        stmt.setString(5, String(p.prioridad || ''));
        stmt.setString(6, String(p.pais || ''));
        stmt.setString(7, String(p.empresa || ''));
        stmt.setString(8, String(p.area || ''));
        stmt.setString(9, String(p.estado || ''));
        stmt.setString(10, String(p.gerente || ''));
        stmt.setString(11, String(p.director || ''));
        stmt.setString(12, String(p.division || ''));

        // 13. num_integrantes
        stmt.setInt(13, parseInt(p.numIntegrantes, 10) || 0);

        // 14. valor_proyecto
        stmt.setDouble(14, parseFloat(p.valorProyecto) || 0.0);

        stmt.addBatch();
        contadorEnLote++;

        // Ejecutar e ir confirmando cada lote de 50 registros
        if (contadorEnLote >= TAMANO_LOTE || i === proyectos.length - 1) {
          stmt.executeBatch();
          conn.commit();
          contadorEnLote = 0;
        }
      }

      stmt.close();
      return proyectos.length;
    } catch (e) {
      if (conn) {
        try {
          conn.rollback();
        } catch (rbError) {
          // Protege para que no enmascare el error original
          Logger.log(`(Aviso rollback: ${rbError.message})`);
        }
      }
      throw e; // Muestra el error real que ocurrió en MySQL
    } finally {
      if (stmt) {
        try { stmt.close(); } catch (_) {}
      }
      if (conn) {
        try { conn.close(); } catch (_) {}
      }
    }
  }

  return {
    probarConexion,
    obtenerTodos,
    insertarMuchos
  };
})();

// Alias para compatibilidad con código existente que use RepositorioProyectos
const RepositorioProyectos = RepositorioSheets;
