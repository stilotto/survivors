"""Fetch AWS Terrain Tiles (terrarium, z14) for the map area and bake them into
data/elevation.png: a lon/lat grid over BBOX, height in decimeters as R*256+G.
Run: pip install pillow numpy; python3 tools/fetch_elevation.py"""
import io,json,math,os,urllib.request
import numpy as np
from PIL import Image
BBOX=(-80.12,40.74,-79.99,40.82)  # same as fetch_map.py
Z=14; W=720
OUT=os.path.join(os.path.dirname(__file__),'..','data')
def tile_xy(lon,lat):
  n=2**Z; return (lon+180)/360*n,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n
x0,y0=tile_xy(BBOX[0],BBOX[3]); x1,y1=tile_xy(BBOX[2],BBOX[1])
tx0,ty0,tx1,ty1=int(x0),int(y0),int(x1),int(y1)
mosaic=np.zeros(((ty1-ty0+1)*256,(tx1-tx0+1)*256))
for ty in range(ty0,ty1+1):
  for tx in range(tx0,tx1+1):
    url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png'
    a=np.asarray(Image.open(io.BytesIO(urllib.request.urlopen(url).read())).convert('RGB')).astype(float)
    mosaic[(ty-ty0)*256:(ty-ty0+1)*256,(tx-tx0)*256:(tx-tx0+1)*256]=a[...,0]*256+a[...,1]+a[...,2]/256-32768
lat_mid=(BBOX[1]+BBOX[3])/2
w_m=(BBOX[2]-BBOX[0])*111320*math.cos(math.radians(lat_mid)); h_m=(BBOX[3]-BBOX[1])*110574
H=round(W*h_m/w_m)
lons=np.linspace(BBOX[0],BBOX[2],W); lats=np.linspace(BBOX[3],BBOX[1],H)
px=np.array([tile_xy(l,lat_mid)[0] for l in lons])-tx0; px*=256
py=np.array([tile_xy(BBOX[0],l)[1] for l in lats])-ty0; py*=256
gx,gy=np.meshgrid(px-0.5,py-0.5)
ix,iy=np.floor(gx).astype(int),np.floor(gy).astype(int); fx,fy=gx-ix,gy-iy
m=lambda yy,xx: mosaic[yy,xx]
h=(m(iy,ix)*(1-fx)*(1-fy)+m(iy,ix+1)*fx*(1-fy)+m(iy+1,ix)*(1-fx)*fy+m(iy+1,ix+1)*fx*fy)
dm=np.clip(np.round(h*10),0,65535).astype(np.uint32)
img=np.zeros((H,W,3),np.uint8); img[...,0]=dm>>8; img[...,1]=dm&255
Image.fromarray(img).save(os.path.join(OUT,'elevation.png'),optimize=True)
json.dump({'bbox':BBOX,'width':W,'height':H,'widthMeters':round(w_m,1),'heightMeters':round(h_m,1),
  'encoding':'decimeters = R*256 + G','source':'AWS Terrain Tiles (terrarium) z14'},open(os.path.join(OUT,'elevation.json'),'w'),indent=1)
print(W,H,round(h.min(),1),round(h.max(),1))
