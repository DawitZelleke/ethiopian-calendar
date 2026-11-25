# Downloads the open-licensed (SIL OFL) fonts the videos use and makes fixed-weight copies.
import os, urllib.request
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
G = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
os.makedirs('fonts', exist_ok=True)
def fetch(path, out):
    if not os.path.exists(out): urllib.request.urlretrieve(G + path, out)
fetch('publicsans/PublicSans%5Bwght%5D.ttf', 'fonts/PublicSans.ttf')
fetch('spectral/Spectral-SemiBold.ttf', 'fonts/Spectral-SemiBold.ttf')
fetch('notosansethiopic/NotoSansEthiopic%5Bwdth%2Cwght%5D.ttf', 'fonts/NotoSansEthiopic.ttf')
for w, n in [(800, 'ExtraBold'), (700, 'Bold')]:
    f = TTFont('fonts/PublicSans.ttf'); instantiateVariableFont(f, {'wght': w}, inplace=True); f.save(f'fonts/PublicSans-{n}.ttf')
f = TTFont('fonts/NotoSansEthiopic.ttf'); instantiateVariableFont(f, {'wght': 800, 'wdth': 100}, inplace=True); f.save('fonts/NotoSansEthiopic-ExtraBold.ttf')
print('fonts ready')
