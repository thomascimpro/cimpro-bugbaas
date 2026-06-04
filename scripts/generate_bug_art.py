from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "bugdex"
OUT.mkdir(parents=True, exist_ok=True)

DESIGN_SIZE = 1024
OUTPUT_SIZE = 384
OUTPUT_PADDING = 42
SCALE = 3
CANVAS = DESIGN_SIZE * SCALE
C = CANVAS / 2

BUGS = [
    ("zilvervisje", "silverfish", "#9fb2ad", "#dfe8e4", "#4d635d", 1),
    ("fruitvlieg", "fly", "#8a5a2b", "#f1c45a", "#3f2714", 1),
    ("bladluis", "aphid", "#6d9f45", "#c7e48b", "#314b22", 1),
    ("mug", "mosquito", "#6d7f83", "#d7eef1", "#29373a", 1),
    ("mot", "moth", "#7b6a42", "#e4d2a4", "#352b16", 2),
    ("motmug", "moth", "#6d6154", "#d9ccb8", "#302820", 1),
    ("langpootmug", "mosquito", "#6b7a76", "#d9eeed", "#253331", 2),
    ("mier", "ant", "#423120", "#9a6740", "#1c1510", 2),
    ("houtmier", "ant", "#2e1c16", "#d34f31", "#120b08", 3),
    ("faraomier", "ant", "#c99745", "#f3d178", "#5a3a16", 1),
    ("vlo", "flea", "#5d3a24", "#b07a3b", "#24170f", 2),
    ("teek", "tick", "#27221f", "#75675d", "#0e0b09", 2),
    ("fluweelmijt", "tick", "#b82225", "#ff5b52", "#391010", 2),
    ("pissebed", "woodlouse", "#5f6f6a", "#b7c6c0", "#26322f", 2),
    ("stinkwants", "shield", "#456f43", "#9fc06e", "#23361f", 3),
    ("schildwants", "shield", "#304b39", "#8cae74", "#17251b", 3),
    ("snuitkever", "weevil", "#405d44", "#91a96c", "#1d2b20", 3),
    ("lieveheersbeestje", "ladybug", "#b83227", "#f2695e", "#17211c", 3),
    ("kakkerlak", "roach", "#5a341e", "#b67a3c", "#20120b", 3),
    ("oorworm", "earwig", "#725137", "#cf9e64", "#2b1d14", 3),
    ("boktor", "longhorn", "#354f3b", "#87a868", "#18241a", 4),
    ("tapijtkever", "carpet", "#252d36", "#efc35d", "#0e1419", 4),
    ("roofwants", "assassin", "#3d4735", "#b94535", "#151c15", 4),
    ("duizendpoot", "centipede", "#704026", "#d48a43", "#2a160c", 4),
    ("sprinkhaan", "grasshopper", "#587c2d", "#a7ca61", "#263914", 4),
    ("wesp", "wasp", "#1f1f1b", "#f0c642", "#10100d", 4),
    ("hoornaar", "hornet", "#2b2118", "#d89d32", "#0f0b08", 5),
    ("sluipwesp", "wasp", "#1a1815", "#c99127", "#070605", 4),
    ("schorpioen", "scorpion", "#3d332e", "#b1845e", "#18120f", 5),
    ("termiet", "termite", "#a27a4c", "#f0cf94", "#4c351e", 5),
    ("mestkever", "dung", "#1d4a3b", "#5bb489", "#0c241c", 5),
    ("wandelende-tak", "stick", "#6a5936", "#b49755", "#2e2513", 5),
    ("wandelend-blad", "leaf", "#3f7138", "#a8d275", "#1b3618", 5),
    ("vogelspin", "spider", "#3b2b24", "#8b5f45", "#140f0c", 5),
    ("reuzenkakkerlak", "roach", "#4b2b19", "#d08a42", "#160c07", 5),
    ("reuzen-duizendpoot", "centipede", "#68321e", "#e07a3b", "#21100a", 5),
    ("neushoornkever", "rhino", "#253c34", "#6fa47c", "#0f211a", 5),
    ("atlaskever", "atlas", "#253540", "#73a1b1", "#0d161b", 5),
    ("herculeskever", "hercules", "#2c3a2d", "#9aae62", "#121a12", 5),
    ("goliathkever", "goliath", "#16221e", "#d7bd57", "#070d0b", 5),
    ("vliegend-hert", "stag", "#1f1714", "#8b5633", "#0b0705", 5),
    ("juweelkever", "jewel", "#0b6e74", "#40d8b4", "#03272a", 5),
    ("goudtor", "jewel", "#1f6f46", "#d7bd57", "#0b2f1c", 4),
    ("tijgerkever", "tiger", "#29402d", "#d8a650", "#10180f", 4),
    ("doodgraver", "burying", "#171413", "#df6c32", "#050404", 4),
    ("kniptor", "click", "#332a1f", "#b78945", "#15100b", 3),
    ("loopkever", "runner", "#111819", "#4e6f78", "#050809", 3),
    ("waterkever", "water", "#17364a", "#76b6d3", "#081a24", 3),
    ("schrijvertje", "water", "#1d3640", "#9bd0df", "#08161a", 2),
    ("schaatsenrijder", "skater", "#2a2a24", "#b4c6be", "#0f0f0c", 2),
    ("waterschorpioen", "water-scorpion", "#322b25", "#a08360", "#13100d", 4),
    ("bidsprinkhaan", "mantis", "#356632", "#a7d067", "#142911", 5),
    ("wespspin", "spider", "#201916", "#f0c642", "#090706", 4),
    ("kruisspin", "spider", "#33251d", "#d2b38c", "#120c08", 3),
    ("springspin", "spider", "#1e1c1c", "#7f6d62", "#070606", 3),
    ("libel", "dragonfly", "#24606f", "#bdf4ff", "#0a2630", 4),
    ("waterjuffer", "dragonfly", "#244b74", "#cceaff", "#0b1b2a", 3),
    ("gaasvlieg", "lacewing", "#6fa65a", "#dff5c9", "#233f1c", 2),
    ("doodshoofdvlinder", "moth", "#2d241f", "#cfaa72", "#0f0b08", 5),
    ("kolibrievlinder", "moth", "#704432", "#d78a58", "#25130d", 4),
    ("koninginnenpage", "butterfly", "#19150f", "#f1cf48", "#070604", 5),
    ("atalanta", "butterfly", "#161515", "#e95e32", "#060606", 4),
    ("dagpauwoog", "butterfly", "#522716", "#f0a13a", "#180b05", 4),
    ("eikenprocessierups", "caterpillar", "#6f6a5f", "#d6d0be", "#2d2a24", 2),
    ("pijlstaartrups", "caterpillar", "#427a38", "#d5e767", "#163015", 3),
    ("boekluis", "tiny", "#b9a06d", "#efe0b4", "#5b4a28", 1),
    ("stofluis", "tiny", "#8d8377", "#e0d8c9", "#413b34", 1),
    ("cicade", "cicada", "#3a4d40", "#9fb995", "#151f18", 3),
    ("schuimcicade", "cicada", "#53794d", "#d6efbd", "#1f341c", 2),
    ("orchidee-bidsprinkhaan", "mantis", "#f6d6df", "#fff4f7", "#7b4055", 5),
    ("pauwspin", "spider", "#17151d", "#35a8d6", "#08070a", 5),
    ("juweelwesp", "wasp", "#083d46", "#2ee0b8", "#031316", 5),
    ("goudschildkever", "shield", "#6f4f12", "#f4d45f", "#271904", 5),
    ("harlekijnwants", "shield", "#1c1715", "#ee4d2f", "#060504", 4),
    ("lantaarnvlieg", "fly", "#3c241b", "#df8d54", "#120907", 4),
    ("vioolspin", "spider", "#5c4332", "#b58a65", "#1f150f", 3),
    ("gespikkelde-houtvlinder", "moth", "#5f503e", "#d7c69e", "#241b13", 4),
    ("zebra-springspin", "spider", "#181818", "#f0f0e8", "#050505", 4),
    ("smaragdlibel", "dragonfly", "#0b5f4c", "#7bf0cf", "#042018", 5),
    ("glasvleugelvlinder", "butterfly", "#d8f8ff", "#f3ffff", "#33525b", 5),
    ("komeetmot", "moth", "#6f8c55", "#d8f0a4", "#243514", 5),
    ("maanmot", "moth", "#82b86c", "#e2f5bd", "#243f1d", 5),
    ("atlasvlinder", "butterfly", "#7a3b22", "#d99b46", "#1d0d07", 5),
    ("rozekever", "jewel", "#27583f", "#d44f5f", "#0f2017", 4),
    ("kardinaalkever", "runner", "#9f1e1e", "#f45b4d", "#160606", 4),
    ("vuurwants", "shield", "#181412", "#ef3d2e", "#050404", 3),
    ("sabelsprinkhaan", "grasshopper", "#567335", "#b8d16a", "#223015", 4),
    ("mierenleeuw", "caterpillar", "#6e5538", "#d6b06f", "#251909", 4),
    ("dobsonvlieg", "fly", "#4d3b2b", "#c6a46c", "#170f09", 5),
    ("helikopterjuffer", "dragonfly", "#27606e", "#c8f7ff", "#0b2630", 4),
    ("spookinsect", "stick", "#776a50", "#d8d0b5", "#2f291f", 5),
    ("bladpootwants", "shield", "#3e4a2c", "#a6bc65", "#161d0f", 4),
    ("assassin-bug", "assassin", "#282820", "#b73b33", "#090908", 5),
    ("tijgermug", "mosquito", "#151719", "#f7f7e8", "#050606", 4),
    ("dolksteekwesp", "wasp", "#15110d", "#f2c33e", "#050403", 5),
    ("roofvlieg", "fly", "#4b4235", "#d0b88c", "#19150f", 4),
    ("kameelhalsvlieg", "fly", "#463221", "#c89b57", "#160d06", 4),
    ("zweefvlieg", "fly", "#1d1a15", "#f0c94b", "#070604", 3),
    ("goudwesp", "wasp", "#0b4f51", "#f1c84f", "#042223", 5),
    ("fluweelmier", "ant", "#281817", "#e84635", "#0b0606", 4),
    ("reuzenwaterwants", "water-scorpion", "#2b2c24", "#8c8060", "#0e0f0b", 5),
    ("zweepschorpioen", "scorpion", "#2c2622", "#a2805c", "#100c0a", 5),
    ("azuren-waterjuffer", "dragonfly", "#1b4f8f", "#9bdcff", "#071f3a", 4),
    ("rouwmantelvlinder", "butterfly", "#1b1715", "#efe4b0", "#070606", 5),
    ("keizersmantel", "butterfly", "#5f2a13", "#f09a37", "#170805", 5),
    ("gouden-tor", "jewel", "#146b42", "#f0cf4a", "#062818", 4),
    ("soldaatje", "runner", "#9f3423", "#ee7440", "#180806", 3),
    ("doodgraverkever", "burying", "#151312", "#f07336", "#050404", 4),
    ("olifantskever", "rhino", "#2d332b", "#8c8d6a", "#11140f", 5),
    ("regenboogmestkever", "dung", "#123a35", "#6df0bb", "#061715", 5),
    ("titanus-kever", "longhorn", "#2a2119", "#b5874f", "#0d0906", 5),
    ("langsprietboktor", "longhorn", "#263626", "#93b06d", "#0e160d", 4),
    ("schildpadkever", "shield", "#415024", "#d8cf75", "#151b0a", 4),
    ("vuurkever", "runner", "#a82720", "#f45d43", "#150504", 4),
    ("blauwe-ertsbij", "wasp", "#071c2d", "#3187d8", "#020a12", 5),
    ("wespboktor", "longhorn", "#1d1a15", "#e7be3e", "#070605", 4),
    ("groene-zandloopkever", "tiger", "#0a5f48", "#54d69a", "#042218", 5),
]


