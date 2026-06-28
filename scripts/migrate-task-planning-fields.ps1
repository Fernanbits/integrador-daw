param(
    [string]$DatabaseUrl,
    [string]$EnvPath = "$PSScriptRoot\..\backend\.env"
)

$ErrorActionPreference = 'Stop'

if (-not $DatabaseUrl -and -not (Test-Path -LiteralPath $EnvPath)) {
    throw "No se encontro el archivo de entorno: $EnvPath"
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'No se encontro psql en PATH. Instala las herramientas de PostgreSQL.'
}

if (-not $DatabaseUrl) {
    Get-Content -LiteralPath $EnvPath | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) {
            return
        }

        $key, $value = $line.Split('=', 2)
        $value = $value.Trim().Trim('"').Trim("'")
        [Environment]::SetEnvironmentVariable($key.Trim(), $value, 'Process')
    }
}

$connectionArgs = @()
if ($DatabaseUrl) {
    $connectionArgs = @("--dbname=$DatabaseUrl")
} elseif ($env:DATABASE_URL) {
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

$migrationSql = @'
BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tareas_prioridad_enum') THEN
        CREATE TYPE tareas_prioridad_enum AS ENUM ('ALTA', 'MEDIA', 'BAJA');
    END IF;
END
$$;

ALTER TABLE tareas
    ADD COLUMN IF NOT EXISTS prioridad tareas_prioridad_enum NOT NULL DEFAULT 'MEDIA',
    ADD COLUMN IF NOT EXISTS fecha_vencimiento date;

UPDATE tareas
SET prioridad = 'MEDIA'
WHERE prioridad IS NULL;

COMMIT;

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'tareas'
  AND column_name IN ('prioridad', 'fecha_vencimiento')
ORDER BY column_name;
'@

$tempSql = New-TemporaryFile
try {
    Set-Content -LiteralPath $tempSql -Value $migrationSql -Encoding UTF8
    & psql @connectionArgs -X -v ON_ERROR_STOP=1 -P pager=off -f $tempSql

    if ($LASTEXITCODE -ne 0) {
        throw 'La migracion fallo.'
    }
} finally {
    Remove-Item -LiteralPath $tempSql -Force -ErrorAction SilentlyContinue
}
