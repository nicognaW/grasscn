import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.platform.NativeImage;
import com.mojang.blaze3d.systems.RenderSystem;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Locale;
import java.util.Queue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;
import it.unimi.dsi.fastutil.floats.FloatUnaryOperator;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;
import net.minecraft.client.Camera;
import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.renderer.Projection;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.RandomSource;
import net.minecraft.world.item.DyeColor;
import net.minecraft.world.item.component.FireworkExplosion;
import net.minecraft.world.Difficulty;
import net.minecraft.world.level.GameType;
import net.minecraft.world.level.LevelSettings;
import net.minecraft.world.level.WorldDataConfiguration;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.gamerules.GameRules;
import net.minecraft.world.level.levelgen.WorldOptions;
import net.minecraft.world.level.levelgen.presets.WorldPresets;
import org.joml.Matrix4f;

/**
 * Projected reference harness (ADR 0005).
 *
 * <p>Creates an isolated world through the vanilla world-creation flow, places the declared
 * blocks, and renders it with the unmodified 26.2 renderer. The only replacement is the main
 * camera's projection matrix, which becomes the declared front-on orthographic projection.
 * Textures, mipmaps, shaders, lighting, chunk meshing, culling and sky stay vanilla.
 *
 * <p>For every block capture the harness saves two full native frames: the scene, and the backdrop
 * after the declared blocks are removed again. The launcher derives the geometry mask from the
 * difference of these two native frames.
 *
 * <p>A firework capture (kind {@code "firework"}) starts one explosion through the vanilla
 * {@code ClientLevel.createFireworks} and saves a backdrop frame before it, then one frame per
 * client tick, each rendered at partialTick 0. The client's game timer is replaced by
 * {@link SteppedTimer}, which runs only the ticks the harness asks for and reports partialTick 0;
 * every tick still runs through the vanilla {@code Minecraft.tick}. Particle randomness is seeded
 * through {@link #particleRandom()}, which {@code ParticleSeedAgent} wires into
 * {@code Particle.<init>}.
 */
