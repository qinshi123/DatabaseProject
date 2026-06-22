param(
  [string]$HostName = $env:PGHOST,
  [string]$Port = $env:PGPORT,
  [string]$User = $env:PGUSER,
  [string]$Database = $env:PGDATABASE,
  [string]$PsqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe",
  [switch]$CreateDatabase
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dataDir = Join-Path $root "data"
$schema = Join-Path $root "db\schema.sql"
$mapping = Join-Path $root "db\seed_mapping.sql"
$verify = Join-Path $root "db\verify.sql"
$envFile = Join-Path $root ".env"

if (Test-Path $envFile) {
  Get-Content -LiteralPath $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $key, $value = $line.Split("=", 2)
    $key = $key.Trim()
    $value = $value.Trim().Trim('"').Trim("'")
    if ($key -and -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

if (-not $HostName) { $HostName = $env:PGHOST }
if (-not $Port) { $Port = $env:PGPORT }
if (-not $User) { $User = $env:PGUSER }
if (-not $Database) { $Database = $env:PGDATABASE }

if (-not $HostName) { $HostName = "localhost" }
if (-not $Port) { $Port = "5432" }
if (-not $User) { $User = "postgres" }
if (-not $Database) { $Database = "curriculum_compare" }

if (-not (Test-Path $PsqlPath)) {
  throw "Cannot find psql at $PsqlPath. Set -PsqlPath to your PostgreSQL psql.exe."
}

function To-PsqlPath([string]$path) {
  return ($path -replace "\\", "/").Replace("'", "''")
}

if ($CreateDatabase) {
  $exists = & $PsqlPath -h $HostName -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'"
  if (-not $exists) {
    & $PsqlPath -h $HostName -p $Port -U $User -d postgres -c "CREATE DATABASE $Database WITH ENCODING 'UTF8';"
  }
}

& $PsqlPath -h $HostName -p $Port -U $User -d $Database -f $schema

$tempImport = Join-Path ([System.IO.Path]::GetTempPath()) ("curriculum_import_" + [guid]::NewGuid().ToString("N") + ".sql")
$university = To-PsqlPath (Join-Path $dataDir "university.csv")
$school = To-PsqlPath (Join-Path $dataDir "school.csv")
$major = To-PsqlPath (Join-Path $dataDir "major.csv")
$course = To-PsqlPath (Join-Path $dataDir "course.csv")
$program = To-PsqlPath (Join-Path $dataDir "program.csv")
$credit = To-PsqlPath (Join-Path $dataDir "credit_requirement.csv")

@"
\encoding UTF8
\copy university(id, name) FROM '$university' WITH (FORMAT csv, ENCODING 'UTF8')
\copy school(id, name, university_id) FROM '$school' WITH (FORMAT csv, ENCODING 'UTF8')
\copy major(id, name, school_id, degree_level, duration_years) FROM '$major' WITH (FORMAT csv, ENCODING 'UTF8')
\copy course(id, name, credit, hours, school_id) FROM '$course' WITH (FORMAT csv, ENCODING 'UTF8')
\copy credit_requirement(id, major_id, total_credits, required_credits, elective_credits, practice_credits, year) FROM '$credit' WITH (FORMAT csv, ENCODING 'UTF8')
\copy program(id, major_id, course_id, semester, category, is_required) FROM '$program' WITH (FORMAT csv, ENCODING 'UTF8')
"@ | Set-Content -Encoding UTF8 -Path $tempImport

try {
  & $PsqlPath -h $HostName -p $Port -U $User -d $Database -f $tempImport
  & $PsqlPath -h $HostName -p $Port -U $User -d $Database -f $mapping
}
finally {
  Remove-Item -LiteralPath $tempImport -Force -ErrorAction SilentlyContinue
}

& $PsqlPath -h $HostName -p $Port -U $User -d $Database -f $verify
