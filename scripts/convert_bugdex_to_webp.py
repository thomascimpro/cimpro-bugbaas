from pathlib import Path
import re
import sys
from PIL import Image

repo_root = Path(__file__).resolve().parent.parent
source_root = repo_root / "assets" / "bugdex"
target_root = repo_root / "assets" / "bugdex-webp"
bug_art_path = repo_root / "src" / "services" / "bugArt.ts"

if not source_root.exists():
    raise SystemExit(f"Bronmap niet gevonden: {source_root}")
if not bug_art_path.exists():
    raise SystemExit(f"bugArt.ts niet gevonden: {bug_art_path}")

target_root.mkdir(parents=True, exist_ok=True)
files = [p for p in source_root.rglob("*.png") if "_compression-test" not in p.parts]
if not files:
    raise SystemExit(f"Geen PNG-bestanden gevonden in {source_root}")

source_bytes = 0
target_bytes = 0

for index, source in enumerate(files, start=1):
    relative = source.relative_to(source_root).with_suffix(".webp")
    target = target_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)

    try:
        with Image.open(source) as opened:
            image = opened.convert("RGBA")
            alpha_before = image.getchannel("A").getextrema()
            image.save(target, "WEBP", quality=95, method=6, exact=True)

        with Image.open(target) as converted:
            alpha_after = converted.convert("RGBA").getchannel("A").getextrema()

        if alpha_before != alpha_after:
            raise RuntimeError(f"alpha {alpha_before} werd {alpha_after}")
    except Exception as exc:
        raise SystemExit(f"Conversie mislukt: {source}\nReden: {exc}") from exc

    source_bytes += source.stat().st_size
    target_bytes += target.stat().st_size
    print(f"[{index}/{len(files)}] {relative}")

bug_art = bug_art_path.read_text(encoding="utf-8-sig")
updated, replacements = re.subn(
    r"\.\./\.\./assets/bugdex/(.*?)\.png",
    r"../../assets/bugdex-webp/\1.webp",
    bug_art,
)
if replacements == 0:
    raise SystemExit("Geen PNG-verwijzingen gevonden in bugArt.ts")

bug_art_path.write_text(updated, encoding="utf-8")
reduction = round((1 - target_bytes / source_bytes) * 100, 1)

print()
print(f"Klaar: {len(files)} afbeeldingen")
print(f"Origineel: {source_bytes / 1024 / 1024:.2f} MB")
print(f"WebP:      {target_bytes / 1024 / 1024:.2f} MB")
print(f"Besparing: {reduction}%")
print(f"Map:       {target_root}")
print(f"Aangepast: {bug_art_path} ({replacements} verwijzingen)")
