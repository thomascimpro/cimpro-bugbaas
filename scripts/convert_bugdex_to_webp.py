from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import re
from PIL import Image, ImageChops

repo_root = Path(__file__).resolve().parent.parent
source_root = repo_root / "assets" / "bugdex"
target_root = repo_root / "assets" / "bugdex-webp"
bug_art_path = repo_root / "src" / "services" / "bugArt.ts"

max_dimension = 512
webp_quality = 85
worker_count = 8

if not source_root.exists() or not bug_art_path.exists():
    raise SystemExit("BugDex-bronnen of bugArt.ts ontbreken")

bug_art = bug_art_path.read_text(encoding="utf-8-sig")
references = re.findall(r'assets/bugdex(?:-webp)?/(.*?)\.(?:png|webp)', bug_art)
if not references:
    raise SystemExit("Geen BugDex-afbeeldingen gevonden in bugArt.ts")
if len(set(references)) != len(references):
    raise SystemExit("Dubbele BugDex-afbeeldingsverwijzingen gevonden")

target_root.mkdir(parents=True, exist_ok=True)

def convert(relative_stem: str):
    source = source_root / f"{relative_stem}.png"
    relative = Path(f"{relative_stem}.webp")
    target = target_root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if not source.exists():
        raise FileNotFoundError(f"Bron ontbreekt: {source}")

    with Image.open(source) as opened:
        image = opened.convert("RGBA")
        if max(image.size) > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        expected_alpha = image.getchannel("A")
        image.save(target, "WEBP", quality=webp_quality, method=4, exact=True)

    with Image.open(target) as converted:
        converted_rgba = converted.convert("RGBA")
        if converted_rgba.size != image.size:
            raise RuntimeError(f"afmeting {converted_rgba.size} werd verwacht {image.size}")
        if ImageChops.difference(expected_alpha, converted_rgba.getchannel("A")).getbbox() is not None:
            raise RuntimeError("transparantie is gewijzigd")

    return source.stat().st_size, target.stat().st_size

source_bytes = 0
target_bytes = 0
try:
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        for index, (source_size, target_size) in enumerate(executor.map(convert, references), start=1):
            source_bytes += source_size
            target_bytes += target_size
            if index % 50 == 0 or index == len(references):
                print(f"[{index}/{len(references)}] geoptimaliseerd")
except Exception as exc:
    raise SystemExit(f"Conversie mislukt: {exc}") from exc

updated, replacements = re.subn(
    r"\.\./\.\./assets/bugdex/(.*?)\.png",
    r"../../assets/bugdex-webp/\1.webp",
    bug_art,
)
if replacements > 0:
    bug_art_path.write_text(updated, encoding="utf-8")
reduction = round((1 - target_bytes / source_bytes) * 100, 1)

print()
print(f"Klaar: {len(references)} afbeeldingen, maximaal {max_dimension}px, WebP kwaliteit {webp_quality}")
print(f"Origineel: {source_bytes / 1024 / 1024:.2f} MB")
print(f"WebP:      {target_bytes / 1024 / 1024:.2f} MB")
print(f"Besparing: {reduction}%")
print(f"Map:       {target_root}")
print(f"Register bijgewerkt: {replacements} verwijzingen")
