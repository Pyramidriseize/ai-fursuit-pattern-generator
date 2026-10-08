"""Packs the rendered icon PNGs into furge.ico (Windows) and furge.icns (macOS)."""
import sys
from pathlib import Path

from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
master = Image.open(src / "icon-1024.png").convert("RGBA")
frames = [Image.open(src / f"icon-{s}.png").convert("RGBA") for s in (16, 24, 32, 48, 64, 128, 256)]
frames[-1].save(out / "furge.ico", format="ICO", append_images=frames[:-1], sizes=[f.size for f in frames])
master.save(out / "furge.icns", format="ICNS")
print("packed", out / "furge.ico", out / "furge.icns")
