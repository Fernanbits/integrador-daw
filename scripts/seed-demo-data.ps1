param(
    [string]$EnvPath = "$PSScriptRoot\..\backend\.env"
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $EnvPath)) {
    throw "No se encontro el archivo de entorno: $EnvPath"
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'No se encontro psql en PATH. Instala las herramientas de PostgreSQL.'
}

Get-Content -LiteralPath $EnvPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) {
        return
    }

    $key, $value = $line.Split('=', 2)
    $value = $value.Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($key.Trim(), $value, 'Process')
}

$connectionArgs = @()
if ($env:DATABASE_URL) {
    $connectionArgs = @("--dbname=$env:DATABASE_URL")
} else {
    if (-not $env:DB_HOST -or -not $env:DB_USERNAME -or -not $env:DB_NAME) {
        throw 'Defini DATABASE_URL o DB_HOST, DB_USERNAME y DB_NAME en backend/.env.'
    }

    if ($env:DB_PASSWORD) {
        $env:PGPASSWORD = $env:DB_PASSWORD
    }

    $connectionArgs = @(
        "--host=$env:DB_HOST",
        "--port=$(if ($env:DB_PORT) { $env:DB_PORT } else { '5432' })",
        "--username=$env:DB_USERNAME",
        "--dbname=$env:DB_NAME"
    )
}

$seedSql = @'
BEGIN;

WITH datos_clientes(numero, nombre_base, estado) AS (
    VALUES
        (1, 'Andes Consultoria', 'ACTIVO'::clientes_estado_enum),
        (2, 'Rio Sur Digital', 'ACTIVO'::clientes_estado_enum),
        (3, 'Nexo Salud', 'ACTIVO'::clientes_estado_enum),
        (4, 'Mercurio Logistica', 'ACTIVO'::clientes_estado_enum),
        (5, 'Estudio Prisma', 'ACTIVO'::clientes_estado_enum),
        (6, 'Atlas Energia', 'ACTIVO'::clientes_estado_enum),
        (7, 'Orion Retail', 'ACTIVO'::clientes_estado_enum),
        (8, 'Norte Seguros', 'ACTIVO'::clientes_estado_enum),
        (9, 'Aula Viva', 'ACTIVO'::clientes_estado_enum),
        (10, 'Pampa Agro', 'ACTIVO'::clientes_estado_enum),
        (11, 'Nodo Financiero', 'ACTIVO'::clientes_estado_enum),
        (12, 'Bruma Turismo', 'ACTIVO'::clientes_estado_enum),
        (13, 'Delta Farma', 'ACTIVO'::clientes_estado_enum),
        (14, 'Pixel Factory', 'ACTIVO'::clientes_estado_enum),
        (15, 'Metro Alimentos', 'ACTIVO'::clientes_estado_enum),
        (16, 'Faro Legal', 'ACTIVO'::clientes_estado_enum),
        (17, 'Sur Textil', 'ACTIVO'::clientes_estado_enum),
        (18, 'Vector Analytics', 'ACTIVO'::clientes_estado_enum),
        (19, 'Campus Norte', 'ACTIVO'::clientes_estado_enum),
        (20, 'Alma Eventos', 'ACTIVO'::clientes_estado_enum),
        (21, 'Cliente Historico A', 'BAJA'::clientes_estado_enum),
        (22, 'Cliente Historico B', 'BAJA'::clientes_estado_enum),
        (23, 'Cliente Historico C', 'BAJA'::clientes_estado_enum),
        (24, 'Cliente Historico D', 'BAJA'::clientes_estado_enum)
),
clientes_demo AS (
    SELECT
        numero,
        'Cliente Demo ' || lpad(numero::text, 2, '0') || ' - ' || nombre_base AS nombre,
        estado
    FROM datos_clientes
)
INSERT INTO clientes (nombre, estado)
SELECT nombre, estado
FROM clientes_demo origen
WHERE NOT EXISTS (
    SELECT 1
    FROM clientes existente
    WHERE existente.nombre = origen.nombre
);

