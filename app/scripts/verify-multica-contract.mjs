#!/usr/bin/env node

/**
 * Ensures the read-only Multica preview retains its agreed migration shape.
 * MULTICA_IMPORTER_SCRIPT is intentionally available for local negative tests.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const importerScript = process.env.MULTICA_IMPORTER_SCRIPT || path.join(scriptDirectory, 'multica-import.mjs')
const expected = {
  mode: 'dry-run',
  writes_performed: false,
  'summary.project_count': 7,
  'summary.epic_count': 8,
  'summary.story_count': 57,
  'summary.acceptance_criterion_count': 189,
  'summary.declared_missing_source_document_count': 5,
  'summary.harness_only_source_count': 7,
}

const result = spawnSync(process.execPath, [importerScript, 'preview', '--json'], {
  cwd: path.resolve(scriptDirectory, '..', '..'),
  encoding: 'utf8',
})

if (result.error || result.status !== 0) {
  const detail = result.error?.message || result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`
  console.error(`Multica contract verification could not run the read-only preview: ${detail}`)
  process.exit(1)
}

let preview
try {
  preview = JSON.parse(result.stdout)
} catch (error) {
  console.error(`Multica contract verification received invalid JSON from the preview: ${error.message}`)
  process.exit(1)
}

const actual = (key) => key.split('.').reduce((value, part) => value?.[part], preview)
const failures = Object.entries(expected).flatMap(([key, value]) => {
  const received = actual(key)
  return received === value ? [] : [`${key}: expected ${JSON.stringify(value)}, received ${received === undefined ? 'missing' : JSON.stringify(received)}`]
})

if (failures.length) {
  console.error(`Multica migration contract verification failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

const missingConfirmation = spawnSync(process.execPath, [importerScript, 'apply', '--json'], {
  cwd: path.resolve(scriptDirectory, '..', '..'),
  encoding: 'utf8',
})

if (missingConfirmation.status === 0 || !missingConfirmation.stderr.includes('Refusing history import apply')) {
  console.error('Multica guarded apply verification failed: apply without confirmations must fail closed before any write.')
  process.exit(1)
}

console.log('Multica migration contract verified: dry-run, no writes; 7 projects, 8 Epics, 57 stories, 189 acceptance criteria, 5 declared-missing documents, and 7 Harness-only sources. Guarded apply fails closed without every confirmation input.')
