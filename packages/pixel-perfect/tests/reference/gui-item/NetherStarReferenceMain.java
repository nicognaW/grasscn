import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mojang.blaze3d.systems.RenderSystem;
import java.awt.image.BufferedImage;
import java.lang.reflect.Field;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.client.renderer.item.ItemStackRenderState;
import net.minecraft.client.renderer.rendertype.TextureTransform;
import net.minecraft.client.renderer.texture.TextureAtlas;
import net.minecraft.client.resources.model.geometry.BakedQuad;
import net.minecraft.core.component.DataComponentMap;
import net.minecraft.core.component.DataComponents;
import net.minecraft.core.component.PatchedDataComponentMap;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.Identifier;
import net.minecraft.util.Util;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import org.joml.Matrix4f;
import org.joml.Vector3f;
import org.joml.Vector3fc;

/**
 * Captured references of the original nether star GUI item with its enchantment glint at fixed
 * glint times. An isolated test screen supplies the stack, position, GUI scale and background;
 * the item model, item atlas, lighting, glint pipeline and blit are the vanilla renderer's.
 *
 * <p>The only change is the glint clock: {@code GlintClockAgent} routes the single
 * {@code Util.getMillis()} call of {@code TextureTransform.setupGlintTexturing} to
 * {@link #glintMillis()}, which returns the case's fixed glint time while a capture is armed.
 */
