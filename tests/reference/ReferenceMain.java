import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import net.minecraft.client.Minecraft;
import net.minecraft.client.Screenshot;
import net.minecraft.client.gui.GuiGraphicsExtractor;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Test-only entry point: vanilla classes and renderer produce the oracle pixels. */
public final class ReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("registry.reference.output"));
    private static final Path FRAMES = Path.of(System.getProperty("registry.reference.frames"));

    public static void main(String[] args) {
        Thread installer = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> client.gui.setScreen(new ReferenceScreen()));
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Vanilla client did not finish loading within 180 seconds");
            } catch (Throwable error) {
                error.printStackTrace();
                System.exit(2);
            }
        }, "registry-reference-installer");
        installer.setDaemon(true);
        installer.start();
        net.minecraft.client.main.Main.main(args);
    }

    private static final class ReferenceScreen extends Screen {
        private static final String[] STATES = {"normal", "hover", "focus", "disabled"};
        private record ReferenceCase(String name, int width, String label, int state, int x, int y) {}
        private static final List<ReferenceCase> CASES = createCases();
        private static final List<ReferenceCase> ASCII_CASES = createAsciiCases();
        private final List<Button> buttons = new ArrayList<>();
        private int scale = 1;
        private boolean asciiPage;
        private int frames;
        private long stableSince;
        private boolean capturing;

        ReferenceScreen() {
            super(Component.literal("Registry native reference capture"));
        }

        private static List<ReferenceCase> createCases() {
            List<ReferenceCase> cases = new ArrayList<>();
            int[] widths = {200, 150, 103};
            int[] x = {16, 232, 398};
            String[] labels = {"Button", "Done", "iIl! MW@09"};
            for (int row = 0; row < STATES.length; row++) {
                for (int column = 0; column < widths.length; column++) {
                    cases.add(new ReferenceCase(STATES[row] + "-w" + widths[column], widths[column], labels[column], row, x[column], 16 + row * 32));
                }
                cases.add(new ReferenceCase(STATES[row] + "-w257", 257, "Wider button", row, 16, 144 + row * 32));
            }
            return cases;
        }

        private static List<ReferenceCase> createAsciiCases() {
            List<ReferenceCase> cases = new ArrayList<>();
            for (int group = 0; group < 3; group++) {
                int start = 32 + group * 32;
                int end = Math.min(126, start + 31);
                StringBuilder label = new StringBuilder();
                for (int code = start; code <= end; code++) label.append((char) code);
                for (int index = 0; index < 2; index++) {
                    int state = index == 0 ? 0 : 3;
                    String name = "ascii-" + start + "-" + end + "-" + STATES[state];
                    cases.add(new ReferenceCase(name, 300, label.toString(), state, 16, 16 + (group * 2 + index) * 32));
                }
            }
            return cases;
        }

        private List<ReferenceCase> currentCases() { return asciiPage ? ASCII_CASES : CASES; }

        @Override protected void init() {
            buttons.clear();
            for (ReferenceCase reference : currentCases()) {
                Button button = Button.builder(Component.literal(reference.label()), ignored -> {})
                    .bounds(reference.x(), reference.y(), reference.width(), 20).build();
                button.active = reference.state() != 3;
                button.setFocused(reference.state() == 2);
                buttons.add(button);
            }
            frames = 0;
            stableSince = System.nanoTime();
        }

        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, 0xff202020);
            for (int index = 0; index < buttons.size(); index++) {
                Button button = buttons.get(index);
                boolean hover = currentCases().get(index).state() == 1;
                button.extractRenderState(graphics, hover ? button.getX() + 1 : -100,
                    hover ? button.getY() + 1 : -100, partialTick);
            }
            frames++;
        }

        @Override public void tick() {
            if (minecraft.gui.overlay() != null) {
                stableSince = System.nanoTime();
                frames = 0;
                return;
            }
            if (frames < 20 || capturing || System.nanoTime() - stableSince < 1_000_000_000L) return;
            if (minecraft.getWindow().getGuiScale() != scale) {
                minecraft.options.guiScale().set(scale);
                minecraft.resizeGui();
                frames = 0;
                stableSince = System.nanoTime();
                return;
            }
            capturing = true;
            final int capturedScale = scale;
            final boolean capturedAsciiPage = asciiPage;
            final List<ReferenceCase> capturedCases = currentCases();
            Screenshot.takeScreenshot(minecraft.gameRenderer.mainRenderTarget(), image -> {
                try (image) {
                    Files.createDirectories(OUTPUT);
                    Files.createDirectories(FRAMES);
                    Path fullFrame = FRAMES.resolve("native-" + (capturedAsciiPage ? "ascii-" : "") + "scale-" + capturedScale + ".png");
                    image.writeToFile(fullFrame);
                    BufferedImage frame = ImageIO.read(fullFrame.toFile());
                    if ((frame.getRGB(1, 1) & 0xffffff) != 0x202020
                        || (frame.getRGB(frame.getWidth() - 2, frame.getHeight() - 2) & 0xffffff) != 0x202020) {
                        throw new IllegalStateException("Native capture contains an overlay or unexpected background");
                    }
                    for (ReferenceCase reference : capturedCases) {
                        BufferedImage crop = frame.getSubimage(reference.x() * capturedScale,
                            reference.y() * capturedScale, reference.width() * capturedScale, 20 * capturedScale);
                        for (int y = 0; y < crop.getHeight(); y++) {
                            for (int x = 0; x < crop.getWidth(); x++) {
                                int pixel = crop.getRGB(x, y);
                                if (((pixel >>> 16) & 255) != ((pixel >>> 8) & 255)
                                    || ((pixel >>> 8) & 255) != (pixel & 255)) {
                                    throw new IllegalStateException("Native vanilla button has unexpected colored pixels: " + reference.name());
                                }
                            }
                        }
                        Path target = OUTPUT.resolve(reference.name() + "-s" + capturedScale + ".png");
                        ImageIO.write(crop, "png", target.toFile());
                    }
                    System.out.println("REGISTRY_REFERENCE_CAPTURED=" + (capturedAsciiPage ? "ascii-" : "") + "scale-" + capturedScale);
                    minecraft.execute(() -> {
                        if (capturedScale == 3 && capturedAsciiPage) {
                            System.out.println("REGISTRY_REFERENCE_COMPLETE");
                            minecraft.stop();
                        } else if (capturedScale == 3) {
                            asciiPage = true;
                            scale = 1;
                            init();
                            capturing = false;
                        } else {
                            scale++;
                            frames = 0;
                            stableSince = System.nanoTime();
                            capturing = false;
                        }
                    });
                } catch (Throwable error) {
                    error.printStackTrace();
                    System.exit(3);
                }
            });
        }

        @Override public boolean shouldCloseOnEsc() { return false; }
        @Override public boolean isPauseScreen() { return false; }
    }
}
