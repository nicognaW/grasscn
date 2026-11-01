import java.util.*;
import com.mojang.blaze3d.vertex.*;
import net.minecraft.client.model.player.PlayerModel;
import net.minecraft.client.model.geom.builders.*;
public class PlayerMesh {
 static class Capture implements VertexConsumer {
  List<float[]> vertices=new ArrayList<>();float[] vertex;
  public VertexConsumer addVertex(float x,float y,float z){vertex=new float[]{x,y,z,0,0,0,0,0};return this;}
  public VertexConsumer setUv(float u,float v){vertex[3]=u;vertex[4]=v;return this;}
  public VertexConsumer setNormal(float x,float y,float z){vertex[5]=x;vertex[6]=y;vertex[7]=z;vertices.add(vertex);return this;}
  public VertexConsumer setColor(int r,int g,int b,int a){return this;}public VertexConsumer setColor(int c){return this;}public VertexConsumer setUv1(int u,int v){return this;}public VertexConsumer setUv2(int u,int v){return this;}public VertexConsumer setLineWidth(float w){return this;}
 }
 static void collect(net.minecraft.client.model.geom.ModelPart part,float ox,float oy,float oz,List<float[]> vertices)throws Exception{if(part.xRot!=0||part.yRot!=0||part.zRot!=0)throw new IllegalStateException("Unexpected model rotation");ox+=part.x/16f;oy+=part.y/16f;oz+=part.z/16f;var compile=part.getClass().getDeclaredMethod("compile",PoseStack.Pose.class,VertexConsumer.class,int.class,int.class,int.class);compile.setAccessible(true);var capture=new Capture();compile.invoke(part,new PoseStack().last(),capture,15728880,0,-1);for(var vertex:capture.vertices){var v=java.util.Arrays.copyOf(vertex,11);v[8]=ox;v[9]=oy;v[10]=oz;vertices.add(v);}var children=part.getClass().getDeclaredField("children");children.setAccessible(true);for(var child:((java.util.Map<String,net.minecraft.client.model.geom.ModelPart>)children.get(part)).values())collect(child,ox,oy,oz,vertices);}
 public static void main(String[] args)throws Exception{var result=new LinkedHashMap<String,Object>();for(boolean slim:new boolean[]{false,true}){var root=LayerDefinition.create(PlayerModel.createMesh(CubeDeformation.NONE,slim),64,64).bakeRoot();var vertices=new ArrayList<float[]>();collect(root,0,0,0,vertices);result.put(slim?"slim":"wide",vertices);}System.out.print(new com.google.gson.Gson().toJson(result));}
}
