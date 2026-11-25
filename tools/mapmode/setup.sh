#!/bin/bash
# One-time setup: fonts, map vectors, NASA imagery with terrain relief. Everything comes from free,
# public sources: Google Fonts (OFL), Natural Earth (public domain), NASA GIBS Blue Marble (public domain),
# AWS Terrain Tiles (credit: Mapzen / AWS Open Data; see README). Takes a few minutes.
set -e
cd "$(dirname "$0")"
pip install -q numpy pillow fonttools
python3 make_fonts.py
python3 make_region.py
mkdir -p data
[ -f data/wide.jpg ] || curl -s -o data/wide.jpg "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=BlueMarble_ShadedRelief_Bathymetry&CRS=EPSG:4326&BBOX=-32,-2,62,72&WIDTH=2467&HEIGHT=3133&FORMAT=image/jpeg"
python3 build_tiles.py
echo "setup complete"
