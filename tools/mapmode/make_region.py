# Downloads Natural Earth (public domain) coastlines, rivers, lakes and borders and crops them to the
# region the episodes use, writing data/region.json.
import json, os, urllib.request
BB = (18, 2, 50, 40)  # lon0, lat0, lon1, lat1
SRC = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
os.makedirs('data', exist_ok=True)
def get(name):
    f = f'data/{name}.geojson'
    if not os.path.exists(f): urllib.request.urlretrieve(SRC + name + '.geojson', f)
    return json.load(open(f))
def inb(c): return BB[0] - 2 <= c[0] <= BB[2] + 2 and BB[1] - 2 <= c[1] <= BB[3] + 2
def lines(g):
    t, cs = g['type'], g['coordinates']
    return {'LineString': [cs], 'MultiLineString': cs, 'Polygon': cs, 'MultiPolygon': [r for p in cs for r in p]}.get(t, [])
def simplify(line, tol):
    out = [line[0]]
    for p in line[1:]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= tol: out.append(p)
    if out[-1] != line[-1]: out.append(line[-1])
    return [[round(x, 3), round(y, 3)] for x, y in out]
def take(name, keep=lambda p: True, tol=0.01):
    res = []
    for f in get(name)['features']:
        if not keep(f['properties']): continue
        for l in lines(f['geometry']):
            seg = []
            for c in l:
                if inb(c): seg.append(c)
                else:
                    if len(seg) > 1: res.append(simplify(seg, tol))
                    seg = []
            if len(seg) > 1: res.append(simplify(seg, tol))
    return res
out = {'coast': take('ne_10m_coastline'), 'rivers': take('ne_10m_rivers_lake_centerlines', lambda p: (p.get('scalerank') or 9) <= 7),
       'lakes': take('ne_10m_lakes', lambda p: (p.get('scalerank') or 9) <= 6), 'borders': take('ne_50m_admin_0_countries', tol=0.02)}
json.dump(out, open('data/region.json', 'w'), separators=(',', ':'))
print('data/region.json', {k: len(v) for k, v in out.items()})
