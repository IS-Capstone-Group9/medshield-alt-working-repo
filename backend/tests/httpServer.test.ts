import test from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {connect, type AddressInfo} from 'node:net'
import {createGatewayHttpServer} from '../src/httpServer'

test('an idle pooled socket remains usable after the advertised lifetime, without extending request/header budgets', async () => {
  const ports: number[] = []
  const server = createGatewayHttpServer((req,res) => {ports.push(req.socket.remotePort!);res.setHeader('Content-Length','2');res.end('ok')})
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve))
  const port = (server.address() as AddressInfo).port
  // Own the socket so client-agent idle-retirement policies cannot hide the
  // server grace period (or make this test depend on the client's Node version).
  const socket=connect(port,'127.0.0.1')
  await once(socket,'connect')
  socket.setTimeout(15_000,()=>socket.destroy(new Error('HTTP test read timed out')))
  const read = () => new Promise<string>((resolve,reject) => {
    let text=''
    const cleanup=()=>{socket.off('data',data);socket.off('error',failed);socket.off('close',closed)}
    const failed=(error:Error)=>{cleanup();reject(error)}
    const closed=()=>failed(new Error('Socket closed before response'))
    const data=(chunk:Buffer)=>{
      text+=chunk.toString('utf8')
      const end=text.indexOf('\r\n\r\n')
      if(end>=0 && text.length>=end+6){cleanup();resolve(text)}
    }
    socket.on('data',data);socket.once('error',failed);socket.once('close',closed)
    socket.write('GET / HTTP/1.1\r\nHost: localhost\r\nConnection: keep-alive\r\n\r\n')
  })
  try {
    assert.match(await read(),/Keep-Alive: timeout=5\r\n/i)
    await new Promise(resolve=>setTimeout(resolve,5_200))
    assert.equal(socket.destroyed,false)
    assert.match(await read(),/^HTTP\/1.1 200/)
    assert.equal(ports.length,2)
    assert.equal(ports[0],ports[1], 'The original socket must survive the advertised idle boundary')
    assert.equal(server.headersTimeout,60_000)
    assert.equal(server.requestTimeout,300_000)
  } finally {socket.destroy();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})

test('explicit close is honored without advertising persistence', async () => {
  const server=createGatewayHttpServer((_req,res)=>res.end('ok'))
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {
    const response=await fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port,{headers:{Connection:'close'}})
    await response.text()
    assert.equal(response.status,200)
    assert.equal(response.headers.get('connection'),'close')
    assert.equal(response.headers.get('keep-alive'),null)
  } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
