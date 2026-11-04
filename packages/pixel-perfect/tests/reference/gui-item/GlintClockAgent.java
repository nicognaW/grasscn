import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

/**
 * Fixed glint times for captured references of GUI items with an enchantment glint.
 *
 * <p>Vanilla scrolls the glint texture by {@code Util.getMillis()} inside
 * {@code TextureTransform.setupGlintTexturing}, so no two frames or launches agree. This agent
 * rewrites exactly that one call to {@code NetherStarReferenceMain.glintMillis()}, which returns
 * the vanilla {@code Util.getMillis()} unless a capture has armed a fixed glint time. Nothing else
 * changes: the game clock, the texture matrix arithmetic and the glint rendering stay vanilla.
 */
public final class GlintClockAgent {
    private static final String TARGET = "net/minecraft/client/renderer/rendertype/TextureTransform";
    private static final String UTIL = "net/minecraft/util/Util";
    private static final String MILLIS_TYPE = "()J";

    private GlintClockAgent() {}

    public static void premain(String arguments, Instrumentation instrumentation) {
        instrumentation.addTransformer(new ClassFileTransformer() {
            @Override
            public byte[] transform(ClassLoader loader, String name, Class<?> redefined, ProtectionDomain domain, byte[] bytes) {
                if (!TARGET.equals(name)) return null;
                try {
                    return rewrite(loader, bytes);
                } catch (Throwable error) {
                    error.printStackTrace();
                    Runtime.getRuntime().halt(3);
                    return null;
                }
            }
        });
    }

    private static byte[] rewrite(ClassLoader loader, byte[] bytes) {
        ClassFile files = ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(
            ClassHierarchyResolver.ofResourceParsing(loader).orElse(ClassHierarchyResolver.defaultResolver())));
        ClassModel model = files.parse(bytes);
        int[] rewritten = {0};
        ClassDesc hook = ClassDesc.of("NetherStarReferenceMain");
        MethodTypeDesc type = MethodTypeDesc.ofDescriptor(MILLIS_TYPE);
        byte[] result = files.transformClass(model, ClassTransform.transformingMethodBodies(
            method -> method.methodName().equalsString("setupGlintTexturing"),
            (code, element) -> {
                if (element instanceof InvokeInstruction call
                    && call.opcode() == Opcode.INVOKESTATIC
                    && call.owner().asInternalName().equals(UTIL)
                    && call.name().equalsString("getMillis")
                    && call.type().equalsString(MILLIS_TYPE)) {
                    rewritten[0]++;
                    code.invokestatic(hook, "glintMillis", type);
                } else {
                    code.with(element);
                }
            }));
        if (rewritten[0] != 1) throw new IllegalStateException("Expected one Util.getMillis() in setupGlintTexturing, found " + rewritten[0]);
        System.setProperty("grasscn.glint.clock.hook", "1");
        return result;
    }
}
