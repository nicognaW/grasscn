"""Recover the selected native UI texture and audio inputs without changing the game installation."""
import argparse,base64,hashlib,json,struct,zipfile
from io import BytesIO
from PIL import Image
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('jar',type=Path);parser.add_argument('--assets',type=Path);args=parser.parse_args()
root=Path(__file__).resolve().parents[3];web=root/'apps/web';test_root=root/'packages/tests';expected='40896ee9f1e2bec3c934daac7e93d41e9e3d9c2f8ae0ca366d52ffbfd1afa290';assert hashlib.sha256(args.jar.read_bytes()).hexdigest()==expected,'Unexpected Minecraft artifact'
sha=lambda b:hashlib.sha256(b).hexdigest();image_url=lambda b:'data:image/png;base64,'+base64.b64encode(b).decode();assets={};pings={};provenance={}
with zipfile.ZipFile(args.jar) as archive:
 members=set(archive.namelist())
 for member in sorted(members):
  if not member.endswith('.png'):continue
  relevant=member.startswith(('assets/minecraft/textures/gui/sprites/hud/','assets/minecraft/textures/gui/signs/','assets/minecraft/textures/gui/hanging_signs/','assets/minecraft/textures/gui/sprites/widget/page_','assets/minecraft/textures/map/','assets/minecraft/textures/gui/sprites/container/villager/','assets/minecraft/textures/gui/sprites/player_list/')) or member in ['assets/minecraft/textures/gui/book.png','assets/minecraft/textures/gui/container/villager.png']
  ping=member.startswith('assets/minecraft/textures/gui/sprites/') and '/ping_' in member
  if not relevant and not ping:continue
  data=archive.read(member);width,height=struct.unpack('>II',data[16:24]);key=member.removeprefix('assets/minecraft/textures/').removesuffix('.png')
  if relevant:assets[key]={'src':image_url(data),'width':width,'height':height}
  if ping:pings[key]=image_url(data)
  record={'sha256':sha(data),'width':width,'height':height}
  if member+'.mcmeta' in members:
   metadata=archive.read(member+'.mcmeta');record.update(metadata=json.loads(metadata),metadataSha256=sha(metadata))
  provenance[member]=record
 hotbar={}
 for name in ['hotbar','hotbar_selection']:
  image=Image.open(BytesIO(archive.read('assets/minecraft/textures/gui/sprites/hud/'+name+'.png'))).convert('RGBA')
  hotbar[name]={'width':image.width,'height':image.height,'rgba':base64.b64encode(image.tobytes()).decode()}
 (web/'registry/ui/minecraft-hotbar-rgba.ts').write_text('export const hotbarRgba = '+json.dumps(hotbar,separators=(',',':'))+' as const\n',encoding='utf-8')
 (web/'registry/ui/minecraft-advancement-assets.ts').write_text('export const advancementBackground = '+json.dumps(image_url(archive.read('assets/minecraft/textures/block/stone.png')))+'\n',encoding='utf-8')
(web/'registry/ui/minecraft-adventure-assets.ts').write_text('export const adventureAssets = '+json.dumps(assets,separators=(',',':'))+' as const\n',encoding='utf-8')
(web/'registry/ui/minecraft-player-list-assets.ts').write_text('export const playerListAssets = '+json.dumps(pings)+' as const\n',encoding='utf-8')
asset_root=args.assets or args.jar.resolve().parents[2]/'assets';index_bytes=(asset_root/'indexes/32.json').read_bytes();index=json.loads(index_bytes)
def original(member):
 entry=index['objects'][member];data=(asset_root/'objects'/entry['hash'][:2]/entry['hash']).read_bytes();assert len(data)==entry['size'] and hashlib.sha1(data).hexdigest()==entry['hash'];return data
sounds=original('minecraft/sounds.json');event=json.loads(sounds)['item.book.page_turn'];clips=[];audio=[]
for entry in event['sounds']:
 member='minecraft/sounds/'+entry['name']+'.ogg';data=original(member);clips.append('data:audio/ogg;base64,'+base64.b64encode(data).decode());audio.append({'member':member,'sha1':hashlib.sha1(data).hexdigest(),'sha256':sha(data),'eventVolume':entry.get('volume',1)})
(web/'registry/ui/minecraft-book-sound-assets.ts').write_text('export const bookPageSounds = '+json.dumps(clips)+' as const\n',encoding='utf-8')
out=test_root/'tests/reference/native-expansion';out.mkdir(exist_ok=True)
(out/'asset-provenance.json').write_text(json.dumps({'minecraftVersion':'26.2','sourceJarSha256':expected,'sourceType':'Static artifact recovery; not native screenshot verification','data':provenance},indent=2)+'\n',encoding='utf-8')
(out/'book-sound-provenance.json').write_text(json.dumps({'minecraftVersion':'26.2','sourceJarSha256':expected,'assetIndexSha256':sha(index_bytes),'soundDefinitionsSha256':sha(sounds),'event':'item.book.page_turn','pitch':1,'baseGain':.25,'clips':audio},indent=2)+'\n',encoding='utf-8')
print(f'Recovered {len(assets)} textures, {len(pings)} ping sprites and {len(clips)} page-turn clips.')
