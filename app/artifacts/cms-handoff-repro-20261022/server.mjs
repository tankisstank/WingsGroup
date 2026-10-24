import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = 3487
const HOST = '127.0.0.1'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BUNDLE_PATH = path.join(__dirname, 'react-parent.bundle.js')

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${HOST}:${PORT}`}`)

  // 1. Control Route: Plain HTML iframe parent (without React re-renders)
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>CMS Handoff Repro - Plain Parent (Control)</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    iframe { width: 100%; height: 350px; border: 2px solid #ccc; border-radius: 8px; }
    nav { margin-bottom: 20px; padding: 10px; background: #eef2ff; border-radius: 6px; }
    nav a { font-weight: bold; margin-right: 15px; color: #1d4ed8; }
  </style>
</head>
<body>
  <nav>
    <a href="/">1. Plain HTML Iframe (Control)</a>
    <a href="/react">2. React Parent (Payload IframeLoader Repro)</a>
  </nav>
  <h2>CMS Preview Initializer Repro: Plain Parent (Control)</h2>
  <p>Parent page hosting iframe with sandbox matching production CMS Payload LivePreview:</p>
  <iframe
    id="preview-iframe"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
    src="/init"
  ></iframe>
</body>
</html>`)
    return
  }

  // 2. React Parent Route: Simulates installed Payload IframeLoader / LivePreviewWindow
  if (req.method === 'GET' && url.pathname === '/react') {
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>CMS Handoff Repro - React Parent (Payload Equivalent)</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    nav { margin-bottom: 20px; padding: 10px; background: #eef2ff; border-radius: 6px; }
    nav a { font-weight: bold; margin-right: 15px; color: #1d4ed8; }
  </style>
</head>
<body>
  <nav>
    <a href="/">1. Plain HTML Iframe (Control)</a>
    <a href="/react">2. React Parent (Payload IframeLoader Repro)</a>
  </nav>
  <div id="root">Loading React parent...</div>
  <script src="/react-parent.bundle.js"></script>
</body>
</html>`)
    return
  }

  // 3. Client React Bundle
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/react-parent.bundle.js') {
    if (fs.existsSync(BUNDLE_PATH)) {
      res.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/javascript; charset=utf-8',
      })
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      fs.createReadStream(BUNDLE_PATH).pipe(res)
      return
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Bundle not found')
    return
  }

  // 4. Initializer Route: Exact production form + top-level setTimeout form.submit()
  if (req.method === 'GET' && url.pathname === '/init') {
    const formActionPolicy = `form-action 'self' http://${HOST}:${PORT}`
    const reportOnlyPolicy = "form-action 'self'"

    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': formActionPolicy,
      'Content-Security-Policy-Report-Only': reportOnlyPolicy,
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    })
    res.end(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="origin">
  <title>Mở bản xem trước</title>
</head>
<body>
  <p>Đang mở bản xem trước. Nếu chưa chuyển trang, hãy nhấn nút bên dưới.</p>
  <div id="error-display" style="color: red; font-weight: bold; margin-bottom: 10px;"></div>
  <form id="preview-handoff" method="post" action="http://${HOST}:${PORT}/sink">
    <input type="hidden" name="handoff" value="qa-not-a-grant">
    <button type="submit">Mở bản xem trước</button>
  </form>
  <script>
    const form = document.getElementById('preview-handoff')
    const errDisplay = document.getElementById('error-display')
    if (form) {
      form.dataset.handoffState = 'scheduled'
      window.setTimeout(() => {
        try {
          form.dataset.handoffState = 'submitted'
          form.submit()
          form.dataset.handoffState = 'returned'
        } catch (err) {
          const errMsg = (err && (err.name + ': ' + err.message)) || String(err)
          form.dataset.handoffState = 'error'
          form.dataset.handoffError = errMsg
          if (errDisplay) {
            errDisplay.textContent = 'Submit error: ' + errMsg
          }
        }
      }, 0)
    }
  </script>
</body>
</html>`)
    return
  }

  // 5. POST Sink: Receives form submission and responds with 303 See Other
  if (req.method === 'POST' && url.pathname === '/sink') {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      res.writeHead(303, {
        'Cache-Control': 'no-store',
        'Location': '/done',
      })
      res.end()
    })
    return
  }

  // 6. Destination Route
  if (req.method === 'GET' && url.pathname === '/done') {
    res.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Done</title>
</head>
<body>
  <h2>Done</h2>
  <p>Handoff submitted</p>
</body>
</html>`)
    return
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

server.listen(PORT, HOST, () => {
  console.log(`CMS Handoff Repro Server listening on http://${HOST}:${PORT}`)
})
