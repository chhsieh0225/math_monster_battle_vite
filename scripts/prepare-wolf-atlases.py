"""Offline art preparation only; requires Pillow and NumPy, not game dependencies.

Usage: python3 scripts/prepare-wolf-atlases.py --source-dir /path/to/generated_images
The crop/anchor coordinates are reviewed for these exact sources, not generic art.
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
RECOIL = "exec-fa34bd63-fdc8-4bee-9c8e-6114d381f3bb.png"
SHEETS = {
    "steel-wolf-cub-v1": {
        "source": "exec-c237a1f8-e4f9-48c3-b5a8-b2939ef951b2.png",
        "regions": [(60, 70, 478, 425), (485, 70, 855, 425), (875, 70, 1278, 425), (1280, 70, 1750, 425),
                    (45, 450, 470, 810), (480, 450, 860, 810), (870, 450, 1280, 810), (1290, 450, 1750, 810)],
        "anchors": [229.5, 223, 245.5, 313.5, 255, 228, 251, 270.5],
        "scale": 1.0, "footX": 356,
    },
    "steel-wolf-blade-v1": {
        "source": "exec-55f04dab-a1fb-44f8-a4f5-029cc3c85cbe.png",
        "regions": [(35, 60, 420, 410), (440, 60, 855, 410), (865, 60, 1270, 410), (1275, 60, 1750, 410),
                    (10, 445, 440, 810), (450, 445, 865, 810), (875, 445, 1320, 810), (1320, 445, 1750, 810)],
        "anchors": [217, 211.5, 267.5, 344.5, 268, 256.5, 98, 275.5],
        "scale": 0.84, "footX": 306,
    },
}


def remove_checkerboard(image):
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

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(height):
        seed(0, y)
        seed(width - 1, y)
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height:
                seed(nx, ny)

    # Only border-connected neutral pixels are background. Enclosed white fur stays opaque.
    pixels[:, :, 3] = np.where(background, 0, 255)
    result = Image.fromarray(pixels)
    result.putalpha(result.getchannel("A").filter(ImageFilter.MinFilter(3)))
    return result.crop(result.getchannel("A").getbbox())


def corrected_recoil(path):
    image = Image.open(path).convert("RGBA")
    # This edit has genuine alpha but a soft external glow; retain its solid silhouette.
    image.putalpha(image.getchannel("A").point(lambda v: max(0, min(255, (v - 240) * 255 // 10))))
    image = image.crop(image.getchannel("A").getbbox())
    # Normalize the separately generated edit's resolution to the original sheet's drawing scale.
    return image.resize((round(image.width * 292 / image.height), 292), Image.Resampling.LANCZOS)


def prepare(source_dir):
    report = {"cell": [512, 384], "grid": [4, 2], "baseline": 368,
              "poses": ["idle", "inhale", "anticipation", "strike", "followThrough", "recovery", "recoil", "bracedRecovery"],
              "assets": {}}
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, config in SHEETS.items():
        source_path = source_dir / config["source"]
        source = Image.open(source_path)
        if source.size != (1774, 887):
            raise ValueError(f"Unexpected source dimensions: {source_path}")
        atlas = Image.new("RGBA", (2048, 768))
        records = []
        for index, region in enumerate(config["regions"]):
            pose = corrected_recoil(source_dir / RECOIL) if name == "steel-wolf-cub-v1" and index == 6 else remove_checkerboard(source.crop(region))
            scale = config["scale"]
            size = (round(pose.width * scale), round(pose.height * scale))
            pose = pose.resize(size, Image.Resampling.LANCZOS)
            x = round(config["footX"] - config["anchors"][index] * scale)
            y = report["baseline"] - pose.height
            if not (x >= 12 and x + pose.width <= 500 and y >= 12):
                raise ValueError(f"Insufficient gutter: {name}, pose {index}")
            atlas.alpha_composite(pose, (index % 4 * 512 + x, index // 4 * 384 + y))
            bounds = pose.getchannel("A").point(lambda v: 255 if v > 64 else 0).getbbox()
            records.append({"index": index, "sourceCrop": list(region), "sourceFootX": config["anchors"][index],
                            "offset": [x, y], "size": list(size),
                            "visibleBounds": [x + bounds[0], y + bounds[1], x + bounds[2], y + bounds[3]]})
        path = OUTPUT / f"{name}.webp"
        atlas.save(path, "WEBP", quality=92, method=6, exact=True)
        report["assets"][name] = {"file": path.name, "source": config["source"],
                                  "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(),
                                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size,
                                  "uniformScale": config["scale"], "footX": config["footX"], "frames": records}
        if name == "steel-wolf-cub-v1":
            report["assets"][name]["recoilSource"] = RECOIL
            report["assets"][name]["recoilSourceSha256"] = hashlib.sha256((source_dir / RECOIL).read_bytes()).hexdigest()
        print(f"{path.name}: {path.stat().st_size:,} bytes")
    (OUTPUT / "registration-wolf-v1.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", required=True, type=Path)
    prepare(parser.parse_args().source_dir)
