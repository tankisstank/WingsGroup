import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(scriptDir, '..')
const standaloneRoot = path.join(appRoot, '.next', 'standalone')

async function copyTree(source, destination) {
  if (!existsSync(source)) {
    console.log(`Skipping missing source: ${path.relative(appRoot, source)}`)
    return
  }

  if (!existsSync(standaloneRoot)) {
    console.log('Skipping standalone asset copy because .next/standalone does not exist.')
    return
  }

  await rm(destination, { force: true, recursive: true })
  await mkdir(path.dirname(destination), { recursive: true })
  await cp(source, destination, { recursive: true, dereference: true })
  console.log(`Copied ${path.relative(appRoot, source)} -> ${path.relative(appRoot, destination)}`)
}

await copyTree(path.join(appRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'))
await copyTree(path.join(appRoot, 'public'), path.join(standaloneRoot, 'public'))
// Payload's SQLite adapter resolves these optional packages dynamically. Next's
// file tracer can omit them from pnpm standalone output, so copy the exact
// installed package trees explicitly for local/staging SQLite boot.
const pnpmVirtualStore = path.join(appRoot, 'node_modules', '.pnpm', 'node_modules')
await copyTree(path.join(pnpmVirtualStore, 'libsql'), path.join(standaloneRoot, 'node_modules', 'libsql'))
await copyTree(path.join(pnpmVirtualStore, '@libsql'), path.join(standaloneRoot, 'node_modules', '@libsql'))
await copyTree(path.join(pnpmVirtualStore, '@neon-rs'), path.join(standaloneRoot, 'node_modules', '@neon-rs'))
await copyTree(path.join(pnpmVirtualStore, 'detect-libc'), path.join(standaloneRoot, 'node_modules', 'detect-libc'))
