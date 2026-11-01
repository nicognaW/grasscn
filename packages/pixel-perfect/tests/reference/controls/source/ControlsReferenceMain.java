import com.google.gson.Gson;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.AbstractWidget;
import net.minecraft.client.gui.components.Checkbox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Supplies test inputs only; original Minecraft widgets and GPU render the pixels. */
public final class ControlsReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("registry.reference.output"));
    private static final Path FRAMES = Path.of(System.getProperty("registry.reference.frames"));
    record Case(String name, String element, String state, boolean checked, int width, int height, int x, int y) {}
    private static Case[] cases;

    public static void main(String[] args) throws Exception {
        cases = new Gson().fromJson(Files.readString(Path.of(System.getProperty("registry.reference.cases"))), Case[].class);
        Thread installer = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> client.gui.setScreen(new ControlsScreen()));
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Vanilla loading timed out");
            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
        }, "registry-controls-installer");
        installer.setDaemon(true);
        installer.start();
        net.minecraft.client.main.Main.main(args);
    }

    private static final class ControlsScreen extends Screen {
        private final List<AbstractWidget> widgets = new ArrayList<>();
        private int scale = 1;
        private int frames;
        private long stableSince;
        private boolean capturing;
        ControlsScreen() { super(Component.literal("Registry controls reference")); }

        @Override protected void init() {
            widgets.clear();
            for (Case c : cases) {
                AbstractWidget widget = switch (c.element()) {
                    case "checkbox" -> Checkbox.builder(Component.empty(), font).pos(c.x(), c.y()).selected(c.checked()).build();
                    default -> throw new IllegalArgumentException("No native renderer configured for " + c.element());
                };
                widget.active = !c.state().equals("disabled");
                widget.setFocused(c.state().equals("focus"));
                widgets.add(widget);
            }
            frames = 0;
            stableSince = System.nanoTime();
        }

        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, 0xff202020);
            for (int i = 0; i < widgets.size(); i++) {
                AbstractWidget widget = widgets.get(i);
                boolean hover = cases[i].state().equals("hover");
                widget.extractRenderState(graphics, hover ? widget.getX() + 1 : -100, hover ? widget.getY() + 1 : -100, partialTick);
            }
            frames++;
        }

        @Override public void tick() {
            if (minecraft.gui.overlay() != null) { frames = 0; stableSince = System.nanoTime(); return; }
            if (frames < 20 || capturing || System.nanoTime() - stableSince < 1_000_000_000L) return;
            if (minecraft.getWindow().getGuiScale() != scale) {
                minecraft.options.guiScale().set(scale);
                minecraft.resizeGui();
                frames = 0; stableSince = System.nanoTime(); return;
            }
            capturing = true;
            int capturedScale = scale;
            Screenshot.takeScreenshot(minecraft.gameRenderer.mainRenderTarget(), image -> {
                try (image) {
                    Files.createDirectories(OUTPUT);
                    Files.createDirectories(FRAMES);
                    Path fullFrame = FRAMES.resolve("native-controls-s" + capturedScale + ".png");
                    image.writeToFile(fullFrame);
                    BufferedImage frame = ImageIO.read(fullFrame.toFile());
                    if ((frame.getRGB(1, 1) & 0xffffff) != 0x202020 ||
                        (frame.getRGB(frame.getWidth() - 2, frame.getHeight() - 2) & 0xffffff) != 0x202020)
                        throw new IllegalStateException("Native frame is contaminated by an overlay");
                    for (Case c : cases) {
                        BufferedImage crop = frame.getSubimage(c.x() * capturedScale, c.y() * capturedScale, c.width() * capturedScale, c.height() * capturedScale);
                        ImageIO.write(crop, "png", OUTPUT.resolve(c.name() + "-s" + capturedScale + ".png").toFile());
                    }
                    System.out.println("REGISTRY_CONTROLS_CAPTURED=" + capturedScale);
                    minecraft.execute(() -> {
                        if (capturedScale == 3) { System.out.println("REGISTRY_REFERENCE_COMPLETE"); minecraft.stop(); }
                        else { scale++; frames = 0; stableSince = System.nanoTime(); capturing = false; }
                    });
                } catch (Throwable error) { error.printStackTrace(); System.exit(3); }
            });
        }
        @Override public boolean shouldCloseOnEsc() { return false; }
        @Override public boolean isPauseScreen() { return false; }
    }
}
