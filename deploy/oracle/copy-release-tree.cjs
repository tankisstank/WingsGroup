const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function copyReleaseTree(source, destination) {
  assert.ok(!fs.existsSync(destination), 'Release copy destination already exists')
  // Windows Copy-Item dereferences junctions; relink.sh recreates these on Linux.
  fs.cpSync(source, destination, {
    recursive: true,
    filter: (entry) => !fs.lstatSync(entry).isSymbolicLink(),
  })
}

if (require.main === module) {
  const tree = process.argv[2]
  assert.ok(['.next', 'node_modules'].includes(tree), 'Unexpected release tree')
  const root = process.cwd()
  const source = path.join(root, 'app/.next/standalone', tree)
  const destination = path.join(root, 'deploy/oracle/temp-release', tree)
  copyReleaseTree(source, destination)
  console.log(`Copied ${tree} without Windows junctions`)
}

module.exports = { copyReleaseTree }
