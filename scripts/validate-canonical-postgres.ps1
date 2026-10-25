[CmdletBinding()]
param(
    [string]$PostgresAdmin = 'postgres',
    [int]$Port = 5432
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$candidatePath = Join-Path $repoRoot 'supabase/candidates/202610040001_canonical_baseline.sql'
$prerequisitesPath = Join-Path $repoRoot 'supabase/diagnostics/local_postgres_prerequisites.sql'
$assertionsPath = Join-Path $repoRoot 'supabase/diagnostics/assert_canonical_catalog.sql'
$catalogPath = Join-Path $repoRoot 'supabase/diagnostics/verify_canonical_catalog.sql'

if (-not (Test-Path -LiteralPath $candidatePath)) { throw "Canonical candidate not found: $candidatePath" }
if (-not (Test-Path -LiteralPath $prerequisitesPath)) { throw "Local prerequisite SQL not found: $prerequisitesPath" }
if (-not (Test-Path -LiteralPath $assertionsPath)) { throw "Catalog assertions not found: $assertionsPath" }

foreach ($toolName in @('psql', 'createdb')) {
    if (-not (Get-Command $toolName -ErrorAction SilentlyContinue)) {
        throw "Required local PostgreSQL tool '$toolName' is unavailable. This script does not install tools."
    }
}
if ($PostgresAdmin -notin @('postgres', 'supabase_admin')) { throw 'PostgresAdmin must be postgres or supabase_admin because the candidate has an owner-role guard.' }
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Port must be between 1 and 65535.' }
foreach ($connectionOverride in @('PGHOSTADDR', 'PGSERVICE', 'PGSERVICEFILE', 'PGOPTIONS')) {
    if (-not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($connectionOverride))) {
        throw "Clear $connectionOverride before running; the runner refuses connection overrides. No database was created."
    }
}

# Force loopback networking. No project URL, remote host, .env value, or Supabase key is read.
$loopbackHost = '127.0.0.1'
$databaseName = 'rw16_canonical_' + [guid]::NewGuid().ToString('N').Substring(0, 12)
$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$scratchRoot = [System.IO.Path]::GetFullPath((Join-Path $tempBase ('rw16-canonical-' + [guid]::NewGuid().ToString('N'))))
if (-not $scratchRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Generated scratch path is outside the system temp directory.' }
New-Item -ItemType Directory -Path $scratchRoot | Out-Null
$databaseCreated = $false

try {
    $source = [System.IO.File]::ReadAllText($candidatePath)
    $sourceHash = (Get-FileHash -LiteralPath $candidatePath -Algorithm SHA256).Hash
    $guardPattern = "(?s)do \`$target_guard\`$ begin\s*if current_setting\('rw16\.validation_project_ref',true\) is distinct from 'zrmqovpxpuzixngvwhgi' then\s*raise exception 'Validation target assertion missing or mismatched; expected RW16-Migration-Test / zrmqovpxpuzixngvwhgi';\s*end if;\s*end \`$target_guard\`$;"
    $guardMatches = [regex]::Matches($source, $guardPattern)
    if ($guardMatches.Count -ne 1) { throw "Expected exactly one known hosted-project guard in the candidate; found $($guardMatches.Count). Nothing was executed." }

    $localGuard = @'
do $target_guard$ begin
 if current_setting('rw16.local_validation',true) is distinct from 'local-postgres-validation' then
  raise exception 'Local PostgreSQL assertion missing or mismatched';
 end if;
end $target_guard$;
'@
    $bootstrap = [regex]::new($guardPattern).Replace($source, $localGuard.TrimEnd(), 1)
    $bootstrap = $bootstrap -replace '(?m)^-- Authorized for one disposable runtime validation execution only; never for staging or production\.$', '-- LOCAL SCRATCH COPY only; generated for the loopback PostgreSQL validation database.'
    $bootstrap = $bootstrap -replace '(?m)^-- Validation target: RW16-Migration-Test / zrmqovpxpuzixngvwhgi\.$', '-- Hosted Supabase validation targets are intentionally not used by this local runner.'
    $bootstrap = $bootstrap -replace '(?m)^-- Before execution, verify the Supabase Dashboard URL is /dashboard/project/zrmqovpxpuzixngvwhgi\.$', '-- The runner pins its connection to 127.0.0.1 and creates a unique local database.'
    $bootstrap = $bootstrap -replace '(?m)^-- PostgreSQL does not expose the Supabase project ref.*$', '-- The original hosted-project guard is replaced in this temporary copy by a local-only session assertion.'
    $prelude = "select set_config('rw16.local_validation','local-postgres-validation',false);`r`n"
    $bootstrapPath = Join-Path $scratchRoot 'bootstrap.sql'
    $prerequisites = [System.IO.File]::ReadAllText($prerequisitesPath)
    [System.IO.File]::WriteAllText($bootstrapPath, $prerequisites + "`r`n" + $prelude + $bootstrap, [System.Text.UTF8Encoding]::new($false))

    $createdbArgs = @('--no-password', '--host', $loopbackHost, '--port', "$Port", '--username', $PostgresAdmin, $databaseName)
    & createdb @createdbArgs
    if ($LASTEXITCODE -ne 0) { throw "Could not create unique disposable loopback database '$databaseName'." }
    $databaseCreated = $true

    $psqlCommon = @('--no-password', '--no-psqlrc', '--host', $loopbackHost, '--port', "$Port", '--username', $PostgresAdmin, '--dbname', $databaseName, '--set', 'ON_ERROR_STOP=1')
    & psql @psqlCommon '--file' $bootstrapPath
    if ($LASTEXITCODE -ne 0) { throw "Canonical bootstrap failed in local database '$databaseName'. Preserve the complete psql error output for review." }

    & psql @psqlCommon '--file' $assertionsPath
    if ($LASTEXITCODE -ne 0) { throw "Catalog assertions failed in local database '$databaseName'. Preserve the complete psql error output for review." }

    & psql @psqlCommon '--file' $catalogPath
    if ($LASTEXITCODE -ne 0) { throw "Read-only catalog inventory failed in local database '$databaseName'." }

    Write-Host "Bootstrap and catalog assertions passed for local database: $databaseName"
    Write-Host "Original candidate SHA256: $sourceHash"
    Write-Host 'The candidate file was read only; a scratch copy with only the hosted assertion adapted was executed.'
    Write-Host "Cleanup this exact disposable database later with: dropdb --host $loopbackHost --port $Port --username $PostgresAdmin $databaseName"
}
catch {
    if ($databaseCreated) {
        Write-Error $_
        Write-Host "Disposable database retained for diagnosis: $databaseName"
        Write-Host "Remove only this generated database after reviewing it with: dropdb --host $loopbackHost --port $Port --username $PostgresAdmin $databaseName"
        exit 1
    }
    throw
}
finally {
    if (Test-Path -LiteralPath $scratchRoot) {
        $resolvedScratch = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $scratchRoot).Path)
        if (-not $resolvedScratch.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw 'Refusing to remove scratch files outside the system temp directory.'
        }
        Remove-Item -LiteralPath $resolvedScratch -Recurse -Force
    }
}
