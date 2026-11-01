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
 [DllImport("kernel32.dll",EntryPoint="SetInformationJobObject",SetLastError=true)] static extern bool SetCpu(IntPtr job,int info,ref Cpu value,uint size);
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
 public static IntPtr Create(uint cpuPercent,ulong memoryBytes){
  var job=CreateJobObject(IntPtr.Zero,null);if(job==IntPtr.Zero)throw new Exception("CreateJobObject "+Marshal.GetLastWin32Error());
  var cpu=new Cpu{Flags=5,Rate=cpuPercent*100};
  if(!SetCpu(job,15,ref cpu,(uint)Marshal.SizeOf(cpu)))throw new Exception("CPU cap "+Marshal.GetLastWin32Error());
  var limits=new Extended();limits.Basic.Flags=0x10|0x200|0x2000;limits.Basic.Affinity=(UIntPtr)((1UL << Math.Min(16,Math.Max(1,(int)Math.Ceiling(Environment.ProcessorCount*cpuPercent/100.0))))-1);limits.JobMemory=(UIntPtr)memoryBytes;
  if(!SetExtended(job,9,ref limits,(uint)Marshal.SizeOf(limits)))throw new Exception("Memory cap "+Marshal.GetLastWin32Error());
  return job;
 }
}
'@
