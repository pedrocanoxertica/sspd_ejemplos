-- =============================================================================
-- BASE DE DATOS: gestion_proyectos
-- Estructura generada a partir de: "Gestion eficiente de datos - Practica 2 .csv"
-- =============================================================================

-- 1. Creación de la base de datos con soporte completo UTF-8
CREATE DATABASE IF NOT EXISTS gestion_proyectos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE gestion_proyectos;

-- 2. Eliminación previa de tabla para ejecuciones repetidas
DROP TABLE IF EXISTS proyectos;

-- 3. Creación de la tabla principal 'proyectos'
CREATE TABLE proyectos (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  fecha_inicio DATE NULL COMMENT 'Fecha de inicio del proyecto (formato YYYY-MM-DD)',
  nombre_proyecto VARCHAR(150) NOT NULL COMMENT 'Nombre identificador del proyecto',
  descripcion VARCHAR(255) NULL COMMENT 'Tipo o descripción de la iniciativa (Desarrollo, Soporte, etc.)',
  prioridad VARCHAR(50) NULL COMMENT 'Nivel de prioridad (Alta, Media, Baja)',
  pais VARCHAR(100) NULL COMMENT 'País donde opera o se ejecuta el proyecto',
  empresa VARCHAR(100) NULL COMMENT 'Segmento o empresa (Enterprise, Basic, etc.)',
  area VARCHAR(100) NULL COMMENT 'Área solicitante (Sistemas, Administrativo, Contabilidad, etc.)',
  estado VARCHAR(50) NULL COMMENT 'Estado del proyecto (Activo, Finalizado, etc.)',
  gerente VARCHAR(150) NULL COMMENT 'Nombre del Gerente a cargo',
  director VARCHAR(150) NULL COMMENT 'Nombre del Director responsable',
  division VARCHAR(100) NULL COMMENT 'División asignada (Preventa, Administrativo, Ventas, etc.)',
  num_integrantes INT UNSIGNED DEFAULT 0 COMMENT 'Número de integrantes del equipo',
  valor_proyecto DECIMAL(14, 2) DEFAULT 0.00 COMMENT 'Presupuesto o valor económico del proyecto',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Auditoría: fecha de inserción del registro',
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Auditoría: última actualización',

  PRIMARY KEY (id),

  -- Índices para optimizar búsquedas, reportes y filtros frecuentes
  INDEX idx_proyectos_fecha_inicio (fecha_inicio),
  INDEX idx_proyectos_gerente (gerente),
  INDEX idx_proyectos_director (director),
  INDEX idx_proyectos_estado (estado),
  INDEX idx_proyectos_pais (pais),
  INDEX idx_proyectos_empresa (empresa),
  INDEX idx_proyectos_area (area)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de proyectos, líderes y presupuestos';


-- =============================================================================
-- INSERTS DE EJEMPLO (Primeras filas del CSV para prueba inmediata)
-- =============================================================================

INSERT INTO proyectos (id, fecha_inicio, nombre_proyecto, descripcion, prioridad, pais, empresa, area, estado, gerente, director, division, num_integrantes, valor_proyecto)
VALUES
  (1, '2021-10-22', 'Proyecto #1', 'Desarrollo', 'Alta', 'Colombia', 'Enterprise', 'Sistemas', 'Activo', 'Ivan Martinez', 'Viviana Gonzalez', 'Preventa', 13500, 19000.00),
  (2, '2021-10-23', 'Proyecto #2', 'Soporte', 'Baja', 'Perú', 'Enterprise', 'Adminsitrativo', 'Activo', 'Juan Perez', 'Paola Gutierrez', 'Administrativo', 14500, 19000.00),
  (3, '2021-10-24', 'Proyecto #3', 'Google', 'Media', 'Chile', 'Enterprise', 'Contabilidad', 'Activo', 'Diego Acosta', 'Orlando Duran', 'Administrativo', 5500, 15000.00),
  (4, '2021-10-25', 'Proyecto #4', 'Implementación', 'Alta', 'México', 'Enterprise', 'Comercial', 'Activo', 'Ivan Martinez', 'Javier Urbina', 'Gestión de clientes', 10500, 8000.00),
  (5, '2021-10-26', 'Proyecto #5', 'Desarrollo', 'Alta', 'Brasil', 'Enterprise', 'Comercial', 'Activo', 'Juan Perez', 'Oskar Sanchez', 'Ventas', 11500, 9000.00),
  (6, '2021-10-27', 'Proyecto #6', 'Soporte', 'Alta', 'Ecuador', 'Enterprise', 'Sistemas', 'Activo', 'Diego Acosta', 'Ivonne Ortiz', 'Infraestructura', 5500, 6500.00),
  (7, '2021-10-28', 'Proyecto #7', 'Google', 'Alta', 'Perú', 'Basic', 'Adminsitrativo', 'Activo', 'Ivan Martinez', 'Viviana Gonzalez', 'Administrativo', 10500, 7500.00),
  (8, '2021-10-29', 'Proyecto #8', 'Implementación', 'Baja', 'Perú', 'Basic', 'Contabilidad', 'Activo', 'Paola Gutierrez', 'Juan Perez', 'Administrativo', 11500, 18000.00),
  (9, '2021-10-30', 'Proyecto #9', 'Desarrollo', 'Baja', 'Perú', 'Basic', 'Comercial', 'Activo', 'Orlando Duran', 'Diego Acosta', 'Gestión de clientes', 2500, 17000.00),
  (10, '2021-10-31', 'Proyecto #10', 'Soporte', 'Baja', 'Perú', 'Basic', 'Comercial', 'Activo', 'Viviana Gonzalez', 'Fernando Alfaro', 'Ventas', 2000, 14500.00);


-- =============================================================================
-- COMANDO PARA IMPORTAR EL CSV COMPLETO A MYSQL
-- (Ajusta la ruta absoluta de tu archivo si utilizas la consola o phpMyAdmin / MySQL Workbench)
-- =============================================================================
/*
LOAD DATA LOCAL INFILE 'C:/Users/Pedro Cano/Documents/SSPD scripts/Gestion eficiente de datos - Practica 2 .csv'
INTO TABLE proyectos
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ',' 
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\r\n' -- o '\n' según tu sistema operativo
IGNORE 1 LINES
(
  id,
  @var_fecha,
  nombre_proyecto,
  @var_descripcion,
  @var_prioridad,
  @var_pais,
  @var_empresa,
  @var_area,
  @var_estado,
  @var_gerente,
  @var_director,
  @var_division,
  @var_num_integrantes,
  @var_valor
)
SET
  fecha_inicio    = STR_TO_DATE(TRIM(@var_fecha), '%d/%m/%Y'),
  descripcion     = TRIM(@var_descripcion),
  prioridad       = TRIM(@var_prioridad),
  pais            = TRIM(@var_pais),
  empresa         = TRIM(@var_empresa),
  area            = TRIM(@var_area),
  estado          = TRIM(@var_estado),
  gerente         = TRIM(@var_gerente),
  director        = TRIM(@var_director),
  division        = TRIM(@var_division),
  num_integrantes = CAST(TRIM(@var_num_integrantes) AS UNSIGNED),
  -- Limpia el signo '$' y las comas de miles del formato "$19,000":
  valor_proyecto  = CAST(REPLACE(REPLACE(REPLACE(TRIM(@var_valor), '$', ''), ',', ''), ' ', '') AS DECIMAL(14, 2));
*/
