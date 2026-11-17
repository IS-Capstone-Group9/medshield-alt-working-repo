import {createServer, type RequestListener} from 'node:http'

/** Give clients time to retire idle sockets after the advertised lifetime.
 * Node 22.14 has no native keepAliveTimeoutBuffer. Large response parsing can
 * otherwise race the server's idle close when a pooled client starts a read.
 * Request/header and warehouse deadlines retain their existing defaults. */
export function createGatewayHttpServer(listener: RequestListener) {
  return createServer({keepAliveTimeout: 10_000}, (request, response) => {
    const connection = (request.headers.connection ?? '').toLowerCase().split(',').map(token => token.trim())
    const persistent = request.httpVersionMajor === 1 &&
      (request.httpVersionMinor >= 1 || connection.includes('keep-alive')) && !connection.includes('close')
    if (persistent) response.setHeader('Keep-Alive', 'timeout=5')
    listener(request, response)
  })
}
