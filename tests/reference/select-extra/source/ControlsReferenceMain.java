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
    record Case(String name, String element, String state, boolean checked, int width, int height, int x, int y, int page, double value, String label, String text, String placeholder, Integer cursor, Integer anchor, int caretMs, Integer maxLength, Integer wrapWidth, String background, String alignment, Integer contentHeight, String color, String overlay, Boolean selected, String[] labels, Integer selectedIndex, Integer targetIndex, Integer disabledIndex, long timeMs) {}
    record TabRect(int x, int y, int width, int height) {}
    record NativeLayout(int width, int height, List<String> renderedLines, List<TabRect> tabRects) {
        NativeLayout(int width, int height, List<String> renderedLines) { this(width, height, renderedLines, null); }
    }
    private static final java.util.Map<String, NativeLayout> layouts = new java.util.LinkedHashMap<>();
    private static Case[] cases;
    private static final java.util.Map<String, Object> observedGlyphs = new java.util.LinkedHashMap<>();
    private static void observeTabGlyphs(Minecraft minecraft, List<Case> pageCases) {
        if (!Boolean.parseBoolean(System.getProperty("registry.reference.observeGlyphs", "true"))) return;
        try {
            var method = minecraft.font.getClass().getDeclaredMethod("getGlyph", int.class, net.minecraft.network.chat.Style.class);
            method.setAccessible(true);
            for (Case c : pageCases) {
                if (!c.element().startsWith("tabs") && !c.element().startsWith("select")) continue;
                String text = c.label() == null ? "" : c.label();
                if (c.labels() != null) text += String.join("", c.labels());
                for (int codepoint : text.codePoints().toArray()) {
                    String code = Integer.toHexString(codepoint);
                    if (codepoint < 128 || observedGlyphs.containsKey(code)) continue;
                    Object glyph = method.invoke(minecraft.font, codepoint, net.minecraft.network.chat.Style.EMPTY);
                    var values = new java.util.LinkedHashMap<String, Object>();
                    for (String key : List.of("u0", "u1", "v0", "v1", "left", "right", "up", "down")) {
                        var field = glyph.getClass().getDeclaredField(key); field.setAccessible(true); values.put(key, field.get(glyph));
                    }
                    observedGlyphs.put(code, values);
                }
            }
            if (!observedGlyphs.isEmpty()) Files.writeString(OUTPUT.getParent().resolve("glyph-atlas.json"), new Gson().toJson(observedGlyphs));
        } catch (Exception error) { throw new IllegalStateException(error); }
    }
    private static net.minecraft.util.TimeSource.NanoTimeSource actualTimeSource() {
        try {
            var field = net.minecraft.util.Util.class.getDeclaredField("timeSource");
            field.setAccessible(true);
            return (net.minecraft.util.TimeSource.NanoTimeSource) field.get(null);
        } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
    }

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
                    case "label" -> new ReferenceLabel(c, font);
                    case "separator" -> new ReferenceSeparator(c);
                    case "scroll-area" -> new ReferenceScrollArea(c);
                    case "progress" -> new ReferenceProgress(c);
                    case "select-trigger" -> net.minecraft.client.gui.components.CycleButton.<String>builder(Component::literal, c.label()).withValues(java.util.List.of(c.label())).displayOnlyValue().create(c.x(), c.y(), c.width(), c.height(), Component.empty());
                    case "select-list" -> new ReferenceSelectList(c);
                    case "tabs-trigger" -> createTabTrigger(c);
                    case "tabs" -> new ReferenceTabs(c);
                    default -> throw new IllegalArgumentException("No native renderer configured for " + c.element());
                };
                widget.active = !c.state().startsWith("disabled");
                widget.setFocused(c.state().contains("focus"));
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
                boolean hover = reference.state().endsWith("hover");
                var timeSource = (reference.element().startsWith("tabs") || reference.element().equals("select-trigger")) ? actualTimeSource() : null;
                try {
                    if ((reference.element().startsWith("tabs") || reference.element().equals("select-trigger"))) net.minecraft.util.Util.setTimeSource(() -> reference.timeMs() * 1_000_000L);
                    widget.extractRenderState(graphics, hover ? widget.getX() + 1 : -100, hover ? widget.getY() + 1 : -100, partialTick);
                } finally { if ((reference.element().startsWith("tabs") || reference.element().equals("select-trigger"))) net.minecraft.util.Util.setTimeSource(timeSource); }
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
            observeTabGlyphs(minecraft, pageCases);
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

    /** Original LanguageSelectionList and original Entry renderer; only content/geometry/state are supplied. */
    private static final class ReferenceSelectList extends AbstractWidget {
        private final net.minecraft.client.gui.components.ObjectSelectionList list;
        private final Case reference;
        ReferenceSelectList(Case c) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty()); reference = c;
            try {
                var mc = Minecraft.getInstance();
                var screen = new net.minecraft.client.gui.screens.options.LanguageSelectScreen(null, mc.options, mc.getLanguageManager());
                screen.width = c.width(); screen.height = c.height() + 82;
                var listClass = Class.forName("net.minecraft.client.gui.screens.options.LanguageSelectScreen$LanguageSelectionList");
                var constructor = listClass.getDeclaredConstructor(net.minecraft.client.gui.screens.options.LanguageSelectScreen.class, Minecraft.class);
                constructor.setAccessible(true);
                list = (net.minecraft.client.gui.components.ObjectSelectionList) constructor.newInstance(screen, mc);
                list.setRectangle(c.width(), c.height() - 4, 0, 2);
                var entryClass = Class.forName("net.minecraft.client.gui.screens.options.LanguageSelectScreen$LanguageSelectionList$Entry");
                var entryConstructor = entryClass.getDeclaredConstructor(listClass, String.class, net.minecraft.client.resources.language.LanguageInfo.class);
                entryConstructor.setAccessible(true);
                var language = entryClass.getDeclaredField("language"); language.setAccessible(true);
                var entries = new ArrayList<net.minecraft.client.gui.components.ObjectSelectionList.Entry>();
                for (int i = 0; i < c.labels().length; i++) {
                    var entry = (net.minecraft.client.gui.components.ObjectSelectionList.Entry) entryConstructor.newInstance(list, "en_us", new net.minecraft.client.resources.language.LanguageInfo("", c.labels()[i], false));
                    Component text = Component.literal(c.labels()[i]);
                    if (c.disabledIndex() != null && c.disabledIndex() == i) text = text.copy().withStyle(style -> style.withColor(0xa0a0a0));
                    language.set(entry, text); entries.add(entry);
                }
                list.replaceEntries(entries);
                var selection = net.minecraft.client.gui.components.AbstractSelectionList.class.getDeclaredMethod("setSelected", Class.forName("net.minecraft.client.gui.components.AbstractSelectionList$Entry"));
                selection.invoke(list, c.selectedIndex() != null && c.selectedIndex() >= 0 ? entries.get(c.selectedIndex()) : null);
                list.setScrollAmount(c.value());
                layouts.put(c.name(), new NativeLayout(c.width(), c.height(), java.util.Arrays.asList(c.labels()), entries.stream().map(entry -> new TabRect(entry.getX(), entry.getY(), entry.getWidth(), entry.getHeight())).toList()));
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override public void setFocused(boolean focused) { super.setFocused(focused); if (list != null) { list.setFocused(focused && !list.children().isEmpty() ? (net.minecraft.client.gui.components.events.GuiEventListener) list.children().get(reference.selectedIndex() != null && reference.selectedIndex() >= 0 ? reference.selectedIndex() : 0) : null); list.setScrollAmount(reference.value()); } }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.pose().pushMatrix(); graphics.pose().translate(getX(), getY());
            var target = reference.labels().length > 0 ? (net.minecraft.client.gui.components.ObjectSelectionList.Entry) list.children().get(reference.targetIndex() == null ? 0 : reference.targetIndex()) : null;
            list.extractRenderState(graphics, reference.state().endsWith("hover") && target != null ? target.getX() + 2 : -100, reference.state().endsWith("hover") && target != null ? target.getY() + 2 : -100, partialTick);
            graphics.pose().popMatrix();
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class ReferenceTab implements net.minecraft.client.gui.components.tabs.Tab {
        private final Component title;
        ReferenceTab(String title) { this.title = Component.literal(title); }
        @Override public Component getTabTitle() { return title; }
        @Override public Component getTabExtraNarration() { return Component.empty(); }
        @Override public void visitChildren(java.util.function.Consumer<AbstractWidget> visitor) {}
        @Override public void doLayout(net.minecraft.client.gui.navigation.ScreenRectangle area) {}
        @Override public net.minecraft.client.gui.layouts.Layout getLayout() { return new net.minecraft.client.gui.layouts.GridLayout(); }
    }
    private static AbstractWidget createTabTrigger(Case c) {
        var manager = new net.minecraft.client.gui.components.tabs.TabManager(ignored -> {}, ignored -> {});
        var tab = new ReferenceTab(c.label());
        manager.setCurrentTab(Boolean.TRUE.equals(c.selected()) ? tab : new ReferenceTab("Other"), false);
        var button = new net.minecraft.client.gui.components.tabs.MenuTabBar.MenuTabButton(manager, tab, c.width(), 24);
        button.setPosition(c.x(), c.y());
        return button;
    }
    private static final class ReferenceTabs extends AbstractWidget {
        private final net.minecraft.client.gui.components.tabs.MenuTabBar bar;
        private final Case reference;
        ReferenceTabs(Case c) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty());
            reference = c;
            var manager = new net.minecraft.client.gui.components.tabs.TabManager(ignored -> {}, ignored -> {});
            var builder = net.minecraft.client.gui.components.tabs.MenuTabBar.builder(manager, c.width());
            for (String title : c.labels()) builder.addTab(new ReferenceTab(title));
            bar = builder.build(); bar.arrangeElements(c.width());
            if (c.selectedIndex() != null && c.selectedIndex() >= 0) bar.selectTab(c.selectedIndex(), false);
            if (c.disabledIndex() != null) bar.setTabActiveState(c.disabledIndex(), false);
            if (c.state().equals("focus")) bar.setFocused(bar.children().get(c.targetIndex()));
            var rectangles = bar.children().stream().map(child -> (AbstractWidget) child).map(child -> new TabRect(child.getX(), child.getY(), child.getWidth(), child.getHeight())).toList();
            layouts.put(c.name(), new NativeLayout(c.width(), c.height(), java.util.Arrays.asList(c.labels()), rectangles));
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.pose().pushMatrix(); graphics.pose().translate(getX(), getY());
            if (reference.contentHeight() != null && reference.contentHeight() > 0) net.minecraft.client.gui.screens.Screen.extractMenuBackgroundTexture(graphics, net.minecraft.client.gui.screens.Screen.MENU_BACKGROUND, 0, 24, 0, 0, reference.width(), reference.contentHeight());
            var target = (AbstractWidget) bar.children().get(reference.targetIndex() == null ? 0 : reference.targetIndex());
            bar.extractRenderState(graphics, reference.state().endsWith("hover") ? target.getX() + 1 : -100, reference.state().endsWith("hover") ? 1 : -100, partialTick);
            graphics.pose().popMatrix();
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class ReferenceProgress extends AbstractWidget {
        private final net.minecraft.client.gui.components.BossHealthOverlay renderer;
        private final net.minecraft.world.BossEvent event;
        private final java.lang.reflect.Method extract;
        ReferenceProgress(Case c) {
            super(c.x(), c.y(), 182, 5, Component.empty());
            renderer = new net.minecraft.client.gui.components.BossHealthOverlay(Minecraft.getInstance());
            event = new net.minecraft.client.gui.components.LerpingBossEvent(java.util.UUID.nameUUIDFromBytes(c.name().getBytes(java.nio.charset.StandardCharsets.UTF_8)), Component.empty(), (float)c.value(), net.minecraft.world.BossEvent.BossBarColor.valueOf(c.color().toUpperCase(java.util.Locale.ROOT)), net.minecraft.world.BossEvent.BossBarOverlay.valueOf(c.overlay().toUpperCase(java.util.Locale.ROOT)), false, false, false);
            try {
                extract = renderer.getClass().getDeclaredMethod("extractBar", GuiGraphicsExtractor.class, int.class, int.class, net.minecraft.world.BossEvent.class);
                extract.setAccessible(true);
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            try { extract.invoke(renderer, graphics, getX(), getY(), event); }
            catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class ReferenceScrollArea extends net.minecraft.client.gui.components.AbstractTextAreaWidget {
        private final int content;
        private final List<AbstractWidget> rows = new ArrayList<>();
        ReferenceScrollArea(Case c) {
            super(c.x(), c.y(), c.width() - (c.contentHeight() > c.height() ? 6 : 0), c.height(), Component.empty(), net.minecraft.client.gui.components.AbstractScrollArea.defaultSettings(10), false, false);
            content = c.contentHeight();
            for (int i = 0; i * 24 < content; i++) rows.add(net.minecraft.client.gui.components.Button.builder(Component.literal("Row " + (i + 1)), ignored -> {}).bounds(c.x(), c.y() + i * 24, getWidth(), 20).build());
            setScrollAmount(c.value());
            layouts.put(c.name(), new NativeLayout(c.width(), c.height(), List.of()));
        }
        @Override protected int innerPadding() { return 0; }
        @Override protected int getInnerHeight() { return content; }
        @Override protected void extractContents(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            for (var row : rows) row.extractRenderState(graphics, -100, -100, partialTick);
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class SeparatorList extends net.minecraft.client.gui.components.AbstractSelectionList<SeparatorList.SeparatorEntry> {
        static final class SeparatorEntry extends Entry<SeparatorEntry> {
            @Override public void extractContent(GuiGraphicsExtractor graphics, int mouseX, int mouseY, boolean hovered, float partialTick) {}
        }
        SeparatorList(Case c) {
            super(Minecraft.getInstance(), c.width(), 16, c.y() + ("footer".equals(c.state()) ? -16 : 2), 20);
            setX(c.x());
        }
        void extractSeparators(GuiGraphicsExtractor graphics) { super.extractListSeparators(graphics); }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }
    private static final class ReferenceSeparator extends AbstractWidget {
        private final SeparatorList list;
        ReferenceSeparator(Case c) { super(c.x(), c.y(), c.width(), c.height(), Component.empty()); list = new SeparatorList(c); }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) { list.extractSeparators(graphics); }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    private static final class ReferenceLabel extends AbstractWidget {
        private final AbstractWidget text;
        ReferenceLabel(Case c, net.minecraft.client.gui.Font font) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty());
            Component content = Component.literal(c.label());
            List<String> lines = new ArrayList<>();
            if (c.wrapWidth() != null || "center".equals(c.alignment())) {
                var multiline = new net.minecraft.client.gui.components.MultiLineTextWidget(content, font)
                    .setMaxWidth(c.wrapWidth() == null ? c.width() : c.wrapWidth()).setCentered("center".equals(c.alignment()));
                multiline.setPosition(c.x() + ("center".equals(c.alignment()) ? (c.width() - multiline.getWidth()) / 2 : 0), c.y());
                text = multiline;
                for (var line : font.split(content, c.wrapWidth() == null ? c.width() : c.wrapWidth())) {
                    StringBuilder value = new StringBuilder();
                    line.accept((index, style, codepoint) -> { value.appendCodePoint(codepoint); return true; });
                    lines.add(value.toString());
                }
            } else {
                text = new net.minecraft.client.gui.components.StringWidget(c.x(), c.y(), c.width(), c.height(), content, font);
                lines.add(c.label());
            }
            layouts.put(c.name(), new NativeLayout(c.width(), c.height(), lines));
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            text.active = active;
            text.extractRenderState(graphics, -100, -100, partialTick);
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
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
