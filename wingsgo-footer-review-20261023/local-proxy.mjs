import http from 'node:http'

for (const [port, host] of [[3193, 'wingsgo.vn'], [3194, 'wingsgroup.vn'], [3195, 'wingside.vn']]) {
  http.createServer((request, response) => {
    const upstream = http.request({
      hostname: '127.0.0.1',
      port: 3192,
      path: request.url,
      method: request.method,
      headers: { ...request.headers, host },
    }, (incoming) => {
      response.writeHead(incoming.statusCode, incoming.headers)
      incoming.pipe(response)
    })
    upstream.on('error', (error) => {
      console.error(error)
      response.writeHead(502)
      response.end(error.message)
    })
    request.pipe(upstream)
  }).listen(port, '127.0.0.1', () => console.log(`${host}: http://127.0.0.1:${port}`))
}
