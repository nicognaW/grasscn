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
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import net.minecraft.client.Camera;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.renderer.Projection;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
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
 * <p>For every capture the harness saves two full native frames: the scene, and the backdrop
 * after the declared blocks are removed again. The launcher derives the geometry mask from the
 * difference of these two native frames.
 */
public final class ProjectedReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("grasscn.projected.output"));
    private static final Path SCENE = Path.of(System.getProperty("grasscn.projected.scene"));
    private static final long STEP_TIMEOUT_SECONDS = 240;
    private static final int UPDATE_CLIENTS_WITHOUT_NEIGHBOUR_UPDATES = 2 | 16;

    private ProjectedReferenceMain() {}

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

    /** Front-on orthographic projection centred on the camera: pixelsPerBlock window pixels per block. */
    static final class DeclaredOrthographicProjection extends Projection {
        private final float pixelsPerBlock, zNear, zFar;

        DeclaredOrthographicProjection(float pixelsPerBlock, float zNear, float zFar) {
            this.pixelsPerBlock = pixelsPerBlock;
            this.zNear = zNear;
            this.zFar = zFar;
        }

        @Override public Matrix4f getMatrix(Matrix4f destination) {
            Minecraft client = Minecraft.getInstance();
            float halfWidth = client.getWindow().getWidth() / (2.0F * pixelsPerBlock);
            float halfHeight = client.getWindow().getHeight() / (2.0F * pixelsPerBlock);
            boolean zeroToOne = RenderSystem.getDevice().getDeviceInfo().isZZeroToOne();
            return destination.setOrtho(-halfWidth, halfWidth, -halfHeight, halfHeight, zNear, zFar, zeroToOne);
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
        DeclaredOrthographicProjection declared = new DeclaredOrthographicProjection(projection.get("pixelsPerBlock").getAsFloat(), projection.get("zNear").getAsFloat(), projection.get("zFar").getAsFloat());
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
            return values;
        });
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("runtime", runtime);
        result.put("captures", captures);
        Files.writeString(OUTPUT.resolve("native-run.json"), new com.google.gson.GsonBuilder().setPrettyPrinting().create().toJson(result) + "\n", StandardCharsets.UTF_8);
        System.out.println("GRASSCN_PROJECTED_REFERENCE_COMPLETE");
        client.execute(client::stop);
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
            if (identical >= 12 && System.nanoTime() - stableSince >= TimeUnit.SECONDS.toNanos(3)) return pixels;
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
