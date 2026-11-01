from pathlib import Path
scratch = Path(__file__).resolve().parents[6] / '.pixel-perfect-test' / 'native-expansion'
scratch.mkdir(parents=True, exist_ok=True)
import gzip,zlib,struct,json,hashlib,collections,math
class Nbt:
 def __init__(self,b):self.b=b;self.i=0
 def take(self,n):r=self.b[self.i:self.i+n];self.i+=n;return r
 def val(self,fmt):return struct.unpack('>'+fmt,self.take(struct.calcsize(fmt)))[0]
 def string(self):return self.take(self.val('H')).decode('utf-8')
 def tag(self,t):
  if t==1:return self.val('b')
  if t==2:return self.val('h')
  if t==3:return self.val('i')
  if t==4:return self.val('q')
  if t==5:return self.val('f')
  if t==6:return self.val('d')
  if t==7:return self.take(self.val('i'))
  if t==8:return self.string()
  if t==9:sub=self.val('b');return [self.tag(sub) for _ in range(self.val('i'))]
  if t==10:
   result={}
   while True:
    sub=self.val('b')
    if sub==0:return result
    name=self.string();result[name]=self.tag(sub)
  if t==11:return [self.val('i') for _ in range(self.val('i'))]
  if t==12:return [self.val('q') for _ in range(self.val('i'))]
  raise ValueError(t)
 def root(self):t=self.val('b');name=self.string();return self.tag(t)
def slots(longs,bits,n):
 per=64//bits;mask=(1<<bits)-1
 return [((longs[i//per]&((1<<64)-1))>>((i%per)*bits))&mask for i in range(n)]
def region_chunks(path,source_bytes=None):
 b=path.read_bytes() if source_bytes is None else source_bytes
 for n in range(1024):
  location=int.from_bytes(b[n*4:n*4+4],'big');offset=location>>8
  if not offset:continue
  length=int.from_bytes(b[offset*4096:offset*4096+4],'big');typ=b[offset*4096+4];raw=b[offset*4096+5:offset*4096+4+length]
  if typ==2:raw=zlib.decompress(raw)
  elif typ==1:raw=gzip.decompress(raw)
  elif typ!=3:raise ValueError(f'compression{typ}')
  yield Nbt(raw).root()
def main():
 world=Path(r'C:\Users\admin\mc\.minecraft\versions\Everything Voxy 26.2\saves\新的世界')
 files=[world/'dimensions/minecraft/overworld/region'/name for name in ['r.0.0.mca','r.3.0.mca','r.-2.1.mca','r.2.-2.mca']]
 summary=[]
 for p in files:
  chunks=list(region_chunks(p));surface=collections.Counter();valid=0
  for c in chunks:
   h=c.get('Heightmaps',{}).get('WORLD_SURFACE')
   if not h:continue
   valid+=1;heights=slots(h,9,256);sections={s['Y']:s for s in c.get('sections',[])}
   for i,value in enumerate(heights):
    y=value-65;section=sections.get(y//16)
    if not section:continue
    bs=section['block_states'];pal=bs['palette'];j=(y%16)*256+(i//16)*16+i%16;bits=max(4,(len(pal)-1).bit_length());index=0 if len(pal)==1 else ((bs['data'][j//(64//bits)]&((1<<64)-1))>>((j%(64//bits))*bits))&((1<<bits)-1);surface[pal[index]['Name']]+=1
  summary.append({'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'chunks':len(chunks),'fullSurfaceChunks':valid,'topStates':surface.most_common(20)})
  print(p.name,len(chunks),valid,surface.most_common(8))
 scratch.joinpath('map-region-candidates.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def export_terrain():
 world=Path(r'C:\Users\admin\mc\.minecraft\versions\Everything Voxy 26.2\saves\新的世界');source=world/'dimensions/minecraft/overworld/region/r.2.-2.mca';raw=source.read_bytes();all_chunks=list(region_chunks(source,raw));chunks=[]
 for c in all_chunks:
  if not (75<=c['xPos']<=92 and -54<=c['zPos']<=-36):continue
  if c.get('Status')!='minecraft:full':raise ValueError(('Incomplete chunk',c['xPos'],c['zPos'],c.get('Status')))
  if 'WORLD_SURFACE' not in c.get('Heightmaps',{}):raise ValueError('Missing original WORLD_SURFACE')
  sections=[]
  for section in c.get('sections',[]):
   if 'block_states' not in section:continue
   states=section['block_states'];palette=states['palette']
   if any(not item['Name'].startswith('minecraft:') for item in palette):raise ValueError('Non-vanilla block')
   sections.append({'y':section['Y'],'palette':palette,'data':states.get('data',[])})
  chunks.append({'x':c['xPos'],'z':c['zPos'],'heightmap':c['Heightmaps']['WORLD_SURFACE'],'sections':sections})
 if len(chunks)!=18*19:raise ValueError(('Missing original chunks',len(chunks)))
 data={'sourceRegion':str(source),'sourceRegionSha256':hashlib.sha256(raw).hexdigest(),'dimension':'minecraft:overworld','minY':-64,'height':384,'hasCeiling':False,'centerX':1344,'centerZ':-704,'mapScale':1,'chunks':chunks}
 encoded=json.dumps(data,separators=(',',':')).encode('utf-8');target=scratch.joinpath('map-world-input.json.gz');target.write_bytes(gzip.compress(encoded,mtime=0));provenance={'sourceRegion':str(source),'sourceRegionSha256':hashlib.sha256(raw).hexdigest(),'regionBytes':len(raw),'inputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'inputBytes':target.stat().st_size,'chunkBounds':{'x':[75,92],'z':[-54,-36]},'chunks':len(chunks),'center':[1344,-704],'mapScale':1,'sourceDimensionType':'Minecraft26.2 vanilla overworld: min_y-64, height384, has_ceiling false','method':'Read-only NBT decoding preserves original block-state Name/Properties/palettes/packed indices and WORLD_SURFACE heightmap words; no colors are inferred or painted by this extractor.'};scratch.joinpath('map-world-input-provenance.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+'\n',encoding='utf-8');print(json.dumps(provenance,ensure_ascii=True))
if __name__=='__main__':
 import sys
 export_terrain() if '--export' in sys.argv else main()
