import http from 'node:http'
import {serveProductionFixture} from './production-fixture.mjs'

// Preserve absolute legacy loopback URLs without reading the mutable foreground
// preview or changing test source. All browser HTTP traffic stays in this Job.
export async function serveFullHosts(plan) {
  const {fixturePort, previewPort, proxyPort} = plan.execution
  const owned = new Set([fixturePort, previewPort])
  const map = new Map([[5174, fixturePort], [5178, fixturePort], [5176, previewPort]])
  let fixture, preview, proxy
  try {
    fixture = await serveProductionFixture({port: fixturePort})
    const {preview: startPreview} = await import('vite')
    preview = await startPreview({configFile: 'vite.preview.config.ts', preview: {host: '127.0.0.1', port: previewPort, strictPort: true}})
    proxy = http.createServer((request, response) => {
      let target
      try {
        target = new URL(request.url)
        if (target.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(target.hostname)) throw Error('Unowned browser request')
        const port = map.get(Number(target.port)) ?? Number(target.port)
        if (!owned.has(port)) throw Error('Unowned browser port')
        target.hostname = '127.0.0.1'; target.port = String(port)
      } catch { response.writeHead(502); response.end('Full run only serves its isolated snapshot'); return }
      const upstream = http.request(target, {method: request.method, headers: {...request.headers, host: target.host}}, incoming => {
        response.writeHead(incoming.statusCode ?? 502, incoming.headers); incoming.pipe(response)
      })
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end() })
      request.pipe(upstream)
    })
    proxy.on('connect', (_, socket) => socket.destroy())
    await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(proxyPort, '127.0.0.1', resolve) })
    return {fixtureBundleUrl: fixture.url, close: async () => {
      proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve))
      await new Promise(resolve => preview.httpServer.close(resolve)); await fixture.close()
    }}
  } catch (error) {
    proxy?.closeAllConnections(); proxy?.close()
    if (preview) await new Promise(resolve => preview.httpServer.close(resolve))
    await fixture?.close(); throw error
  }
}
