const assert = require('node:assert/strict')
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

function get(pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({
      hostname: process.env.HOSTNAME,
      port: 3000,
      path: pathname,
      headers: { Host: 'wingsgo.vn' },
    }, (response) => {
      let body = ''
      response.on('data', (chunk) => { body += chunk })
      response.on('end', () => resolve({ status: response.statusCode, body }))
    })
    request.setTimeout(30000, () => request.destroy(new Error('Render timed out')))
    request.on('error', reject)
  })
}

async function run() {
  const catalogResponse = await get('/api/wingsgo/tour-catalog')
  assert.equal(catalogResponse.status, 200)
  const catalog = JSON.parse(catalogResponse.body)
  const card = [...catalog.all, ...catalog.featured].find((item) => String(item.id) === '119')
  assert.ok(card && card.price.kind === 'verified' && card.price.originalPrice > card.price.value)
  const original = new Intl.NumberFormat('vi-VN').format(card.price.originalPrice)
  const sale = new Intl.NumberFormat('vi-VN').format(card.price.value)
  const routes = []
  for (const pathname of ['/', '/tour', card.href, '/thi-truong/nhat-ban']) {
    const response = await get(pathname)
    assert.equal(response.status, 200, pathname)
    const deletedPrices = [...response.body.matchAll(/<del\b[^>]*>([^<]*)<\/del>/g)].map((match) => match[1])
    assert.ok(deletedPrices.some((label) => label.includes(original)), `Original price missing on ${pathname}`)
    assert.ok(response.body.includes('text-red-600') && response.body.includes(sale), `Red sale missing on ${pathname}`)
    assert.ok(!/<span[^>]*bg-gradient-to-r[^>]*>\s*40900000\s*<\/span>/.test(response.body), 'Numeric promotion badge remains')
    routes.push({ pathname, original, sale, assertions: 'PASS rendered original/sale pair and numeric badge suppressed' })
  }
  const configChunks = fs.readdirSync('/app/.next/server/chunks')
    .filter((filename) => filename.endsWith('.js'))
    .filter((filename) => fs.readFileSync(path.join('/app/.next/server/chunks', filename), 'utf8')
      .includes('listSearchableFields:["tourProduct.title","departureCity","flightNumber","airline","variantKey","inventoryIdentity"]'))
  assert.ok(configChunks.length > 0, '58633ae search configuration absent from running server bundle')
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), readOnly: true, buildID: fs.readFileSync('/app/.next/BUILD_ID', 'utf8').trim(), configChunks, routes }, null, 2))
}

run().catch((error) => { console.error(error); process.exitCode = 1 })

