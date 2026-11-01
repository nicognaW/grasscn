param([ValidateSet('regressions','pixels','all','full')][string]$Suite='regressions',[ValidateRange(1,8)][int]$Workers=1,[ValidateRange(1,10)][int]$CpuPercent=10,[ValidateRange(50,75)][int]$CpuStopPercent=75)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$node=(Get-Command bun).Source
$common=& git -C $repo rev-parse --git-common-dir
if($LASTEXITCODE -ne 0){throw 'Cannot locate shared verification coordination'}
if(-not [IO.Path]::IsPathRooted($common)){$common=Join-Path $repo $common}
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
function Get-GrasscnFullContext {
 $result=& $node (Join-Path $repo 'scripts/full-run.mjs') context --issue $env:GRASSCN_FULL_RUN_ISSUE
 if($LASTEXITCODE -ne 0){throw 'Full run authorization or executor ownership rejected'}
 return ($result|ConvertFrom-Json)
}
$foregroundLease=$null;$runContext=$null
if($Suite -eq 'full'){
 $runContext=Get-GrasscnFullContext
 if($Workers -ne $runContext.plan.execution.workers){throw 'Workers differ from the approved Full plan'}
 $runDirectory=$runContext.attempt
}else{
 New-Item -ItemType Directory -Path $foregroundDirectory -Force|Out-Null
 $foregroundLease=Join-Path $foregroundDirectory ($PID.ToString()+'-'+[Guid]::NewGuid().ToString('N')+'.json')
 [IO.File]::WriteAllText($foregroundLease,([pscustomobject]@{pid=$PID;start=(Get-Process -Id $PID).StartTime.ToUniversalTime().ToString('o')}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
 $runDirectory=Join-Path (Split-Path -Parent (Split-Path -Parent $repo)) ('.pixel-perfect-test/porting/'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')+'-'+$Suite)
}
$grasscnHeavyMutex=[Threading.Mutex]::new($false,'Local\GrasscnHeavyVerification');$acquired=$false
try {
 while(-not $acquired){
  if($Suite -eq 'full' -and (Test-GrasscnForeground)){Start-Sleep -Milliseconds 500;continue}
  try{$acquired=$grasscnHeavyMutex.WaitOne(500)}catch [Threading.AbandonedMutexException]{$acquired=$true}
 }
 if($Suite -eq 'full'){$runContext=Get-GrasscnFullContext}

New-Item -ItemType Directory -Path $runDirectory -Force | Out-Null
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class GrasscnBudget {
 [StructLayout(LayoutKind.Sequential)] public struct Cpu { public uint Flags, Rate; }
 [StructLayout(LayoutKind.Sequential)] public struct Basic {
  public long ProcessTime, JobTime; public uint Flags; public UIntPtr MinWorking, MaxWorking;
  public uint Active; public UIntPtr Affinity; public uint Priority, Scheduling;
 }
 [StructLayout(LayoutKind.Sequential)] public struct Io {public ulong ReadOps,WriteOps,OtherOps,ReadBytes,WriteBytes,OtherBytes;}
 [StructLayout(LayoutKind.Sequential)] public struct Extended {public Basic Basic;public Io Io;public UIntPtr ProcessMemory,JobMemory,PeakProcess,PeakJob;}
 [StructLayout(LayoutKind.Sequential)] public class Memory {
  public uint Length=(uint)Marshal.SizeOf(typeof(Memory));public uint Load;
  public ulong Total,Available,TotalPage,AvailablePage,TotalVirtual,AvailableVirtual,ExtendedVirtual;
 }
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr attributes,string name);
 [DllImport("kernel32.dll",EntryPoint="SetInformationJobObject",SetLastError=true)] public static extern bool SetCpu(IntPtr job,int info,ref Cpu value,uint size);
 [DllImport("kernel32.dll",EntryPoint="SetInformationJobObject",SetLastError=true)] static extern bool SetExtended(IntPtr job,int info,ref Extended value,uint size);
 [DllImport("kernel32.dll",EntryPoint="QueryInformationJobObject",SetLastError=true)] public static extern bool ReadCpu(IntPtr job,int info,out Cpu value,uint size,IntPtr length);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool GetExitCodeProcess(IntPtr process,out uint exitCode);
 [DllImport("kernel32.dll",SetLastError=true)] public static extern bool TerminateJobObject(IntPtr job,uint code);
 [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr handle);
 [DllImport("kernel32.dll")] public static extern bool GlobalMemoryStatusEx([In,Out] Memory memory);
 [DllImport("kernel32.dll")] static extern bool GetSystemTimes(out long idle,out long kernel,out long user);
 public static long[] Times(){long i,k,u;if(!GetSystemTimes(out i,out k,out u))throw new Exception("GetSystemTimes failed");return new long[]{i,k,u};}
 public static Memory Ram(){var m=new Memory();if(!GlobalMemoryStatusEx(m))throw new Exception("Memory sample failed");return m;}
 public static IntPtr Create(uint cpuPercent,ulong memoryBytes,uint affinityCpuPercent){
  var job=CreateJobObject(IntPtr.Zero,null);if(job==IntPtr.Zero)throw new Exception("CreateJobObject "+Marshal.GetLastWin32Error());
  var cpu=new Cpu{Flags=5,Rate=cpuPercent*100};
  if(!SetCpu(job,15,ref cpu,(uint)Marshal.SizeOf(cpu)))throw new Exception("CPU cap "+Marshal.GetLastWin32Error());
  var limits=new Extended();limits.Basic.Flags=0x10|0x200|0x2000;limits.Basic.Affinity=(UIntPtr)((1UL << Math.Min(16,Math.Max(1,(int)Math.Ceiling(Environment.ProcessorCount*affinityCpuPercent/100.0))))-1);limits.JobMemory=(UIntPtr)memoryBytes;
  if(!SetExtended(job,9,ref limits,(uint)Marshal.SizeOf(limits)))throw new Exception("Memory cap "+Marshal.GetLastWin32Error());
  return job;
 }
}
'@
$baseline=[GrasscnBudget]::Ram()
$usedBytes=$baseline.Total-$baseline.Available
$headroom=[Math]::Min(4GB,[Math]::Floor($baseline.Total*.87-$usedBytes))
if($baseline.Load -ge 86 -or $headroom -lt .4GB){throw 'Insufficient headroom to start safely; no browser workers launched.'}
$memoryBudget=[uint64]$headroom

$cpuBefore=[GrasscnBudget]::Times();Start-Sleep -Seconds 1;$cpuAfter=[GrasscnBudget]::Times();$cpuDelta=($cpuAfter[1]-$cpuBefore[1])+($cpuAfter[2]-$cpuBefore[2]);$baselineCpu=100.*(1-($cpuAfter[0]-$cpuBefore[0])/$cpuDelta)
$browserCpuBudget=[uint32][Math]::Max(1,[Math]::Min($CpuPercent,[Math]::Floor($CpuStopPercent-5-$baselineCpu)))
$cpuBudget=[uint32][Math]::Min(4,$browserCpuBudget)

$logicalProcessorLimit=[Math]::Min(16,[Math]::Max(1,[Math]::Ceiling([Environment]::ProcessorCount*$browserCpuBudget/100.0)))
if($baselineCpu+100.*$logicalProcessorLimit/[Environment]::ProcessorCount -gt $CpuStopPercent){throw 'CPU preflight exceeds the verification headroom budget.'}
$job=[GrasscnBudget]::Create($cpuBudget,$memoryBudget,$browserCpuBudget)
$limits=[GrasscnBudget+Cpu]::new()
if(-not [GrasscnBudget]::ReadCpu($job,15,[ref]$limits,8,[IntPtr]::Zero)){throw 'Unable to read back CPU cap'}
if($limits.Flags -ne 5 -or $limits.Rate -ne $cpuBudget*100){throw 'CPU cap readback mismatch'}


$samples=Join-Path $runDirectory 'resource-samples.jsonl'
$sampleWriter=[IO.StreamWriter]::new([IO.FileStream]::new($samples,[IO.FileMode]::Append,[IO.FileAccess]::Write,[IO.FileShare]::ReadWrite));$sampleWriter.AutoFlush=$true
$result=Join-Path $runDirectory 'resource-summary.json'
$node=(Get-Command bun).Source
$budgetGate=Join-Path $runDirectory ('budget-ready-'+[Guid]::NewGuid().ToString('N')+'.json')
$argsList=@('scripts/guarded-entry.mjs',('"'+$budgetGate+'"'),'scripts/verify-porting.mjs',$Suite,('"'+$runDirectory+'"'),$Workers.ToString())
$env:GOMAXPROCS='1'
$env:GOMEMLIMIT='768MiB'
$env:RAYON_NUM_THREADS='1'
$process=$null;$reason='completed' ;$peakCpu=0.;$peakRam=0.;$count=0
try {
 $process=Start-Process -FilePath $node -ArgumentList $argsList -WorkingDirectory $repo -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runDirectory 'stdout.log') -RedirectStandardError (Join-Path $runDirectory 'stderr.log')
 $processHandle=$process.Handle
 if(-not [GrasscnBudget]::AssignProcessToJobObject($job,$processHandle)){Stop-Process -Id $process.Id;throw 'Could not enforce job limits; stopped test launcher.'}
 [IO.File]::WriteAllText($budgetGate,([pscustomobject]@{pid=$process.Id;enforced=$true}|ConvertTo-Json -Compress),[Text.UTF8Encoding]::new($false))
 $process.PriorityClass='BelowNormal'
 [pscustomobject]@{RootPid=$process.Id;CpuHardCapPercent=$cpuBudget;MemoryCapGiB=[Math]::Round($memoryBudget/1GB,3);SystemCpuStopThresholdPercent=$CpuStopPercent;SystemRamStopThresholdPercent=88;SampleIntervalMilliseconds=500;Workers=$Workers;LogicalProcessorLimit=$logicalProcessorLimit;BaselineRamPercent=$baseline.Load;CpuReadback=$limits.Rate} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runDirectory 'resource-policy.json')
 $before=[GrasscnBudget]::Times()
 while(-not $process.HasExited){
  Start-Sleep -Milliseconds 500
  $phaseFile=Join-Path $runDirectory 'verification-phase.json'
  if($cpuBudget -ne $browserCpuBudget -and (Test-Path -LiteralPath $phaseFile)){
   try{$verificationPhase=Get-Content -LiteralPath $phaseFile -Raw|ConvertFrom-Json}catch{$verificationPhase=$null}
   if($verificationPhase.phase -eq 'browser'){
    $browserLimits=[GrasscnBudget+Cpu]::new();$browserLimits.Flags=5;$browserLimits.Rate=$browserCpuBudget*100
    if(-not [GrasscnBudget]::SetCpu($job,15,[ref]$browserLimits,8)){throw 'Cannot enforce browser CPU phase cap'}
    if(-not [GrasscnBudget]::ReadCpu($job,15,[ref]$limits,8,[IntPtr]::Zero) -or $limits.Rate -ne $browserLimits.Rate -or $limits.Flags -ne 5){throw 'Browser CPU phase readback mismatch'}
    $cpuBudget=$browserCpuBudget
    [pscustomobject]@{Phase='browser';CpuHardCapPercent=$cpuBudget;CpuReadback=$limits.Rate;At=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $runDirectory 'browser-resource-policy.json')
   }
  }
  $after=[GrasscnBudget]::Times();$total=($after[1]-$before[1])+($after[2]-$before[2]);$idle=$after[0]-$before[0]
  $cpu=if($total -gt 0){100.*($total-$idle)/$total}else{0.};$before=$after
  $ram=[GrasscnBudget]::Ram();$ramPercent=100.*($ram.Total-$ram.Available)/$ram.Total
  $peakCpu=[Math]::Max($peakCpu,$cpu);$peakRam=[Math]::Max($peakRam,$ramPercent);$count++
  $sampleWriter.WriteLine(([pscustomobject]@{At=[DateTime]::UtcNow.ToString('o');SystemCpuPercent=[Math]::Round($cpu,2);SystemRamPercent=[Math]::Round($ramPercent,2)} | ConvertTo-Json -Compress))
  if($Suite -eq 'full' -and (Test-GrasscnForeground)){$reason='foreground-priority';[GrasscnBudget]::TerminateJobObject($job,79)|Out-Null;break}
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