public final class NetherStarReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("grasscn.item.output"));
    private static final Path CASE = Path.of(System.getProperty("grasscn.item.case"));
    private static final String COMPLETE = "GRASSCN_NETHER_STAR_REFERENCE_COMPLETE";
    private static volatile long armedMillis = -1;

    private NetherStarReferenceMain() {}

    /** The glint clock: the armed glint time, otherwise vanilla {@code Util.getMillis()}. */
    public static long glintMillis() {
        long value = armedMillis;
        return value >= 0 ? value : Util.getMillis();
    }

    public static void main(String[] args) throws Exception {
        // GlintClockAgent marks its hook when TextureTransform loads (lazily); the screen checks
        // the mark before the first capture.
        JsonObject definition = JsonParser.parseString(Files.readString(CASE, StandardCharsets.UTF_8)).getAsJsonObject();
        Thread installer = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> client.gui.setScreen(new StarScreen(definition)));
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Vanilla item loading timed out");
            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
        }, "grasscn-nether-star-reference");
        installer.setDaemon(true);
        installer.start();
        net.minecraft.client.main.Main.main(args);
    }

    private static boolean hookLoaded() {
        return "1".equals(System.getProperty("grasscn.glint.clock.hook", ""));
    }

    /** The original nether star holder with the shipped model and glint components bound explicitly. */
    private static ItemStack star(boolean glint) {
        try {
            // 26.2 binds default item components only after joining a server. Supply the
            // nether star's shipped ITEM_MODEL and ENCHANTMENT_GLINT_OVERRIDE explicitly; no world.
            var constructor = ItemStack.class.getDeclaredConstructor(net.minecraft.core.Holder.class, int.class, PatchedDataComponentMap.class);
            constructor.setAccessible(true);
            var components = new PatchedDataComponentMap(DataComponentMap.EMPTY);
            components.set(DataComponents.ITEM_MODEL, Identifier.withDefaultNamespace("nether_star"));
            if (glint) components.set(DataComponents.ENCHANTMENT_GLINT_OVERRIDE, Boolean.TRUE);
            return constructor.newInstance(Items.NETHER_STAR.builtInRegistryHolder(), 1, components);
        } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
    }

    private static final class StarScreen extends Screen {
        private final JsonObject definition;
        private final int scale;
        private final int x;
        private final int y;
        private final int background;
        private final List<JsonObject> cases = new ArrayList<>();
        private final List<Map<String, Object>> records = new ArrayList<>();
        private final ItemStack glinted = star(true);
        private final ItemStack plain = star(false);
        private int index;
        private int frames;
        private long stableSince = System.nanoTime();
        private boolean capturing;

        StarScreen(JsonObject definition) {
            super(Component.literal("Grasscn native nether star item"));
            this.definition = definition;
            scale = definition.get("scale").getAsInt();
            x = definition.getAsJsonArray("logicalPosition").get(0).getAsInt();
            y = definition.getAsJsonArray("logicalPosition").get(1).getAsInt();
            background = Integer.parseInt(definition.get("background").getAsString().substring(1), 16);
            for (JsonElement entry : definition.getAsJsonArray("cases")) cases.add(entry.getAsJsonObject());
            // A diagnostic control frame without the glint component, at glint time 0.
            JsonObject control = new JsonObject();
            control.addProperty("name", "no-glint");
            control.addProperty("glintMillis", 0);
            control.addProperty("control", true);
            cases.add(control);
            arm();
        }

        private JsonObject current() { return cases.get(index); }

        private void arm() {
            armedMillis = current().get("glintMillis").getAsLong();
            frames = 0;
            stableSince = System.nanoTime();
        }

        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, 0xff000000 | background);
            graphics.item(current().has("control") ? plain : glinted, x, y);
            frames++;
        }

        @Override public void tick() {
            if (minecraft.gui.overlay() != null) { frames = 0; stableSince = System.nanoTime(); return; }
            if (minecraft.getWindow().getGuiScale() != scale) {
                minecraft.options.guiScale().set(scale);
                minecraft.resizeGui();
                frames = 0;
                stableSince = System.nanoTime();
                return;
            }
            int minimumFrames = definition.get("minimumStableFrames").getAsInt();
            long minimumNanos = definition.get("minimumStableMilliseconds").getAsLong() * 1_000_000L;
            if (capturing || frames < minimumFrames || System.nanoTime() - stableSince < minimumNanos) return;
            if (!hookLoaded()) fail(new IllegalStateException("Glint clock hook is not installed; run with -javaagent:GlintClockAgent"));
            capturing = true;
            JsonObject entry = current();
            String name = entry.get("name").getAsString();
            Screenshot.takeScreenshot(minecraft.gameRenderer.mainRenderTarget(), image -> {
                try (image) {
                    Files.createDirectories(OUTPUT.resolve("frames"));
                    Files.createDirectories(OUTPUT.resolve("references"));
                    Path framePath = OUTPUT.resolve("frames").resolve(name + ".png");
                    image.writeToFile(framePath);
                    BufferedImage frame = ImageIO.read(framePath.toFile());
                    for (JsonElement sentinel : definition.getAsJsonArray("sentinels")) {
                        int sx = sentinel.getAsJsonArray().get(0).getAsInt();
                        int sy = sentinel.getAsJsonArray().get(1).getAsInt();
                        if ((frame.getRGB(sx, sy) & 0xffffff) != background) throw new IllegalStateException("Native item frame contaminated at " + sx + "," + sy);
                    }
                    int size = 16 * scale;
                    ImageIO.write(frame.getSubimage(x * scale, y * scale, size, size), "png", OUTPUT.resolve("references").resolve(name + ".png").toFile());
                    Map<String, Object> record = new LinkedHashMap<>();
                    record.put("name", name);
                    record.put("glintMillis", entry.get("glintMillis").getAsLong());
                    record.put("control", entry.has("control"));
                    record.put("frame", "frames/" + name + ".png");
                    record.put("reference", "references/" + name + ".png");
                    record.put("bounds", List.of(x * scale, y * scale, size, size));
                    records.add(record);
                    minecraft.execute(() -> {
                        if (index + 1 < cases.size()) {
                            index++;
                            arm();
                            capturing = false;
                        } else {
                            finish();
                        }
                    });
                } catch (Throwable error) { fail(error); }
            });
        }

        private void finish() {
            try {
                Map<String, Object> result = new LinkedHashMap<>();
                result.put("captures", records);
                result.put("runtime", runtime());
                Files.writeString(OUTPUT.resolve("native-run.json"), new GsonBuilder().setPrettyPrinting().create().toJson(result) + "\n", StandardCharsets.UTF_8);
                armedMillis = -1;
                System.out.println(COMPLETE);
                minecraft.stop();
            } catch (Throwable error) { fail(error); }
        }

        /** Read-only runtime facts the web port depends on; nothing here changes rendering. */
        private Map<String, Object> runtime() throws ReflectiveOperationException {
            Map<String, Object> values = new LinkedHashMap<>();
            var info = RenderSystem.getDevice().getDeviceInfo();
            values.put("device", info.name());
            values.put("vendor", info.vendorName());
            values.put("driver", info.driverInfo());
            values.put("backend", info.backendName());
            values.put("window", List.of(minecraft.getWindow().getWidth(), minecraft.getWindow().getHeight()));
            values.put("guiScale", minecraft.getWindow().getGuiScale());
            values.put("glintSpeed", minecraft.options.glintSpeed().get());
            values.put("glintStrength", minecraft.options.glintStrength().get());
            values.put("glintStrengthFloatBits", Float.floatToRawIntBits(minecraft.options.glintStrength().get().floatValue()));
            Map<String, Object> matrices = new LinkedHashMap<>();
            long saved = armedMillis;
            for (JsonObject entry : cases) {
                if (entry.has("control")) continue;
                armedMillis = entry.get("glintMillis").getAsLong();
                matrices.put(entry.get("name").getAsString(), matrixBits(TextureTransform.GLINT_TEXTURING.createMatrix()));
            }
            armedMillis = saved;
            values.put("glintTextureMatrixBits", matrices);

            var items = (TextureAtlas) minecraft.getTextureManager().getTexture(TextureAtlas.LOCATION_ITEMS);
            var sprite = items.getSprite(Identifier.withDefaultNamespace("item/nether_star"));
            Map<String, Object> atlas = new LinkedHashMap<>();
            atlas.put("width", read(items, "width"));
            atlas.put("height", read(items, "height"));
            atlas.put("mipLevelCount", read(items, "mipLevelCount"));
            atlas.put("sampler", sampler(items.getSampler()));
            atlas.put("spriteX", sprite.getX());
            atlas.put("spriteY", sprite.getY());
            atlas.put("spriteUvBits", List.of(Float.floatToRawIntBits(sprite.getU0()), Float.floatToRawIntBits(sprite.getU1()), Float.floatToRawIntBits(sprite.getV0()), Float.floatToRawIntBits(sprite.getV1())));
            values.put("itemAtlas", atlas);

            var glint = minecraft.getTextureManager().getTexture(net.minecraft.client.renderer.feature.ItemFeatureRenderer.ENCHANTED_GLINT_ITEM);
            Map<String, Object> glintTexture = new LinkedHashMap<>();
            glintTexture.put("width", glint.getTexture().getWidth(0));
            glintTexture.put("height", glint.getTexture().getHeight(0));
            glintTexture.put("mipLevels", glint.getTexture().getMipLevels());
            glintTexture.put("sampler", sampler(glint.getSampler()));
            values.put("glintTexture", glintTexture);

            ItemStackRenderState state = new ItemStackRenderState();
            minecraft.getItemModelResolver().updateForTopItem(state, glinted, ItemDisplayContext.GUI, null, null, 0);
            values.put("animated", state.isAnimated());
            values.put("usesBlockLight", state.usesBlockLight());
            Object[] layers = (Object[]) read(state, "layers");
            int active = (int) read(state, "activeLayerCount");
            List<Object> layerValues = new ArrayList<>();
            for (int layer = 0; layer < active; layer++) {
                Map<String, Object> layerValue = new LinkedHashMap<>();
                layerValue.put("foilType", String.valueOf(read(layers[layer], "foilType")));
                layerValue.put("itemTransform", String.valueOf(read(layers[layer], "itemTransform")));
                layerValue.put("localTransformBits", matrixBits((Matrix4f) read(layers[layer], "localTransform")));
                List<Object> quads = new ArrayList<>();
                Map<String, Integer> edges = new java.util.TreeMap<>();
                @SuppressWarnings("unchecked")
                List<BakedQuad> bakedQuads = (List<BakedQuad>) read(layers[layer], "quads");
                for (BakedQuad quad : bakedQuads) {
                    // Edge quads are perpendicular to the GUI view and cover no pixels; their
                    // order varies between launches, so only their count per direction is kept.
                    var direction = quad.direction();
                    if (direction != net.minecraft.core.Direction.SOUTH && direction != net.minecraft.core.Direction.NORTH) {
                        edges.merge(String.valueOf(direction), 1, Integer::sum);
                        continue;
                    }
                    Map<String, Object> quadValue = new LinkedHashMap<>();
                    quadValue.put("direction", String.valueOf(quad.direction()));
                    List<Object> vertices = new ArrayList<>();
                    for (int vertex = 0; vertex < 4; vertex++) {
                        Vector3fc position = quad.position(vertex);
                        long uv = quad.packedUV(vertex);
                        vertices.add(List.of(Float.floatToRawIntBits(position.x()), Float.floatToRawIntBits(position.y()), Float.floatToRawIntBits(position.z()), Long.toString(uv)));
                    }
                    quadValue.put("vertices", vertices);
                    var material = quad.materialInfo();
                    quadValue.put("sprite", material.sprite().contents().name().toString());
                    quadValue.put("layer", String.valueOf(material.layer()));
                    quadValue.put("itemRenderType", material.itemRenderType().toString().replaceAll(",? ?sampler=[^\\]]*", ""));
                    quadValue.put("tintIndex", material.tintIndex());
                    quadValue.put("shade", material.shade());
                    quads.add(quadValue);
                }
                layerValue.put("quads", quads);
                layerValue.put("edgeQuads", edges);
                layerValues.add(layerValue);
            }
            values.put("layers", layerValues);

            // The ITEMS_FLAT light directions, recomputed with the vanilla Lighting constructor's
            // matrix from its own constants.
            Vector3fc light0 = (Vector3fc) readStatic(com.mojang.blaze3d.platform.Lighting.class, "DIFFUSE_LIGHT_0");
            Vector3fc light1 = (Vector3fc) readStatic(com.mojang.blaze3d.platform.Lighting.class, "DIFFUSE_LIGHT_1");
            Matrix4f flat = new Matrix4f().rotationY(-0.3926991F).rotateX(2.3561945F);
            Vector3f flat0 = flat.transformDirection(light0, new Vector3f());
            Vector3f flat1 = flat.transformDirection(light1, new Vector3f());
            values.put("itemsFlatLightBits", List.of(vectorBits(flat0), vectorBits(flat1)));
            return values;
        }

        @Override public boolean shouldCloseOnEsc() { return false; }
        @Override public boolean isPauseScreen() { return false; }
    }

    private static List<Integer> vectorBits(Vector3fc vector) {
        return List.of(Float.floatToRawIntBits(vector.x()), Float.floatToRawIntBits(vector.y()), Float.floatToRawIntBits(vector.z()));
    }

    private static List<Integer> matrixBits(Matrix4f matrix) {
        float[] values = new float[16];
        matrix.get(values);
        List<Integer> bits = new ArrayList<>();
        for (float value : values) bits.add(Float.floatToRawIntBits(value));
        return bits;
    }

    private static List<String> sampler(com.mojang.blaze3d.textures.GpuSampler sampler) {
        return List.of(String.valueOf(sampler.getMinFilter()), String.valueOf(sampler.getMagFilter()), String.valueOf(sampler.getAddressModeU()), String.valueOf(sampler.getAddressModeV()));
    }

    private static Object read(Object target, String name) throws ReflectiveOperationException {
        Class<?> type = target.getClass();
        while (type != null) {
            try {
                Field field = type.getDeclaredField(name);
                field.setAccessible(true);
                return field.get(target);
            } catch (NoSuchFieldException missing) {
                type = type.getSuperclass();
            }
        }
        throw new NoSuchFieldException(name);
    }

    private static Object readStatic(Class<?> type, String name) throws ReflectiveOperationException {
        Field field = type.getDeclaredField(name);
        field.setAccessible(true);
        return field.get(null);
    }

    private static void fail(Throwable error) {
        error.printStackTrace();
        Runtime.getRuntime().halt(3);
    }
}
