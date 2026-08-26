/**
 * Anonymous, read-only HTTP gate for the real WingsGroup editorial routes.
 * The operator must supply the exact staging/preview origin; no origin is
 * embedded in this script.
 */
import {
  normalizeWingsGroupEditorialPreflightOrigin,
  runWingsGroupEditorialMediaPreflight,
} from './lib/wingsGroupEditorialMediaPreflight'

const value = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const configuredOrigin = value('--origin')
if (!configuredOrigin) throw new Error('--origin is required.')

const report = await runWingsGroupEditorialMediaPreflight({
  origin: normalizeWingsGroupEditorialPreflightOrigin(configuredOrigin),
})

console.log(JSON.stringify(report, null, 2))
