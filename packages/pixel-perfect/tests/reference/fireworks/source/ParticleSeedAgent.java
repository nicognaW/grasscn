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
 * Fixed-seed particle randomness for projected references (ADR 0005).
 *
 * <p>Vanilla gives every particle its own {@code RandomSource.create()}, seeded from
 * {@code RandomSupport.generateUniqueSeed()} (a process-wide uniquifier XOR {@code System.nanoTime()}),
 * so no two launches agree. This agent rewrites exactly that one call in
 * {@code net.minecraft.client.particle.Particle.<init>} to
 * {@code ProjectedReferenceMain.particleRandom()}, which returns the vanilla
 * {@code RandomSource.create()} unless a capture has armed a fixed seed. Nothing else in the game
 * changes: the random source class, its algorithm and every draw stay vanilla.
 */
public final class ParticleSeedAgent {
    private static final String TARGET = "net/minecraft/client/particle/Particle";
    private static final String RANDOM_SOURCE = "net/minecraft/util/RandomSource";
    private static final String CREATE_TYPE = "()Lnet/minecraft/util/RandomSource;";

    private ParticleSeedAgent() {}

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
        ClassDesc hook = ClassDesc.of("ProjectedReferenceMain");
        MethodTypeDesc type = MethodTypeDesc.ofDescriptor(CREATE_TYPE);
        byte[] result = files.transformClass(model, ClassTransform.transformingMethodBodies(
            method -> method.methodName().equalsString("<init>"),
            (code, element) -> {
                if (element instanceof InvokeInstruction call
                    && call.opcode() == Opcode.INVOKESTATIC
                    && call.owner().asInternalName().equals(RANDOM_SOURCE)
                    && call.name().equalsString("create")
                    && call.type().equalsString(CREATE_TYPE)) {
                    rewritten[0]++;
                    code.invokestatic(hook, "particleRandom", type);
                } else {
                    code.with(element);
                }
            }));
        if (rewritten[0] != 1) throw new IllegalStateException("Expected one RandomSource.create() in Particle.<init>, found " + rewritten[0]);
        System.setProperty("grasscn.particle.seed.hook", "1");
        return result;
    }
}
