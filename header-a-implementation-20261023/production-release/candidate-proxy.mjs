import http from 'node:http'

const server = http.createServer((request, response) => {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: 31085,
    path: request.url,
    method: request.method,
    headers: {
      ...request.headers,
      host: 'wingsgroup.vn',
      'x-forwarded-host': 'wingsgroup.vn',
      'x-forwarded-proto': 'https',
    },
  }, (result) => {
    response.writeHead(result.statusCode || 502, result.headers)
    result.pipe(response)
  })
  upstream.on('error', (error) => {
    console.error(error.message)
    response.writeHead(502)
    response.end('Candidate proxy unavailable')
  })
  request.pipe(upstream)
})
server.listen(31086, '127.0.0.1', () => console.log('US085 candidate host proxy ready on127.0.0.1:31086'))
