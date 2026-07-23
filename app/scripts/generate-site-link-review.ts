import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import { DEFAULT_LOCAL_DATABASE_URL, resolveLocalDatabaseURL } from '../src/utilities/localDatabase'

type TreeItem = {
  children?: TreeItem[]
  depth?: number
  label: string
  path: string
  type: 'page' | 'post' | 'utility'
}

type SiteNode = {
  code: string
  label: string
  pathPrefix: string
  children: TreeItem[]
}

const siteAliasByCode: Record<string, string> = {
  'wings-care': 'wingscare',
  'wings-go': 'wingsgo',
  'wings-pass': 'wingspass',
  'wings-plus': 'wingsplus',
  'wing-side': 'wingsside',
  'wings-group': '',
}

type SiteRow = {
  code: string
  id: number
  name: string
}

type PageRow = {
  pathname: null | string
  site_id: number
  slug: null | string
  title: null | string
}

type PostRow = {
  site_id: number
  slug: null | string
  title: null | string
}

const normalizePath = (pathValue?: null | string) => {
  if (!pathValue || pathValue === '/') {
    return '/'
  }

  return pathValue.startsWith('/') ? pathValue : `/${pathValue}`
}

const sitePath = (siteCode: string, pathValue?: null | string) => {
  const alias = siteAliasByCode[siteCode]
  const normalized = normalizePath(pathValue)

  if (!alias) {
    return normalized
  }

  return `/${alias}${normalized === '/' ? '' : normalized}`
}

const getDatabaseURL = () => {
  const databaseURL = resolveLocalDatabaseURL(
    process.env.DATABASE_URL || DEFAULT_LOCAL_DATABASE_URL,
  )

  if (!databaseURL.startsWith('file:')) {
    throw new Error('generate-site-link-review currently supports local SQLite DATABASE_URL only.')
  }

  const filePath = databaseURL.replace(/^file:/, '')
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(import.meta.dirname, '..', filePath)

  return `file:${resolved.replaceAll('\\', '/')}`
}

const indentByDepth = (pathValue: string) =>
  Math.max(pathValue.split('/').filter(Boolean).length - 1, 0)