def hex_to_rgb(value):
    value = value.strip("#")
    return tuple(int(value[i : i + 2], 16) for i in range(0, 6, 2))


def mix(a, b, t):
    ar, ag, ab = hex_to_rgb(a)
    br, bg, bb = hex_to_rgb(b)
    return (int(ar + (br - ar) * t), int(ag + (bg - ag) * t), int(ab + (bb - ab) * t), 255)


def ellipse(draw, box, fill, outline=None, width=1):
    box = tuple(int(v) for v in box)
    draw.ellipse(box, fill=fill, outline=outline, width=int(width))


def line(draw, xy, fill, width):
    draw.line([(int(x), int(y)) for x, y in xy], fill=fill, width=int(width), joint="curve")


def glow(base, color, strength):
    layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    ellipse(d, (C - 270 * SCALE, C - 260 * SCALE, C + 270 * SCALE, C + 260 * SCALE), (*hex_to_rgb(color), strength))
    layer = layer.filter(ImageFilter.GaussianBlur(34 * SCALE))
    base.alpha_composite(layer)


def fit_for_export(img):
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return img.resize((OUTPUT_SIZE, OUTPUT_SIZE), Image.Resampling.LANCZOS)

    cropped = img.crop(bbox)
    max_side = OUTPUT_SIZE - OUTPUT_PADDING * 2
    scale = min(max_side / cropped.width, max_side / cropped.height)
    size = (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale)))
    fitted = cropped.resize(size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (OUTPUT_SIZE, OUTPUT_SIZE), (0, 0, 0, 0))
    out.alpha_composite(fitted, ((OUTPUT_SIZE - fitted.width) // 2, (OUTPUT_SIZE - fitted.height) // 2))
    return out


def draw_legs(draw, count, dark, long=False):
    pairs = count // 2
    for i in range(pairs):
        y = C - 120 * SCALE + i * (240 * SCALE / max(1, pairs - 1))
        bend = 72 * SCALE if long else 54 * SCALE
        left = [(C - 80 * SCALE, y), (C - 170 * SCALE, y - 25 * SCALE), (C - 220 * SCALE, y - bend * 0.25)]
        right = [(C + 80 * SCALE, y), (C + 170 * SCALE, y - 25 * SCALE), (C + 220 * SCALE, y - bend * 0.25)]
        if i % 2:
            left = [(x, CANVAS - y) for x, y in left]
            right = [(x, CANVAS - y) for x, y in right]
        line(draw, left, dark, 16 * SCALE)
        line(draw, right, dark, 16 * SCALE)


def draw_bug(slug, kind, body, shell, dark, level):
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    glow(img, shell, 52 + level * 11)
    draw = ImageDraw.Draw(img)

    ellipse(draw, (C - 185 * SCALE, C + 210 * SCALE, C + 185 * SCALE, C + 285 * SCALE), (20, 32, 24, 44))

    leg_count = 8 if kind in {"spider", "scorpion"} else 14 if kind == "centipede" else 6
    draw_legs(draw, leg_count, hex_to_rgb(dark) + (255,), kind in {"grasshopper", "longhorn", "stick", "centipede"})

    if kind in {"moth", "fly", "mosquito", "wasp", "hornet", "dragonfly", "lacewing", "cicada"}:
        wing = (*hex_to_rgb(shell), 116)
        ellipse(draw, (C - 285 * SCALE, C - 155 * SCALE, C - 25 * SCALE, C + 105 * SCALE), wing)
        ellipse(draw, (C + 25 * SCALE, C - 155 * SCALE, C + 285 * SCALE, C + 105 * SCALE), wing)
        if kind in {"dragonfly", "lacewing"}:
            ellipse(draw, (C - 300 * SCALE, C - 30 * SCALE, C - 30 * SCALE, C + 195 * SCALE), (*hex_to_rgb(shell), 86))
            ellipse(draw, (C + 30 * SCALE, C - 30 * SCALE, C + 300 * SCALE, C + 195 * SCALE), (*hex_to_rgb(shell), 86))
            for x in [-180, -95, 95, 180]:
                line(draw, [(C + x * SCALE, C - 120 * SCALE), (C + x * 0.62 * SCALE, C + 130 * SCALE)], hex_to_rgb(dark) + (88,), 5 * SCALE)

    if kind in {"butterfly"}:
        wing_dark = (*hex_to_rgb(dark), 220)
        ellipse(draw, (C - 335 * SCALE, C - 265 * SCALE, C - 18 * SCALE, C + 35 * SCALE), wing_dark)
        ellipse(draw, (C + 18 * SCALE, C - 265 * SCALE, C + 335 * SCALE, C + 35 * SCALE), wing_dark)
        ellipse(draw, (C - 285 * SCALE, C - 20 * SCALE, C - 18 * SCALE, C + 270 * SCALE), (*hex_to_rgb(shell), 220))
        ellipse(draw, (C + 18 * SCALE, C - 20 * SCALE, C + 285 * SCALE, C + 270 * SCALE), (*hex_to_rgb(shell), 220))
        for dx in [-205, 205]:
            ellipse(draw, (C + dx * SCALE - 34 * SCALE, C + 48 * SCALE, C + dx * SCALE + 34 * SCALE, C + 116 * SCALE), (255, 240, 156, 190), hex_to_rgb(dark) + (160,), 3 * SCALE)

    if kind in {"scorpion", "water-scorpion"}:
        line(draw, [(C, C + 150 * SCALE), (C + 120 * SCALE, C + 230 * SCALE), (C + 80 * SCALE, C + 315 * SCALE)], hex_to_rgb(dark) + (255,), 28 * SCALE)
        ellipse(draw, (C + 42 * SCALE, C + 290 * SCALE, C + 122 * SCALE, C + 355 * SCALE), hex_to_rgb(shell) + (255,))
        line(draw, [(C - 105 * SCALE, C - 125 * SCALE), (C - 250 * SCALE, C - 190 * SCALE)], hex_to_rgb(dark) + (255,), 20 * SCALE)
        line(draw, [(C + 105 * SCALE, C - 125 * SCALE), (C + 250 * SCALE, C - 190 * SCALE)], hex_to_rgb(dark) + (255,), 20 * SCALE)

    if kind in {"mantis"}:
        line(draw, [(C - 80 * SCALE, C - 120 * SCALE), (C - 230 * SCALE, C - 250 * SCALE), (C - 165 * SCALE, C - 120 * SCALE)], hex_to_rgb(dark) + (255,), 22 * SCALE)
        line(draw, [(C + 80 * SCALE, C - 120 * SCALE), (C + 230 * SCALE, C - 250 * SCALE), (C + 165 * SCALE, C - 120 * SCALE)], hex_to_rgb(dark) + (255,), 22 * SCALE)

    if kind in {"leaf"}:
        draw.polygon(
            [(int(C), int(C - 260 * SCALE)), (int(C - 210 * SCALE), int(C - 35 * SCALE)), (int(C - 80 * SCALE), int(C + 235 * SCALE)), (int(C), int(C + 285 * SCALE)), (int(C + 80 * SCALE), int(C + 235 * SCALE)), (int(C + 210 * SCALE), int(C - 35 * SCALE))],
            fill=hex_to_rgb(shell) + (240,),
            outline=hex_to_rgb(dark) + (210,)
        )
        line(draw, [(C, C - 240 * SCALE), (C, C + 250 * SCALE)], hex_to_rgb(dark) + (120,), 7 * SCALE)
        for side in [-1, 1]:
            for i in range(4):
                y = C - 140 * SCALE + i * 82 * SCALE
                line(draw, [(C, y), (C + side * (80 + i * 18) * SCALE, y + 45 * SCALE)], hex_to_rgb(dark) + (95,), 5 * SCALE)

    if kind in {"centipede", "silverfish", "stick", "caterpillar", "tiny", "dragonfly", "lacewing", "cicada", "butterfly", "moth", "fly", "mosquito", "wasp", "hornet", "leaf", "mantis"}:
        segments = 7 if kind != "centipede" else 10
        if kind == "caterpillar":
            segments = 8
        if kind == "tiny":
            segments = 4
        if kind in {"dragonfly", "lacewing", "cicada", "butterfly", "moth", "fly", "mosquito", "wasp", "hornet"}:
            segments = 6
            for i in range(segments):
                y = C - 125 * SCALE + i * (315 * SCALE / max(1, segments - 1))
                w = (38 + math.sin(i / max(1, segments - 1) * math.pi) * 42) * SCALE
                if kind in {"wasp", "hornet"} and i % 2:
                    fill = hex_to_rgb("#f0c642") + (255,)
                else:
                    fill = mix(body, shell, i / max(1, segments - 1) * 0.45)
                ellipse(draw, (C - w, y - 38 * SCALE, C + w, y + 48 * SCALE), fill, hex_to_rgb(dark) + (190,), 4 * SCALE)
        elif kind == "leaf":
            pass
        elif kind == "mantis":
            ellipse(draw, (C - 78 * SCALE, C - 145 * SCALE, C + 78 * SCALE, C + 210 * SCALE), hex_to_rgb(shell) + (255,), hex_to_rgb(dark) + (200,), 5 * SCALE)
            line(draw, [(C, C - 125 * SCALE), (C, C + 180 * SCALE)], hex_to_rgb(dark) + (110,), 5 * SCALE)
        else:
            for i in range(segments):
                y = C - 190 * SCALE + i * (370 * SCALE / max(1, segments - 1))
                w = (92 + math.sin(i / max(1, segments - 1) * math.pi) * 84) * SCALE
                ellipse(draw, (C - w, y - 42 * SCALE, C + w, y + 54 * SCALE), mix(body, shell, i / max(1, segments - 1) * 0.35), hex_to_rgb(dark) + (180,), 4 * SCALE)
    else:
        ellipse(draw, (C - 145 * SCALE, C - 180 * SCALE, C + 145 * SCALE, C + 205 * SCALE), hex_to_rgb(body) + (255,), hex_to_rgb(dark) + (220,), 8 * SCALE)
        ellipse(draw, (C - 118 * SCALE, C - 152 * SCALE, C + 118 * SCALE, C + 182 * SCALE), hex_to_rgb(shell) + (255,))
        line(draw, [(C, C - 150 * SCALE), (C, C + 170 * SCALE)], hex_to_rgb(dark) + (150,), 8 * SCALE)
        if kind in {"jewel"}:
            for i, tint in enumerate(["#7df7d9", "#4aa8ff", "#d7bd57"]):
                ellipse(draw, (C - (92 - i * 22) * SCALE, C - (110 - i * 38) * SCALE, C + (92 - i * 22) * SCALE, C - (55 - i * 38) * SCALE), hex_to_rgb(tint) + (145,))
        if kind in {"tiger", "runner"}:
            for y in [-105, -30, 45, 120]:
                line(draw, [(C - 235 * SCALE, C + y * SCALE), (C - 310 * SCALE, C + (y + 20) * SCALE)], hex_to_rgb(shell) + (112,), 10 * SCALE)
                line(draw, [(C + 235 * SCALE, C + y * SCALE), (C + 310 * SCALE, C + (y + 20) * SCALE)], hex_to_rgb(shell) + (112,), 10 * SCALE)
        if kind in {"water"}:
            for r in [250, 315]:
                ellipse(draw, (C - r * SCALE, C - 35 * SCALE, C + r * SCALE, C + 220 * SCALE), (112, 182, 211, 34), (112, 182, 211, 80), 4 * SCALE)
        for dx, dy in [(-58, -72), (62, -22), (-52, 58), (54, 102)]:
            if level >= 3 or (dx + dy) % 2 == 0:
                ellipse(draw, (C + dx * SCALE - 18 * SCALE, C + dy * SCALE - 18 * SCALE, C + dx * SCALE + 18 * SCALE, C + dy * SCALE + 18 * SCALE), hex_to_rgb(dark) + (190,))

    head_size = 95 * SCALE if kind not in {"silverfish", "centipede"} else 72 * SCALE
    ellipse(draw, (C - head_size, C - 270 * SCALE, C + head_size, C - 120 * SCALE), hex_to_rgb(dark) + (255,))
    ellipse(draw, (C - 44 * SCALE, C - 235 * SCALE, C - 22 * SCALE, C - 213 * SCALE), (238, 250, 232, 255))
    ellipse(draw, (C + 22 * SCALE, C - 235 * SCALE, C + 44 * SCALE, C - 213 * SCALE), (238, 250, 232, 255))

    if kind in {"weevil", "rhino", "atlas", "hercules", "goliath", "stag"}:
        horn_len = (92 + level * 16) * SCALE
        line(draw, [(C, C - 245 * SCALE), (C, C - 245 * SCALE - horn_len)], hex_to_rgb(dark) + (255,), 22 * SCALE)
        if kind in {"hercules", "goliath", "atlas", "stag"}:
            line(draw, [(C - 14 * SCALE, C - 275 * SCALE), (C - 80 * SCALE, C - 345 * SCALE)], hex_to_rgb(dark) + (255,), 16 * SCALE)
            line(draw, [(C + 14 * SCALE, C - 275 * SCALE), (C + 80 * SCALE, C - 345 * SCALE)], hex_to_rgb(dark) + (255,), 16 * SCALE)
        if kind == "stag":
            for side in [-1, 1]:
                line(draw, [(C + side * 42 * SCALE, C - 250 * SCALE), (C + side * 165 * SCALE, C - 345 * SCALE), (C + side * 225 * SCALE, C - 285 * SCALE)], hex_to_rgb(dark) + (255,), 18 * SCALE)

    if kind in {"longhorn", "ant", "earwig", "cicada", "lacewing"}:
        line(draw, [(C - 52 * SCALE, C - 240 * SCALE), (C - 190 * SCALE, C - 320 * SCALE)], hex_to_rgb(dark) + (255,), 14 * SCALE)
        line(draw, [(C + 52 * SCALE, C - 240 * SCALE), (C + 190 * SCALE, C - 320 * SCALE)], hex_to_rgb(dark) + (255,), 14 * SCALE)

    if kind in {"earwig"}:
        line(draw, [(C - 42 * SCALE, C + 205 * SCALE), (C - 110 * SCALE, C + 315 * SCALE)], hex_to_rgb(dark) + (255,), 16 * SCALE)
        line(draw, [(C + 42 * SCALE, C + 205 * SCALE), (C + 110 * SCALE, C + 315 * SCALE)], hex_to_rgb(dark) + (255,), 16 * SCALE)

    if slug in {"pauwspin"}:
        fan_colors = ["#35a8d6", "#f05a32", "#f2d34f", "#7f4fd6"]
        ellipse(draw, (C - 205 * SCALE, C + 75 * SCALE, C + 205 * SCALE, C + 330 * SCALE), hex_to_rgb("#101820") + (230,), hex_to_rgb("#f2d34f") + (210,), 6 * SCALE)
        for i, color in enumerate(fan_colors):
            x = C - 140 * SCALE + i * 92 * SCALE
            ellipse(draw, (x - 38 * SCALE, C + 130 * SCALE, x + 38 * SCALE, C + 245 * SCALE), hex_to_rgb(color) + (210,))

    if slug in {"zebra-springspin", "pauwspin"}:
        for dx in [-46, -16, 16, 46]:
            ellipse(draw, (C + dx * SCALE - 20 * SCALE, C - 252 * SCALE, C + dx * SCALE + 20 * SCALE, C - 212 * SCALE), (235, 248, 242, 255), hex_to_rgb(dark) + (180,), 3 * SCALE)

    if slug in {"vioolspin"}:
        line(draw, [(C - 34 * SCALE, C - 78 * SCALE), (C, C + 10 * SCALE), (C + 34 * SCALE, C - 78 * SCALE)], hex_to_rgb("#2b1d16") + (210,), 8 * SCALE)

    if slug in {"glasvleugelvlinder", "smaragdlibel", "helikopterjuffer", "azuren-waterjuffer"}:
        for side in [-1, 1]:
            for i in range(4):
                line(draw, [(C + side * 52 * SCALE, C - 80 * SCALE + i * 55 * SCALE), (C + side * 255 * SCALE, C - 135 * SCALE + i * 70 * SCALE)], hex_to_rgb("#f5ffff") + (120,), 4 * SCALE)

    if slug in {"komeetmot", "maanmot"}:
        for side in [-1, 1]:
            line(draw, [(C + side * 120 * SCALE, C + 160 * SCALE), (C + side * 215 * SCALE, C + 360 * SCALE)], hex_to_rgb(shell) + (230,), 18 * SCALE)
            ellipse(draw, (C + side * 215 * SCALE - 18 * SCALE, C + 350 * SCALE, C + side * 215 * SCALE + 18 * SCALE, C + 386 * SCALE), hex_to_rgb(shell) + (220,))

    if slug in {"atlasvlinder"}:
        for side in [-1, 1]:
            ellipse(draw, (C + side * 250 * SCALE - 36 * SCALE, C - 250 * SCALE, C + side * 250 * SCALE + 36 * SCALE, C - 178 * SCALE), hex_to_rgb("#2b1a10") + (230,))
            ellipse(draw, (C + side * 250 * SCALE - 13 * SCALE, C - 232 * SCALE, C + side * 250 * SCALE + 13 * SCALE, C - 206 * SCALE), (248, 231, 160, 255))

    if slug in {"doodshoofdvlinder"}:
        ellipse(draw, (C - 40 * SCALE, C - 42 * SCALE, C + 40 * SCALE, C + 44 * SCALE), (224, 198, 139, 210), hex_to_rgb(dark) + (120,), 3 * SCALE)
        ellipse(draw, (C - 24 * SCALE, C - 8 * SCALE, C - 8 * SCALE, C + 8 * SCALE), hex_to_rgb(dark) + (210,))
        ellipse(draw, (C + 8 * SCALE, C - 8 * SCALE, C + 24 * SCALE, C + 8 * SCALE), hex_to_rgb(dark) + (210,))

    if slug in {"mierenleeuw", "dobsonvlieg", "titanus-kever", "vliegend-hert"}:
        for side in [-1, 1]:
            line(draw, [(C + side * 45 * SCALE, C - 250 * SCALE), (C + side * 180 * SCALE, C - 345 * SCALE)], hex_to_rgb(dark) + (255,), 20 * SCALE)
            line(draw, [(C + side * 85 * SCALE, C - 285 * SCALE), (C + side * 165 * SCALE, C - 265 * SCALE)], hex_to_rgb(dark) + (255,), 12 * SCALE)

    if slug in {"bladpootwants", "schildpadkever", "goudschildkever"}:
        ellipse(draw, (C - 178 * SCALE, C - 160 * SCALE, C + 178 * SCALE, C + 210 * SCALE), hex_to_rgb(shell) + (96,), hex_to_rgb("#f7f0c8") + (150,), 5 * SCALE)
        if slug == "schildpadkever":
            ellipse(draw, (C - 218 * SCALE, C - 205 * SCALE, C + 218 * SCALE, C + 236 * SCALE), (245, 255, 230, 38), (245, 255, 230, 135), 6 * SCALE)
        line(draw, [(C, C - 128 * SCALE), (C, C + 182 * SCALE)], hex_to_rgb(dark) + (120,), 6 * SCALE)
        for dx, dy in [(-80, -55), (82, -20), (-62, 56), (64, 112)]:
            ellipse(draw, (C + dx * SCALE - 16 * SCALE, C + dy * SCALE - 16 * SCALE, C + dx * SCALE + 16 * SCALE, C + dy * SCALE + 16 * SCALE), hex_to_rgb(dark) + (80,))

    if slug in {"lantaarnvlieg"}:
        ellipse(draw, (C - 92 * SCALE, C - 318 * SCALE, C + 92 * SCALE, C - 205 * SCALE), hex_to_rgb("#d26b3d") + (220,), hex_to_rgb(dark) + (160,), 5 * SCALE)
        for dx, dy in [(-160, -80), (-110, 20), (135, -65), (160, 42)]:
            ellipse(draw, (C + dx * SCALE - 14 * SCALE, C + dy * SCALE - 14 * SCALE, C + dx * SCALE + 14 * SCALE, C + dy * SCALE + 14 * SCALE), hex_to_rgb("#f3d18c") + (190,))

    if slug in {"gespikkelde-houtvlinder"}:
        for dx, dy in [(-190, -85), (-125, 20), (125, -35), (188, 80), (-70, 135), (76, 118)]:
            ellipse(draw, (C + dx * SCALE - 18 * SCALE, C + dy * SCALE - 18 * SCALE, C + dx * SCALE + 18 * SCALE, C + dy * SCALE + 18 * SCALE), hex_to_rgb("#2f2519") + (145,))

    if slug in {"roofvlieg"}:
        for i in range(7):
            x = C - 92 * SCALE + i * 31 * SCALE
            line(draw, [(x, C - 70 * SCALE), (x - 22 * SCALE, C - 118 * SCALE)], hex_to_rgb("#f1dfb2") + (145,), 5 * SCALE)

    if slug in {"kameelhalsvlieg"}:
        line(draw, [(C, C - 190 * SCALE), (C, C - 330 * SCALE)], hex_to_rgb(dark) + (255,), 22 * SCALE)
        ellipse(draw, (C - 55 * SCALE, C - 380 * SCALE, C + 55 * SCALE, C - 300 * SCALE), hex_to_rgb(dark) + (255,))

    if slug in {"harlekijnwants", "vuurwants", "wespboktor", "tijgermug"}:
        for y in [-95, -20, 55, 130]:
            line(draw, [(C - 94 * SCALE, C + y * SCALE), (C + 94 * SCALE, C + (y + 34) * SCALE)], hex_to_rgb("#f5efe2") + (150,), 8 * SCALE)

    if slug in {"regenboogmestkever", "juweelwesp", "goudwesp", "blauwe-ertsbij", "gouden-tor"}:
        for i, color in enumerate(["#56e0ff", "#62f0a0", "#f1c84f", "#d966ff"]):
            ellipse(draw, (C - (130 - i * 24) * SCALE, C - (125 - i * 52) * SCALE, C + (130 - i * 24) * SCALE, C - (68 - i * 52) * SCALE), hex_to_rgb(color) + (95,))

    if level >= 5:
        for angle in [0.1, 1.9, 3.7, 5.2]:
            x = C + math.cos(angle) * 235 * SCALE
            y = C + math.sin(angle) * 235 * SCALE
            ellipse(draw, (x - 12 * SCALE, y - 12 * SCALE, x + 12 * SCALE, y + 12 * SCALE), (245, 220, 110, 145))

    fit_for_export(img).save(OUT / f"{slug}.png", optimize=True)


for bug in BUGS:
    draw_bug(*bug)

print(f"Generated {len(BUGS)} HD BugDex assets in {OUT}")
