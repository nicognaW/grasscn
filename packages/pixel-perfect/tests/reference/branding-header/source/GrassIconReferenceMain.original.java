import java.awt.image.BufferedImage;
import java.nio.file.*;
import javax.imageio.ImageIO;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Items;

/** Captures the original grass-block inventory item; no reconstructed artwork. */
public final class GrassIconReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("registry.brand.output"));
    public static void main(String[] args) {
        Thread installer = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> client.gui.setScreen(new IconScreen()));
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Vanilla item loading timed out");
            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
        }, "grasscn-item-reference");
        installer.setDaemon(true); installer.start();
        net.minecraft.client.main.Main.main(args);
    }
    private static final class IconScreen extends Screen {
        private int scale = 1, backdrop = 0, frames;
        private long stableSince = System.nanoTime();
        private boolean capturing;
        private final net.minecraft.world.item.ItemStack grass;
        IconScreen() {
            super(Component.literal("Grasscn native grass item"));
            try {
                // 26.2 binds default item components only after joining a server.
                // Supply the original item-model ID explicitly; no world is created.
                var constructor = net.minecraft.world.item.ItemStack.class.getDeclaredConstructor(net.minecraft.core.Holder.class, int.class, net.minecraft.core.component.PatchedDataComponentMap.class);
                constructor.setAccessible(true);
                var components = new net.minecraft.core.component.PatchedDataComponentMap(net.minecraft.core.component.DataComponentMap.EMPTY);
                components.set(net.minecraft.core.component.DataComponents.ITEM_MODEL, net.minecraft.resources.Identifier.withDefaultNamespace("grass_block"));
                grass = constructor.newInstance(Items.GRASS_BLOCK.builtInRegistryHolder(), 1, components);
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, backdrop == 0 ? 0xff000000 : 0xffffffff);
            graphics.item(grass, 16, 16);
            frames++;
        }
        @Override public void tick() {
            if (minecraft.gui.overlay() != null) { frames = 0; stableSince = System.nanoTime(); return; }
            if (minecraft.getWindow().getGuiScale() != scale) {
                minecraft.options.guiScale().set(scale); minecraft.resizeGui(); frames = 0; stableSince = System.nanoTime(); return;
            }
            if (capturing || frames < 20 || System.nanoTime() - stableSince < 1_000_000_000L) return;
            capturing = true;
            int capturedScale = scale, capturedBackdrop = backdrop;
            Screenshot.takeScreenshot(minecraft.gameRenderer.mainRenderTarget(), image -> {
                try (image) {
                    Files.createDirectories(OUTPUT.resolve("frames"));
                    String name = "grass-block-" + (capturedBackdrop == 0 ? "black" : "white") + "-s" + capturedScale + ".png";
                    Path framePath = OUTPUT.resolve("frames").resolve(name);
                    image.writeToFile(framePath);
                    BufferedImage frame = ImageIO.read(framePath.toFile());
                    int expected = capturedBackdrop == 0 ? 0 : 0xffffff;
                    if ((frame.getRGB(1, 1) & 0xffffff) != expected || (frame.getRGB(frame.getWidth() - 2, frame.getHeight() - 2) & 0xffffff) != expected) throw new IllegalStateException("Native icon frame contaminated");
                    ImageIO.write(frame.getSubimage(16 * capturedScale, 16 * capturedScale, 16 * capturedScale, 16 * capturedScale), "png", OUTPUT.resolve(name).toFile());
                    minecraft.execute(() -> {
                        if (capturedScale == 3 && capturedBackdrop == 1) { System.out.println("GRASSCN_ITEM_REFERENCE_COMPLETE"); minecraft.stop(); }
                        else {
                            if (capturedBackdrop == 0) backdrop = 1; else { scale = 3; backdrop = 0; }
                            capturing = false; frames = 0; stableSince = System.nanoTime();
                        }
                    });
                } catch (Throwable error) { error.printStackTrace(); System.exit(3); }
            });
        }
        @Override public boolean shouldCloseOnEsc() { return false; }
        @Override public boolean isPauseScreen() { return false; }
    }
}
