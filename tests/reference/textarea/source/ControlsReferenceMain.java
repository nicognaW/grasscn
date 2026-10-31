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
import net.minecraft.client.gui.screens.inventory.tooltip.ClientTooltipComponent;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;

/** Supplies test inputs only; original Minecraft widgets and GPU render the pixels. */
public final class ControlsReferenceMain {
    private static final Path OUTPUT = Path.of(System.getProperty("registry.reference.output"));
    private static final Path FRAMES = Path.of(System.getProperty("registry.reference.frames"));
    record Case(String name, String element, String state, boolean checked, int width, int height, int x, int y, int page, double value, String label, String text, String placeholder, Integer cursor, Integer anchor, int caretMs, Integer maxLength, Integer wrapWidth, String background) {}
    record NativeLayout(int width, int height, List<String> renderedLines) {}
    private static final java.util.Map<String, NativeLayout> layouts = new java.util.LinkedHashMap<>();
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
                    case "button" -> net.minecraft.client.gui.components.Button.builder(Component.literal(c.label()), ignored -> {}).bounds(c.x(), c.y(), c.width(), c.height()).build();
                    case "slider" -> new ReferenceSlider(c);
                    case "input" -> createEditBox(c);
                    case "textarea" -> createTextArea(c);
                    case "tooltip" -> new ReferenceTooltip(c, font);
                    case "card" -> new ReferencePanel(c, font);
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

