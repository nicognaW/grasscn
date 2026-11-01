param([ValidateSet('regressions','pixels','all','full')][string]$Suite='regressions',[ValidateRange(1,8)][int]$Workers=1,[ValidateRange(1,40)][int]$CpuPercent=5,[ValidateRange(50,80)][int]$CpuStopPercent=65)
$ErrorActionPreference='Stop'
$pptPackage=Split-Path -Parent $PSScriptRoot
$repository=Split-Path -Parent (Split-Path -Parent $pptPackage)
$node=(Get-Command bun).Source
function Get-GrasscnFullContext {
 $result=& $node (Join-Path $pptPackage 'cli/full-tests.mjs') context --issue $env:GRASSCN_FULL_RUN_ISSUE
 if($LASTEXITCODE -ne 0){throw 'Full run authorization or executor ownership rejected'}
 return ($result|ConvertFrom-Json)
}
$beforeStart=$null;$lowPriority=$false
if($Suite -eq 'full'){
 $context=Get-GrasscnFullContext
 if($Workers -ne $context.plan.execution.workers){throw 'Workers differ from the approved Full plan'}
 $runDirectory=$context.attempt;$lowPriority=$true
 $beforeStart={Get-GrasscnFullContext|Out-Null}
}else{$runDirectory=Join-Path $repository ('.pixel-perfect-test/porting/'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')+'-'+$Suite)}
Push-Location -LiteralPath $pptPackage
try{$runner=& $node --eval "console.log(require.resolve('@grasscn/tests/run-workload'))";if($LASTEXITCODE -ne 0){throw 'Cannot resolve shared resource runner'}}finally{Pop-Location}
& $runner -WorkDirectory $pptPackage -Workload (Join-Path $pptPackage 'src/runtime/verify-porting.mjs') -WorkloadArguments @($Suite,$runDirectory,$Workers.ToString()) -OutputDirectory $runDirectory -LowPriority:$lowPriority -BeforeStart $beforeStart -Workers $Workers -CpuPercent $CpuPercent -CpuStopPercent $CpuStopPercent
exit $LASTEXITCODE
