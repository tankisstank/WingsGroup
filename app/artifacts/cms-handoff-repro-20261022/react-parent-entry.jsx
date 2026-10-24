import React, { useState, useCallback, useRef } from 'react'
import { createRoot } from 'react-dom/client'

function LivePreviewWindowRepro() {
  const [url, setUrl] = useState('/init')
  const [loadedURL, setLoadedURL] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [renderCount, setRenderCount] = useState(1)
  const [loadEvents, setLoadEvents] = useState(0)
  const iframeRef = useRef(null)

  const handleLoad = useCallback((e) => {
    setLoadEvents((prev) => prev + 1)
    // Mirrors Payload LivePreviewWindow line 111: setLoadedURL(url)
    setLoadedURL(url)
    // Mirrors Payload IframeLoader line 66: setIsLoading(false)
    setIsLoading(false)
    // Triggers immediate React parent re-render upon iframe onLoad
    setRenderCount((prev) => prev + 1)
  }, [url])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h2>React Parent (Payload IframeLoader / LivePreview Reproduction)</h2>
      <div id="react-diagnostics" style={{ background: '#f0f0f0', padding: '10px', marginBottom: '15px', borderRadius: '6px' }}>
        <div><strong>Iframe onLoad events:</strong> <span id="load-count">{loadEvents}</span></div>
        <div><strong>React Parent Render count:</strong> <span id="render-count">{renderCount}</span></div>
        <div><strong>loadedURL:</strong> <span id="loaded-url">{loadedURL || 'null'}</span></div>
        <div><strong>isLoading:</strong> <span id="is-loading">{String(isLoading)}</span></div>
        <div><strong>Current iframe src:</strong> <span id="iframe-src">{url}</span></div>
      </div>
      <div className="iframe-container" style={{ position: 'relative' }}>
        <iframe
          ref={iframeRef}
          id="live-preview-iframe"
          className={`live-preview-iframe ${isLoading ? 'is-loading' : ''}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-downloads"
          src={url}
          onLoad={handleLoad}
          style={{ width: '100%', height: '350px', border: '2px solid #0066cc', borderRadius: '8px' }}
        />
      </div>
    </div>
  )
}

const rootEl = document.getElementById('root')
if (rootEl) {
  createRoot(rootEl).render(<LivePreviewWindowRepro />)
}
