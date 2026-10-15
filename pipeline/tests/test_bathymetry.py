import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from build_bathymetry import build_grid  # noqa: E402


def test_build_grid_orders_rows_north_to_south_and_clamps():
    rows = [[30, 117, -5000], [30, 117.05, 12], [30.05, 117, -60], [30.05, 117.05, None]]
    g = build_grid(rows, bbox=(117, 30, 117.05, 30.05))
    assert (g["width"], g["height"]) == (2, 2)
    # 북쪽 행(30.05)이 먼저
    assert g["data"] == [-60, -200, -200, 1]
