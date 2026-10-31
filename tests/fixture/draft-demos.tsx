import * as React from "react"
import {getWorldMapPixels} from "../../preview/demos/map-world-data"
import {setMinecraftSoundVolume} from "../../registry/ui/minecraft-sound"
import {Book} from "../../registry/ui/book"
import {Hotbar} from "../../registry/ui/hotbar"
import {HealthMeter,ArmorMeter,HungerMeter,AirMeter,ExperienceBar} from "../../registry/ui/hud"
import {PlayerPreview} from "../../registry/ui/player-preview"
import {MinecraftMap,LocatorBar} from "../../registry/ui/map"
import {Sign,HangingSign} from "../../registry/ui/sign"
import {PlayerList,Scoreboard} from "../../registry/ui/player-list"
import {Trading} from "../../registry/ui/trading"
import {minecraftBadgeAssets} from "../../registry/ui/minecraft-badge-assets"
import type {MinecraftAvatarSkin} from "../../registry/ui/avatar"
type Sample={element:string;uncontrolled?:boolean;offerCount?:number;heading?:number;muted?:boolean;src?:string;model?:'wide'|'slim';state?:string;color?:string;checked?:boolean;value?:number;labels?:string[];label?:string;text?:string;anchor?:number;width?:number;height?:number;cursor?:number;background?:string}
export default function DraftDemos({sample,scale}:{sample:Sample;scale:1|2|3}){const[value,setValue]=React.useState(sample.value??0),[selected,setSelected]=React.useState(String(sample.value??0)),[trades,setTrades]=React.useState(0),[scroll,setScroll]=React.useState(sample.cursor??0);React.useEffect(()=>setMinecraftSoundVolume(sample.muted?0:1),[sample.muted]);const common={id:'subject',scale};const pixels=React.useMemo(()=>sample.state==='saved-world'?getWorldMapPixels():Uint8Array.from({length:16384},(_,i)=>sample.state==='palette'?i%256:sample.state==='empty'?0:Math.floor(i/128)<40?6:i%128<48?50:Math.floor(i/128)>100?10:34),[sample.state]);const roster=[{id:'alex',name:'Alex',skin:'slim/alex' as const,latency:42,score:18},{id:'steve',name:'Steve',skin:'wide/steve' as const,latency:220,score:12},{id:'kai',name:'Kai',skin:'wide/kai' as const,latency:670,score:7}];const icon=<img src={minecraftBadgeAssets.diamond} alt=""/>;const offers=Array.from({length:sample.offerCount??9},(_,i)=>({id:String(i),label:`Offer ${i+1}`,cost:{label:'Diamonds',count:i+1,icon},result:{label:`Reward ${i+1}`,count:1,icon},inStock:i!==(sample.offerCount??9)-1}));let content:React.ReactNode
 switch(sample.element){
 case 'book':content=<Book {...common} pages={sample.labels??['Welcome to grasscn.\n\nEvery pixel counts.','Plan. Build. Ship.','Your next chapter.']} page={value} onPageChange={setValue}/>;break
 case 'hotbar':content=<Hotbar {...common} background={sample.background??"#202020"} value={value} onValueChange={setValue}/>;break
 case 'health':content=<HealthMeter {...common} value={value} condition={({NORMAL:'normal',POISIONED:'poisoned',WITHERED:'withered',FROZEN:'frozen',ABSORBING:'absorbing'} as const)[sample.state as 'NORMAL']??'normal'}/>;break
 case 'armor':content=<ArmorMeter {...common} value={value}/>;break
 case 'hunger':content=<HungerMeter {...common} value={value}/>;break
 case 'air':content=<AirMeter {...common} value={value}/>;break
 case 'experience':content=<ExperienceBar {...common} value={value}/>;break
 case 'player-preview':content=<PlayerPreview {...common} src={sample.src} model={sample.model} onRotationChange={pose=>document.documentElement.dataset.rotation=JSON.stringify(pose)} skin={(sample.src&&!['wide/steve','slim/alex'].includes(sample.state??'')?'wide/steve':sample.state??'wide/steve') as MinecraftAvatarSkin} width={sample.width??80} height={sample.height??120} defaultRotation={{yaw:sample.value??30,pitch:sample.anchor??-5}}/>;break
 case 'map':content=<MinecraftMap onMapClick={point=>document.documentElement.dataset.mapClick=JSON.stringify(point)} {...common} pixels={pixels} markers={sample.checked?[{id:'home',x:0,y:0,label:'Home',decoration:'frame',rotation:value},{id:'village',x:70,y:-50,label:'Village',decoration:'plains_village',rotation:value}]:[]} onMarkerSelect={id=>{setSelected(id);document.documentElement.dataset.marker=id}}/>;break
 case 'locator':content=<div id="subject" style={{position:'relative',width:182*scale,height:17*scale}}><LocatorBar scale={scale} heading={sample.heading??0} markers={sample.checked?[{id:'point',label:'Waypoint',bearing:value,color:sample.color??'#ffffff',shape:'default_3'}]:[]} style={{position:'absolute',left:0,top:6*scale}} onMarkerSelect={id=>{setSelected(id);document.documentElement.dataset.marker=id}}/></div>;break
 case 'sign':content=<Sign {...common} wood={sample.state as import('../../registry/ui/sign').SignWood??'oak'} glowing={sample.checked} lines={sample.labels??['Welcome','to grasscn','','Make it yours.']}/>;break
 case 'hanging-sign':content=<HangingSign {...common} wood={sample.state as import('../../registry/ui/sign').SignWood??'oak'} glowing={sample.checked} lines={sample.labels??['Open','for business','','Welcome!']}/>;break
 case 'player-list':content=<PlayerList {...common} players={(sample.labels??roster.map(p=>p.name)).map((name,i)=>({id:String(i),name,skin:(['slim/alex','wide/steve','wide/kai'] as const)[i%3],latency:(sample.labels?.length??3)===3?[42,220,670][i]:[-1,42,149,150,299,300,670,1200][i%8],score:sample.checked?((sample.labels?.length??3)===3?[18,12,7][i]:i*3+7):undefined}))} header={sample.label} footer={sample.text} onPlayerSelect={setSelected}/>;break
 case 'scoreboard':content=<Scoreboard {...common} title={sample.label??'Build leaderboard'} entries={(sample.labels??roster.map(p=>p.name)).map((name,i)=>({id:String(i),name,score:(sample.labels?.length??3)===3?[18,12,7][i]:i*3+7}))}/>;break
 case 'trading-scrollbar':case 'trading':content=<Trading ref={node=>{document.documentElement.dataset.tradingRef=node?.dataset.slot??''}} defaultScrollOffset={sample.cursor??0} scrollOffset={sample.uncontrolled?undefined:scroll} onScrollOffsetChange={setScroll} {...common} id={sample.element==='trading-scrollbar'?undefined:'subject'} offers={offers} title="Component shop" selectedId={selected} onSelectedIdChange={setSelected} onTrade={()=>setTrades(v=>v+1)}/>;break
 default:throw Error('Unknown draft feature: '+sample.element)
 }
 if(sample.element==='trading-scrollbar')return <div id="subject" style={{position:'relative',width:6*scale,height:140*scale,overflow:'hidden'}}><div style={{position:'absolute',left:-94*scale,top:-18*scale}}>{content}</div></div>
 return <>{content}{sample.element==='trading'&&<input aria-label="Scroll offset" type="number" value={scroll} onChange={event=>setScroll(Number(event.target.value))}/>}<output aria-label="Demo value" style={{display:'block',color:'white',marginTop:20}}>{value} / {selected} / {trades}</output></>
}
