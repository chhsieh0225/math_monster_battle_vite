"""Prepare the approved roster drawings offline; requires Pillow and NumPy.

python3 scripts/prepare-roster-atlases.py --source-dir /path/to/generated_images
--analyze discovers background separators without exporting production assets.
--verify checks all shipped atlases without needing the original generated images.
Source prompts and optional reviewed crop/anchor overrides live in the JSON manifest.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public/sprites/visual-pilot"
MANIFEST = ROOT / "scripts/roster-art-sources.json"
CELL = (512, 384)
BASELINE = 368
POSES = ["idle", "inhale", "anticipation", "strike", "followThrough", "recovery", "recoil", "bracedRecovery"]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def remove_matte(source):
    pixels = np.array(source.convert("RGBA"))
    rgb = pixels[:, :, :3].astype(np.int16)
    red, green, blue = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # The intentionally saturated key excludes white fur, silver, pink petals and dark violet.
    matte = (np.minimum(red, blue) > 180) & (green < 85) & (np.abs(red - blue) < 45)
    matte &= np.minimum(red, blue) - green > 140
    if matte.mean() < .2:
        raise ValueError("Source does not have the approved magenta matte")
    alpha = Image.fromarray(np.where(matte, 0, pixels[:, :, 3]).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    pixels[:, :, 3] = np.array(alpha)
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels)


def separator(projection, expected, radius):
    low, high = max(1, round(expected - radius)), min(len(projection) - 1, round(expected + radius))
    empty = np.where(projection[low:high] == 0)[0] + low
    if not len(empty):
        raise ValueError(f"No clear separator around {expected:.1f}; review source crops")
    runs = np.split(empty, np.where(np.diff(empty) > 1)[0] + 1)
    # A real gap is preferred over a one-pixel crack within an appendage.
    run = min(runs, key=lambda r: abs(float(r.mean()) - expected) - min(len(r), 24))
    return round(float(run.mean()))


def regions_for(image):
    mask = np.array(image.getchannel("A")) > 64
    height, width = mask.shape
    middle = separator(mask.sum(1), height / 2, height * .09)
    regions = []
    for top, bottom in [(0, middle), (middle, height)]:
        projection = mask[top:bottom].sum(0)
        columns = [0] + [separator(projection, width * i / 4, width * .075) for i in range(1, 4)] + [width]
        # Share the empty separator pixel so both crops have a transparent edge even in a narrow gap.
        regions.extend((left, top, min(right + 1, width), min(bottom + 1, height))
                       for left, right in zip(columns, columns[1:]))
    return regions


def poses_for(source, config):
    cleaned = remove_matte(source)
    regions = config.get("regions") or regions_for(cleaned)
    if len(regions) != 8:
        raise ValueError("Exactly eight source regions are required")
    poses = []
    coverage = np.zeros((cleaned.height, cleaned.width), dtype=np.uint8)
    for index, region in enumerate(regions):
        isolated = cleaned
        polygon = config.get("polygons", {}).get(str(index))
        if polygon:
            mask = Image.new("L", cleaned.size)
            ImageDraw.Draw(mask).polygon([tuple(point) for point in polygon], fill=255)
            isolated = Image.new("RGBA", cleaned.size)
            isolated.paste(cleaned, (0, 0), mask)
        cell = isolated.crop(region)
        bounds = cell.getchannel("A").getbbox()
        if not bounds:
            raise ValueError(f"Empty pose {index}")
        if min(bounds[:2]) <= 0 or bounds[2] >= cell.width or bounds[3] >= cell.height:
            raise ValueError(f"Pose {index} touches source crop boundary: {region}, {bounds}")
        pose = cell.crop(bounds)
        mask = np.array(pose.getchannel("A")) > 64
        left, top = region[0] + bounds[0], region[1] + bounds[1]
        coverage[top:top + pose.height, left:left + pose.width] += mask.astype(np.uint8)
        # Initial contact anchor; reviewed overrides cover tails, hovering actors and props.
        contact = np.where(mask[-8:])[1]
        anchor = float(np.median(contact))
        if config.get("anchorMode", "rearFoot") == "rearFoot":
            contact_columns = np.where(mask[-max(12, round(pose.height * .07)):].sum(0) >= 4)[0]
            runs = np.split(contact_columns, np.where(np.diff(contact_columns) > 1)[0] + 1)
            feet = [run for run in runs if len(run) >= 8]
            if feet:
                anchor = float(np.median(feet[-1]))
        if "anchors" in config:
            anchor = config["anchors"][index]
        poses.append({"image": pose, "anchor": anchor, "region": region,
                      "tightCrop": [region[0] + bounds[0], region[1] + bounds[1],
                                    region[0] + bounds[2], region[1] + bounds[3]]})
    original = np.array(cleaned.getchannel("A")) > 64
    if np.any(original & (coverage == 0)) or np.any(coverage > 1):
        raise ValueError("Source crops lose or duplicate foreground pixels; review separators")
    return poses


def prepare(source_dir, analyze=False, preview_dir=None):
    sources = json.loads(MANIFEST.read_text())["sources"]
    keys = [item["key"] for item in sources]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate source identities")
    report = {"cell": list(CELL), "grid": [4, 2], "baseline": BASELINE, "poses": POSES, "assets": {}}
    errors = []
    if preview_dir:
        preview_dir.mkdir(parents=True, exist_ok=True)
    for config in sources:
        key = config["key"]
        try:
            path = source_dir / config["source"]
            source = Image.open(path)
            if source.width < 1600 or source.height < 800:
                raise ValueError("Source is below approved resolution")
            poses = poses_for(source, config)
            left = max(p["anchor"] for p in poses)
            right = max(p["image"].width - p["anchor"] for p in poses)
            scale = min(1, 484 / (left + right), 352 / max(p["image"].height for p in poses))
            foot_x = round(256 + (left - right) * scale / 2)
            atlas = Image.new("RGBA", (2048, 768))
            frames = []
            for index, pose in enumerate(poses):
                size = tuple(round(v * scale) for v in pose["image"].size)
                image = pose["image"].resize(size, Image.Resampling.LANCZOS)
                x = round(foot_x - pose["anchor"] * scale)
                y = BASELINE - size[1]
                if not (x >= 12 and x + size[0] <= 500 and y >= 12):
                    raise ValueError(f"Insufficient destination gutter, pose {index}")
                atlas.alpha_composite(image, (index % 4 * CELL[0] + x, index // 4 * CELL[1] + y))
                frames.append({"index": index, "sourceCrop": list(pose["region"]), "tightCrop": pose["tightCrop"],
                               "sourceFootX": pose["anchor"], "offset": [x, y], "size": list(size)})
            if preview_dir:
                preview = Image.new("RGBA", atlas.size, "#16242e")
                preview.alpha_composite(atlas)
                draw = ImageDraw.Draw(preview)
                for index in range(8):
                    x, y = index % 4 * CELL[0], index // 4 * CELL[1]
                    draw.line((x, y + BASELINE, x + CELL[0], y + BASELINE), fill="#496677")
                    draw.line((x + foot_x, y + BASELINE - 8, x + foot_x, y + BASELINE + 6), fill="#ff6060", width=2)
                    draw.text((x + 10, y + 5), f"{key} / {index}", fill="white")
                preview.resize((1024, 384), Image.Resampling.LANCZOS).convert("RGB").save(preview_dir / f"{key}.jpg", quality=94)
            if analyze:
                print(f"{key}: crops={[list(p['region']) for p in poses]}; anchors={[p['anchor'] for p in poses]}")
                continue
            name = key.replace("_", "-") + "-v1"
            output = OUTPUT / f"{name}.webp"
            for quality in [92, 90, 88, 86, 84, 82, 80]:
                atlas.save(output, "WEBP", quality=quality, method=6, exact=True)
                if output.stat().st_size < 400_000:
                    break
            else:
                raise ValueError("Atlas exceeds 400 KB even at quality 80; review rather than shrink")
            decoded = Image.open(output).convert("RGBA")
            for index, frame in enumerate(frames):
                x, y = index % 4 * CELL[0], index // 4 * CELL[1]
                cell = decoded.crop((x, y, x + CELL[0], y + CELL[1]))
                bounds = cell.getchannel("A").point(lambda v: 255 if v > 64 else 0).getbbox()
                if not bounds or not (bounds[0] >= 12 and bounds[1] >= 12 and bounds[2] <= 500 and bounds[3] <= BASELINE):
                    raise ValueError(f"Decoded alpha outside registered cell, pose {index}")
                frame["visibleBounds"] = list(bounds)
                frame["rgbaSha256"] = digest(cell.tobytes())
            if len({f["rgbaSha256"] for f in frames}) != 8:
                raise ValueError("Duplicate pose drawings")
            union = [min(f["visibleBounds"][i] for f in frames) if i < 2 else max(f["visibleBounds"][i] for f in frames) for i in range(4)]
            report["assets"][name] = {"key": key, "file": output.name, "source": path.name,
                "sourceSha256": digest(path.read_bytes()), "sha256": digest(output.read_bytes()),
                "bytes": output.stat().st_size, "quality": quality, "uniformScale": scale, "footX": foot_x,
                "bounds": union, "frames": frames}
            print(f"{key}: {output.stat().st_size:,} bytes, quality={quality}, bounds={union}")
        except (ValueError, OSError) as error:
            errors.append(f"{key}: {error}")
    if errors:
        raise SystemExit("\n".join(errors))
    if not analyze:
        (OUTPUT / "registration-roster-v1.json").write_text(json.dumps(report, indent=2) + "\n")


def verify():
    records = {}
    for name in ["registration-v2.json", "registration-wolf-v1.json", "registration-fire-v1.json", "registration-roster-v1.json"]:
        records.update(json.loads((OUTPUT / name).read_text())["assets"])
    for record in records.values():
        path = OUTPUT / record["file"]
        data = path.read_bytes()
        if len(data) >= 400_000 or digest(data) != record["sha256"]:
            raise ValueError(f"Atlas bytes do not match approved registration: {path.name}")
        decoded = Image.open(path).convert("RGBA")
        if decoded.size != (2048, 768):
            raise ValueError(f"Wrong atlas dimensions: {path.name}")
        for index, frame in enumerate(record["frames"]):
            x, y = index % 4 * CELL[0], index // 4 * CELL[1]
            cell = decoded.crop((x, y, x + CELL[0], y + CELL[1]))
            alpha = cell.getchannel("A")
            bounds = alpha.point(lambda v: 255 if v > 64 else 0).getbbox()
            if list(bounds or []) != frame["visibleBounds"]:
                raise ValueError(f"Decoded bounds mismatch: {path.name}, pose {index}")
            borders = [(0, 0, 512, 10), (0, 374, 512, 384), (0, 0, 10, 384), (502, 0, 512, 384)]
            if any(alpha.crop(border).getbbox() for border in borders):
                raise ValueError(f"Nontransparent cell gutter: {path.name}, pose {index}")
            if "rgbaSha256" in frame and digest(cell.tobytes()) != frame["rgbaSha256"]:
                raise ValueError(f"Decoded pose mismatch: {path.name}, pose {index}")
    print(f"Verified {len(records)} atlases, {sum(len(r['frames']) for r in records.values())} poses, "
          f"{sum(r['bytes'] for r in records.values()):,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    parser.add_argument("--analyze", action="store_true")
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--preview-dir", type=Path)
    args = parser.parse_args()
    if args.verify:
        verify()
    elif args.source_dir:
        prepare(args.source_dir, args.analyze, args.preview_dir)
    else:
        parser.error("--source-dir is required unless --verify is used")
