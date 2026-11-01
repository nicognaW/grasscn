import org.joml.Matrix3x2f;
import org.joml.Options;
public class SplashMotionOracle {
 public static void main(String[] args) {
  int width=Integer.parseInt(args[0]);
  float[] sine=new float[65536];
  for(int i=0;i<sine.length;i++)sine[i]=(float)Math.sin(i/10430.378350470453d);
  System.out.println("# JOML FASTMATH="+Options.FASTMATH);
  for(long time=0;time<1000;time++){
   float phase=(float)(time%1000L)/1000.0f*6.2831855f;
   float pulse=1.8f-Math.abs(sine[(int)((long)(phase*10430.378350470453d)&65535L)]*0.1f);
   float scale=pulse*100.0f/(width+32);
   Matrix3x2f matrix=new Matrix3x2f().rotate(-0.34906584f).scale(scale);
   System.out.printf("%d,%d,%d,%d,%d,%d,%d%n",time,Float.floatToRawIntBits(pulse),Float.floatToRawIntBits(scale),Float.floatToRawIntBits(matrix.m00),Float.floatToRawIntBits(matrix.m01),Float.floatToRawIntBits(matrix.m10),Float.floatToRawIntBits(matrix.m11));
  }
 }
}
