param([Parameter(Mandatory=$true)][string]$WorkDirectory,[Parameter(Mandatory=$true)][string]$Workload,[string[]]$WorkloadArguments=@(),[Parameter(Mandatory=$true)][string]$OutputDirectory,[switch]$LowPriority,[scriptblock]$BeforeStart,[ValidateRange(1,8)][int]$Workers=1,[ValidateRange(1,40)][int]$CpuPercent=5,[ValidateRange(50,80)][int]$CpuStopPercent=65)
$ErrorActionPreference='Stop'
$runDirectory=[IO.Path]::GetFullPath($OutputDirectory)
$node=(Get-Command bun).Source
$common=& git -C $WorkDirectory rev-parse --git-common-dir
if($LASTEXITCODE -ne 0){throw 'Cannot locate shared verification coordination'}
if(-not [IO.Path]::IsPathRooted($common)){$common=Join-Path $WorkDirectory $common}
$foregroundDirectory=Join-Path ([IO.Path]::GetFullPath($common)) 'grasscn-verification/foreground'
function Test-GrasscnForeground {
 if(-not (Test-Path -LiteralPath $foregroundDirectory)){return $false}
 foreach($file in Get-ChildItem -LiteralPath $foregroundDirectory -Filter '*.json' -File){
  try{$lease=Get-Content -LiteralPath $file.FullName -Raw|ConvertFrom-Json;$owner=Get-Process -Id ([int]$lease.pid) -ErrorAction Stop
   if($owner.StartTime.ToUniversalTime().ToString('o') -eq $lease.start){return $true}
  }catch{}
 }
 return $false
}
$foregroundLease=$null
if(-not $LowPriority){
 New-Item -ItemType Directory -Path $foregroundDirectory -Force|Out-Null
 $foregroundLease=Join-Path $foregroundDirectory ($PID.ToString()+'-'+[Guid]::NewGuid().ToString('N')+'.json')
 [IO.File]::WriteAllText($foregroundLease,([pscustomobject]@{pid=$PID;start=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
}
$grasscnHeavyMutex=[Threading.Mutex]::new($false,'Local\GrasscnHeavyVerification');$acquired=$false
try {
 while(-not $acquired){
  if($LowPriority -and (Test-GrasscnForeground)){Start-Sleep -Milliseconds 500;continue}
  try{$acquired=$grasscnHeavyMutex.WaitOne(500)}catch [Threading.AbandonedMutexException]{$acquired=$true}
 }
 if($BeforeStart){& $BeforeStart}
 New-Item -ItemType Directory -Path $runDirectory -Force|Out-Null
 . (Join-Path $PSScriptRoot 'windows-budget.ps1')
$baseline=[GrasscnBudget]::Ram()
$usedBytes=$baseline.Total-$baseline.Available
$headroom=[Math]::Min(10GB,[Math]::Floor($baseline.Total*.89-$usedBytes))
if($baseline.Load -ge 86 -or $headroom -lt .4GB){throw 'Insufficient headroom to start safely; no browser workers launched.'}
$memoryBudget=[uint64]$headroom

$cpuBefore=[GrasscnBudget]::Times();Start-Sleep -Seconds 1;$cpuAfter=[GrasscnBudget]::Times();$cpuDelta=($cpuAfter[1]-$cpuBefore[1])+($cpuAfter[2]-$cpuBefore[2]);$baselineCpu=100.*(1-($cpuAfter[0]-$cpuBefore[0])/$cpuDelta)
$cpuBudget=[uint32][Math]::Max(1,[Math]::Min($CpuPercent,[Math]::Floor($CpuStopPercent-5-$baselineCpu)))

$logicalProcessorLimit=[Math]::Min(16,[Math]::Max(1,[Math]::Ceiling([Environment]::ProcessorCount*$cpuBudget/100.0)))
if($baselineCpu+100.*$logicalProcessorLimit/[Environment]::ProcessorCount -gt $CpuStopPercent){throw 'CPU preflight exceeds the verification headroom budget.'}
$job=[GrasscnBudget]::Create($cpuBudget,$memoryBudget)
$limits=[GrasscnBudget+Cpu]::new()
if(-not [GrasscnBudget]::ReadCpu($job,15,[ref]$limits,8,[IntPtr]::Zero)){throw 'Unable to read back CPU cap'}
if($limits.Flags -ne 5 -or $limits.Rate -ne $cpuBudget*100){throw 'CPU cap readback mismatch'}


$samples=Join-Path $runDirectory 'resource-samples.jsonl'
$sampleWriter=[IO.StreamWriter]::new([IO.FileStream]::new($samples,[IO.FileMode]::Append,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite));$sampleWriter.AutoFlush=$true
$result=Join-Path $runDirectory 'resource-summary.json'
$node=(Get-Command bun).Source
$budgetGate=Join-Path $runDirectory ('budget-ready-'+[Guid]::NewGuid().ToString('N')+'.json')
$launchArguments=@((Join-Path $PSScriptRoot 'guarded-entry.ts'),$budgetGate,$Workload)+$WorkloadArguments
$argsList=@($launchArguments|ForEach-Object{'"'+$_.Replace('"','\"')+'"'})
$env:GOMAXPROCS='1'
$env:RAYON_NUM_THREADS='1'
$process=$null;$reason='completed' ;$peakCpu=0.;$peakRam=0.;$count=0
try {
 $process=Start-Process -FilePath $node -ArgumentList $argsList -WorkingDirectory $WorkDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDirectory 'stdout.log') -RedirectStandardError (Join-Path $runDirectory 'stderr.log')
 $processHandle=$process.Handle
 if(-not [GrasscnBudget]::AssignProcessToJobObject($job,$processHandle)){Stop-Process -Id $process.Id;throw 'Could not enforce job limits; stopped test launcher.'}
 [IO.File]::WriteAllText($budgetGate,([pscustomobject]@{pid=$process.Id;enforced=$true}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
 $process.PriorityClass='BelowNormal'
 [pscustomobject]@{RootPid=$process.Id;CpuHardCapPercent=$cpuBudget;MemoryCapGiB=[Math]::Round($memoryBudget/1GB,3);SystemCpuStopThresholdPercent=$CpuStopPercent;SystemRamStopThresholdPercent=88;SampleIntervalMilliseconds=500;Workers=$Workers;LogicalProcessorLimit=$logicalProcessorLimit;BaselineRamPercent=$baseline.Load;CpuReadback=$limits.Rate} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDirectory 'resource-policy.json')
 $before=[GrasscnBudget]::Times()
 while(-not $process.HasExited){
  Start-Sleep -Milliseconds 500
  $after=[GrasscnBudget]::Times();$total=($after[1]-$before[1])+($after[2]-$before[2]);$idle=$after[0]-$before[0]
  $cpu=if($total -gt 0){100.*($total-$idle)/$total}else{0.};$before=$after
  $ram=[GrasscnBudget]::Ram();$ramPercent=100.*($ram.Total-$ram.Available)/$ram.Total
  $peakCpu=[Math]::Max($peakCpu,$cpu);$peakRam=[Math]::Max($peakRam,$ramPercent);$count++
  $sampleWriter.WriteLine(([pscustomobject]@{At=[DateTime]::UtcNow.ToString('o');SystemCpuPercent=[Math]::Round($cpu,2);SystemRamPercent=[Math]::Round($ramPercent,2)} | ConvertTo-Json -Compress))
  if($LowPriority -and (Test-GrasscnForeground)){$reason='foreground-priority';[GrasscnBudget]::TerminateJobObject($job,79)|Out-Null;break}
  if($cpu -ge $CpuStopPercent -or $ramPercent -ge 88){$reason='system-headroom-guard';[GrasscnBudget]::TerminateJobObject($job,78)|Out-Null;break}
  $process.Refresh()
 }
 $process.WaitForExit()
 $exitCode=[uint32]0
 if(-not [GrasscnBudget]::GetExitCodeProcess($processHandle,[ref]$exitCode) -or $exitCode -eq 259){throw 'Could not read a terminal verification exit code'}
 [pscustomobject]@{Reason=$reason;ExitCode=$exitCode;Samples=$count;PeakSystemCpuPercent=[Math]::Round($peakCpu,2);PeakSystemRamPercent=[Math]::Round($peakRam,2);CpuHardCapPercent=$cpuBudget;MemoryCapGiB=[Math]::Round($memoryBudget/1GB,3)} | ConvertTo-Json | Set-Content -LiteralPath $result
 Get-Content -LiteralPath $result
 if($reason -ne 'completed' -or $exitCode -ne 0){exit 1}
} finally {$sampleWriter.Dispose();[GrasscnBudget]::CloseHandle($job)|Out-Null}

} finally {if($acquired){$grasscnHeavyMutex.ReleaseMutex()};$grasscnHeavyMutex.Dispose();if($foregroundLease){Remove-Item -LiteralPath $foregroundLease -Force -ErrorAction SilentlyContinue}}
