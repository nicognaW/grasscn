import com.google.gson.Gson;
import java.nio.file.*;
import java.util.*;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;

/** Reads original runtime atlas placement; does not construct reference pixels. */
public final class AtlasProbeMain {
    public static void main(String[] args) {
        Thread probe = new Thread(() -> {
            try {
                long deadline = System.nanoTime() + 180_000_000_000L;
                while (System.nanoTime() < deadline) {
                    Minecraft client = Minecraft.getInstance();
                    if (client != null && client.isGameLoadFinished() && client.gui.overlay() == null) {
                        client.execute(() -> {
                            try {
                                var manager = client.getAtlasManager();
                                var field = manager.getClass().getDeclaredField("spriteLookup");
                                field.setAccessible(true);
                                Map<?, ?> sprites = (Map<?, ?>) field.get(manager);
                                var result = new TreeMap<String, Object>();
                                for (var entry : sprites.entrySet()) if (entry.getKey().toString().contains("tooltip/")) {
                                    var sprite = (TextureAtlasSprite) entry.getValue();
                                    result.put(entry.getKey().toString(), Map.of("x", sprite.getX(), "y", sprite.getY(), "u0", sprite.getU0(), "u1", sprite.getU1(), "v0", sprite.getV0(), "v1", sprite.getV1(), "u10", sprite.getU(.1f), "u90", sprite.getU(.9f), "v10", sprite.getV(.1f), "v90", sprite.getV(.9f)));
                                }
                                Files.writeString(Path.of(System.getProperty("registry.atlas.output")), new Gson().toJson(result));
                                System.out.println("REGISTRY_ATLAS_PROBE_COMPLETE");
                                System.exit(0);
                            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
                        });
                        return;
                    }
                    Thread.sleep(100);
                }
                throw new IllegalStateException("Native atlas load timed out");
            } catch (Throwable error) { error.printStackTrace(); System.exit(2); }
        });
        probe.setDaemon(true);
        probe.start();
        net.minecraft.client.main.Main.main(args);
    }
}
