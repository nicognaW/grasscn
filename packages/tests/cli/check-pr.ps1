param([ValidateRange(1,8)][int]$Workers=1,[ValidateRange(1,40)][int]$CpuPercent=10,[ValidateRange(50,80)][int]$CpuStopPercent=75)
$ErrorActionPreference='Stop'
$testPackage=Split-Path -Parent $PSScriptRoot
$repository=Split-Path -Parent (Split-Path -Parent $testPackage)
$output=Join-Path $repository ('test-results/verification/'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff'))
& (Join-Path $testPackage 'src/runtime/run-workload.ps1') -WorkDirectory $testPackage -Workload (Join-Path $testPackage 'src/checks/verify.ts') -WorkloadArguments @($output,$Workers.ToString()) -OutputDirectory $output -BuildThenBrowser -Workers $Workers -CpuPercent $CpuPercent -CpuStopPercent $CpuStopPercent
exit $LASTEXITCODE
