import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeBuilder;
import java.lang.classfile.CodeElement;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.MethodTypeDesc;
import java.lang.instrument.ClassFileTransformer;
import java.lang.instrument.Instrumentation;
import java.security.ProtectionDomain;

/**
 * Fixed-seed randomness and sound observation for projected references (ADR 0005).
 *
 * <p>Vanilla gives every particle and every entity its own {@code RandomSource.create()}, seeded
 * from {@code RandomSupport.generateUniqueSeed()} (a process-wide uniquifier XOR
 * {@code System.nanoTime()}), so no two launches agree. This agent rewrites exactly that one call in
 * {@code net.minecraft.client.particle.Particle.<init>} to {@code ProjectedReferenceMain.particleRandom()}
 * and in {@code net.minecraft.world.entity.Entity.<init>} to {@code ProjectedReferenceMain.entityRandom()}.
 * Each returns the vanilla {@code RandomSource.create()} unless a capture has armed a fixed seed.
 * Nothing else in the game changes: the random source class, its algorithm and every draw stay vanilla.
 *
 * <p>It also inserts, at the start of {@code SoundManager.play(SoundInstance)} and
 * {@code SoundManager.playDelayed(SoundInstance, int)}, a read-only call that records the sound the
 * game asked for (the capture has no audio device, so the sound engine never reports it itself).
 * The original method bodies run unchanged after the call.
 */
public final class ParticleSeedAgent {
    private static final String PARTICLE = "net/minecraft/client/particle/Particle";
    private static final String ENTITY = "net/minecraft/world/entity/Entity";
    private static final String SOUND_MANAGER = "net/minecraft/client/sounds/SoundManager";
    private static final String RANDOM_SOURCE = "net/minecraft/util/RandomSource";
    private static final String CREATE_TYPE = "()Lnet/minecraft/util/RandomSource;";
    private static final String PLAY_TYPE = "(Lnet/minecraft/client/resources/sounds/SoundInstance;)Lnet/minecraft/client/sounds/SoundEngine$PlayResult;";
    private static final String PLAY_DELAYED_TYPE = "(Lnet/minecraft/client/resources/sounds/SoundInstance;I)V";
    private static final ClassDesc HOOK = ClassDesc.of("ProjectedReferenceMain");

    private ParticleSeedAgent() {}

    public static void premain(String arguments, Instrumentation instrumentation) {
        instrumentation.addTransformer(new ClassFileTransformer() {
            @Override
            public byte[] transform(ClassLoader loader, String name, Class<?> redefined, ProtectionDomain domain, byte[] bytes) {
                try {
                    if (PARTICLE.equals(name)) return seedRandom(loader, bytes, "particleRandom", "Particle", "grasscn.particle.seed.hook");
                    if (ENTITY.equals(name)) return seedRandom(loader, bytes, "entityRandom", "Entity", "grasscn.entity.seed.hook");
                    if (SOUND_MANAGER.equals(name)) return observeSounds(loader, bytes);
                    return null;
                } catch (Throwable error) {
                    error.printStackTrace();
                    Runtime.getRuntime().halt(3);
                    return null;
                }
            }
        });
    }

    private static ClassFile files(ClassLoader loader) {
        return ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(
            ClassHierarchyResolver.ofResourceParsing(loader).orElse(ClassHierarchyResolver.defaultResolver())));
    }

    /** Replaces the single {@code RandomSource.create()} in the constructors with the harness hook. */
    private static byte[] seedRandom(ClassLoader loader, byte[] bytes, String hook, String owner, String property) {
        ClassFile files = files(loader);
        ClassModel model = files.parse(bytes);
        int[] rewritten = {0};
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
                    code.invokestatic(HOOK, hook, type);
                } else {
                    code.with(element);
                }
            }));
        if (rewritten[0] != 1) throw new IllegalStateException("Expected one RandomSource.create() in " + owner + ".<init>, found " + rewritten[0]);
        System.setProperty(property, "1");
        return result;
    }

    /** Prepends a read-only harness call to SoundManager.play and SoundManager.playDelayed. */
    private static byte[] observeSounds(ClassLoader loader, byte[] bytes) {
        ClassFile files = files(loader);
        ClassModel model = files.parse(bytes);
        int[] observed = {0};
        byte[] result = files.transformClass(model, (classBuilder, element) -> {
            if (element instanceof java.lang.classfile.MethodModel method && method.methodName().equalsString("play") && method.methodType().equalsString(PLAY_TYPE)) {
                observed[0]++;
                classBuilder.transformMethod(method, java.lang.classfile.MethodTransform.transformingCode(prepend(builder -> {
                    builder.aload(1);
                    builder.invokestatic(HOOK, "soundPlayed", MethodTypeDesc.ofDescriptor("(Ljava/lang/Object;)V"));
                })));
            } else if (element instanceof java.lang.classfile.MethodModel method && method.methodName().equalsString("playDelayed") && method.methodType().equalsString(PLAY_DELAYED_TYPE)) {
                observed[0]++;
                classBuilder.transformMethod(method, java.lang.classfile.MethodTransform.transformingCode(prepend(builder -> {
                    builder.aload(1);
                    builder.iload(2);
                    builder.invokestatic(HOOK, "soundDelayed", MethodTypeDesc.ofDescriptor("(Ljava/lang/Object;I)V"));
                })));
            } else {
                classBuilder.with(element);
            }
        });
        if (observed[0] != 2) throw new IllegalStateException("Expected SoundManager.play and playDelayed, found " + observed[0]);
        System.setProperty("grasscn.sound.hook", "1");
        return result;
    }

    private static CodeTransform prepend(java.util.function.Consumer<CodeBuilder> start) {
        return new CodeTransform() {
            @Override public void atStart(CodeBuilder builder) { start.accept(builder); }
            @Override public void accept(CodeBuilder builder, CodeElement element) { builder.with(element); }
        };
    }
}
