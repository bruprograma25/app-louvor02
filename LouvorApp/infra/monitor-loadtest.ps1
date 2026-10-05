param(
    [ValidateRange(1, 60)]
    [int]$IntervalSeconds = 5
)

$ErrorActionPreference = "Stop"
$composeFile = Join-Path $PSScriptRoot "..\docker-compose.scalable.yml"
$reportsDirectory = Join-Path $PSScriptRoot "..\backend\loadtests\reports"
New-Item -ItemType Directory -Force -Path $reportsDirectory | Out-Null

$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$outputFile = Join-Path $reportsDirectory "resources-$runId.csv"
"timestamp,container,cpu_percent,memory_usage,memory_limit,postgres_connections,postgres_active,redis_clients,redis_memory" |
    Set-Content -Path $outputFile -Encoding utf8

Write-Host "Gravando métricas em $outputFile. Pressione Ctrl+C para parar."
while ($true) {
    $timestamp = (Get-Date).ToUniversalTime().ToString("o")
    $postgresStats = docker compose -f $composeFile exec -T postgres-loadtest sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*), count(*) FILTER (WHERE state = chr(97)||chr(99)||chr(116)||chr(105)||chr(118)||chr(101)) FROM pg_stat_activity;"'
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível consultar as conexões do PostgreSQL de carga."
    }
    $postgresValues = $postgresStats.Trim().Split("|")
    if ($postgresValues.Count -ne 2) {
        throw "Resposta inesperada das métricas do PostgreSQL: $postgresStats"
    }

    $redisStats = docker compose -f $composeFile exec -T redis-loadtest redis-cli --raw INFO clients
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível consultar as métricas do Redis de carga."
    }
    $redisClients = [regex]::Match(($redisStats -join "`n"), "(?m)^connected_clients:(\d+)").Groups[1].Value
    $redisMemory = [regex]::Match(($redisStats -join "`n"), "(?m)^used_memory_human:([^\r\n]+)").Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($redisClients) -or [string]::IsNullOrWhiteSpace($redisMemory)) {
        throw "A resposta de métricas do Redis está incompleta."
    }

    $containerStats = docker stats --no-stream --format "{{.Name}},{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}}"
    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível obter CPU e memória dos containers."
    }
    $containersGravados = 0
    foreach ($line in $containerStats) {
        if ($line -notmatch "loadtest|locust") {
            continue
        }
        $fields = $line.Split(",", 4)
        if ($fields.Count -ne 4) {
            continue
        }
        $row = @(
            $timestamp,
            $fields[0],
            $fields[1].TrimEnd("%"),
            $fields[2].Split("/")[0].Trim(),
            $fields[2].Split("/")[1].Trim(),
            $postgresValues[0],
            $postgresValues[1],
            $redisClients,
            $redisMemory
        ) -join ","
        Add-Content -Path $outputFile -Value $row -Encoding utf8
        $containersGravados++
    }
    if ($containersGravados -eq 0) {
        throw "Nenhum container de carga ativo foi encontrado para monitorar."
    }

    Start-Sleep -Seconds $IntervalSeconds
}
