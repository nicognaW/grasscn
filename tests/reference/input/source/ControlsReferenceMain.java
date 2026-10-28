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
import net.minecraft.client.gui.components.AbstractSliderButton;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Supplies test inputs only; original Minecraft widgets and GPU render the pixels. */
public final class ControlsReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("registry.reference.output"));
    private static final Path FRAMES = Path.of(System.getProperty("registry.reference.frames"));
    record Case(String name, String element, String state, boolean checked, int width, int height, int x, int y, int page, double value, String label, String text, String placeholder, Integer cursor, Integer anchor, int caretMs, Integer maxLength) {}
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
        private List<Case> pageCases;
        private int page;
        private int scale = 1;
        private int frames;
        private long stableSince;
        private boolean capturing;
        ControlsScreen() { super(Component.literal("Registry controls reference")); }

        @Override protected void init() {
            widgets.clear();
            pageCases = java.util.Arrays.stream(cases).filter(c -> c.page() == page).toList();
            for (Case c : pageCases) {
                AbstractWidget widget = switch (c.element()) {
                    case "checkbox" -> Checkbox.builder(Component.empty(), font).pos(c.x(), c.y()).selected(c.checked()).build();
                    case "slider" -> new ReferenceSlider(c);
                    case "input" -> createEditBox(c);
                    default -> throw new IllegalArgumentException("No native renderer configured for " + c.element());
                };
                widget.active = !c.state().equals("disabled");
                widget.setFocused(c.state().startsWith("focus"));
                if (widget instanceof ReferenceSlider slider) slider.setEditing(c.state().equals("focus"));
                widgets.add(widget);
            }
            frames = 0;
            stableSince = System.nanoTime();
        }

        private EditBox createEditBox(Case c) {
            EditBox input = new EditBox(font, c.x(), c.y(), c.width(), c.height(), Component.literal("Input"));
            input.setMaxLength(c.maxLength() == null ? 1024 : c.maxLength());
            input.setValue(c.text() == null ? "" : c.text());
            input.moveCursorToStart(false);
            input.moveCursorTo(c.cursor() == null ? input.getValue().length() : c.cursor(), false);
            if (c.anchor() != null) input.setHighlightPos(c.anchor());
            input.setEditable(!c.state().equals("disabled") && !c.state().contains("readonly"));
            if (c.placeholder() != null) input.setHint(Component.literal(c.placeholder()));
            return input;
        }

        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, 0xff202020);
            for (int i = 0; i < widgets.size(); i++) {
                AbstractWidget widget = widgets.get(i);
                if (widget instanceof EditBox input && input.isFocused()) {
                    try {
                        var focusedTime = EditBox.class.getDeclaredField("focusedTime");
                        focusedTime.setAccessible(true);
                        focusedTime.setLong(input, net.minecraft.util.Util.getMillis() - pageCases.get(i).caretMs());
                    } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
                }
                boolean hover = pageCases.get(i).state().equals("hover");
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
            int capturedPage = page;
            Screenshot.takeScreenshot(minecraft.gameRenderer.mainRenderTarget(), image -> {
                try (image) {
                    Files.createDirectories(OUTPUT);
                    Files.createDirectories(FRAMES);
                    boolean multiplePages = java.util.Arrays.stream(cases).anyMatch(c -> c.page() > 0);
                    Path fullFrame = FRAMES.resolve("native-controls-" + (multiplePages ? "p" + capturedPage + "-" : "") + "s" + capturedScale + ".png");
                    image.writeToFile(fullFrame);
                    BufferedImage frame = ImageIO.read(fullFrame.toFile());
                    if ((frame.getRGB(1, 1) & 0xffffff) != 0x202020 ||
                        (frame.getRGB(frame.getWidth() - 2, frame.getHeight() - 2) & 0xffffff) != 0x202020)
                        throw new IllegalStateException("Native frame is contaminated by an overlay");
                    for (Case c : pageCases) {
                        BufferedImage crop = frame.getSubimage(c.x() * capturedScale, c.y() * capturedScale, c.width() * capturedScale, c.height() * capturedScale);
                        ImageIO.write(crop, "png", OUTPUT.resolve(c.name() + "-s" + capturedScale + ".png").toFile());
                    }
                    System.out.println("REGISTRY_CONTROLS_CAPTURED=" + capturedScale);
                    minecraft.execute(() -> {
                        if (capturedScale == 3 && capturedPage == java.util.Arrays.stream(cases).mapToInt(Case::page).max().orElse(0)) { System.out.println("REGISTRY_REFERENCE_COMPLETE"); minecraft.stop(); }
                        else if (capturedScale == 3) { page++; scale = 1; init(); capturing = false; }
                        else { scale++; frames = 0; stableSince = System.nanoTime(); capturing = false; }
                    });
                } catch (Throwable error) { error.printStackTrace(); System.exit(3); }
            });
        }
        @Override public boolean shouldCloseOnEsc() { return false; }
        @Override public boolean isPauseScreen() { return false; }
    }

    private static final class ReferenceSlider extends AbstractSliderButton {
        ReferenceSlider(Case c) { super(c.x(), c.y(), c.width(), c.height(), Component.literal(c.label() == null ? "" : c.label()), c.value()); }
        void setEditing(boolean editing) { this.canChangeValue = editing; }
        @Override protected void updateMessage() {}
        @Override protected void applyValue() {}
    }
}
