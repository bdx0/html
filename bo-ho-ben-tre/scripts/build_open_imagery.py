#!/usr/bin/env python3
"""Build a reproducible, locally hosted RGB orthomosaic for Hồ Trúc Giang.

Search priority: OpenAerialMap STAC (only per-item permitted open licenses,
sufficient coverage) -> Copernicus Sentinel-2 L2A Earth Search STAC.
No Google/Esri tile extraction and no image synthesis. Metadata tracks source,
capture date, native pixel size, exact bbox, license, item id, and attribution.
Requires requests rasterio Pillow numpy. Nonfatal when upstream unreachable.
"""
import argparse
import datetime as dt
import json
import logging
import os
import sys
from pathlib import Path

import numpy as np
import requests
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.vrt import WarpedVRT
import rasterio

LOG = logging.getLogger("open-imagery")
# Fixed geodetic bounds around OSM Hồ Trúc Giang + ~300 m neighborhood.
BBOX = (106.37220, 10.23277, 106.38408, 10.24445)
SIZE = 1024
OAM_SEARCH = "https://api.imagery.hotosm.org/stac/search"
S2_SEARCH = "https://earth-search.aws.element84.com/v1/search"
ALLOWED_OAM = {"CC-BY-4.0", "CC-BY-SA-4.0", "CC0-1.0"}
HTTP = requests.Session()
HTTP.headers["User-Agent"] = "BoHoBenTre-open-imagery/1.0 (public GitHub Pages research project)"
TIMEOUT = 40
os.environ.setdefault("GDAL_DISABLE_READDIR_ON_OPEN", "EMPTY_DIR")
os.environ.setdefault("CPL_VSIL_CURL_ALLOWED_EXTENSIONS", ".tif,.tiff")
os.environ.setdefault("AWS_NO_SIGN_REQUEST", "YES")
os.environ.setdefault("GDAL_HTTP_MAX_RETRY", "3")
os.environ.setdefault("GDAL_HTTP_RETRY_DELAY", "2")


def post_search(url, collection, max_items=80, extra=None):
    payload = {"collections": [collection], "bbox": list(BBOX), "limit": max_items}
    if extra:
        payload.update(extra)
    response = HTTP.post(url, json=payload, timeout=TIMEOUT)
    response.raise_for_status()
    data = response.json()
    return data.get("features", [])


def covers_bbox(item, bbox=BBOX):
    extent = item.get("bbox") or []
    if len(extent) < 4:
        return False
    return (extent[0] <= bbox[0] and extent[1] <= bbox[1]
            and extent[2] >= bbox[2] and extent[3] >= bbox[3])


def get_band(href, band=1):
    if not href or not href.startswith("https://"):
        raise ValueError("Asset must be HTTPS")
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES"):
        with rasterio.open(href) as src:
            native = min(abs(src.res[0]), abs(src.res[1]))
            vrt_opts = {
                "crs": "EPSG:4326",
                "transform": from_bounds(*BBOX, SIZE, SIZE),
                "width": SIZE,
                "height": SIZE,
                "resampling": Resampling.bilinear,
                "src_nodata": src.nodata,
                "dst_nodata": 0,
            }
            with WarpedVRT(src, **vrt_opts) as vrt:
                array = vrt.read(band, masked=True)
                mask = np.ma.getmaskarray(array)
                return np.asarray(array.filled(0)), ~mask, native


def image_from_oam(item):
    props = item.get("properties") or {}
    license_id = (props.get("license") or item.get("license") or "").upper()
    if license_id not in ALLOWED_OAM or not covers_bbox(item):
        return None
    assets = item.get("assets") or {}
    asset = assets.get("visual") or assets.get("image")
    if not asset:
        return None
    url = asset.get("href", "")
    if not url.startswith("https://"):
        return None
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", AWS_NO_SIGN_REQUEST="YES"):
        with rasterio.open(url) as src:
            if src.count < 3:
                return None
            with WarpedVRT(src, crs="EPSG:4326",
                           transform=from_bounds(*BBOX, SIZE, SIZE),
                           width=SIZE, height=SIZE, resampling=Resampling.bilinear,
                           src_nodata=src.nodata, dst_nodata=0) as vrt:
                data = vrt.read([1, 2, 3], masked=True)
                valid = ~np.any(np.ma.getmaskarray(data), axis=0)
                if float(np.mean(valid)) < .95:
                    raise ValueError("OAM image does not cover 95% of the AOI")
                rgb = np.asarray(data.filled(0), dtype=np.float32)
                if np.nanmax(rgb) > 255:
                    rgb = np.clip(rgb / 256, 0, 255)
                rgb = np.moveaxis(np.clip(rgb, 0, 255).astype(np.uint8), 0, -1)
                if np.mean(rgb[valid]) < 2:
                    raise ValueError("OAM visual raster looks empty")
                producer = props.get("oam:producer_name") or props.get("provider") or "OpenAerialMap contributor"
                if isinstance(producer, list):
                    producer = ", ".join(str(x) for x in producer)
                return rgb, {
                    "source": "OpenAerialMap", "license": license_id,
                    "attribution": f"Imagery: {producer} / OpenAerialMap ({license_id})",
                    "native_resolution_m": props.get("gsd") or props.get("oam:gsd") or None,
                    "acquired": str(props.get("datetime") or "")[:10] or None,
                    "item_id": item.get("id"),
                    "source_url": f"https://api.imagery.hotosm.org/stac/collections/openaerialmap/items/{item.get('id')}",
                }


