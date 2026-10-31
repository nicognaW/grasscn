import * as React from 'react'
import {Trading,type TradeOffer} from '../../registry/ui/trading'
import {tradingIcons} from './trading-icons'
import type {DemoProps} from '../types'
export default function TradingDemo({scale}:DemoProps){
 const[completed,setCompleted]=React.useState(0),[selected,setSelected]=React.useState('0')
 const goods=[['book','Field guide',4],['bread','Bread',1],['compass','Compass',5],['name_tag','Name tag',8],['glass_bottle','Glass bottle',2],['redstone','Redstone',3],['paper','Paper',1],['diamond','Diamond',12],['book','Enchanted guide',16]] as const
 const offers:TradeOffer[]=goods.map(([name,label,count],i)=>({id:String(i),label,cost:{label:'Emeralds',count,icon:<img src={tradingIcons.emerald} alt=""/>},result:{label,count:1,icon:<img src={tradingIcons[name]} alt=""/>},inStock:i!==8}))
 return <div className="demo-stage" data-stage="trading" style={{display:'grid',gap:16,maxWidth:'100%'}}><div style={{maxWidth:'100%',overflowX:'auto'}}><Trading scale={scale} title="Village market" offers={offers} selectedId={selected} onSelectedIdChange={setSelected} onTrade={()=>setCompleted(n=>n+1)}/></div><output aria-live="polite">{completed?`${completed} trade${completed===1?'':'s'} completed.`:'Choose an offer, then take the result.'}</output><p className="grass-note">Scroll through offers. The final offer is out of stock.</p></div>
}