WITH proyectos_demo AS (
    SELECT
        serie.numero,
        'Proyecto Demo ' || lpad(serie.numero::text, 3, '0') || ' - ' ||
            CASE serie.numero % 8
                WHEN 0 THEN 'Portal de autoservicio'
                WHEN 1 THEN 'Migracion administrativa'
                WHEN 2 THEN 'Tablero operativo'
                WHEN 3 THEN 'Automatizacion de reportes'
                WHEN 4 THEN 'Integracion comercial'
                WHEN 5 THEN 'Modernizacion interna'
                WHEN 6 THEN 'Gestion documental'
                ELSE 'Analitica de procesos'
            END AS nombre,
        'Proyecto de demostracion generado para validar filtros, paginacion, metricas, pulso y bitacora.' AS descripcion,
        CASE
            WHEN serie.numero % 13 = 0 THEN 'BAJA'
            WHEN serie.numero % 7 = 0 THEN 'FINALIZADO'
            ELSE 'ACTIVO'
        END AS estado,
        CASE
            WHEN serie.numero % 5 = 0 THEN NULL
            ELSE 'Cliente Demo ' || lpad((((serie.numero - 1) % 24) + 1)::text, 2, '0') || ' - '
        END AS prefijo_cliente,
        now() - ((serie.numero + 12) || ' days')::interval AS fecha_creacion,
        now() - ((serie.numero % 18) || ' days')::interval AS fecha_actualizacion
    FROM generate_series(1, 96) AS serie(numero)
)
INSERT INTO proyectos (nombre, descripcion, estado, id_cliente, fecha_creacion, fecha_actualizacion)
SELECT
    proyecto.nombre,
    proyecto.descripcion,
    proyecto.estado,
    cliente.id,
    proyecto.fecha_creacion,
    proyecto.fecha_actualizacion
FROM proyectos_demo proyecto
LEFT JOIN clientes cliente
    ON proyecto.prefijo_cliente IS NOT NULL
    AND cliente.nombre LIKE proyecto.prefijo_cliente || '%'
WHERE NOT EXISTS (
    SELECT 1
    FROM proyectos existente
    WHERE existente.nombre = proyecto.nombre
);

WITH proyectos_demo AS (
    SELECT
        id,
        nombre,
        substring(nombre FROM 'Proyecto Demo ([0-9]+)')::integer AS numero
    FROM proyectos
    WHERE nombre LIKE 'Proyecto Demo %'
),
tareas_demo AS (
    SELECT
        proyecto.id AS proyecto_id,
        tarea.numero_tarea,
        CASE tarea.numero_tarea % 6
            WHEN 1 THEN 'Definir alcance y responsables'
            WHEN 2 THEN 'Relevar datos iniciales'
            WHEN 3 THEN 'Implementar flujo principal'
            WHEN 4 THEN 'Validar integracion con usuarios'
            WHEN 5 THEN 'Documentar decisiones'
            ELSE 'Preparar cierre y evidencias'
        END AS descripcion_base,
        CASE
            WHEN proyecto.numero % 13 = 0 AND tarea.numero_tarea > 2 THEN 'BAJA'::tareas_estado_enum
            WHEN tarea.numero_tarea <= (proyecto.numero % 3) THEN 'FINALIZADA'::tareas_estado_enum
            WHEN tarea.numero_tarea <= ((proyecto.numero % 4) + 1) THEN 'EN_PROGRESO'::tareas_estado_enum
            ELSE 'PENDIENTE'::tareas_estado_enum
        END AS estado,
        now() - ((proyecto.numero + tarea.numero_tarea + 6) || ' days')::interval AS fecha_creacion,
        now() - (((proyecto.numero + tarea.numero_tarea) % 14) || ' days')::interval AS fecha_actualizacion
    FROM proyectos_demo proyecto
    CROSS JOIN LATERAL generate_series(1, 3 + (proyecto.numero % 5)) AS tarea(numero_tarea)
)
INSERT INTO tareas (descripcion, estado, proyecto_id, fecha_creacion, fecha_actualizacion)
SELECT
    descripcion_base || ' - ' || proyecto.nombre,
    tarea.estado,
    proyecto_id,
    tarea.fecha_creacion,
    tarea.fecha_actualizacion
FROM tareas_demo tarea
JOIN proyectos proyecto ON proyecto.id = tarea.proyecto_id
WHERE NOT EXISTS (
    SELECT 1
    FROM tareas existente
    WHERE existente.proyecto_id = tarea.proyecto_id
      AND existente.descripcion = tarea.descripcion_base || ' - ' || proyecto.nombre
);

COMMIT;

SELECT 'clientes' AS tabla, count(*) AS filas FROM clientes
UNION ALL SELECT 'proyectos', count(*) FROM proyectos
UNION ALL SELECT 'tareas', count(*) FROM tareas
UNION ALL SELECT 'usuarios', count(*) FROM usuarios
ORDER BY tabla;
'@

$tempSql = New-TemporaryFile
try {
    Set-Content -LiteralPath $tempSql -Value $seedSql -Encoding UTF8
    & psql @connectionArgs -X -v ON_ERROR_STOP=1 -P pager=off -f $tempSql

    if ($LASTEXITCODE -ne 0) {
        throw 'La carga de datos fallo.'
    }
} finally {
    Remove-Item -LiteralPath $tempSql -Force -ErrorAction SilentlyContinue
}