const escapeHTML = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const buildHTML = ({ generatedAt, sites }: { generatedAt: string; sites: SiteNode[] }) => {
  const data = JSON.stringify(sites)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WingsGroup Site Link Review</title>
  <style>
    :root {
      --bg: #f6f7f9;
      --panel: #ffffff;
      --panel-strong: #eef2f6;
      --border: #d8dee7;
      --text: #172033;
      --muted: #647084;
      --accent: #0f766e;
      --accent-strong: #0b4f49;
      --danger: #b42318;
      --radius: 8px;
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      background: var(--bg);
      color: var(--text);
      margin: 0;
    }

    .app {
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      height: 100vh;
      min-height: 720px;
    }

    .sidebar {
      background: var(--panel);
      border-right: 1px solid var(--border);
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      min-width: 0;
    }

    .sidebar__head {
      border-bottom: 1px solid var(--border);
      display: grid;
      gap: 0.65rem;
      padding: 1rem;
    }

    .sidebar__head h1 {
      font-size: 1.05rem;
      margin: 0;
    }

    .sidebar__head p {
      color: var(--muted);
      font-size: 0.85rem;
      line-height: 1.45;
      margin: 0;
    }

    .toolbar {
      border-bottom: 1px solid var(--border);
      display: grid;
      gap: 0.65rem;
      padding: 0.85rem 1rem;
    }

    .toolbar input {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font: inherit;
      min-height: 2.5rem;
      padding: 0 0.75rem;
      width: 100%;
    }

    .toolbar__row {
      display: flex;
      gap: 0.5rem;
    }

    button,
    .button {
      align-items: center;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 700;
      gap: 0.35rem;
      justify-content: center;
      min-height: 2.25rem;
      padding: 0 0.7rem;
      text-decoration: none;
    }

    button:hover,
    .button:hover {
      border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
      color: var(--accent-strong);
    }

    .tree {
      overflow: auto;
      padding: 0.65rem;
    }

    details {
      border: 1px solid transparent;
      border-radius: var(--radius);
      margin-bottom: 0.45rem;
    }

    details[open] {
      background: color-mix(in srgb, var(--panel-strong) 55%, white);
      border-color: var(--border);
    }

    summary {
      align-items: center;
      cursor: pointer;
      display: flex;
      gap: 0.5rem;
      font-weight: 800;
      list-style: none;
      padding: 0.6rem 0.7rem;
    }

    summary::-webkit-details-marker { display: none; }

    summary::before {
      content: "▸";
      color: var(--muted);
      width: 1rem;
    }

    details[open] summary::before { content: "▾"; }

    .site-count {
      color: var(--muted);
      font-size: 0.78rem;
      font-weight: 700;
      margin-left: auto;
    }

    .node {
      align-items: center;
      background: transparent;
      border: 0;
      border-radius: 6px;
      color: var(--text);
      display: grid;
      gap: 0.25rem;
      grid-template-columns: minmax(0, 1fr) auto;
      min-height: auto;
      padding: 0.46rem 0.55rem;
      text-align: left;
      width: 100%;
    }

    .node:hover,
    .node.is-active {
      background: color-mix(in srgb, var(--accent) 9%, white);
      color: var(--accent-strong);
    }

    .node__label {
      font-size: 0.88rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .node__path {
      color: var(--muted);
      font-size: 0.74rem;
      grid-column: 1 / -1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .badge {
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      font-size: 0.68rem;
      font-weight: 800;
      padding: 0.1rem 0.38rem;
      text-transform: uppercase;
    }

    .viewer {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
    }

    .viewer__bar {
      align-items: center;
      background: var(--panel);
      border-bottom: 1px solid var(--border);
      display: grid;
      gap: 0.85rem;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 0.8rem 1rem;
    }

    .current {
      display: grid;
      gap: 0.15rem;
      min-width: 0;
    }

    .current strong,
    .current span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .current span {
      color: var(--muted);
      font-size: 0.83rem;
    }

    .viewer__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: end;
    }

    iframe {
      background: white;
      border: 0;
      height: 100%;
      width: 100%;
    }

    .empty {
      color: var(--muted);
      padding: 1rem;
    }

    .is-hidden { display: none; }

    @media (width < 900px) {
      .app {
        grid-template-columns: 1fr;
        grid-template-rows: 45vh 55vh;
      }

      .sidebar {
        border-bottom: 1px solid var(--border);
        border-right: 0;
        min-height: 0;
      }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <header class="sidebar__head">
        <h1>WingsGroup Site Link Review</h1>
        <p>Generated ${escapeHTML(generatedAt)}. Click một page/post ở bên trái để preview trong khung bên phải.</p>
      </header>

      <div class="toolbar">
        <input id="filter" type="search" placeholder="Tìm site, page, post hoặc URL..." />
        <div class="toolbar__row">
          <button id="expandAll" type="button">Mở tất cả</button>
          <button id="collapseAll" type="button">Đóng tất cả</button>
        </div>
      </div>

      <nav class="tree" id="tree" aria-label="Site tree"></nav>
    </aside>

    <main class="viewer">
      <div class="viewer__bar">
        <div class="current">
          <strong id="currentLabel">Chưa chọn trang</strong>
          <span id="currentPath">Chọn một link trong tree để bắt đầu rà soát.</span>
        </div>
        <div class="viewer__actions">
          <a class="button" href="#" id="openNew" rel="noreferrer" target="_blank">Mở tab mới</a>
          <button id="copyLink" type="button">Copy URL</button>
          <button id="reloadFrame" type="button">Reload preview</button>
        </div>
      </div>
      <iframe id="preview" title="Preview selected WingsGroup page"></iframe>
    </main>
  </div>

  <script>
    const sites = ${data};
    const baseURL = 'http://localhost:3000';
    const tree = document.getElementById('tree');
    const filter = document.getElementById('filter');
    const preview = document.getElementById('preview');
    const currentLabel = document.getElementById('currentLabel');
    const currentPath = document.getElementById('currentPath');
    const openNew = document.getElementById('openNew');
    const copyLink = document.getElementById('copyLink');
    const reloadFrame = document.getElementById('reloadFrame');
    let currentURL = '';

    function absoluteURL(path) {
      return new URL(path, baseURL).toString();
    }

    function selectNode(button) {
      document.querySelectorAll('.node.is-active').forEach((node) => node.classList.remove('is-active'));
      button.classList.add('is-active');

      const url = absoluteURL(button.dataset.path);
      currentURL = url;
      currentLabel.textContent = button.dataset.label;
      currentPath.textContent = url;
      openNew.href = url;
      preview.src = url;
    }

    function renderTree() {
      tree.innerHTML = '';

      for (const site of sites) {
        const details = document.createElement('details');
        details.open = true;
        details.dataset.search = [site.label, site.code, site.pathPrefix].join(' ').toLowerCase();

        const summary = document.createElement('summary');
        summary.innerHTML = '<span>' + site.label + '</span><span class="site-count">' + site.children.length + '</span>';
        details.appendChild(summary);

        for (const item of site.children) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'node';
          button.style.paddingLeft = (0.55 + Math.min(item.depth || 0, 4) * 0.85) + 'rem';
          button.dataset.path = item.path;
          button.dataset.label = item.label;
          button.dataset.search = [site.label, site.code, item.label, item.path, item.type].join(' ').toLowerCase();
          button.innerHTML =
            '<span class="node__label">' + item.label + '</span>' +
            '<span class="badge">' + item.type + '</span>' +
            '<span class="node__path">' + item.path + '</span>';
          button.addEventListener('click', () => selectNode(button));
          details.appendChild(button);
        }

        tree.appendChild(details);
      }

      const first = tree.querySelector('.node');
      if (first) selectNode(first);
    }

    function applyFilter() {
      const query = filter.value.trim().toLowerCase();
      let visibleCount = 0;

      for (const details of tree.querySelectorAll('details')) {
        let siteHasVisibleNode = false;
        const siteMatches = details.dataset.search.includes(query);

        for (const node of details.querySelectorAll('.node')) {
          const visible = !query || siteMatches || node.dataset.search.includes(query);
          node.classList.toggle('is-hidden', !visible);
          siteHasVisibleNode ||= visible;
          if (visible) visibleCount += 1;
        }

        details.classList.toggle('is-hidden', !siteHasVisibleNode && !siteMatches);
        if (query && (siteHasVisibleNode || siteMatches)) {
          details.open = true;
        }
      }

      if (visibleCount === 0 && query) {
        if (!document.getElementById('emptySearch')) {
          const empty = document.createElement('p');
          empty.id = 'emptySearch';
          empty.className = 'empty';
          empty.textContent = 'Không tìm thấy link phù hợp.';
          tree.appendChild(empty);
        }
      } else {
        document.getElementById('emptySearch')?.remove();
      }
    }

    document.getElementById('expandAll').addEventListener('click', () => {
      document.querySelectorAll('details').forEach((details) => { details.open = true; });
    });

    document.getElementById('collapseAll').addEventListener('click', () => {
      document.querySelectorAll('details').forEach((details) => { details.open = false; });
    });

    filter.addEventListener('input', applyFilter);

    copyLink.addEventListener('click', async () => {
      if (!currentURL) return;
      await navigator.clipboard.writeText(currentURL).catch(() => {});
      copyLink.textContent = 'Đã copy';
      window.setTimeout(() => { copyLink.textContent = 'Copy URL'; }, 1200);
    });

    reloadFrame.addEventListener('click', () => {
      if (currentURL) preview.src = currentURL;
    });

    renderTree();
  </script>
</body>
</html>`
}

const { createClient } =
  await import('../node_modules/.pnpm/@libsql+client@0.14.0/node_modules/@libsql/client/lib-esm/node.js')
const client = createClient({ url: getDatabaseURL() })

const [siteRows, pageRows, postRows] = await Promise.all([
  client.execute({
    args: [],
    sql: `
      select id, name, code
      from sites
      where is_active = 1
      order by name
    `,
  }),
  client.execute({
    args: [],
    sql: `
      select
        pages.site_id,
        pages.pathname,
        pages.slug,
        coalesce(
          max(case when pages_locales._locale = 'vi' then pages_locales.title end),
          max(case when pages_locales._locale = 'en' then pages_locales.title end),
          pages.slug,
          pages.pathname
        ) as title
      from pages
      left join pages_locales on pages_locales._parent_id = pages.id
      where pages._status = 'published'
      group by pages.id
      order by pages.site_id, pages.pathname
    `,
  }),
  client.execute({
    args: [],
    sql: `
      select
        posts.site_id,
        posts.slug,
        coalesce(
          max(case when posts_locales._locale = 'vi' then posts_locales.title end),
          max(case when posts_locales._locale = 'en' then posts_locales.title end),
          posts.slug
        ) as title
      from posts
      left join posts_locales on posts_locales._parent_id = posts.id
      where posts._status = 'published'
      group by posts.id
      order by posts.site_id, posts.slug
    `,
  }),
])

const pagesBySite = new Map<number, PageRow[]>()
for (const row of pageRows.rows as unknown as PageRow[]) {
  const pages = pagesBySite.get(row.site_id) || []
  pages.push(row)
  pagesBySite.set(row.site_id, pages)
}

const postsBySite = new Map<number, PostRow[]>()
for (const row of postRows.rows as unknown as PostRow[]) {
  const posts = postsBySite.get(row.site_id) || []
  posts.push(row)
  postsBySite.set(row.site_id, posts)
}

const sites = (siteRows.rows as unknown as SiteRow[])
  .filter((site) => typeof site.code === 'string' && site.code in siteAliasByCode)
  .map<SiteNode>((site) => {
    const code = site.code
    const pages = (pagesBySite.get(site.id) || []).map<TreeItem>((page) => {
      const pathValue = sitePath(code, page.pathname)

      return {
        depth: indentByDepth(page.pathname || '/'),
        label: page.title || page.slug || pathValue,
        path: pathValue,
        type: 'page',
      }
    })

    const posts = (postsBySite.get(site.id) || [])
      .filter((post) => post.slug)
      .map<TreeItem>((post) => ({
        depth: 1,
        label: post.title || post.slug || 'Untitled post',
        path: sitePath(code, `/posts/${post.slug}`),
        type: 'post',
      }))

    const utilities: TreeItem[] = [
      {
        depth: 0,
        label: 'Search',
        path: sitePath(code, '/search'),
        type: 'utility',
      },
      {
        depth: 0,
        label: 'Posts archive',
        path: sitePath(code, '/posts'),
        type: 'utility',
      },
    ]

    return {
      children: [...utilities, ...pages, ...posts].sort((a, b) => a.path.localeCompare(b.path)),
      code,
      label: site.name || code,
      pathPrefix: siteAliasByCode[code] ? `/${siteAliasByCode[code]}` : '/',
    }
  })

const outputDir = path.resolve(import.meta.dirname, '..', 'output')
await fs.mkdir(outputDir, { recursive: true })
await fs.writeFile(
  path.join(outputDir, 'site-link-review.html'),
  buildHTML({ generatedAt: new Date().toLocaleString('vi-VN'), sites }),
)

console.log(`Generated ${path.join(outputDir, 'site-link-review.html')}`)
