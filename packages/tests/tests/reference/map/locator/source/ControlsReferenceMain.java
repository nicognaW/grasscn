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
    record Case(String name, String element, String state, boolean checked, int width, int height, int x, int y, int page, double value, String label, String text, String placeholder, Integer cursor, Integer anchor, int caretMs, Integer maxLength, Integer wrapWidth, String background, String alignment, Integer contentHeight, String color, String overlay, Boolean selected, String[] labels, Integer selectedIndex, Integer targetIndex, Integer disabledIndex, long timeMs, Boolean viewport, Integer lineLimit) {}
    record TabRect(int x, int y, int width, int height) {}
    record NativeLayout(int width, int height, List<String> renderedLines, List<TabRect> tabRects) {
        NativeLayout(int width, int height, List<String> renderedLines) { this(width, height, renderedLines, null); }
    }
    private static final java.util.Map<String, NativeLayout> layouts = new java.util.LinkedHashMap<>();
    private static Case[] cases;
    private static void dumpCheckboxAtlas(Minecraft client) {
        try {
            var manager=client.getAtlasManager();var field=manager.getClass().getDeclaredField("spriteLookup");field.setAccessible(true);
            var result=new java.util.TreeMap<String,Object>();
            for(var entry:((java.util.Map<?,?>)field.get(manager)).entrySet())if(entry.getKey().toString().contains("widget/checkbox")){
                var sprite=(net.minecraft.client.renderer.texture.TextureAtlasSprite)entry.getValue();
                result.put(entry.getKey().toString(),java.util.Map.of("x",sprite.getX(),"y",sprite.getY(),"u0",sprite.getU0(),"u1",sprite.getU1(),"v0",sprite.getV0(),"v1",sprite.getV1()));
            }
            Files.writeString(OUTPUT.getParent().resolve("checkbox-atlas.json"),new Gson().toJson(result));
        }catch(Exception error){throw new IllegalStateException(error);}
    }
    private static boolean observeAfterCapture(Case c) { return c.element().equals("hover-card") || c.element().equals("suggestion-list") || c.element().startsWith("menu-"); }
    private static final java.util.Map<String, Object> observedGlyphs = new java.util.LinkedHashMap<>();
    private static void observeTabGlyphs(Minecraft minecraft, List<Case> pageCases) {
        if (!Boolean.parseBoolean(System.getProperty("registry.reference.observeGlyphs", "true"))) return;
        try {
            var method = minecraft.font.getClass().getDeclaredMethod("getGlyph", int.class, net.minecraft.network.chat.Style.class);
            method.setAccessible(true);
            for (Case c : pageCases) {
                if (!c.element().startsWith("tabs") && !c.element().startsWith("select") && !c.element().equals("dialog") && !c.element().equals("alert-dialog") && !c.element().equals("popover") && !c.element().equals("hover-card") && !c.element().equals("suggestion-list") && !c.element().startsWith("menu-")) continue;
                String text = c.label() == null ? "" : c.label();
                if ((c.element().equals("dialog") || c.element().equals("alert-dialog") || c.element().equals("popover") || c.element().equals("hover-card")) && c.text() != null) text += c.text();
                if (c.labels() != null) text += String.join("", c.labels());
                for (int codepoint : text.codePoints().toArray()) {
                    String code = Integer.toHexString(codepoint);
                    if ((codepoint < 128 && (!(c.element().equals("popover") || c.element().equals("hover-card") || c.element().equals("suggestion-list") || c.element().startsWith("menu-")) || codepoint < 33 || codepoint > 126)) || observedGlyphs.containsKey(code)) continue;
                    Object glyph = method.invoke(minecraft.font, codepoint, net.minecraft.network.chat.Style.EMPTY);
                    var values = new java.util.LinkedHashMap<String, Object>();
                    for (String key : List.of("u0", "u1", "v0", "v1", "left", "right", "up", "down")) {
                        var field = glyph.getClass().getDeclaredField(key); field.setAccessible(true); values.put(key, field.get(glyph));
                    }
                    if (c.element().equals("dialog") || c.element().equals("alert-dialog") || c.element().equals("popover") || c.element().equals("hover-card") || c.element().equals("suggestion-list") || c.element().startsWith("menu-")) {
                        var info = ((net.minecraft.client.gui.font.glyphs.BakedGlyph)glyph).info();
                        values.put("advance",info.getAdvance()); values.put("boldOffset",info.getBoldOffset()); values.put("shadowOffset",info.getShadowOffset());
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
                        client.execute(() -> { for(var components:net.minecraft.core.registries.BuiltInRegistries.DATA_COMPONENT_INITIALIZERS.build(net.minecraft.data.registries.VanillaRegistries.createLookup()))components.apply(); client.gui.setScreen(new ControlsScreen()); });
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

        @Override public void extractBackground(GuiGraphicsExtractor graphics,int mouseX,int mouseY,float partialTick) {
            // A full confirmation screen owns its original background and blur.
            // The wrapper must not schedule a second blur in the same frame.
            if (pageCases != null && pageCases.stream().anyMatch(c -> c.element().equals("alert-dialog"))) return;
            super.extractBackground(graphics,mouseX,mouseY,partialTick);
        }

        @Override protected void init() {
            widgets.clear();
            pageCases = java.util.Arrays.stream(cases).filter(c -> c.page() == page).toList();
            for (Case c : pageCases) {
                AbstractWidget widget = switch (c.element()) {
                    case "toggle-filter" -> createRecipeFilter(c);
                    case "advancement-badge" -> new ReferenceBadge(c);
                    case "advancement-tree" -> new ReferenceAdvancementTree(c);
                    case "book" -> new ReferenceBook(c);
                    case "map" -> new ReferenceMap(c);
                    case "trading" -> new ReferenceTrading(c);
                    case "locator" -> new ReferenceLocator(c);
                    case "sign", "hanging-sign" -> new ReferenceSign(c);
                    case "hotbar" -> new ReferenceHotbar(c);
                    case "health" -> new ReferenceHealth(c);
                    case "armor", "hunger", "air", "experience" -> new ReferenceMeter(c);
                    case "player-preview" -> createPlayerPreview(c);
                    case "pagination-arrow" -> createPaginationArrow(c);
                    case "checkbox" -> Checkbox.builder(Component.empty(), font).pos(c.x(), c.y()).selected(c.checked()).build();
                    case "button" -> net.minecraft.client.gui.components.Button.builder(Component.literal(c.label()), ignored -> {}).bounds(c.x(), c.y(), c.width(), c.height()).build();
                    case "slider" -> new ReferenceSlider(c);
                    case "input" -> createEditBox(c);
                    case "textarea" -> createTextArea(c);
                    case "tooltip" -> new ReferenceTooltip(c, font);
                    case "card" -> new ReferencePanel(c, font);
                    case "popover" -> new ReferencePanel(c, font);
                    case "hover-card" -> new ReferenceTooltip(c, font);
                    case "suggestion-list", "menu-panel" -> new ReferenceSuggestions(c, font, this);
                    case "menu-checkbox", "menu-label", "menu-label-inset", "menu-separator", "menu-sub-trigger", "menu-disabled" -> new ReferenceMenuParts(c, font);
                    case "label" -> new ReferenceLabel(c, font);
                    case "separator" -> new ReferenceSeparator(c);
                    case "scroll-area" -> new ReferenceScrollArea(c);
                    case "progress" -> new ReferenceProgress(c);
                    case "dialog" -> new ReferenceDialog(c);
                    case "alert-dialog" -> new ReferenceConfirmation(c);
                    case "switch" -> net.minecraft.client.gui.components.CycleButton.onOffBuilder(c.checked()).displayOnlyValue().create(c.x(), c.y(), c.width(), c.height(), Component.empty());
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

        private AbstractWidget createPaginationArrow(Case c) {
            String direction = c.checked() ? "forward" : "backward";
            var sprites = new net.minecraft.client.gui.components.WidgetSprites(
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/page_"+direction),
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/page_"+direction+"_highlighted"));
            return new net.minecraft.client.gui.components.ImageButton(c.x(), c.y(), 12, 17, sprites, button -> {}, Component.empty());
        }

        private AbstractWidget createRecipeFilter(Case c) {
            net.minecraft.client.gui.components.WidgetSprites sprites = new net.minecraft.client.gui.components.WidgetSprites(
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/filter_enabled"),
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/filter_disabled"),
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/filter_enabled_highlighted"),
                net.minecraft.resources.Identifier.withDefaultNamespace("recipe_book/filter_disabled_highlighted"));
            return net.minecraft.client.gui.components.CycleButton.booleanBuilder(Component.empty(), Component.empty(), c.checked())
                .withSprite((button, value) -> sprites.get(value, button.isHoveredOrFocused()))
                .displayState(net.minecraft.client.gui.components.CycleButton.DisplayState.HIDE)
                .create(c.x(), c.y(), 26, 16, Component.empty());
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
            observeTabGlyphs(minecraft, pageCases.stream().filter(c -> !observeAfterCapture(c)).toList());
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
                    Case dialog = pageCases.stream().filter(c -> (c.element().equals("dialog") || c.element().equals("alert-dialog")) && Boolean.TRUE.equals(c.viewport())).findFirst().orElse(null);
                    int topGuard = 0x202020, bottomGuard = 0x202020;
                    if (dialog != null) {
                        if (pageCases.size() != 1) throw new IllegalStateException("A viewport dialog must be captured alone");
                        int background = Integer.parseInt(dialog.background().substring(1),16);
                        if (dialog.element().equals("alert-dialog")) {
                            topGuard = bottomGuard = 0;
                            for (int shift : new int[]{16,8,0}) topGuard |= Math.round(((background >>> shift)&255) * (191/255f)) << shift;
                            bottomGuard = topGuard;
                        } else { topGuard = blendBackdrop(background,192); bottomGuard = blendBackdrop(background,208); }
                    }
                    if ((frame.getRGB(1, 1) & 0xffffff) != topGuard ||
                        (frame.getRGB(frame.getWidth() - 2, frame.getHeight() - 2) & 0xffffff) != bottomGuard)
                        throw new IllegalStateException("Native frame is contaminated by an overlay");
                    for (int index = 0; index < pageCases.size(); index++) {
                        Case c = pageCases.get(index);
                        AbstractWidget widget = widgets.get(index);
                        NativeLayout layout = layouts.get(c.name());
                        if (layout != null) layouts.put(c.name()+"-s"+capturedScale,layout);
                        BufferedImage crop = frame.getSubimage(c.x() * capturedScale, c.y() * capturedScale, (layout == null ? widget.getWidth() : layout.width()) * capturedScale, (layout == null ? widget.getHeight() : layout.height()) * capturedScale);
                        ImageIO.write(crop, "png", OUTPUT.resolve(c.name() + "-s" + capturedScale + ".png").toFile());
                    }
                    Files.writeString(OUTPUT.getParent().resolve("layout.json"), new Gson().toJson(layouts));
                    System.out.println("REGISTRY_CONTROLS_CAPTURED=" + capturedScale);
                    minecraft.execute(() -> {
                        if (capturedScale == 3 && capturedPage == java.util.Arrays.stream(cases).mapToInt(Case::page).max().orElse(0)) { if (java.util.Arrays.stream(cases).anyMatch(ControlsReferenceMain::observeAfterCapture)) observeTabGlyphs(minecraft, java.util.Arrays.asList(cases)); if (java.util.Arrays.stream(cases).anyMatch(c -> c.element().startsWith("menu-"))) dumpCheckboxAtlas(minecraft); System.out.println("REGISTRY_REFERENCE_COMPLETE"); minecraft.stop(); }
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

    private static int blendBackdrop(int background,int alpha) {
        int color = 0;
        for (int shift : new int[]{16,8,0}) color |= Math.round(16 * (alpha/255f) + ((background >>> shift)&255) * (1-alpha/255f)) << shift;
        return color;
    }
    private static final class DialogBackground extends Screen {
        private final int color;
        private final boolean patterned;
        private final net.minecraft.client.gui.components.Button button;
        DialogBackground(String hex, boolean patterned) {
            super(Component.empty()); color = (int)(0xff000000L | Long.parseLong(hex.substring(1),16)); this.patterned = patterned;
            button = net.minecraft.client.gui.components.Button.builder(Component.literal("Behind the dialog"),ignored -> {}).bounds(18,100,140,20).build();
        }
        @Override public void extractBackground(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) { graphics.fill(0,0,width,height,color); }
        @Override public void extractRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            if (!patterned) return;
            for (int i=0;i<256;i++) graphics.fill(18+i,18,19+i,82,0xff000000 | i<<16 | (255-i)<<8 | ((i*37)%256));
            button.extractRenderState(graphics,-100,-100,partialTick);
        }
    }
    /** The original PopupScreen supplies layout, font rendering, button rows, panel and backdrop. */
    private static final class ReferenceDialog extends AbstractWidget {
        private final net.minecraft.client.gui.components.PopupScreen popup;
        private final List<net.minecraft.client.gui.components.Button> buttons;
        private final Case reference;
        ReferenceDialog(Case c) {
            super(c.x(),c.y(),Boolean.TRUE.equals(c.viewport()) ? Minecraft.getInstance().getWindow().getGuiScaledWidth() : c.width(),Boolean.TRUE.equals(c.viewport()) ? Minecraft.getInstance().getWindow().getGuiScaledHeight() : c.height(),Component.empty()); reference = c;
            var builder = new net.minecraft.client.gui.components.PopupScreen.Builder(new DialogBackground(c.background(),c.checked()), Component.literal(c.label())).setWidth(c.wrapWidth() == null ? 250 : c.wrapWidth());
            if (c.text() != null) for (String message : c.text().split("\n\n",-1)) builder.addMessage(Component.literal(message));
            for (String label : c.labels() == null ? new String[]{"Done"} : c.labels()) builder.addButton(Component.literal(label),ignored -> {});
            popup = builder.build(); popup.init(getWidth(),getHeight()); popup.clearFocus();
            buttons = popup.children().stream().filter(child -> child instanceof net.minecraft.client.gui.components.Button).map(child -> (net.minecraft.client.gui.components.Button) child).toList();
            for (int i=0;i<buttons.size();i++) { buttons.get(i).setFocused(false); buttons.get(i).active = c.disabledIndex() == null || c.disabledIndex() != i; }
            if (c.state().equals("focus")) buttons.get(c.targetIndex() == null ? 0 : c.targetIndex()).setFocused(true);
            try {
                var field = popup.getClass().getDeclaredField("layout"); field.setAccessible(true);
                var layout = (net.minecraft.client.gui.layouts.LinearLayout) field.get(popup);
                var rectangles = new ArrayList<TabRect>();
                rectangles.add(new TabRect(layout.getX()-18,layout.getY()-18,layout.getWidth()+36,layout.getHeight()+36));
                var descriptions = new ArrayList<String>(); descriptions.add("panel");
                layout.visitWidgets(widget -> { rectangles.add(new TabRect(widget.getX(),widget.getY(),widget.getWidth(),widget.getHeight())); descriptions.add(widget.getMessage().getString()); });
                layouts.put(c.name(),new NativeLayout(getWidth(),getHeight(),descriptions,rectangles));
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mouseX, int mouseY, float partialTick) {
            graphics.enableScissor(getX(),getY(),getRight(),getBottom());
            graphics.pose().pushMatrix(); graphics.pose().translate(getX(),getY());
            var target = buttons.get(reference.targetIndex() == null ? 0 : reference.targetIndex());
            popup.extractRenderStateWithTooltipAndSubtitles(graphics,reference.state().equals("hover") ? target.getX()+1 : -100,reference.state().equals("hover") ? target.getY()+1 : -100,partialTick);
            graphics.pose().popMatrix(); graphics.disableScissor();
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    /** Supplies a controlled scene through Screen's panorama hook; the original
     * ConfirmScreen and Screen render all content, menu shading and GPU blur. */
    private static final class ReferenceConfirmation extends AbstractWidget {
        private final net.minecraft.client.gui.screens.ConfirmScreen confirmation;
        private final List<net.minecraft.client.gui.components.Button> buttons;
        private final Case reference;
        ReferenceConfirmation(Case c) {
            super(c.x(),c.y(),Minecraft.getInstance().getWindow().getGuiScaledWidth(),Minecraft.getInstance().getWindow().getGuiScaledHeight(),Component.empty()); reference=c;
            final int sceneColor=(int)(0xff000000L | Long.parseLong(c.background().substring(1),16));
            var sceneButton=net.minecraft.client.gui.components.Button.builder(Component.literal("Behind the dialog"),ignored -> {}).bounds(18,100,140,20).build();
            var labels=c.labels()==null ? new String[]{"Yes","No"} : c.labels();
            confirmation=new net.minecraft.client.gui.screens.ConfirmScreen(ignored -> {},Component.literal(c.label()),Component.literal(c.text()==null ? "" : c.text()),Component.literal(labels[0]),Component.literal(labels[1])) {
                @Override protected void extractPanorama(GuiGraphicsExtractor graphics,float partialTick) {
                    graphics.fill(0,0,width,height,sceneColor);
                    if (c.checked()) {
                        for(int i=0;i<256;i++) graphics.fill(18+i,18,19+i,82,0xff000000 | i<<16 | (255-i)<<8 | ((i*37)%256));
                        sceneButton.extractRenderState(graphics,-100,-100,partialTick);
                    }
                    // PanoramaRenderState is drawn before GUI strata. Put the
                    // controlled replacement scene before the native blur too.
                    graphics.nextStratum();
                }
            };
            Minecraft.getInstance().options.menuBackgroundBlurriness().set((int)c.value());
            confirmation.init(getWidth(),getHeight()); confirmation.clearFocus();
            buttons=confirmation.children().stream().filter(child -> child instanceof net.minecraft.client.gui.components.Button).map(child -> (net.minecraft.client.gui.components.Button)child).toList();
            for(int i=0;i<buttons.size();i++) {buttons.get(i).setFocused(false);buttons.get(i).active=c.disabledIndex()==null || c.disabledIndex()!=i;}
            if(c.state().equals("focus"))buttons.get(c.targetIndex()==null ? 0 : c.targetIndex()).setFocused(true);
            try {
                var field=net.minecraft.client.gui.screens.ConfirmScreen.class.getDeclaredField("layout");field.setAccessible(true);
                var layout=(net.minecraft.client.gui.layouts.LinearLayout)field.get(confirmation);
                var rectangles=new ArrayList<TabRect>();rectangles.add(new TabRect(layout.getX(),layout.getY(),layout.getWidth(),layout.getHeight()));
                var descriptions=new ArrayList<String>();descriptions.add("confirmation layout");
                layout.visitWidgets(widget -> {rectangles.add(new TabRect(widget.getX(),widget.getY(),widget.getWidth(),widget.getHeight()));descriptions.add(widget.getMessage().getString());});
                layouts.put(c.name(),new NativeLayout(getWidth(),getHeight(),descriptions,rectangles));
            }catch(ReflectiveOperationException error){throw new IllegalStateException(error);}
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mouseX,int mouseY,float partialTick) {
            var target=buttons.get(reference.targetIndex()==null ? 0 : reference.targetIndex());
            confirmation.extractRenderStateWithTooltipAndSubtitles(graphics,reference.state().equals("hover") ? target.getX()+1 : -100,reference.state().equals("hover") ? target.getY()+1 : -100,partialTick);
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

    /** Analyst-defined menu slot layout, painted entirely by native widgets and GUI primitives. */
    private static final class ReferenceMenuParts extends AbstractWidget {
        private final Case c;
        private final net.minecraft.client.gui.Font font;
        private AbstractWidget child;
        ReferenceMenuParts(Case c, net.minecraft.client.gui.Font font) {
            super(c.x(),c.y(),c.width(),c.height(),Component.empty());this.c=c;this.font=font;
            int x=c.x()+6,y=c.y()+6;
            if(c.element().equals("menu-checkbox")) {
                child=Checkbox.builder(Component.literal(c.label()),font).pos(x+1,y+1).selected(c.checked()).build();
                child.active=!c.state().startsWith("disabled");child.setFocused(c.state().equals("focus"));
            } else if(c.element().equals("menu-separator")) {
                var json=new Gson().toJsonTree(c).getAsJsonObject();json.addProperty("name",c.name()+"-separator");json.addProperty("state","header");json.addProperty("x",x);json.addProperty("y",y+2);json.addProperty("width",c.width()-12);json.addProperty("height",2);
                child=new ReferenceSeparator(new Gson().fromJson(json,Case.class));
            } else {
                int inset=c.element().equals("menu-label-inset") ? 22 : 1;
                var text=new net.minecraft.client.gui.components.StringWidget(x+inset,y+2,font.width(c.label()),9,c.element().equals("menu-disabled") ? AbstractWidget.WithInactiveMessage.defaultInactiveMessage(Component.literal(c.label())) : Component.literal(c.label()),font);
                if(c.element().equals("menu-sub-trigger"))text.setMessage(Component.literal(c.label()).withStyle(style -> style.withColor(c.state().equals("focus") ? 0xffff00 : 0xaaaaaa)));
                text.active=!c.element().equals("menu-disabled");child=text;
            }
            layouts.put(c.name(),new NativeLayout(c.width(),c.height(),c.label()==null ? List.of() : List.of(c.label())));
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mx,int my,float time) {
            graphics.blitSprite(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED,net.minecraft.resources.Identifier.withDefaultNamespace("popup/background"),getX(),getY(),getWidth(),getHeight());
            if(!c.element().equals("menu-separator"))graphics.fill(getX()+6,getY()+6,getX()+getWidth()-6,getY()+getHeight()-6,0xd0000000);
            child.extractRenderState(graphics,-100,-100,time);
            if(c.element().equals("menu-sub-trigger"))graphics.text(font,">",getX()+getWidth()-7-font.width(">"),getY()+8,c.state().equals("focus") ? 0xffffff00 : 0xffaaaaaa);
        }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

    /** Original suggestion-list renderer, optionally placed on the original popup sprite. */
    private static final class ReferenceSuggestions extends AbstractWidget {
        private final Case c;
        private final net.minecraft.client.gui.components.CommandSuggestions.SuggestionsList list;
        private final net.minecraft.client.renderer.Rect2i rect;
        ReferenceSuggestions(Case c, net.minecraft.client.gui.Font font, Screen screen) {
            super(c.x(), c.y(), c.width(), c.height(), Component.empty()); this.c = c;
            int limit = c.lineLimit() == null ? c.labels().length : c.lineLimit();
            boolean panel = c.element().equals("menu-panel");
            int padding = panel ? 6 : c.labels().length > limit ? 1 : 0;
            int rows = Math.min(c.labels().length, limit);
            if (c.height() != rows * 12 + padding * 2) throw new IllegalArgumentException("Unexpected suggestion envelope " + c.name());
            var input = new EditBox(font, 0, 0, 200, 20, Component.empty()); input.setBordered(true); input.setValue(c.text() == null ? "" : c.text());
            var owner = new net.minecraft.client.gui.components.CommandSuggestions(Minecraft.getInstance(), screen, input, font, false, false, 1, limit, false, 0xd0000000);
            var values = java.util.Arrays.stream(c.labels()).map(label -> new com.mojang.brigadier.suggestion.Suggestion(com.mojang.brigadier.context.StringRange.at(0), label)).toList();
            try {
                var constructor = net.minecraft.client.gui.components.CommandSuggestions.SuggestionsList.class.getDeclaredConstructor(net.minecraft.client.gui.components.CommandSuggestions.class, int.class, int.class, int.class, List.class, boolean.class);
                constructor.setAccessible(true);
                int x = c.x() + (panel ? 6 : 0), y = c.y() + padding, width = c.width() - (panel ? 12 : 0);
                list = constructor.newInstance(owner, x, y + 1, width - 1, values, false);
                for (String name : List.of("offset", "current")) {
                    var field = list.getClass().getDeclaredField(name); field.setAccessible(true);
                    field.setInt(list, name.equals("offset") ? (int)c.value() : c.selectedIndex() == null ? -1 : c.selectedIndex());
                }
                var field = list.getClass().getDeclaredField("rect"); field.setAccessible(true); rect = (net.minecraft.client.renderer.Rect2i)field.get(list);
                if (rect.getX() != x || rect.getY() != y || rect.getWidth() != width || rect.getHeight() != rows * 12) throw new IllegalStateException("Native suggestion geometry changed");
                int offset = (int)c.value();
                layouts.put(c.name(), new NativeLayout(c.width(), c.height(), java.util.Arrays.asList(c.labels()).subList(offset, Math.min(c.labels().length, offset + rows))));
            } catch (ReflectiveOperationException error) { throw new IllegalStateException(error); }
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics, int mx, int my, float time) {
            if (c.element().equals("menu-panel")) graphics.blitSprite(net.minecraft.client.renderer.RenderPipelines.GUI_TEXTURED, net.minecraft.resources.Identifier.withDefaultNamespace("popup/background"), getX(), getY(), getWidth(), getHeight());
            boolean hover = c.state().endsWith("hover");
            list.extractRenderState(graphics, hover ? rect.getX() + 2 : -100, hover ? rect.getY() + (c.targetIndex() - (int)c.value()) * 12 + 6 : -100);
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




    private static AbstractWidget createPlayerPreview(Case c){
      var mc=Minecraft.getInstance();var skin=new net.minecraft.core.ClientAsset.ResourceTexture(net.minecraft.resources.Identifier.withDefaultNamespace("entity/player/"+c.state()));
      var model=c.state().startsWith("slim/")?net.minecraft.world.entity.player.PlayerModelType.SLIM:net.minecraft.world.entity.player.PlayerModelType.WIDE;
      var widget=new net.minecraft.client.gui.components.PlayerSkinWidget(c.width(),c.height(),mc.getEntityModels(),()->net.minecraft.world.entity.player.PlayerSkin.insecure(skin,null,null,model));widget.setX(c.x());widget.setY(c.y());
      try{var pitch=widget.getClass().getDeclaredField("rotationX");pitch.setAccessible(true);pitch.setFloat(widget,c.anchor());var yaw=widget.getClass().getDeclaredField("rotationY");yaw.setAccessible(true);yaw.setFloat(widget,(float)c.value());}catch(Exception e){throw new IllegalStateException(e);}return widget;
    }
    private static final class HotbarPlayer extends net.minecraft.client.player.LocalPlayer {
      net.minecraft.world.entity.player.Inventory inventory;
      int meterValue; net.minecraft.world.food.FoodData food;
      @Override public net.minecraft.world.entity.player.Abilities getAbilities(){return new net.minecraft.world.entity.player.Abilities();}
      @Override public boolean isSpectator(){return false;}
      @Override public boolean isCreative(){return false;}

      @Override public int getArmorValue(){return meterValue;}
      @Override public net.minecraft.world.food.FoodData getFoodData(){return food;}
      @Override public boolean hasEffect(net.minecraft.core.Holder<net.minecraft.world.effect.MobEffect> effect){return false;}
      @Override public int getMaxAirSupply(){return 300;}
      @Override public int getAirSupply(){return meterValue*30;}
      @Override public boolean isEyeInFluid(net.minecraft.tags.TagKey<net.minecraft.world.level.material.Fluid> fluid){return true;}
      @Override public int getXpNeededForNextLevel(){return 7;}

      private HotbarPlayer(){super(null,null,null,null,null,null,false,null);}
      @Override public net.minecraft.world.entity.player.Inventory getInventory(){return inventory;}
      @Override public net.minecraft.world.item.ItemStack getOffhandItem(){return net.minecraft.world.item.ItemStack.EMPTY;}
      @Override public net.minecraft.world.entity.HumanoidArm getMainArm(){return net.minecraft.world.entity.HumanoidArm.RIGHT;}
      @Override public float getAttackStrengthScale(float time){return 1f;}
    }
    private static final class ReferenceHotbar extends AbstractWidget {
      final HotbarPlayer player;final java.lang.reflect.Method method;final int selected;
      ReferenceHotbar(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());selected=(int)c.value();try{var field=sun.misc.Unsafe.class.getDeclaredField("theUnsafe");field.setAccessible(true);var unsafe=(sun.misc.Unsafe)field.get(null);player=(HotbarPlayer)unsafe.allocateInstance(HotbarPlayer.class);player.inventory=new net.minecraft.world.entity.player.Inventory(null,new net.minecraft.world.entity.EntityEquipment());method=net.minecraft.client.gui.Hud.class.getDeclaredMethod("extractItemHotbar",GuiGraphicsExtractor.class,net.minecraft.client.DeltaTracker.class);method.setAccessible(true);}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mx,int my,float partial){var mc=Minecraft.getInstance();try{var camera=mc.gameRenderer.mainCamera();var prior=camera.entity();player.inventory.setSelectedSlot(selected);camera.setEntity(player);graphics.pose().pushMatrix();graphics.pose().translate(getX()-(graphics.guiWidth()/2-92),getY()-(graphics.guiHeight()-23));try{method.invoke(mc.gui.hud,graphics,net.minecraft.client.DeltaTracker.ZERO);}finally{graphics.pose().popMatrix();camera.setEntity(prior);}}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceMeter extends AbstractWidget {
      final HotbarPlayer player;final Case sample;
      ReferenceMeter(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());sample=c;try{var field=sun.misc.Unsafe.class.getDeclaredField("theUnsafe");field.setAccessible(true);player=(HotbarPlayer)((sun.misc.Unsafe)field.get(null)).allocateInstance(HotbarPlayer.class);player.meterValue=(int)c.value();player.food=new net.minecraft.world.food.FoodData();player.food.setFoodLevel((int)c.value());player.food.setSaturation(5f);player.experienceProgress=(float)c.value();}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){var mc=Minecraft.getInstance();try{var type=net.minecraft.client.gui.Hud.class;var tick=type.getDeclaredField("tickCount");tick.setAccessible(true);tick.setInt(mc.gui.hud,1);switch(sample.element()){
       case "armor"->{var m=type.getDeclaredMethod("extractArmor",GuiGraphicsExtractor.class,net.minecraft.world.entity.player.Player.class,int.class,int.class,int.class,int.class);m.setAccessible(true);m.invoke(null,g,player,getY()+10,1,0,getX());}
       case "hunger"->{var m=type.getDeclaredMethod("extractFood",GuiGraphicsExtractor.class,net.minecraft.world.entity.player.Player.class,int.class,int.class);m.setAccessible(true);m.invoke(mc.gui.hud,g,player,getY(),getX()+81);}
       case "air"->{var m=type.getDeclaredMethod("extractAirBubbles",GuiGraphicsExtractor.class,net.minecraft.world.entity.player.Player.class,int.class,int.class,int.class);m.setAccessible(true);m.invoke(mc.gui.hud,g,player,0,getY()-10,getX()+81);}
       case "experience"->{var bar=new net.minecraft.client.gui.contextualbar.ExperienceBar(mc);var prior=mc.player;mc.player=player;g.pose().pushMatrix();g.pose().translate(getX()-bar.left(mc.getWindow()),getY()-bar.top(mc.getWindow()));try{bar.extractBackground(g,net.minecraft.client.DeltaTracker.ZERO);}finally{g.pose().popMatrix();mc.player=prior;}}
      }}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceHealth extends AbstractWidget {
      final java.lang.reflect.Method method;final Object heart,container;final int value;
      ReferenceHealth(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());value=(int)c.value();try{Class type=Class.forName("net.minecraft.client.gui.Hud$HeartType");heart=java.lang.Enum.valueOf(type,c.state());container=java.lang.Enum.valueOf(type,"CONTAINER");method=net.minecraft.client.gui.Hud.class.getDeclaredMethod("extractHeart",GuiGraphicsExtractor.class,type,int.class,int.class,boolean.class,boolean.class,boolean.class);method.setAccessible(true);}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){try{for(int i=9;i>=0;i--){method.invoke(Minecraft.getInstance().gui.hud,g,container,getX()+i*8,getY(),false,false,false);if(value-i*2>0)method.invoke(Minecraft.getInstance().gui.hud,g,heart,getX()+i*8,getY(),false,false,value-i*2==1);}}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }

    private static final class ControlledBookScreen extends net.minecraft.client.gui.screens.inventory.BookViewScreen {
      ControlledBookScreen(Case c){super();init(192,192);setBookAccess(new BookAccess(java.util.Arrays.stream(c.labels()).<Component>map(Component::literal).toList()));setPage((int)c.value());}
      @Override protected void createMenuControls(){}
      @Override protected void extractPanorama(GuiGraphicsExtractor graphics,float partial){}
      @Override protected void extractBlurredBackground(GuiGraphicsExtractor graphics){}
      @Override protected void extractMenuBackground(GuiGraphicsExtractor graphics){}
      @Override protected void extractMenuBackground(GuiGraphicsExtractor graphics,int x,int y,int w,int h){}
      @Override public void extractTransparentBackground(GuiGraphicsExtractor graphics){}
    }
    private static final class ControlledMerchantScreen extends net.minecraft.client.gui.screens.inventory.MerchantScreen {
      ControlledMerchantScreen(net.minecraft.world.inventory.MerchantMenu menu,net.minecraft.world.entity.player.Inventory inventory,Component title){super(menu,inventory,title);}
      @Override protected void extractPanorama(GuiGraphicsExtractor g,float partial){}
      @Override protected void extractBlurredBackground(GuiGraphicsExtractor g){}
      @Override protected void extractMenuBackground(GuiGraphicsExtractor g){}
      @Override protected void extractMenuBackground(GuiGraphicsExtractor g,int x,int y,int w,int h){}
      @Override public void extractTransparentBackground(GuiGraphicsExtractor g){}
    }
    private static final class ReferenceTrading extends AbstractWidget {
      final HotbarPlayer player;final ControlledMerchantScreen screen;
      ReferenceTrading(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());var mc=Minecraft.getInstance();var prior=mc.player;try{var field=sun.misc.Unsafe.class.getDeclaredField("theUnsafe");field.setAccessible(true);player=(HotbarPlayer)((sun.misc.Unsafe)field.get(null)).allocateInstance(HotbarPlayer.class);player.inventory=new net.minecraft.world.entity.player.Inventory(player,new net.minecraft.world.entity.EntityEquipment());mc.player=player;var menu=new net.minecraft.world.inventory.MerchantMenu(0,player.inventory);var offers=new net.minecraft.world.item.trading.MerchantOffers();for(int i=0;i<9;i++){var offer=new net.minecraft.world.item.trading.MerchantOffer(new net.minecraft.world.item.trading.ItemCost(net.minecraft.world.item.Items.DIAMOND,i+1),new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND),5,1,0f);if(i==8)offer.setToOutOfStock();offers.add(offer);}menu.setOffers(offers);menu.setSelectionHint((int)c.value());menu.getSlot(0).set(new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND,(int)c.value()+1));menu.getSlot(2).set(new net.minecraft.world.item.ItemStack(net.minecraft.world.item.Items.DIAMOND));screen=new ControlledMerchantScreen(menu,player.inventory,Component.literal("Component shop"));screen.init(276,166);for(String name:List.of("shopItem","scrollOff")){var f=net.minecraft.client.gui.screens.inventory.MerchantScreen.class.getDeclaredField(name);f.setAccessible(true);f.setInt(screen,name.equals("shopItem")?(int)c.value():c.cursor());}}catch(Exception error){throw new IllegalStateException(error);}finally{mc.player=prior;}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){var mc=Minecraft.getInstance();var prior=mc.player;mc.player=player;g.pose().pushMatrix();g.pose().translate(getX(),getY());try{screen.extractRenderState(g,-100,-100,0);}finally{g.pose().popMatrix();mc.player=prior;}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceLocator extends AbstractWidget {
      final Case sample;final net.minecraft.client.gui.contextualbar.LocatorBar bar;final java.lang.reflect.Method draw;final HotbarPlayer player;final net.minecraft.world.waypoints.TrackedWaypoint point;
      ReferenceLocator(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());sample=c;bar=new net.minecraft.client.gui.contextualbar.LocatorBar(Minecraft.getInstance());try{var field=sun.misc.Unsafe.class.getDeclaredField("theUnsafe");field.setAccessible(true);player=(HotbarPlayer)((sun.misc.Unsafe)field.get(null)).allocateInstance(HotbarPlayer.class);var icon=new net.minecraft.world.waypoints.Waypoint.Icon();icon.color=java.util.Optional.of(0xff000000|Integer.parseInt(c.color().substring(1),16));point=net.minecraft.world.waypoints.TrackedWaypoint.setAzimuth(java.util.UUID.fromString("00000000-0000-0000-0000-000000000012"),icon,(float)c.value()*((float)Math.PI/180f));draw=bar.getClass().getDeclaredMethod("lambda$extractRenderState$1",net.minecraft.world.entity.Entity.class,net.minecraft.world.level.Level.class,net.minecraft.world.waypoints.PartialTickSupplier.class,GuiGraphicsExtractor.class,int.class,net.minecraft.world.waypoints.TrackedWaypoint.class);draw.setAccessible(true);System.out.println("LOCATOR_STYLE="+Minecraft.getInstance().gui.hud.getWaypointStyles().get(icon.style).sprite(Float.POSITIVE_INFINITY));}catch(Exception error){throw new IllegalStateException(error);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){var mc=Minecraft.getInstance();g.pose().pushMatrix();g.pose().translate(getX()-bar.left(mc.getWindow()),getY()+6-bar.top(mc.getWindow()));try{bar.extractBackground(g,net.minecraft.client.DeltaTracker.ZERO);if(sample.checked())draw.invoke(bar,player,null,(net.minecraft.world.waypoints.PartialTickSupplier)(entity->0f),g,bar.top(mc.getWindow()),point);}catch(Exception error){throw new IllegalStateException(error);}finally{g.pose().popMatrix();}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceMap extends AbstractWidget {
      final net.minecraft.client.renderer.state.MapRenderState state=new net.minecraft.client.renderer.state.MapRenderState();
      ReferenceMap(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());try{var data=net.minecraft.world.level.saveddata.maps.MapItemSavedData.createFresh(0,0,(byte)0,false,false,net.minecraft.world.level.Level.OVERWORLD);for(int i=0;i<16384;i++)data.colors[i]=(byte)(c.state().equals("palette")?i%256:c.state().equals("empty")?0:i/128<40?6:i%128<48?50:i/128>100?10:34);if(c.checked()){var field=data.getClass().getDeclaredField("decorations");field.setAccessible(true);var decorations=(java.util.Map<String,net.minecraft.world.level.saveddata.maps.MapDecoration>)field.get(data);decorations.put("home",new net.minecraft.world.level.saveddata.maps.MapDecoration(net.minecraft.world.level.saveddata.maps.MapDecorationTypes.FRAME,(byte)0,(byte)0,(byte)c.value(),java.util.Optional.empty()));decorations.put("village",new net.minecraft.world.level.saveddata.maps.MapDecoration(net.minecraft.world.level.saveddata.maps.MapDecorationTypes.PLAINS_VILLAGE,(byte)70,(byte)-50,(byte)c.value(),java.util.Optional.empty()));}var id=new net.minecraft.world.level.saveddata.maps.MapId(c.name().hashCode());Minecraft.getInstance().getMapTextureManager().update(id,data);Minecraft.getInstance().getMapRenderer().extractRenderState(id,data,state);}catch(Exception error){throw new IllegalStateException(error);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){g.pose().pushMatrix();g.pose().translate(getX(),getY());g.map(state);g.pose().popMatrix();}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceSign extends AbstractWidget {
      final net.minecraft.client.gui.screens.inventory.AbstractSignEditScreen screen;final java.lang.reflect.Method method;final float origin;
      ReferenceSign(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());boolean hanging=c.element().equals("hanging-sign");origin=hanging?50:30;try{var block=(net.minecraft.world.level.block.Block)net.minecraft.world.level.block.Blocks.class.getField(c.state().toUpperCase()+ (hanging?"_HANGING_SIGN":"_SIGN")).get(null);var state=block.defaultBlockState();net.minecraft.world.level.block.entity.SignBlockEntity sign=hanging?new net.minecraft.world.level.block.entity.HangingSignBlockEntity(net.minecraft.core.BlockPos.ZERO,state):new net.minecraft.world.level.block.entity.SignBlockEntity(net.minecraft.core.BlockPos.ZERO,state);var text=new net.minecraft.world.level.block.entity.SignText().setHasGlowingText(c.checked());for(int i=0;i<4;i++)text=text.setMessage(i,Component.literal(c.labels()[i]));var front=net.minecraft.world.level.block.entity.SignBlockEntity.class.getDeclaredField("frontText");front.setAccessible(true);front.set(sign,text);screen=hanging?new net.minecraft.client.gui.screens.inventory.HangingSignEditScreen(sign,true,false):new net.minecraft.client.gui.screens.inventory.SignEditScreen(sign,true,false);screen.init(120,200);var type=net.minecraft.client.gui.screens.inventory.AbstractSignEditScreen.class;var line=type.getDeclaredField("line");line.setAccessible(true);line.setInt(screen,-1);method=type.getDeclaredMethod("extractSign",GuiGraphicsExtractor.class);method.setAccessible(true);}catch(Exception e){throw new IllegalStateException(e);}}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor g,int mx,int my,float partial){g.pose().pushMatrix();g.pose().translate(getX(),getY()+origin-(origin==50?125:90));try{method.invoke(screen,g);}catch(Exception e){throw new IllegalStateException(e);}finally{g.pose().popMatrix();}}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }
    private static final class ReferenceBook extends AbstractWidget {
      private final ControlledBookScreen book;
      ReferenceBook(Case c){super(c.x(),c.y(),c.width(),c.height(),Component.empty());book=new ControlledBookScreen(c);}
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mx,int my,float partial){graphics.pose().pushMatrix();graphics.pose().translate(getX(),getY()-2);book.extractBackground(graphics,-100,-100,0);book.extractRenderState(graphics,-100,-100,0);graphics.pose().popMatrix();}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }

    private static final class ReferenceAdvancementTree extends AbstractWidget {
      private final net.minecraft.client.gui.screens.advancements.AdvancementTab tab;
      ReferenceAdvancementTree(Case c){
        super(c.x(),c.y(),c.width(),c.height(),Component.empty());
        var mc=Minecraft.getInstance();
        var kinds=net.minecraft.advancements.AdvancementType.values();
        var nodes=new java.util.ArrayList<net.minecraft.advancements.AdvancementNode>();
        float[][] positions={{0,1},{2,0},{2,2},{4,1}};
        var requirements=net.minecraft.advancements.AdvancementRequirements.allOf(java.util.List.of("earned"));
        net.minecraft.client.gui.screens.advancements.AdvancementTab created=null;
        for(int i=0;i<4;i++){
          var display=new net.minecraft.advancements.DisplayInfo(new net.minecraft.world.item.ItemStackTemplate(net.minecraft.world.item.Items.DIAMOND),Component.literal("Milestone "+i),Component.empty(),java.util.Optional.of(new net.minecraft.core.ClientAsset.ResourceTexture(net.minecraft.resources.Identifier.withDefaultNamespace("block/stone"))),i==0?net.minecraft.advancements.AdvancementType.TASK:i==1?net.minecraft.advancements.AdvancementType.GOAL:net.minecraft.advancements.AdvancementType.CHALLENGE,false,false,false);
          display.setLocation(positions[i][0],positions[i][1]);
          var parent=i==0?null:nodes.get(i==3?1:0);
          var advancement=new net.minecraft.advancements.Advancement(java.util.Optional.ofNullable(parent).map(n->n.holder().id()),java.util.Optional.of(display),net.minecraft.advancements.AdvancementRewards.EMPTY,java.util.Map.of(),requirements,false);
          var holder=new net.minecraft.advancements.AdvancementHolder(net.minecraft.resources.Identifier.withDefaultNamespace("registry/tree_"+i),advancement);
          var node=new net.minecraft.advancements.AdvancementNode(holder,parent);nodes.add(node);if(parent!=null)parent.addChild(node);
          if(i==0){var screen=new net.minecraft.client.gui.screens.advancements.AdvancementsScreen(null);screen.width=1536;created=net.minecraft.client.gui.screens.advancements.AdvancementTab.create(mc,screen,0,node);}else created.addAdvancement(node);
          var progress=new net.minecraft.advancements.AdvancementProgress();progress.update(requirements);if((((int)c.value())&(1<<i))!=0)progress.grantProgress("earned");created.getWidget(holder).setProgress(progress);
        }
        tab=created;
        try{for(String name:java.util.List.of("centered","scrollX","scrollY")){var f=tab.getClass().getDeclaredField(name);f.setAccessible(true);if(name.equals("centered"))f.setBoolean(tab,true);else f.setDouble(tab,name.equals("scrollX")?c.cursor():c.anchor());}}catch(Exception e){throw new IllegalStateException(e);}
      }
      @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mx,int my,float partial){tab.extractContents(graphics,getX(),getY());}
      @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output){}
    }

    private static final class ReferenceBadge extends AbstractWidget {
        private final net.minecraft.client.gui.screens.advancements.AdvancementWidget widget;
        ReferenceBadge(Case c) {
            super(c.x(),c.y(),c.width(),26,Component.empty());
            var mc=Minecraft.getInstance();
            var kind=net.minecraft.advancements.AdvancementType.valueOf(c.state().toUpperCase(java.util.Locale.ROOT));
            var display=new net.minecraft.advancements.DisplayInfo(new net.minecraft.world.item.ItemStackTemplate(net.minecraft.world.item.Items.DIAMOND),Component.literal(c.label()),Component.empty(),java.util.Optional.empty(),kind,false,false,false);
            var requirements=net.minecraft.advancements.AdvancementRequirements.allOf(java.util.List.of("earned"));
            var advancement=new net.minecraft.advancements.Advancement(java.util.Optional.empty(),java.util.Optional.of(display),net.minecraft.advancements.AdvancementRewards.EMPTY,java.util.Map.of(),requirements,false);
            var holder=new net.minecraft.advancements.AdvancementHolder(net.minecraft.resources.Identifier.withDefaultNamespace("registry/badge"),advancement);
            var node=new net.minecraft.advancements.AdvancementNode(holder,null);
            var screen=new net.minecraft.client.gui.screens.advancements.AdvancementsScreen(null); screen.width=1536;
            var tab=net.minecraft.client.gui.screens.advancements.AdvancementTab.create(mc,screen,0,node);
            widget=tab.getWidget(holder);
            var progress=new net.minecraft.advancements.AdvancementProgress(); progress.update(requirements);if(c.checked())progress.grantProgress("earned");widget.setProgress(progress);
            try { var width=widget.getClass().getDeclaredField("width");width.setAccessible(true);int actual=width.getInt(widget);if(actual!=c.width())throw new IllegalStateException("Badge width mismatch: "+actual+" expected "+c.width()); }catch(ReflectiveOperationException e){throw new IllegalStateException(e);}
        }
        @Override protected void extractWidgetRenderState(GuiGraphicsExtractor graphics,int mx,int my,float time){ widget.extractHover(graphics,getX(),getY(),1f,0,0); }
        @Override protected void updateWidgetNarration(net.minecraft.client.gui.narration.NarrationElementOutput output) {}
    }

}