public final class ProjectedReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("grasscn.projected.output"));
    private static final Path SCENE = Path.of(System.getProperty("grasscn.projected.scene"));
    private static final long STEP_TIMEOUT_SECONDS = 240;
    private static final int UPDATE_CLIENTS_WITHOUT_NEIGHBOUR_UPDATES = 2 | 16;

    private ProjectedReferenceMain() {}

    private static volatile RandomSource particleSeeds;
    private static volatile Thread particleSeedThread;
    private static final AtomicInteger seededParticles = new AtomicInteger();
    private static final AtomicInteger foreignParticles = new AtomicInteger();

    /**
     * Called by {@code Particle.<init>} in place of {@code RandomSource.create()} (see
     * {@code ParticleSeedAgent}). Unarmed it is exactly the vanilla call. Armed, the n-th particle
     * created gets {@code RandomSource.create(seeds.nextLong())}, where {@code seeds} is
     * {@code RandomSource.create(seed)}: a vanilla LegacyRandomSource, one per declared seed.
     */
    public static RandomSource particleRandom() {
        RandomSource seeds = particleSeeds;
        if (seeds == null) return RandomSource.create();
        if (Thread.currentThread() != particleSeedThread) {
            foreignParticles.incrementAndGet();
            return RandomSource.create();
        }
        seededParticles.incrementAndGet();
        return RandomSource.create(seeds.nextLong());
    }

    /** Vanilla game timer that only runs ticks the harness requests, at partialTick 0. */
    static final class SteppedTimer extends DeltaTracker.Timer {
        private final AtomicInteger pending = new AtomicInteger();
        private final AtomicLong ticksRun = new AtomicLong();

        SteppedTimer(float ticksPerSecond, long now, FloatUnaryOperator targetMsptProvider) {
            super(ticksPerSecond, now, targetMsptProvider);
        }

        @Override public int advanceGameTime(long now) {
            super.advanceGameTime(now);
            int ticks = pending.getAndSet(0);
            ticksRun.addAndGet(ticks);
            return ticks;
        }

        @Override public float getGameTimeDeltaPartialTick(boolean ignoreFrozenGame) {
            return 0.0F;
        }

        void request(int ticks) { pending.addAndGet(ticks); }

        long ticksRun() { return ticksRun.get(); }
    }

    public static void main(String[] args) {
        Thread driver = new Thread(() -> {
            try {
                drive(JsonParser.parseString(Files.readString(SCENE, StandardCharsets.UTF_8)).getAsJsonObject());
            } catch (Throwable error) {
                error.printStackTrace();
                System.exit(2);
            }
        }, "grasscn-projected-reference");
        driver.setDaemon(true);
        driver.start();
        net.minecraft.client.main.Main.main(args);
    }

    /**
     * Front-on orthographic projection: pixelsPerBlock window pixels per block. Without an
     * {@code eyeAt} it is centred on the camera eye; with one, the eye projects to that window pixel
     * position (x from the left, y from the top), so the window frames the scene off-centre while
     * the camera, and with it the vanilla culling frustum, stays where the case puts it.
     */
    static final class DeclaredOrthographicProjection extends Projection {
        private final float pixelsPerBlock, zNear, zFar;
        private final float[] eyeAt;

        DeclaredOrthographicProjection(float pixelsPerBlock, float zNear, float zFar, float[] eyeAt) {
            this.pixelsPerBlock = pixelsPerBlock;
            this.zNear = zNear;
            this.zFar = zFar;
            this.eyeAt = eyeAt;
        }

        @Override public Matrix4f getMatrix(Matrix4f destination) {
            Minecraft client = Minecraft.getInstance();
            boolean zeroToOne = RenderSystem.getDevice().getDeviceInfo().isZZeroToOne();
            if (eyeAt == null) {
                float halfWidth = client.getWindow().getWidth() / (2.0F * pixelsPerBlock);
                float halfHeight = client.getWindow().getHeight() / (2.0F * pixelsPerBlock);
                return destination.setOrtho(-halfWidth, halfWidth, -halfHeight, halfHeight, zNear, zFar, zeroToOne);
            }
            float width = client.getWindow().getWidth(), height = client.getWindow().getHeight();
            return destination.setOrtho(-eyeAt[0] / pixelsPerBlock, (width - eyeAt[0]) / pixelsPerBlock,
                -(height - eyeAt[1]) / pixelsPerBlock, eyeAt[1] / pixelsPerBlock, zNear, zFar, zeroToOne);
        }

        @Override public long getMatrixVersion() {
            return 1L;
        }
    }

    private static void drive(JsonObject scene) throws Exception {
        Minecraft client = waitFor("title screen", () -> {
            Minecraft instance = Minecraft.getInstance();
            return instance != null && instance.isGameLoadFinished() && instance.gui.overlay() == null ? instance : null;
        });
        JsonObject world = scene.getAsJsonObject("world");
        JsonObject camera = scene.getAsJsonObject("camera");
        JsonObject projection = scene.getAsJsonObject("projection");
        if (!"orthographic".equals(projection.get("type").getAsString())) throw new IllegalStateException("Only the declared orthographic projection is supported");
        if (!"minecraft:flat".equals(world.get("preset").getAsString())) throw new IllegalStateException("Only the flat world preset is supported");
        String levelName = world.get("levelName").getAsString();

        onClient(client, () -> {
            LevelSettings settings = new LevelSettings(levelName, GameType.SPECTATOR, new LevelSettings.DifficultySettings(Difficulty.PEACEFUL, false, true), true, WorldDataConfiguration.DEFAULT);
            client.createWorldOpenFlows().createFreshLevel(levelName, settings, new WorldOptions(world.get("seed").getAsLong(), false, false),
                provider -> provider.lookupOrThrow(Registries.WORLD_PRESET).getOrThrow(WorldPresets.FLAT).value().createWorldDimensions(), client.gui.screen());
            return null;
        });
        MinecraftServer server = waitFor("world join", () -> client.level != null && client.player != null && client.gui.screen() == null && client.getSingleplayerServer() != null ? client.getSingleplayerServer() : null);

        JsonArray eye = camera.getAsJsonArray("eye");
        double eyeX = eye.get(0).getAsDouble(), eyeY = eye.get(1).getAsDouble(), eyeZ = eye.get(2).getAsDouble();
        float yRot = camera.get("yRot").getAsFloat(), xRot = camera.get("xRot").getAsFloat();
        onServer(server, () -> {
            GameRules rules = server.getGameRules();
            rules.set(GameRules.ADVANCE_TIME, false, server);
            rules.set(GameRules.ADVANCE_WEATHER, false, server);
            rules.set(GameRules.SPAWN_MOBS, false, server);
            rules.set(GameRules.SPAWN_MONSTERS, false, server);
            rules.set(GameRules.RANDOM_TICK_SPEED, 0, server);
            for (JsonElement command : world.getAsJsonArray("commands")) {
                server.getCommands().performPrefixedCommand(server.createCommandSourceStack(), command.getAsString());
            }
            ServerPlayer player = server.getPlayerList().getPlayers().getFirst();
            player.setGameMode(GameType.SPECTATOR);
            ServerLevel level = server.overworld();
            double feetY = eyeY - player.getEyeHeight();
            player.teleportTo(level, eyeX, feetY, eyeZ, Set.of(), yRot, xRot, true);
            return null;
        });

        long noon = world.get("clockTime").getAsLong();
        Camera mainCamera = client.gameRenderer.mainCamera();
        float[] eyeAt = projection.has("eyeAt") ? new float[] {projection.getAsJsonArray("eyeAt").get(0).getAsFloat(), projection.getAsJsonArray("eyeAt").get(1).getAsFloat()} : null;
        DeclaredOrthographicProjection declared = new DeclaredOrthographicProjection(projection.get("pixelsPerBlock").getAsFloat(), projection.get("zNear").getAsFloat(), projection.get("zFar").getAsFloat(), eyeAt);
        onClient(client, () -> {
            Field field = Camera.class.getDeclaredField("projection");
            field.setAccessible(true);
            field.set(mainCamera, declared);
            if (!client.gui.hud.isHidden()) client.gui.hud.toggle();
            return null;
        });
        waitFor("declared world state", () -> {
            try {
                return onClient(client, () -> client.level.getOverworldClockTime() % 24000L == noon
                    && !client.level.isRaining() && client.level.getRainLevel(1.0F) == 0.0F && client.level.getThunderLevel(1.0F) == 0.0F
                    && client.player.isSpectator()
                    && Math.abs(mainCamera.position().x - eyeX) < 1e-6 && Math.abs(mainCamera.position().y - eyeY) < 1e-6 && Math.abs(mainCamera.position().z - eyeZ) < 1e-6
                    && mainCamera.yRot() == yRot && mainCamera.xRot() == xRot
                    && client.gui.hud.isHidden() ? Boolean.TRUE : null);
            } catch (Exception error) { throw new IllegalStateException(error); }
        });

        Files.createDirectories(OUTPUT.resolve("frames"));
        List<Map<String, Object>> captures = new ArrayList<>();
        for (JsonElement entry : scene.getAsJsonArray("captures")) {
            JsonObject capture = entry.getAsJsonObject();
            String name = capture.get("name").getAsString();
            if (capture.has("kind") && "firework".equals(capture.get("kind").getAsString())) {
                captures.add(captureFirework(client, capture, OUTPUT));
                continue;
            }
            if (capture.has("kind") && "firework-rocket".equals(capture.get("kind").getAsString())) {
                captures.add(captureFireworkRocket(client, server, capture, OUTPUT));
                continue;
            }
            Map<BlockPos, BlockState> blocks = new LinkedHashMap<>();
            for (JsonElement blockEntry : capture.getAsJsonArray("blocks")) {
                JsonObject block = blockEntry.getAsJsonObject();
                JsonArray at = block.getAsJsonArray("at");
                BlockState state = BlockStateParser.parseForBlock(server.overworld().registryAccess().lookupOrThrow(Registries.BLOCK), block.get("state").getAsString(), false).blockState();
                blocks.put(new BlockPos(at.get(0).getAsInt(), at.get(1).getAsInt(), at.get(2).getAsInt()), state);
            }
            placeAndSettle(client, server, blocks);
            int[] scenePixels = stableFrame(client, OUTPUT.resolve("frames").resolve(name + ".scene.png"));
            Map<BlockPos, BlockState> cleared = new LinkedHashMap<>();
            for (BlockPos position : blocks.keySet()) cleared.put(position, Blocks.AIR.defaultBlockState());
            placeAndSettle(client, server, cleared);
            int[] backdropPixels = stableFrame(client, OUTPUT.resolve("frames").resolve(name + ".backdrop.png"));
            if (Arrays.equals(scenePixels, backdropPixels)) throw new IllegalStateException("Declared geometry is not visible in " + name);
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("name", name);
            record.put("scene", "frames/" + name + ".scene.png");
            record.put("backdrop", "frames/" + name + ".backdrop.png");
            captures.add(record);
        }

        Map<String, Object> runtime = onClient(client, () -> {
            Map<String, Object> values = new LinkedHashMap<>();
            var info = RenderSystem.getDevice().getDeviceInfo();
            values.put("device", info.name());
            values.put("vendor", info.vendorName());
            values.put("driver", info.driverInfo());
            values.put("backend", info.backendName());
            values.put("window", List.of(client.getWindow().getWidth(), client.getWindow().getHeight()));
            values.put("cameraPosition", List.of(mainCamera.position().x, mainCamera.position().y, mainCamera.position().z));
            values.put("cameraRotation", List.of(mainCamera.yRot(), mainCamera.xRot()));
            values.put("projectionMatrix", matrix(declared.getMatrix(new Matrix4f())));
            values.put("overworldClockTime", client.level.getOverworldClockTime());
            values.put("raining", client.level.isRaining());
            values.put("gameType", client.player.isSpectator() ? "spectator" : "other");
            values.put("hudHidden", client.gui.hud.isHidden());
            Map<String, Object> options = new LinkedHashMap<>();
            options.put("graphicsPreset", String.valueOf(client.options.graphicsPreset().get()));
            options.put("renderDistance", client.options.renderDistance().get());
            options.put("ambientOcclusion", client.options.ambientOcclusion().get());
            options.put("mipmapLevels", client.options.mipmapLevels().get());
            options.put("textureFiltering", String.valueOf(client.options.textureFiltering().get()));
            options.put("cloudStatus", String.valueOf(client.options.cloudStatus().get()));
            options.put("fov", client.options.fov().get());
            options.put("bobView", client.options.bobView().get());
            options.put("particles", String.valueOf(client.options.particles().get()));
            values.put("videoOptions", options);
            // Read-only: the fog the renderer sets up for this camera, as declared scene conditions.
            Field fogField = net.minecraft.client.renderer.GameRenderer.class.getDeclaredField("fogRenderer");
            fogField.setAccessible(true);
            var fog = ((net.minecraft.client.renderer.fog.FogRenderer) fogField.get(client.gameRenderer))
                .setupFog(mainCamera, client.options.getEffectiveRenderDistance(), client.getDeltaTracker(), 0.0F, client.level);
            Map<String, Object> fogValues = new LinkedHashMap<>();
            fogValues.put("color", List.of(fog.color.x, fog.color.y, fog.color.z, fog.color.w));
            fogValues.put("environmentalStart", fog.environmentalStart);
            fogValues.put("environmentalEnd", fog.environmentalEnd);
            fogValues.put("renderDistanceStart", fog.renderDistanceStart);
            fogValues.put("renderDistanceEnd", fog.renderDistanceEnd);
            fogValues.put("skyEnd", fog.skyEnd);
            fogValues.put("cloudEnd", fog.cloudEnd);
            values.put("fog", fogValues);
            values.put("particleAtlas", particleAtlas(client));
            return values;
        });
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runtime", runtime);
        result.put("captures", captures);
        Files.writeString(OUTPUT.resolve("native-run.json"), new com.google.gson.GsonBuilder().setPrettyPrinting().create().toJson(result) + "\n", StandardCharsets.UTF_8);
        System.out.println("GRASSCN_PROJECTED_REFERENCE_COMPLETE");
        client.execute(client::stop);
    }

    /**
     * One firework explosion through the vanilla client path, captured at every client tick at
     * partialTick 0. Frame {@code tick-N} shows the scene after N client ticks since
     * {@code ClientLevel.createFireworks}.
     */
    private static Map<String, Object> captureFirework(Minecraft client, JsonObject capture, Path output) throws Exception {
        String name = capture.get("name").getAsString();
        long seed = capture.get("seed").getAsLong();
        int maxTicks = capture.get("maxTicks").getAsInt();
        JsonArray at = capture.getAsJsonArray("at");
        double x = at.get(0).getAsDouble(), y = at.get(1).getAsDouble(), z = at.get(2).getAsDouble();
        JsonObject declared = capture.getAsJsonObject("explosion");
        if (!"1".equals(System.getProperty("grasscn.particle.seed.hook"))) throw new IllegalStateException("ParticleSeedAgent is not active");

        FireworkExplosion explosion = new FireworkExplosion(
            FireworkExplosion.Shape.valueOf(declared.get("shape").getAsString().toUpperCase(Locale.ROOT)),
            dyeColors(declared.getAsJsonArray("colors")), dyeColors(declared.getAsJsonArray("fadeColors")),
            declared.get("trail").getAsBoolean(), declared.get("twinkle").getAsBoolean());

        SteppedTimer timer = installSteppedTimer(client);
        // A few stepped ticks settle the camera and any client state at partialTick 0.
        stepTick(timer, 20);
        waitFor("empty particle engine", () -> {
            try { return onClient(client, () -> particleCount(client) == 0 ? Boolean.TRUE : null); }
            catch (Exception error) { throw new IllegalStateException(error); }
        });

        Path frames = output.resolve("frames");
        Path states = output.resolve("states");
        Files.createDirectories(states);
        int[] backdropPixels = stableFrame(client, frames.resolve(name + ".backdrop.png"));
        Map<String, Object> camera = onClient(client, () -> cameraState(client));

        onClient(client, () -> {
            particleSeedThread = Thread.currentThread();
            seededParticles.set(0);
            foreignParticles.set(0);
            particleSeeds = RandomSource.create(seed);
            client.level.createFireworks(x, y, z, 0.0, 0.0, 0.0, List.of(explosion));
            return null;
        });

        List<Map<String, Object>> ticks = new ArrayList<>();
        int lastTick = -1;
        for (int tick = 1; tick <= maxTicks; tick++) {
            stepTick(timer, 1);
            String frame = String.format(Locale.ROOT, "frames/%s.tick-%03d.png", name, tick);
            int[] pixels = stableFrame(client, output.resolve(frame), 6, 1);
            Map<String, Object> state = onClient(client, () -> {
                Map<String, Object> values = particleState(client);
                values.put("camera", cameraState(client));
                return values;
            });
            Files.writeString(states.resolve(String.format(Locale.ROOT, "%s.tick-%03d.json", name, tick)), new com.google.gson.GsonBuilder().setPrettyPrinting().serializeSpecialFloatingPointValues().create().toJson(state) + "\n", StandardCharsets.UTF_8);
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("tick", tick);
            record.put("frame", frame);
            record.put("particles", state.get("count"));
            record.put("equalsBackdrop", Arrays.equals(pixels, backdropPixels));
            ticks.add(record);
            if (((Number) state.get("count")).intValue() == 0) {
                lastTick = tick;
                break;
            }
        }
        particleSeeds = null;
        if (lastTick < 0) throw new IllegalStateException("Explosion still had particles after " + maxTicks + " ticks");
        if (foreignParticles.get() != 0) throw new IllegalStateException(foreignParticles.get() + " particles were created off the client thread while seeded");

        Map<String, Object> colors = new LinkedHashMap<>();
        colors.put("colors", new ArrayList<>(explosion.colors()));
        colors.put("fadeColors", new ArrayList<>(explosion.fadeColors()));

        Map<String, Object> record = new LinkedHashMap<>();
        record.put("name", name);
        record.put("kind", "firework");
        record.put("backdrop", "frames/" + name + ".backdrop.png");
        record.put("seed", Long.toString(seed));
        record.put("seededParticles", seededParticles.get());
        record.put("explosion", colors);
        record.put("cameraAtBackdrop", camera);
        record.put("lastTick", lastTick);
        record.put("ticks", ticks);
        record.put("randomSequences", randomSequences(seed));
        return record;
    }

    /** Replaces the client's game timer with a {@link SteppedTimer} at the vanilla tick rate. */
    private static SteppedTimer installSteppedTimer(Minecraft client) throws Exception {
        return onClient(client, () -> {
            Field field = Minecraft.class.getDeclaredField("deltaTracker");
            field.setAccessible(true);
            DeltaTracker.Timer vanilla = (DeltaTracker.Timer) field.get(client);
            if (vanilla instanceof SteppedTimer stepped) return stepped;
            Field msPerTick = DeltaTracker.Timer.class.getDeclaredField("msPerTick");
            Field provider = DeltaTracker.Timer.class.getDeclaredField("targetMsptProvider");
            msPerTick.setAccessible(true);
            provider.setAccessible(true);
            SteppedTimer stepped = new SteppedTimer(1000.0F / msPerTick.getFloat(vanilla), net.minecraft.util.Util.getMillis(), (FloatUnaryOperator) provider.get(vanilla));
            field.set(client, stepped);
            return stepped;
        });
    }

    private static volatile RandomSource serverEntitySeeds;
    private static volatile Thread serverEntityThread;
    private static volatile RandomSource clientEntitySeeds;
    private static volatile Thread clientEntityThread;
    private static final AtomicInteger seededServerEntities = new AtomicInteger();
    private static final AtomicInteger seededClientEntities = new AtomicInteger();
    private static final AtomicInteger foreignEntities = new AtomicInteger();

    /**
     * Called by {@code Entity.<init>} in place of {@code RandomSource.create()} (see
     * {@code ParticleSeedAgent}). Unarmed it is exactly the vanilla call. Armed, the n-th entity the
     * integrated server thread creates gets {@code RandomSource.create(serverSeeds.nextLong())}, and
     * the n-th entity the client thread creates gets {@code RandomSource.create(clientSeeds.nextLong())}.
     */
    public static RandomSource entityRandom() {
        Thread current = Thread.currentThread();
        RandomSource server = serverEntitySeeds, clientSeeds = clientEntitySeeds;
        if (server != null && current == serverEntityThread) {
            seededServerEntities.incrementAndGet();
            return RandomSource.create(server.nextLong());
        }
        if (clientSeeds != null && current == clientEntityThread) {
            seededClientEntities.incrementAndGet();
            return RandomSource.create(clientSeeds.nextLong());
        }
        if (server != null || clientSeeds != null) foreignEntities.incrementAndGet();
        return RandomSource.create();
    }

    private static final List<Map<String, Object>> sounds = java.util.Collections.synchronizedList(new ArrayList<>());
    private static volatile int soundTick = -1;

    /** Read-only observation of {@code SoundManager.play(SoundInstance)} (see {@code ParticleSeedAgent}). */
    public static void soundPlayed(Object instance) {
        recordSound(instance, 0, "play");
    }

    /** Read-only observation of {@code SoundManager.playDelayed(SoundInstance, int)}. */
    public static void soundDelayed(Object instance, int delay) {
        recordSound(instance, delay, "playDelayed");
    }

    private static void recordSound(Object instance, int delay, String call) {
        if (soundTick < 0) return;
        try {
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("tick", soundTick);
            values.put("call", call);
            values.put("delayTicks", delay);
            values.put("sound", ((net.minecraft.client.resources.sounds.SoundInstance) instance).getIdentifier().toString());
            values.put("source", String.valueOf(read(instance, "source")));
            values.put("volumeBits", Float.floatToRawIntBits((Float) read(instance, "volume")));
            values.put("pitchBits", Float.floatToRawIntBits((Float) read(instance, "pitch")));
            values.put("volume", read(instance, "volume"));
            values.put("pitch", read(instance, "pitch"));
            values.put("position", List.of(read(instance, "x"), read(instance, "y"), read(instance, "z")));
            values.put("thread", Thread.currentThread().getName());
            sounds.add(values);
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException(error);
        }
    }

    /**
     * Holds the integrated server between ticks. While parked, the server thread runs only the
     * actions the harness hands it; {@link #step} lets exactly one vanilla {@code MinecraftServer}
     * tick run, then parks again. The server loop's schedule is reset on release, so it neither
     * skips nor catches up ticks: every tick still runs through the vanilla loop and
     * {@code tickServer}.
     */
    static final class ServerGate {
        private static final Runnable RELEASE = () -> {};
        private final MinecraftServer server;
        private final Field nextTick, delayedTasksMax;
        private java.util.concurrent.BlockingQueue<Runnable> actions;

        ServerGate(MinecraftServer server) throws ReflectiveOperationException {
            this.server = server;
            nextTick = MinecraftServer.class.getDeclaredField("nextTickTimeNanos");
            delayedTasksMax = MinecraftServer.class.getDeclaredField("delayedTasksMaxNextTickTimeNanos");
            nextTick.setAccessible(true);
            delayedTasksMax.setAccessible(true);
        }

        private java.util.concurrent.BlockingQueue<Runnable> queueGate() {
            java.util.concurrent.BlockingQueue<Runnable> queue = new java.util.concurrent.LinkedBlockingQueue<>();
            CompletableFuture<Void> parked = new CompletableFuture<>();
            queue.add(() -> parked.complete(null));
            server.execute(() -> {
                try {
                    while (true) {
                        Runnable action = queue.take();
                        if (action == RELEASE) break;
                        action.run();
                    }
                    long now = net.minecraft.util.Util.getNanos();
                    nextTick.setLong(server, now);
                    delayedTasksMax.setLong(server, now);
                } catch (Throwable error) {
                    error.printStackTrace();
                    System.exit(4);
                }
            });
            return queue;
        }

        /** Parks the server at its next wait between ticks. */
        void park() throws Exception {
            actions = queueGate();
            call(() -> null);
        }

        /** Runs an action on the parked server thread. */
        <T> T call(Step<T> step) throws Exception {
            CompletableFuture<T> result = new CompletableFuture<>();
            actions.add(() -> { try { result.complete(step.run()); } catch (Throwable error) { result.completeExceptionally(error); } });
            return result.get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        }

        /** Lets exactly one server tick run and parks again before the next. */
        void step() throws Exception {
            java.util.concurrent.BlockingQueue<Runnable> current = actions;
            actions = queueGate();
            current.add(RELEASE);
            call(() -> null);
        }

        /** Releases the server for good. */
        void open() {
            actions.add(RELEASE);
            actions = null;
        }
    }

    /**
     * One firework rocket through the vanilla server and client paths, captured at every tick at
     * partialTick 0. The integrated server and the client advance in lockstep: one server tick
     * (held by {@link ServerGate}), then every packet it sent is handled by the client, then one
     * client tick. Frame {@code tick-N} shows the scene after N server and N client ticks since the
     * server spawned the rocket between two ticks, as a player's use of the item does.
     */
    private static Map<String, Object> captureFireworkRocket(Minecraft client, MinecraftServer server, JsonObject capture, Path output) throws Exception {
        String name = capture.get("name").getAsString();
        long particleSeed = capture.get("particleSeed").getAsLong();
        long serverSeed = capture.get("serverEntitySeed").getAsLong();
        long clientSeed = capture.get("clientEntitySeed").getAsLong();
        int maxTicks = capture.get("maxTicks").getAsInt();
        int flightDuration = capture.get("flightDuration").getAsInt();
        JsonArray at = capture.getAsJsonArray("at");
        double x = at.get(0).getAsDouble(), y = at.get(1).getAsDouble(), z = at.get(2).getAsDouble();
        JsonObject declared = capture.getAsJsonObject("explosion");
        for (String hook : List.of("grasscn.particle.seed.hook", "grasscn.entity.seed.hook", "grasscn.sound.hook")) {
            if (!"1".equals(System.getProperty(hook))) throw new IllegalStateException("ParticleSeedAgent hook missing: " + hook);
        }

        FireworkExplosion explosion = new FireworkExplosion(
            FireworkExplosion.Shape.valueOf(declared.get("shape").getAsString().toUpperCase(Locale.ROOT)),
            dyeColors(declared.getAsJsonArray("colors")), dyeColors(declared.getAsJsonArray("fadeColors")),
            declared.get("trail").getAsBoolean(), declared.get("twinkle").getAsBoolean());

        SteppedTimer timer = installSteppedTimer(client);
        ServerGate gate = new ServerGate(server);
        gate.park();
        AtomicInteger marker = new AtomicInteger();
        Runnable lockstep = () -> {
            try {
                gate.step();
                int sent = marker.incrementAndGet();
                // A vanilla packet after everything the tick sent: once the client shows it, the
                // client has handled every packet of that tick (one connection keeps their order).
                gate.call(() -> {
                    server.getPlayerList().getPlayers().getFirst().connection.send(new net.minecraft.network.protocol.game.ClientboundSetExperiencePacket(0.0F, sent, 0));
                    return null;
                });
                waitFor("client handled server tick", () -> {
                    try { return onClient(client, () -> client.player.totalExperience == sent ? Boolean.TRUE : null); }
                    catch (Exception error) { throw new IllegalStateException(error); }
                });
                stepTick(timer, 1);
            } catch (Exception error) { throw new IllegalStateException(error); }
        };
        // Lockstep ticks settle the camera and any client state at partialTick 0.
        for (int settle = 0; settle < 20; settle++) lockstep.run();
        waitFor("empty particle engine", () -> {
            try { return onClient(client, () -> particleCount(client) == 0 ? Boolean.TRUE : null); }
            catch (Exception error) { throw new IllegalStateException(error); }
        });

        Path frames = output.resolve("frames");
        Path states = output.resolve("states");
        Files.createDirectories(states);
        int[] backdropPixels = stableFrame(client, frames.resolve(name + ".backdrop.png"));
        Map<String, Object> camera = onClient(client, () -> cameraState(client));

        onClient(client, () -> {
            particleSeedThread = Thread.currentThread();
            seededParticles.set(0);
            foreignParticles.set(0);
            particleSeeds = RandomSource.create(particleSeed);
            clientEntityThread = Thread.currentThread();
            seededClientEntities.set(0);
            clientEntitySeeds = RandomSource.create(clientSeed);
            return null;
        });
        int rocketId = gate.call(() -> {
            serverEntityThread = Thread.currentThread();
            seededServerEntities.set(0);
            foreignEntities.set(0);
            serverEntitySeeds = RandomSource.create(serverSeed);
            net.minecraft.world.item.ItemStack stack = new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.FIREWORK_ROCKET);
            stack.set(net.minecraft.core.component.DataComponents.FIREWORKS, new net.minecraft.world.item.component.Fireworks(flightDuration, List.of(explosion)));
            var rocket = new net.minecraft.world.entity.projectile.FireworkRocketEntity(server.overworld(), x, y, z, stack);
            serverEntitySeeds = null;
            if (!server.overworld().addFreshEntity(rocket)) throw new IllegalStateException("Rocket was not added");
            return rocket.getId();
        });
        Map<String, Object> spawned = gate.call(() -> serverRocketState(server, rocketId));
        sounds.clear();

        List<Map<String, Object>> ticks = new ArrayList<>();
        int lastTick = -1;
        for (int tick = 1; tick <= maxTicks; tick++) {
            soundTick = tick;
            lockstep.run();
            String frame = String.format(Locale.ROOT, "frames/%s.tick-%03d.png", name, tick);
            int[] pixels = stableFrame(client, output.resolve(frame), 6, 1);
            Map<String, Object> serverState = gate.call(() -> serverRocketState(server, rocketId));
            Map<String, Object> state = onClient(client, () -> {
                Map<String, Object> values = particleState(client);
                values.put("camera", cameraState(client));
                values.put("rocket", clientRocketState(client, rocketId));
                return values;
            });
            state.put("serverRocket", serverState);
            Files.writeString(states.resolve(String.format(Locale.ROOT, "%s.tick-%03d.json", name, tick)), new com.google.gson.GsonBuilder().setPrettyPrinting().serializeSpecialFloatingPointValues().create().toJson(state) + "\n", StandardCharsets.UTF_8);
            Map<String, Object> record = new LinkedHashMap<>();
            record.put("tick", tick);
            record.put("frame", frame);
            record.put("particles", state.get("count"));
            record.put("rocketPresent", state.get("rocket") != null);
            record.put("equalsBackdrop", Arrays.equals(pixels, backdropPixels));
            ticks.add(record);
            if (((Number) state.get("count")).intValue() == 0 && state.get("rocket") == null && serverState == null) {
                lastTick = tick;
                break;
            }
        }
        soundTick = -1;
        particleSeeds = null;
        clientEntitySeeds = null;
        gate.open();
        if (lastTick < 0) throw new IllegalStateException("Rocket sequence still running after " + maxTicks + " ticks");
        if (foreignParticles.get() != 0) throw new IllegalStateException(foreignParticles.get() + " particles were created off the client thread while seeded");
        if (foreignEntities.get() != 0) throw new IllegalStateException(foreignEntities.get() + " entities were created off the seeded threads while seeded");
        if (seededServerEntities.get() != 1 || seededClientEntities.get() != 1) throw new IllegalStateException("Expected one seeded rocket per side, got server " + seededServerEntities.get() + ", client " + seededClientEntities.get());

        Map<String, Object> colors = new LinkedHashMap<>();
        colors.put("colors", new ArrayList<>(explosion.colors()));
        colors.put("fadeColors", new ArrayList<>(explosion.fadeColors()));

        Map<String, Object> record = new LinkedHashMap<>();
        record.put("name", name);
        record.put("kind", "firework-rocket");
        record.put("backdrop", "frames/" + name + ".backdrop.png");
        record.put("particleSeed", Long.toString(particleSeed));
        record.put("serverEntitySeed", Long.toString(serverSeed));
        record.put("clientEntitySeed", Long.toString(clientSeed));
        record.put("seededParticles", seededParticles.get());
        record.put("explosion", colors);
        record.put("spawnedRocket", spawned);
        record.put("cameraAtBackdrop", camera);
        record.put("lastTick", lastTick);
        record.put("sounds", new ArrayList<>(sounds));
        record.put("ticks", ticks);
        record.put("itemAtlas", itemAtlas(client));
        return record;
    }

    /** Read-only: the server rocket's simulated state, or null once it is gone. */
    private static Map<String, Object> serverRocketState(MinecraftServer server, int id) throws ReflectiveOperationException {
        var entity = server.overworld().getEntity(id);
        return entity == null ? null : rocketState(entity);
    }

    /** Read-only: the client rocket's simulated state, or null once it is gone. */
    private static Map<String, Object> clientRocketState(Minecraft client, int id) throws ReflectiveOperationException {
        var entity = client.level.getEntity(id);
        return entity == null ? null : rocketState(entity);
    }

    private static Map<String, Object> rocketState(net.minecraft.world.entity.Entity entity) throws ReflectiveOperationException {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("position", List.of(entity.getX(), entity.getY(), entity.getZ()));
        values.put("old", List.of(entity.xOld, entity.yOld, entity.zOld));
        var movement = entity.getDeltaMovement();
        values.put("movement", List.of(movement.x, movement.y, movement.z));
        values.put("life", read(entity, "life"));
        values.put("lifetime", read(entity, "lifetime"));
        values.put("rotation", List.of(entity.getYRot(), entity.getXRot()));
        values.put("removed", entity.isRemoved());
        values.put("horizontalCollision", entity.horizontalCollision);
        return values;
    }

    /** Read-only: the item atlas layout and sampler the rocket item is drawn with. */
    private static Map<String, Object> itemAtlas(Minecraft client) throws ReflectiveOperationException {
        Map<String, Object> values = new LinkedHashMap<>();
        for (var location : List.of(net.minecraft.client.renderer.texture.TextureAtlas.LOCATION_ITEMS, net.minecraft.client.renderer.texture.TextureAtlas.LOCATION_BLOCKS)) {
            var atlas = (net.minecraft.client.renderer.texture.TextureAtlas) client.getTextureManager().getTexture(location);
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("width", read(atlas, "width"));
            entry.put("height", read(atlas, "height"));
            entry.put("maxMipLevel", read(atlas, "maxMipLevel"));
            entry.put("textureMipLevels", atlas.getTexture().getMipLevels());
            var sampler = atlas.getSampler();
            entry.put("sampler", List.of(String.valueOf(sampler.getMinFilter()), String.valueOf(sampler.getMagFilter()), String.valueOf(sampler.getAddressModeU()), String.valueOf(sampler.getAddressModeV()), String.valueOf(sampler.getMaxLod())));
            var sprite = atlas.getSprite(net.minecraft.resources.Identifier.withDefaultNamespace("item/firework_rocket"));
            Map<String, Object> rocket = new LinkedHashMap<>();
            rocket.put("name", sprite.contents().name().toString());
            rocket.put("x", sprite.getX());
            rocket.put("y", sprite.getY());
            rocket.put("width", sprite.contents().width());
            rocket.put("height", sprite.contents().height());
            rocket.put("uvBits", List.of(Float.floatToRawIntBits(sprite.getU0()), Float.floatToRawIntBits(sprite.getU1()), Float.floatToRawIntBits(sprite.getV0()), Float.floatToRawIntBits(sprite.getV1())));
            rocket.put("transparency", String.valueOf(sprite.transparency()));
            entry.put("fireworkRocket", rocket);
            values.put(location.toString(), entry);
        }
        return values;
    }

    /** Read-only: the particle atlas layout and sampler the firework sprites are drawn with. */
    private static Map<String, Object> particleAtlas(Minecraft client) throws ReflectiveOperationException {
        var atlas = (net.minecraft.client.renderer.texture.TextureAtlas) client.getTextureManager().getTexture(net.minecraft.client.renderer.texture.TextureAtlas.LOCATION_PARTICLES);
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("width", read(atlas, "width"));
        values.put("height", read(atlas, "height"));
        values.put("maxMipLevel", read(atlas, "maxMipLevel"));
        values.put("mipLevelCount", read(atlas, "mipLevelCount"));
        values.put("textureMipLevels", atlas.getTexture().getMipLevels());
        var sampler = atlas.getSampler();
        values.put("sampler", List.of(String.valueOf(sampler.getMinFilter()), String.valueOf(sampler.getMagFilter()), String.valueOf(sampler.getAddressModeU()), String.valueOf(sampler.getAddressModeV()), String.valueOf(sampler.getMaxLod())));
        Map<String, Object> sprites = new LinkedHashMap<>();
        List<String> names = new ArrayList<>();
        for (int index = 0; index < 8; index++) names.add("spark_" + index);
        names.add("flash");
        for (String name : names) {
            var sprite = atlas.getSprite(net.minecraft.resources.Identifier.withDefaultNamespace(name));
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("x", sprite.getX());
            entry.put("y", sprite.getY());
            entry.put("width", sprite.contents().width());
            entry.put("height", sprite.contents().height());
            entry.put("uvBits", List.of(Float.floatToRawIntBits(sprite.getU0()), Float.floatToRawIntBits(sprite.getU1()), Float.floatToRawIntBits(sprite.getV0()), Float.floatToRawIntBits(sprite.getV1())));
            entry.put("transparency", String.valueOf(sprite.transparency()));
            sprites.put(name, entry);
        }
        values.put("sprites", sprites);
        return values;
    }

    private static void stepTick(SteppedTimer timer, int ticks) throws InterruptedException {
        long target = timer.ticksRun() + ticks;
        timer.request(ticks);
        waitFor("stepped ticks", () -> timer.ticksRun() >= target ? Boolean.TRUE : null);
    }

    private static IntList dyeColors(JsonArray names) {
        IntList colors = new IntArrayList();
        for (JsonElement name : names) colors.add(DyeColor.valueOf(name.getAsString().toUpperCase(Locale.ROOT)).getFireworkColor());
        return colors;
    }

    private static Map<String, Object> cameraState(Minecraft client) {
        Camera camera = client.gameRenderer.mainCamera();
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("position", List.of(camera.position().x, camera.position().y, camera.position().z));
        values.put("rotation", List.of(camera.yRot(), camera.xRot()));
        return values;
    }

    private static Object read(Object target, String name) throws ReflectiveOperationException {
        for (Class<?> type = target.getClass(); type != null; type = type.getSuperclass()) {
            try {
                Field field = type.getDeclaredField(name);
                field.setAccessible(true);
                return field.get(target);
            } catch (NoSuchFieldException ignored) {
                // Declared further up the hierarchy.
            }
        }
        throw new NoSuchFieldException(name);
    }

    private static List<Object> particles(Minecraft client) throws ReflectiveOperationException {
        List<Object> all = new ArrayList<>();
        Map<?, ?> groups = (Map<?, ?>) read(client.particleEngine, "particles");
        for (Object group : groups.values()) all.addAll((Queue<?>) read(group, "particles"));
        all.addAll((Queue<?>) read(client.particleEngine, "particlesToAdd"));
        return all;
    }

    private static int particleCount(Minecraft client) throws ReflectiveOperationException {
        return particles(client).size();
    }

    /** Development evidence: every live particle's simulated state after a tick (not retained). */
    private static Map<String, Object> particleState(Minecraft client) throws ReflectiveOperationException {
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object particle : particles(client)) {
            Map<String, Object> values = new LinkedHashMap<>();
            values.put("type", particle.getClass().getSimpleName());
            for (String field : List.of("x", "y", "z", "xo", "yo", "zo", "xd", "yd", "zd", "age", "lifetime", "removed")) values.put(field, read(particle, field));
            if (particle instanceof net.minecraft.client.particle.SingleQuadParticle) {
                for (String field : List.of("quadSize", "rCol", "gCol", "bCol", "alpha")) values.put(field, read(particle, field));
                Object sprite = read(particle, "sprite");
                values.put("sprite", ((net.minecraft.client.renderer.texture.TextureAtlasSprite) sprite).contents().name().toString());
            }
            list.add(values);
        }
        Map<String, Object> state = new LinkedHashMap<>();
        state.put("count", list.size());
        state.put("particles", list);
        return state;
    }

    /** Native outputs of a fresh vanilla RandomSource.create(seed) per sequence; floats and doubles as raw bits. */
    private static Map<String, Object> randomSequences(long seed) {
        Map<String, Object> sequences = new LinkedHashMap<>();
        RandomSource source = RandomSource.create(seed);
        sequences.put("implementation", source.getClass().getName());
        List<Object> values = new ArrayList<>();
        for (int i = 0; i < 32; i++) values.add(source.nextInt());
        sequences.put("nextInt", values);
        Map<String, Object> bounded = new LinkedHashMap<>();
        for (int bound : new int[] {1, 2, 3, 12, 100, 1 << 30, 2147483647}) {
            RandomSource fresh = RandomSource.create(seed);
            List<Object> drawn = new ArrayList<>();
            for (int i = 0; i < 32; i++) drawn.add(fresh.nextInt(bound));
            bounded.put(Integer.toString(bound), drawn);
        }
        sequences.put("nextIntBounded", bounded);
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 32; i++) values.add(Long.toString(source.nextLong()));
        sequences.put("nextLong", values);
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 32; i++) values.add(Float.floatToRawIntBits(source.nextFloat()));
        sequences.put("nextFloatBits", values);
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 32; i++) values.add(Long.toHexString(Double.doubleToRawLongBits(source.nextDouble())));
        sequences.put("nextDoubleBits", values);
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 64; i++) values.add(Long.toHexString(Double.doubleToRawLongBits(source.nextGaussian())));
        sequences.put("nextGaussianBits", values);
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 32; i++) values.add(source.nextBoolean());
        sequences.put("nextBoolean", values);
        // Interleaved draws, as a particle starter mixes them: double, double, gaussian, int(2), float.
        source = RandomSource.create(seed);
        values = new ArrayList<>();
        for (int i = 0; i < 64; i++) {
            switch (i % 5) {
                case 0, 1 -> values.add("d:" + Long.toHexString(Double.doubleToRawLongBits(source.nextDouble())));
                case 2 -> values.add("g:" + Long.toHexString(Double.doubleToRawLongBits(source.nextGaussian())));
                case 3 -> values.add("i:" + source.nextInt(2));
                default -> values.add("f:" + Float.floatToRawIntBits(source.nextFloat()));
            }
        }
        sequences.put("interleaved", values);
        return sequences;
    }

    private static List<Float> matrix(Matrix4f value) {
        float[] cells = value.get(new float[16]);
        List<Float> list = new ArrayList<>();
        for (float cell : cells) list.add(cell);
        return list;
    }

    private static void placeAndSettle(Minecraft client, MinecraftServer server, Map<BlockPos, BlockState> blocks) throws Exception {
        onServer(server, () -> {
            ServerLevel level = server.overworld();
            for (var block : blocks.entrySet()) level.setBlock(block.getKey(), block.getValue(), UPDATE_CLIENTS_WITHOUT_NEIGHBOUR_UPDATES);
            return null;
        });
        waitFor("client block states", () -> {
            try {
                return onClient(client, () -> {
                    for (var block : blocks.entrySet()) if (!client.level.getBlockState(block.getKey()).equals(block.getValue())) return null;
                    return client.levelRenderer.hasRenderedAllSections() ? Boolean.TRUE : null;
                });
            } catch (Exception error) { throw new IllegalStateException(error); }
        });
        // Server state must still match after the client caught up (no neighbour update relit or unlit a lamp).
        onServer(server, () -> {
            for (var block : blocks.entrySet()) if (!server.overworld().getBlockState(block.getKey()).equals(block.getValue())) throw new IllegalStateException("Declared block changed: " + block.getKey());
            return null;
        });
    }

    /** Waits for no screen or overlay, then for twelve identical frames spanning at least three seconds. */
    private static int[] stableFrame(Minecraft client, Path file) throws Exception {
        return stableFrame(client, file, 12, 3);
    }

    /** Waits for no screen or overlay, then for {@code frames} identical frames spanning at least {@code seconds}. */
    private static int[] stableFrame(Minecraft client, Path file, int frames, long seconds) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(STEP_TIMEOUT_SECONDS);
        int[] previous = null;
        int identical = 0;
        long stableSince = 0;
        while (System.nanoTime() < deadline) {
            boolean clear = onClient(client, () -> client.gui.screen() == null && client.gui.overlay() == null && client.levelRenderer.hasRenderedAllSections());
            if (!clear) { previous = null; identical = 0; Thread.sleep(250); continue; }
            CompletableFuture<int[]> grabbed = new CompletableFuture<>();
            CompletableFuture<Void> written = new CompletableFuture<>();
            client.execute(() -> Screenshot.takeScreenshot(client.gameRenderer.mainRenderTarget(), image -> {
                try (NativeImage frame = image) {
                    int[] pixels = frame.getPixelsABGR();
                    grabbed.complete(pixels);
                    frame.writeToFile(file);
                    written.complete(null);
                } catch (Throwable error) { grabbed.completeExceptionally(error); written.completeExceptionally(error); }
            }));
            int[] pixels = grabbed.get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            written.get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (previous != null && Arrays.equals(previous, pixels)) {
                identical++;
            } else {
                identical = 0;
                stableSince = System.nanoTime();
            }
            previous = pixels;
            if (identical >= frames && System.nanoTime() - stableSince >= TimeUnit.SECONDS.toNanos(seconds)) return pixels;
            Thread.sleep(250);
        }
        throw new IllegalStateException("Frame did not stabilise: " + file);
    }

    private interface Step<T> { T run() throws Exception; }

    private static <T> T onClient(Minecraft client, Step<T> step) throws Exception {
        CompletableFuture<T> result = new CompletableFuture<>();
        client.execute(() -> { try { result.complete(step.run()); } catch (Throwable error) { result.completeExceptionally(error); } });
        return result.get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    }

    private static <T> T onServer(MinecraftServer server, Step<T> step) throws Exception {
        CompletableFuture<T> result = new CompletableFuture<>();
        server.execute(() -> { try { result.complete(step.run()); } catch (Throwable error) { result.completeExceptionally(error); } });
        return result.get(STEP_TIMEOUT_SECONDS, TimeUnit.SECONDS);
    }

    private static <T> T waitFor(String what, Supplier<T> condition) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(STEP_TIMEOUT_SECONDS);
        while (System.nanoTime() < deadline) {
            T value = condition.get();
            if (value != null) return value;
            Thread.sleep(100);
        }
        throw new IllegalStateException("Timed out waiting for " + what);
    }
}
