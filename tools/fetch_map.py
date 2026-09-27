"""Fetch map data for the game area from Overture Maps (public S3) and bake
it into small GeoJSON files in data/. Run: pip install pyarrow shapely; python3 tools/fetch_map.py
Overture's roads, buildings and base layers are built from OpenStreetMap (ODbL)."""
import os,json,pyarrow.fs as pf,pyarrow.dataset as ds,pyarrow.compute as pc,shapely,shapely.geometry as sg
from urllib.parse import urlparse
RELEASE='2026-09-23.1'
BBOX=(-80.12,40.74,-79.99,40.82)  # xmin,ymin,xmax,ymax: Evans City + Ash Stop Rd
OUT=os.path.join(os.path.dirname(__file__),'..','data')
px=os.environ.get('HTTPS_PROXY'); p=urlparse(px) if px else None
fs=pf.S3FileSystem(anonymous=True,region='us-west-2',**({'proxy_options':{'scheme':'http','host':p.hostname,'port':p.port}} if p else {}))
def fetch(theme,typ):
  d=ds.dataset(f'overturemaps-us-west-2/release/{RELEASE}/theme={theme}/type={typ}/',filesystem=fs,format='parquet')
  b=lambda k:pc.field(('bbox',k))
  return d.to_table(filter=(b('xmin')>BBOX[0])&(b('ymin')>BBOX[1])&(b('xmax')<BBOX[2])&(b('ymax')<BBOX[3])).to_pylist()
def nm(r): return (r.get('names') or {}).get('primary')
def geo(g):
  d=sg.mapping(shapely.from_wkb(g))
  def f(c): return [f(x) for x in c] if isinstance(c[0],(list,tuple)) else [round(c[0],5),round(c[1],5)]
  d['coordinates']=f(d['coordinates']); return d
def bake(theme,typ,dst,props,keep=lambda r:True):
  fs_=[{'type':'Feature','properties':{k:v for k,v in props(r).items() if v is not None},'geometry':geo(r['geometry'])}
       for r in fetch(theme,typ) if keep(r)]
  json.dump({'type':'FeatureCollection','features':fs_},open(os.path.join(OUT,dst),'w'),separators=(',',':'))
  print(dst,len(fs_))
bake('transportation','segment','roads.json',lambda r:{'name':nm(r),'kind':r['subtype'],'class':r['class']})
bake('buildings','building','buildings.json',lambda r:{'class':r['class'],'height':r['height'] and round(r['height'],1),'floors':r['num_floors'],'name':nm(r)})
bake('base','water','water.json',lambda r:{'class':r['class'],'name':nm(r)})
bake('base','land_use','landuse.json',lambda r:{'kind':r['subtype'],'class':r['class'],'name':nm(r)})
bake('base','land_cover','landcover.json',lambda r:{'kind':r['subtype']})
bake('places','place','places.json',lambda r:{'name':nm(r),'category':r['basic_category']},lambda r:(r['confidence'] or 0)>=0.7)
