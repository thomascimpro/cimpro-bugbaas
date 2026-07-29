"""Normalize one generated bug image into the BugDex transparent cutout format."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def remove_border_connected_background(image: Image.Image) -> int:
    """Remove a light neutral/transparent background without erasing enclosed highlights."""

    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    candidate = bytearray(width * height)

    for y in range(height):
        row = y * width
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if 0 < alpha <= 8:
                alpha = 0
                pixels[x, y] = (red, green, blue, 0)
            if alpha == 0 or (
                max(red, green, blue) - min(red, green, blue) <= 24
                and min(red, green, blue) >= 200
            ):
                candidate[row + x] = 1

    visited = bytearray(width * height)
    queue: deque[int] = deque()

    def add(index: int) -> None:
        if candidate[index] and not visited[index]:
            visited[index] = 1
            queue.append(index)

    for x in range(width):
        add(x)
        add((height - 1) * width + x)
    for y in range(height):
        add(y * width)
        add(y * width + width - 1)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        if x:
            add(index - 1)
        if x + 1 < width:
            add(index + 1)
        if y:
            add(index - width)
        if y + 1 < height:
            add(index + width)

    for index, remove in enumerate(visited):
        if remove:
            pixels[index % width, index // width] = (0, 0, 0, 0)

    return sum(visited)


def normalize(source: Path, destination: Path, max_dimension: int = 700) -> None:
    image = Image.open(source).convert("RGBA")
    removed = remove_border_connected_background(image)
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"no foreground remained after background removal: {source}")

    crop = image.crop(bbox)
    scale = min(max_dimension / crop.width, max_dimension / crop.height)
    size = (
        max(1, round(crop.width * scale)),
        max(1, round(crop.height * scale)),
    )
    crop = crop.resize(size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (768, 768), (0, 0, 0, 0))
    canvas.alpha_composite(crop, ((768 - size[0]) // 2, (768 - size[1]) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination)
    print(
        f"source={image.size} removed={removed} crop={bbox} "
        f"output={destination} alpha_bbox={canvas.getchannel('A').getbbox()}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    normalize(args.source, args.destination)


if __name__ == "__main__":
    main()
