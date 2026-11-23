/**
 * CAPA DE NEGOCIO (CapaNegocio.js)
 * Responsabilidad única: Aplicar reglas de negocio, validaciones, filtros y cálculos
 * sobre los proyectos obtenidos desde RepositorioProyectos (CapaDatos).
 * No accede directamente a SpreadsheetApp ni formatea salidas visuales/HTTP.
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
    const proyectos = RepositorioProyectos.obtenerTodos();

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
   * Valida las reglas de negocio y registra un nuevo proyecto.
   * @param {Object} datosNuevoProyecto
   * @return {Object} Proyecto creado
   */
  function registrarProyecto(datosNuevoProyecto) {
    const errores = [];

    if (!datosNuevoProyecto.id || String(datosNuevoProyecto.id).trim() === '') {
      errores.push('El campo "ID" es obligatorio.');
    }
    if (!datosNuevoProyecto.nombreProyecto || String(datosNuevoProyecto.nombreProyecto).trim() === '') {
      errores.push('El campo "Nombre del proyecto" es obligatorio.');
    }
    if (!datosNuevoProyecto.gerente || String(datosNuevoProyecto.gerente).trim() === '') {
      errores.push('El campo "Gerente" es obligatorio.');
    }
    if (Number(datosNuevoProyecto.numIntegrantes) < 0) {
      errores.push('El "N° integrantes" no puede ser negativo.');
    }
    if (Number(datosNuevoProyecto.valorProyecto) < 0) {
      errores.push('El "Valor proyecto" no puede ser negativo.');
    }

    if (errores.length > 0) {
      throw new Error(`Error de validación de negocio: ${errores.join(' ')}`);
    }

    const existente = RepositorioProyectos.obtenerPorId(datosNuevoProyecto.id);
    if (existente) {
      throw new Error(`Ya existe un proyecto registrado con el ID "${datosNuevoProyecto.id}".`);
    }

    const proyectoNormalizado = {
      id: String(datosNuevoProyecto.id).trim(),
      fechaInicio: datosNuevoProyecto.fechaInicio || new Date(),
      nombreProyecto: String(datosNuevoProyecto.nombreProyecto).trim(),
      descripcion: String(datosNuevoProyecto.descripcion || '').trim(),
      prioridad: String(datosNuevoProyecto.prioridad || 'Media').trim(),
      pais: String(datosNuevoProyecto.pais || '').trim(),
      empresa: String(datosNuevoProyecto.empresa || '').trim(),
      area: String(datosNuevoProyecto.area || '').trim(),
      estado: String(datosNuevoProyecto.estado || 'En planificación').trim(),
      gerente: String(datosNuevoProyecto.gerente).trim(),
      director: String(datosNuevoProyecto.director || '').trim(),
      division: String(datosNuevoProyecto.division || '').trim(),
      numIntegrantes: Number(datosNuevoProyecto.numIntegrantes) || 0,
      valorProyecto: Number(datosNuevoProyecto.valorProyecto) || 0
    };

    return RepositorioProyectos.insertar(proyectoNormalizado);
  }

  return {
    filtrarProyectos,
    generarResumenPortafolio,
    registrarProyecto
  };
})();
