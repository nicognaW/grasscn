"""Read-only asset/class evidence for the pinned Minecraft UI port plan."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument("--jar", required=True, type=Path)
parser.add_argument("--java-bin", required=True, type=Path)
parser.add_argument("--output", type=Path, default=Path("tests/reference/catalog/native-inventory.json"))
args = parser.parse_args()
sha = lambda data: hashlib.sha256(data).hexdigest()
digest = sha(args.jar.read_bytes())
if digest != "40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290":
    raise SystemExit("Artifact digest differs from the agreed Java 26.2 reference")
selected = set("""Font AbstractButton AbstractScrollArea AbstractSelectionList AbstractSliderButton AbstractTextAreaWidget
BossHealthOverlay Button ChatComponent Checkbox CommandSuggestions CycleButton EditBox ItemDisplayWidget
LoadingDotsWidget MultiLineEditBox MultiLineLabel PlayerFaceExtractor PlayerFaceWidget PlayerTabOverlay PopupScreen
StringWidget TabButton AbstractDebugChart ProfilerPieChart MenuTabBar TabNavigationBar SystemToast TutorialToast
ConfirmScreen LoadingDotsText Screen DialogScreen MultiButtonDialogScreen SimpleDialogScreen InputControlHandlers
BookViewScreen PageButton TooltipRenderUtil KeyBindsList RecipeBookComponent RecipeBookPage RecipeButton SwitchGrid
WorldSelectionList TextCursorUtils GuiGraphicsExtractor RenderPipelines""".split())
assets, classes, resources = {}, {}, {}
with zipfile.ZipFile(args.jar) as archive:
    names = set(archive.namelist())
    for name in sorted(names):
        if name.endswith(".png") and (name.startswith("assets/minecraft/textures/gui/") or
            name.startswith("assets/minecraft/textures/entity/player/") or name == "assets/minecraft/textures/font/ascii.png"):
            data = archive.read(name)
            record = dict(sha256=sha(data), width=struct.unpack(">I", data[16:20])[0], height=struct.unpack(">I", data[20:24])[0])
            if name + ".mcmeta" in names:
                metadata = archive.read(name + ".mcmeta")
                record.update(metadata=json.loads(metadata), metadataSha256=sha(metadata))
            assets[name] = record
        elif name.startswith("net/minecraft/client/") and name.endswith(".class") and name.rsplit("/", 1)[-1][:-6] in selected:
            class_name = name[:-6].replace("/", ".")
            command = args.java_bin / ("javap.exe" if os.name == "nt" else "javap")
            result = subprocess.run([str(command), "-classpath", str(args.jar), "-p", "-c", class_name],
                check=True, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            text = result.stdout.decode("utf-8")
            classes[class_name] = dict(member=name, sha256=sha(archive.read(name)), disassemblySha256=sha(result.stdout),
                methods=[line.strip() for line in text.splitlines() if line.startswith("  ") and not line.startswith("    ") and "(" in line and line.strip().endswith(";")],
                resourceConstants=[line.split("// String ", 1)[1] for line in text.splitlines() if "// String " in line])
    for name in ["assets/minecraft/font/default.json", "assets/minecraft/font/include/default.json"]:
        data = archive.read(name)
        resources[name] = dict(sha256=sha(data), definition=json.loads(data))
    found = {name.rsplit(".", 1)[-1] for name in classes}
    if found != selected:
        raise SystemExit(f"Class coverage differs: missing={selected - found}; unexpected={found - selected}")
    output = dict(minecraftVersion=json.loads(archive.read("version.json"))["id"], jarSha256=digest,
        assets=assets, classes=classes, resources=resources,
        evidence=dict(authority="shipped-artifact", reaInventory="ev_398c8e9794747ef63b3c4c389987305b8b012e52a3593f7aa0b7739b445ade05",
            method="Python zipfile: original bytes, PNG dimensions, metadata. javap -p -c: method signatures and resource constants. Static inventory does not establish runtime fidelity.",
            tool=subprocess.run([str(command), "-version"], check=True, capture_output=True, text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0).stdout.strip()))
if sha(args.jar.read_bytes()) != digest:
    raise SystemExit("Source artifact changed during inspection")
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
print(f"Inspected {len(assets)} textures, {len(classes)} classes, {len(resources)} font definitions")