def build_oam():
    items = post_search(OAM_SEARCH, "openaerialmap")
    LOG.info("OpenAerialMap STAC items intersecting AOI: %s", len(items))
    for item in sorted(items, key=lambda f: ((f.get("properties") or {}).get("gsd") or 9999)):
        try:
            found = image_from_oam(item)
            if found:
                return found, len(items)
        except Exception as error:
            LOG.warning("OAM %s skipped: %s", item.get("id"), error)
    return None, len(items)


def image_from_sentinel(item):
    assets = item.get("assets") or {}
    if not all(assets.get(key, {}).get("href") for key in ("red", "green", "blue")):
        return None
    if not covers_bbox(item):
        return None
    channels = []
    masks = []
    for name in ("red", "green", "blue"):
        band, valid, _ = get_band(assets[name]["href"])
        channels.append(band.astype(np.float32))
        masks.append(valid)
    valid = np.logical_and.reduce(masks)
    if np.mean(valid) < .90:
        raise ValueError("Insufficient valid Sentinel pixel coverage")
    # L2A optical 0..10000 reflectance -> exposure for visual inspection.
    bands = np.stack(channels, axis=-1)
    rgb = np.clip((bands / 3600.0), 0, 1.0) ** .85
    rgb = (rgb * 255).astype(np.uint8)
    rgb[~valid] = (235, 238, 242)
    year = (item.get("properties") or {}).get("datetime", "")[:4]
    return rgb, {
        "source": "Copernicus Sentinel-2 L2A",
        "license": "Copernicus Sentinel Data Terms",
        "attribution": f"Contains modified Copernicus Sentinel data {year or 'unknown year'}",
        "native_resolution_m": 10,
        "acquired": str((item.get("properties") or {}).get("datetime", ""))[:10],
        "item_id": item.get("id"),
        "source_url": f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a/items/{item.get('id')}",
        "cloud_cover_percent": (item.get("properties") or {}).get("eo:cloud_cover"),
    }


def build_sentinel():
    end = dt.datetime.now(dt.timezone.utc).date()
    start = end - dt.timedelta(days=240)
    items = post_search(S2_SEARCH, "sentinel-2-c1-l2a", max_items=100, extra={
        "datetime": f"{start.isoformat()}/{end.isoformat()}",
        "query": {"eo:cloud_cover": {"lt": 50}},
    })
    LOG.info("Sentinel-2 images intersecting AOI: %s", len(items))
    candidates = sorted(items, key=lambda it: (
        float((it.get("properties") or {}).get("eo:cloud_cover") or 100),
        str((it.get("properties") or {}).get("datetime") or "")))
    for item in candidates[:12]:
        try:
            found = image_from_sentinel(item)
            if found:
                return found, len(items)
        except Exception as error:
            LOG.warning("Sentinel %s skipped: %s", item.get("id"), error)
    return None, len(items)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", type=Path, default=Path("bo-ho-ben-tre/data/imagery"))
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args.output.mkdir(parents=True, exist_ok=True)
    overview = {
        "status": "unavailable", "bbox": list(BBOX), "image": None,
        "reason": "Chưa tìm được ảnh mở đầy đủ và tải được cho khu vực hồ.",
        "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "oam_intersecting": None, "sentinel_intersecting": None
    }
    data = None
    try:
        found, count = build_oam()
        overview["oam_intersecting"] = count
        data = found
    except Exception as error:
        overview["oam_error"] = str(error)[:240]
        LOG.warning("OAM search failure: %s", error)
    if data is None:
        try:
            found, count = build_sentinel()
            overview["sentinel_intersecting"] = count
            data = found
        except Exception as error:
            overview["sentinel_error"] = str(error)[:240]
            LOG.warning("Sentinel search failure: %s", error)
    if data:
        rgb, metadata = data
        image_path = args.output / "basemap.webp"
        Image.fromarray(rgb).save(image_path, "WEBP", quality=88, method=5)
        overview.update(metadata)
        overview.update({"status": "ready", "image": image_path.name})
        overview.pop("reason", None)
        LOG.info("Wrote %s bytes to %s", image_path.stat().st_size, image_path)
    else:
        (args.output / "basemap.webp").unlink(missing_ok=True)
        LOG.warning("No valid satellite background; keeping OSM technical base")
    (args.output / "manifest.json").write_text(json.dumps(overview, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": overview["status"], "source": overview.get("source"),
                      "oam_found": overview["oam_intersecting"], "sentinel_found": overview["sentinel_intersecting"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
