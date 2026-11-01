param([ValidateSet('regressions','pixels','all','full')][string]$Suite='regressions',[int]$Workers=1,[int]$CpuPercent=5,[int]$CpuStopPercent=65)
& (Join-Path (Split-Path -Parent $PSScriptRoot) 'cli/run-porting.ps1') @PSBoundParameters
exit $LASTEXITCODE
