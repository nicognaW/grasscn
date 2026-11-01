function ports(execution){
 const {fixturePort,previewPort,proxyPort}=execution
 return {owned:new Set([fixturePort,previewPort]),map:new Map([[5174,fixturePort],[5178,fixturePort],[5176,previewPort]]),proxyPort}
}
export function isolatedHttpTarget(url,host,execution){
 const {owned,map}=ports(execution),target=new URL(url,`http://${host}`)
 if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname)||target.username||target.password)throw Error('Unowned browser request')
 const port=map.get(Number(target.port))??Number(target.port)
 if(!owned.has(port))throw Error('Unowned browser port')
 target.hostname='127.0.0.1';target.port=String(port)
 return target
}
export function isolatedTunnelTarget(authority,execution){
 const {owned,map,proxyPort}=ports(execution),target=new URL(`http://${authority}`)
 if(!['127.0.0.1','localhost'].includes(target.hostname)||target.host!==authority)throw Error('Unowned tunnel')
 const port=target.port==='5173'?proxyPort:map.get(Number(target.port))??Number(target.port)
 if(target.port!=='5173'&&!owned.has(port))throw Error('Unowned tunnel port')
 return port
}
