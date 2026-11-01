import com.google.gson.Gson;
import java.nio.file.*;
import java.util.*;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Style;

/** Observes the original default font's baked CJK geometry and atlas placement. */
public final class GlyphProbeMain {
    public static void main(String[] args) {
        Thread probe = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> {
                            try {
                                var method = client.font.getClass().getDeclaredMethod("getGlyph", int.class, Style.class);
                                method.setAccessible(true);
                                var result = new LinkedHashMap<String, Object>();
                                var textures = new IdentityHashMap<Object, Integer>();
                                for (int codepoint : "你好，世界こんにちは世界안녕하세요 세계Hello 世界 123".codePoints().toArray()) {
                                    if (codepoint < 128 || result.containsKey(Integer.toHexString(codepoint))) continue;
                                    Object glyph = method.invoke(client.font, codepoint, Style.EMPTY);
                                    var values = new LinkedHashMap<String, Object>();
                                    for (String key : List.of("u0", "u1", "v0", "v1", "left", "right", "up", "down", "textureView")) {
                                        var field = glyph.getClass().getDeclaredField(key);
                                        field.setAccessible(true);
                                        Object value = field.get(glyph);
                                        if (key.equals("textureView")) value = textures.computeIfAbsent(value, ignored -> textures.size());
                                        values.put(key, value);
                                    }
                                    result.put(Integer.toHexString(codepoint), values);
                                }
                                Files.writeString(Path.of(System.getProperty("registry.glyph.output")), new Gson().toJson(result));
                                System.out.println("REGISTRY_GLYPH_PROBE_COMPLETE");
                                System.exit(0);
                            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
                        });
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Native font load timed out");
            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
        });
        probe.setDaemon(true); probe.start();
        net.minecraft.client.main.Main.main(args);
    }
}
