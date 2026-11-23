/**
 * CAPA DE DATOS (CapaDatos.js)
 * Responsabilidad única: Conectarse a Google Sheets mediante SpreadsheetApp.openById()
 * y realizar operaciones de lectura/escritura mapeando la estructura de columnas.
 * No contiene reglas de negocio ni lógica de presentación/salida.
 */

const CONFIG_DATOS = {
  SPREADSHEET_ID: 'REEMPLAZAR_CON_ID_DE_LA_HOJA', // ID de Google Sheets en la URL
  SHEET_NAME: 'Practica 2'                         // Nombre de la pestaña con los datos
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

const RepositorioProyectos = (() => {
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
      fechaInicio: fila[COLUMNAS_PROYECTO.FECHA_INICIO] || null,
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
      valorProyecto: Number(fila[COLUMNAS_PROYECTO.VALOR_PROYECTO]) || 0
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
      proyecto.fechaInicio,
      proyecto.nombreProyecto,
      proyecto.descripcion,
      proyecto.prioridad,
      proyecto.pais,
      proyecto.empresa,
      proyecto.area,
      proyecto.estado,
      proyecto.gerente,
      proyecto.director,
      proyecto.division,
      proyecto.numIntegrantes,
      proyecto.valorProyecto
    ];
  }

  /**
   * Obtiene todos los registros de proyectos omitiendo el encabezado (fila 1)
   * y descartando filas completamente vacías.
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

  return {
    obtenerTodos,
    obtenerPorId,
    insertar
  };
})();
