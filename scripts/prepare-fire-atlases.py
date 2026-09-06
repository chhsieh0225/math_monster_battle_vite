"""Offline, source-specific art preparation; requires Pillow and NumPy.

Usage: python3 scripts/prepare-fire-atlases.py --source-dir /path/to/generated_images
Crop coordinates, interior matte seeds and supporting feet are visually reviewed.
"""

import argparse
from collections import deque
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/sprites/visual-pilot"
SHEETS = {
    "fire-hatchling-v1": {
        "source": "exec-cad382ee-06e8-4ba7-bdd3-6402536c68d2.png",
        "regions": [(20, 40, 430, 425), (470, 40, 855, 425), (900, 40, 1280, 425), (1320, 40, 1740, 425),
                    (20, 460, 430, 840), (475, 460, 850, 840), (900, 460, 1275, 840), (1320, 460, 1730, 840)],
        "anchors": [161.5, 158, 203.5, 272.5, 229, 163, 88.5, 193],
        "interiorSeeds": {}, "scale": 0.95, "footX": 296,
    },
    "fire-beast-v1": {
        "source": "exec-66b6ea8d-630d-49a8-8131-f20eab80f24d.png",
        "regions": [(35, 40, 430, 425), (460, 40, 870, 425), (900, 40, 1290, 425), (1295, 40, 1750, 425),
                    (20, 450, 430, 835), (460, 450, 870, 835), (875, 450, 1285, 835), (1320, 450, 1740, 835)],
        "anchors": [189.5, 174, 194.5, 287, 261.5, 189, 160.5, 214.5],
        "interiorSeeds": {0: [(241, 102), (256, 191)], 1: [(260, 190), (143, 184), (326, 190), (343, 96)],
                          2: [(215, 186)], 3: [(328, 151), (396, 143)],
                          4: [(252, 118), (130, 94), (146, 104)], 5: [(242, 104), (255, 191)],
                          6: [(266, 194), (200, 206)], 7: [(118, 82), (151, 100), (192, 155), (217, 180)]},
        "scale": 0.90, "footX": 280,
    },
    "fire-dragon-king-v1": {
        "source": "exec-f7e3b27d-a9f3-4df0-9854-40fb4c82209e.png",
        "regions": [(20, 40, 445, 425), (450, 40, 870, 425), (890, 40, 1270, 425), (1275, 40, 1750, 425),
                    (20, 450, 450, 830), (460, 450, 875, 830), (890, 450, 1290, 830), (1300, 450, 1740, 830)],
        "anchors": [235, 235.5, 210, 253.5, 271, 235.5, 146.5, 245],
        "interiorSeeds": {0: [(327, 147), (243, 144), (90, 205), (201, 93)],
                          2: [(245, 159), (102, 70), (178, 62), (187, 72), (283, 165), (252, 158)],
                          3: [(291, 191)], 4: [(171, 38), (194, 53), (154, 77), (234, 131), (161, 88), (212, 72)],
                          5: [(245, 148), (277, 19)],
                          6: [(216, 212), (271, 180), (290, 194), (110, 106), (271, 64), (68, 84), (252, 185), (200, 182)],
                          7: [(261, 161)]},
        "scale": 0.94, "footX": 278, "quality": 88,
    },
}


def remove_matte(image, interior_seeds):
    pixels = np.array(image.convert("RGBA"))
    rgb = pixels[:, :, :3].astype(np.int16)
    neutral = (rgb.min(2) >= 220) & (np.ptp(rgb, axis=2) <= 20)
    height, width = neutral.shape
    background = np.zeros((height, width), bool)
    queue = deque()

    def seed(x, y):
        if neutral[y, x] and not background[y, x]:
            background[y, x] = True
            queue.append((x, y))

    def flood():
        while queue:
            x, y = queue.popleft()
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    seed(nx, ny)

    def mask():
        return Image.fromarray(np.where(background, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)
    flood()
    bounds = mask().getbbox()
    # Wings and curled tails enclose background. Seed only reviewed gaps, not bright fire or eyes.
    for x, y in interior_seeds:
        x, y = x + bounds[0], y + bounds[1]
        if not neutral[y, x]:
            raise ValueError(f"Matte seed no longer matches source: {x}, {y}")
        seed(x, y)
    flood()
    result = Image.fromarray(pixels)
    result.putalpha(mask())
    if result.getchannel("A").getbbox() != bounds:
        raise ValueError("Interior cleanup changed the registered silhouette")
    return result.crop(bounds)


def prepare(source_dir):
    report = {"cell": [512, 384], "grid": [4, 2], "baseline": 368,
              "poses": ["idle", "inhale", "anticipation", "strike", "followThrough", "recovery", "recoil", "bracedRecovery"],
              "assets": {}}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, config in SHEETS.items():
        source_path = source_dir / config["source"]
        source = Image.open(source_path)
        if source.size != (1774, 887) or source.mode != "RGB":
            raise ValueError(f"Unexpected source format: {source_path}")
        atlas = Image.new("RGBA", (2048, 768))
        frames = []
        for index, region in enumerate(config["regions"]):
            seeds = config["interiorSeeds"].get(index, [])
            pose = remove_matte(source.crop(region), seeds)
            size = (round(pose.width * config["scale"]), round(pose.height * config["scale"]))
            pose = pose.resize(size, Image.Resampling.LANCZOS)
            x = round(config["footX"] - config["anchors"][index] * config["scale"])
            y = report["baseline"] - size[1]
            if not (x >= 12 and x + size[0] <= 500 and y >= 12):
                raise ValueError(f"Insufficient gutter: {name}, pose {index}")
            atlas.alpha_composite(pose, (index % 4 * 512 + x, index // 4 * 384 + y))
            bounds = pose.getchannel("A").point(lambda v: 255 if v > 64 else 0).getbbox()
            frames.append({"index": index, "sourceCrop": list(region), "interiorMatteSeeds": seeds,
                           "sourceFootX": config["anchors"][index], "offset": [x, y], "size": list(size),
                           "visibleBounds": [x + bounds[0], y + bounds[1], x + bounds[2], y + bounds[3]]})
        path = OUTPUT / f"{name}.webp"
        quality = config.get("quality", 92)
        atlas.save(path, "WEBP", quality=quality, method=6, exact=True)
        report["assets"][name] = {"file": path.name, "source": config["source"],
                                  "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
                                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size,
                                  "quality": quality, "uniformScale": config["scale"], "footX": config["footX"], "frames": frames}
        union = [min(f["visibleBounds"][i] for f in frames) if i < 2 else max(f["visibleBounds"][i] for f in frames) for i in range(4)]
        print(f"{path.name}: {path.stat().st_size:,} bytes; bounds={union}")
    (OUTPUT / "registration-fire-v1.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    prepare(parser.parse_args().source_dir)