        private net.minecraft.client.gui.components.MultiLineEditBox createTextArea(Case c) {
            var input = net.minecraft.client.gui.components.MultiLineEditBox.builder().setX(c.x()).setY(c.y())
                .setPlaceholder(Component.literal(c.placeholder() == null ? "" : c.placeholder())).build(font, c.width(), c.height(), Component.literal("Textarea"));
            input.setValue(c.text() == null ? "" : c.text());
            try {
                var field = input.getClass().getDeclaredField("textField");
                field.setAccessible(true);
                var text = (net.minecraft.client.gui.components.MultilineTextField) field.get(input);
                int cursor = c.cursor() == null ? input.getValue().length() : c.cursor();
                int anchor = c.anchor() == null ? cursor : c.anchor();
                for (String name : List.of("cursor", "selectCursor")) {
                    var position = text.getClass().getDeclaredField(name);
                    position.setAccessible(true);
                    position.setInt(text, name.equals("cursor") ? cursor : anchor);
                }
                input.setScrollAmount(c.value());
                List<String> lines = new ArrayList<>();
                for (Object line : (Iterable<?>) text.iterateLines()) {
                    var begin = line.getClass().getDeclaredMethod("beginIndex");
                    var end = line.getClass().getDeclaredMethod("endIndex");
                    begin.setAccessible(true); end.setAccessible(true);
                    lines.add(input.getValue().substring((int) begin.invoke(line), (int) end.invoke(line)));
                }
                layouts.put(c.name(), new NativeLayout(c.width() + (input.maxScrollAmount() > 0 ? input.scrollbarWidth() : 0), c.height(), lines));
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
            return input;
        }

        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.fill(0, 0, width, height, 0xff202020);
            for (int i = 0; i < widgets.size(); i++) {
                AbstractWidget widget = widgets.get(i);
                Case reference = pageCases.get(i);
                if (reference.background() != null) {
                    int background = (int)(0xff000000L | Long.parseLong(reference.background().substring(1), 16));
                    graphics.fill(widget.getX(), widget.getY(), widget.getX() + widget.getWidth(), widget.getY() + widget.getHeight(), background);
                }
                if (widget instanceof EditBox input && input.isFocused()) {
                    try {
                        var focusedTime = EditBox.class.getDeclaredField("focusedTime");
                        focusedTime.setAccessible(true);
                        focusedTime.setLong(input, net.minecraft.util.Util.getMillis() - pageCases.get(i).caretMs());
                    } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
                }
                if (widget instanceof net.minecraft.client.gui.components.MultiLineEditBox input && input.isFocused()) {
                    try {
                        var focusedTime = input.getClass().getDeclaredField("focusedTime");
                        focusedTime.setAccessible(true);
                        focusedTime.setLong(input, net.minecraft.util.Util.getMillis() - reference.caretMs());
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
                    for (int index = 0; index < pageCases.size(); index++) {
                        Case c = pageCases.get(index);
                        AbstractWidget widget = widgets.get(index);
                        NativeLayout layout = layouts.get(c.name());
                        BufferedImage crop = frame.getSubimage(c.x() * capturedScale, c.y() * capturedScale, (layout == null ? widget.getWidth() : layout.width()) * capturedScale, (layout == null ? widget.getHeight() : layout.height()) * capturedScale);
                        ImageIO.write(crop, "png", OUTPUT.resolve(c.name() + "-s" + capturedScale + ".png").toFile());
                    }
                    Files.writeString(OUTPUT.getParent().resolve("layout.json"), new Gson().toJson(layouts));
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

    private static final class ReferencePanel extends AbstractWidget {
        private final List<AbstractWidget> contents = new ArrayList<>();
        ReferencePanel(Case c, net.minecraft.client.gui.Font font) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty());
            if (c.text() != null) {
                var title = new net.minecraft.client.gui.components.MultiLineTextWidget(Component.literal(c.label()).withStyle(net.minecraft.ChatFormatting.BOLD), font).setMaxWidth(c.width() - 36).setCentered(true);
                title.setPosition(c.x() + (c.width() - title.getWidth()) / 2, c.y() + 18);
                var message = new net.minecraft.client.gui.components.MultiLineTextWidget(Component.literal(c.text()), font).setMaxWidth(c.width() - 36).setCentered(true);
                message.setPosition(c.x() + (c.width() - message.getWidth()) / 2, title.getY() + title.getHeight() + 12);
                var button = net.minecraft.client.gui.components.Button.builder(Component.literal("Done"), ignored -> {}).bounds(c.x() + 18, message.getY() + message.getHeight() + 12, c.width() - 36, 20).build();
                contents.add(title); contents.add(message); contents.add(button);
            }
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.blitSprite(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED, net.minecraft.resources.Identifier.withDefaultNamespace("popup/background"), getX(), getY(), getWidth(), getHeight());
            for (var widget : contents) widget.extractRenderState(graphics, -100, -100, partialTick);
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class ReferenceTooltip extends AbstractWidget {
        private final List<ClientTooltipComponent> contents;
        private final net.minecraft.client.gui.Font font;
        ReferenceTooltip(Case c, net.minecraft.client.gui.Font font) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty());
            this.font = font;
            var lines = font.split(Component.literal(c.text() == null ? "" : c.text()), c.wrapWidth() == null ? 170 : c.wrapWidth());
            this.contents = lines.stream().map(ClientTooltipComponent::create).toList();
            int textWidth = contents.stream().mapToInt(component -> component.getWidth(font)).max().orElse(0);
            int textHeight = contents.stream().mapToInt(component -> component.getHeight(font)).sum() - (contents.size() == 1 ? 2 : 0);
            setWidth(textWidth + 24);
            setHeight(textHeight + 24);
            if (getWidth() > c.width() || getHeight() > c.height()) throw new IllegalArgumentException("Tooltip exceeds its capture envelope: " + c.name());
            List<String> plainLines = lines.stream().map(line -> {
                StringBuilder value = new StringBuilder();
                line.accept((index, style, codepoint) -> { value.appendCodePoint(codepoint); return true; });
                return value.toString();
            }).toList();
            layouts.put(c.name(), new NativeLayout(getWidth(), getHeight(), plainLines));
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.tooltip(font, contents, 0, 0, (screenWidth, screenHeight, x, y, width, height) -> new org.joml.Vector2i(getX() + 12, getY() + 12), null);
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }
}
