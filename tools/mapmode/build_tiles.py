# High-res base map: NASA Blue Marble (shaded relief + bathymetry, 500 m) for the ancient Near East,
# with hillshade from real elevation baked in, cut into a zoomable tile pyramid.
import os, io, math, json, urllib.request, numpy as np
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
LON0, LON1, LAT0, LAT1 = 22, 50, 8, 40     # region
STEP, PX = 4, 896                           # 4 degree chunks at ~500 m/pixel
os.makedirs('data/gibs', exist_ok=True)
def chunk(ix, iy):
    lo, la = LON0 + ix * STEP, LAT0 + iy * STEP; f = f'data/gibs/{lo}_{la}.jpg'
    if not os.path.exists(f):
        u = ('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
             f'&LAYERS=BlueMarble_ShadedRelief_Bathymetry&CRS=EPSG:4326&BBOX={la},{lo},{la+STEP},{lo+STEP}&WIDTH={PX}&HEIGHT={PX}&FORMAT=image/jpeg')
        open(f, 'wb').write(urllib.request.urlopen(u, timeout=120).read())
    return ix, iy, f
nx, ny = (LON1 - LON0) // STEP, (LAT1 - LAT0) // STEP
with ThreadPoolExecutor(6) as ex: parts = list(ex.map(lambda a: chunk(*a), [(i, j) for i in range(nx) for j in range(ny)]))
W, H = nx * PX, ny * PX
img = Image.new('RGB', (W, H))
for ix, iy, f in parts: img.paste(Image.open(f), (ix * PX, (ny - 1 - iy) * PX))
print('imagery', img.size)

# ---- elevation (AWS terrain tiles, Terrarium encoding) -> hillshade on the same grid ----
Z = 7; os.makedirs('data/terrain', exist_ok=True)
def tx(lon): return (lon + 180) / 360 * 2 ** Z
def ty(lat): r = math.radians(lat); return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** Z
xs = range(int(tx(LON0)), int(tx(LON1)) + 1); ys = range(int(ty(LAT1)), int(ty(LAT0)) + 1)
def tile(x, y):
    f = f'data/terrain/{x}_{y}.png'
    if not os.path.exists(f): open(f, 'wb').write(urllib.request.urlopen(f'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{Z}/{x}/{y}.png', timeout=60).read())
    a = np.asarray(Image.open(f).convert('RGB')).astype(np.float32)
    return x, y, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
with ThreadPoolExecutor(8) as ex: tiles = list(ex.map(lambda a: tile(*a), [(x, y) for x in xs for y in ys]))
mos = np.zeros((len(ys) * 256, len(xs) * 256), np.float32)
for x, y, e in tiles: mos[(y - ys[0]) * 256:(y - ys[0] + 1) * 256, (x - xs[0]) * 256:(x - xs[0] + 1) * 256] = e
# sample the mercator mosaic onto our lon/lat grid (half the imagery resolution, then upscale)
hw, hh = W // 2, H // 2
lon = LON0 + (np.arange(hw) + 0.5) / hw * (LON1 - LON0)
lat = LAT1 - (np.arange(hh) + 0.5) / hh * (LAT1 - LAT0)
px = ((lon + 180) / 360 * 2 ** Z - xs[0]) * 256
r = np.radians(lat); py = ((1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * 2 ** Z - ys[0]) * 256
elev = mos[np.clip(py.astype(int), 0, mos.shape[0] - 1)][:, np.clip(px.astype(int), 0, mos.shape[1] - 1)]
# hillshade, light from the north-west
cell = (LON1 - LON0) / hw * 111000 * math.cos(math.radians(24))
gy, gx = np.gradient(np.maximum(elev, 0), cell)
slope = np.arctan(1.6 * np.hypot(gx, gy)); aspect = np.arctan2(-gx, gy)
az, alt = math.radians(315), math.radians(42)
shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
shade = np.clip(shade, 0, 1)
land = (elev > -5).astype(np.float32)
sh = Image.fromarray((shade * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)
lm = Image.fromarray((land * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
a = np.asarray(img).astype(np.float32) / 255; s = np.asarray(sh).astype(np.float32)[..., None] / 255; m = np.asarray(lm).astype(np.float32)[..., None] / 255
flat = math.sin(alt)   # shade value of flat ground
relief = np.clip(a * (1 + 0.85 * (s - flat)), 0, 1)       # brighten sunlit slopes, darken shadowed ones
out = a * (1 - m) + relief * m
img = Image.fromarray((out * 255).astype(np.uint8))
# ---- pyramid ----
TS = 1024; levels = []; lvl = 0; cur = img
os.makedirs('data/tiles', exist_ok=True)
while True:
    cols, rows = math.ceil(cur.width / TS), math.ceil(cur.height / TS)
    os.makedirs(f'data/tiles/{lvl}', exist_ok=True)
    for cx in range(cols):
        for cy in range(rows):
            cur.crop((cx * TS, cy * TS, min(cur.width, (cx + 1) * TS), min(cur.height, (cy + 1) * TS))).save(f'data/tiles/{lvl}/{cx}_{cy}.jpg', quality=88)
    levels.append({'w': cur.width, 'h': cur.height, 'cols': cols, 'rows': rows})
    if cur.width <= 1600: break
    cur = cur.resize((cur.width // 2, cur.height // 2), Image.LANCZOS); lvl += 1
json.dump({'lon0': LON0, 'lon1': LON1, 'lat0': LAT0, 'lat1': LAT1, 'tile': TS, 'levels': levels}, open('data/tiles/tiles.json', 'w'))
print('levels', [(l['w'], l['h']) for l in levels])
img.resize((W // 8, H // 8)).save('data/tiles/preview.jpg', quality=85)
